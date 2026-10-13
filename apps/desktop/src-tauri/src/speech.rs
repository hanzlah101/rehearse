//! Local speech analysis (PLAN §3): CrisperWhisper through whisper.cpp for a
//! verbatim transcript with word timings, and Praat (a sidecar process, GPL)
//! for pitch, loudness and silences. Audio never leaves the machine.

use std::collections::HashMap;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use sysinfo::System;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};
use tokio::io::AsyncWriteExt;
use whisper_rs::{
    DtwMode, DtwParameters, FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters,
};

// CrisperWhisper 2.0 large, GGML q8 (community conversion; PLAN §6).
const MODEL_FILE: &str = "ggml-crisperwhisper2.0-large-q8_0.bin";
const MODEL_URL: &str = "https://huggingface.co/shrisha/CrisperWhisper2.0_large-ggml/resolve/main/ggml-crisperwhisper2.0-large-q8_0.bin";
const MODEL_SHA256: &str = "f84b2aeced1d89d5dc71a622bfa0077546e849e76a8b181786cfd05de30c1f9a";
const MODEL_BYTES: u64 = 1_656_192_398;

// The model needs ~2–2.5 GB; refuse rather than push the machine into swap.
const MIN_FREE_BYTES: u64 = 3 * 1024 * 1024 * 1024;

const PROSODY_SCRIPT: &str = include_str!("prosody.praat");

// CrisperWhisper writes fillers as two tokens of its own, [UM] and [UH],
// added after <|startoftranscript|>. whisper.cpp takes the 100 ids after that
// token for language tokens and sets their logits to -inf at every step,
// which silences [UM]; and it leaves every id above <|endoftext|> out of the
// segment text, which drops [UH]. `allow_fillers` undoes the first, words are
// built from tokens to undo the second.
const MODEL_VOCAB: usize = 51_896;
const TOKEN_UM: usize = 50_358;
const TOKEN_UH: usize = 50_359;
// CrisperWhisper 2.0's alignment heads (layer, head), from its
// generation_config.json: whisper.cpp aligns tokens to the audio with them
// (DTW over cross-attention), which is where word onsets come from. The
// decoder's own token timestamps are spread over each chunk from its start
// and land words seconds early, so pauses got attached to the wrong words.
const ALIGNMENT_HEADS: [whisper_rs_sys::whisper_ahead; 10] = [
    ahead(8, 8),
    ahead(10, 3),
    ahead(4, 11),
    ahead(9, 18),
    ahead(18, 14),
    ahead(11, 16),
    ahead(20, 16),
    ahead(15, 4),
    ahead(5, 16),
    ahead(9, 16),
];

const fn ahead(n_text_layer: i32, n_head: i32) -> whisper_rs_sys::whisper_ahead {
    whisper_rs_sys::whisper_ahead {
        n_text_layer,
        n_head,
    }
}

// Ordinary text tokens ("," "." " the") that are never suppressed.
const REFERENCE_TOKENS: [usize; 3] = [11, 13, 264];
// [verbatim_1]…[verbatim_5]: CrisperWhisper's verbatim mode (fillers,
// repetitions, false starts), given as the decoder prompt like its own
// package does (crisperwhisper/prompt.py). Without it the model writes the
// intended, cleaned-up text.
const VERBATIM_TAGS: [i32; 5] = [50_373, 50_374, 50_375, 50_376, 50_377];
// The verbatim prompt as whisper.cpp builds it: <|startofprev|>, the tags,
// sot, en, transcribe.
const VERBATIM_PROMPT_TOKENS: usize = 1 + VERBATIM_TAGS.len() + 3;

// whisper.cpp only keeps a prompt for the first 30 s window, so the audio is
// cut into chunks of at most this long, at the quietest moment after the
// minimum, and each chunk is decoded on its own with the verbatim prompt.
const SAMPLE_RATE: usize = 16_000;
const FRAME_SAMPLES: usize = SAMPLE_RATE / 10;
const MIN_CHUNK_SECONDS: usize = 18;
const MAX_CHUNK_SECONDS: usize = 28;
// A chunk whose loudest 100 ms stays under this RMS (about -48 dBFS) is
// silence; decoding it only invites hallucinations.
const SILENT_RMS: f32 = 0.004;

// Repetition loop thresholds (n-gram size → consecutive repeats), as in
// crisperwhisper/loop_detection.py: long repeated phrases are never speech.
const LOOP_THRESHOLDS: [(usize, usize); 5] = [(1, 8), (2, 8), (3, 4), (4, 3), (5, 3)];

/// Transcriptions in progress, by attempt id, so they can be cancelled.
#[derive(Default)]
pub struct Speech {
    cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
    downloading: AtomicBool,
}

fn error(message: impl std::fmt::Display) -> String {
    message.to_string()
}

fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(error)?.join("models"))
}

fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(models_dir(app)?.join(MODEL_FILE))
}

/// A recording path from the frontend ("recordings/x.wav"), resolved inside
/// the app data directory. Anything that could climb out of it is refused.
fn recording_path(app: &AppHandle, relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    let is_safe = path.starts_with("recordings")
        && path
            .components()
            .all(|component| matches!(component, Component::Normal(_)));

    if !is_safe {
        return Err(format!("Not a recording path: {relative}"));
    }

    Ok(app.path().app_data_dir().map_err(error)?.join(path))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    ready: bool,
    total_bytes: u64,
}

#[tauri::command]
pub fn speech_model_status(app: AppHandle) -> Result<ModelStatus, String> {
    let ready = std::fs::metadata(model_path(&app)?)
        .map(|metadata| metadata.len() == MODEL_BYTES)
        .unwrap_or(false);

    Ok(ModelStatus {
        ready,
        total_bytes: MODEL_BYTES,
    })
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    downloaded_bytes: u64,
    total_bytes: u64,
}

async fn sha256_of(path: &Path) -> Result<String, String> {
    let path = path.to_owned();
    tokio::task::spawn_blocking(move || {
        let mut file = std::fs::File::open(path).map_err(error)?;
        let mut hasher = Sha256::new();
        std::io::copy(&mut file, &mut hasher).map_err(error)?;
        Ok(format!("{:x}", hasher.finalize()))
    })
    .await
    .map_err(error)?
}

/// Downloads the speech model on first use (never bundled, PLAN rules),
/// resuming a partial download and checking the SHA-256 before it's used.
#[tauri::command]
pub async fn speech_download_model(
    app: AppHandle,
    speech: State<'_, Speech>,
    on_progress: Channel<DownloadProgress>,
) -> Result<(), String> {
    let path = model_path(&app)?;
    if std::fs::metadata(&path).is_ok_and(|metadata| metadata.len() == MODEL_BYTES) {
        return Ok(());
    }
    if speech.downloading.swap(true, Ordering::SeqCst) {
        return Err("The speech model is already downloading.".into());
    }

    let result = download(&path, &on_progress).await;
    speech.downloading.store(false, Ordering::SeqCst);
    result
}

async fn download(path: &Path, on_progress: &Channel<DownloadProgress>) -> Result<(), String> {
    let dir = path.parent().ok_or("No models directory")?;
    tokio::fs::create_dir_all(dir).await.map_err(error)?;
    let partial = path.with_extension("bin.part");
    let mut downloaded = tokio::fs::metadata(&partial)
        .await
        .map(|metadata| metadata.len())
        .unwrap_or(0);
    if downloaded > MODEL_BYTES {
        tokio::fs::remove_file(&partial).await.map_err(error)?;
        downloaded = 0;
    }

    if downloaded < MODEL_BYTES {
        let client = reqwest::Client::new();
        let mut request = client.get(MODEL_URL);
        if downloaded > 0 {
            request = request.header(reqwest::header::RANGE, format!("bytes={downloaded}-"));
        }
        let response = request
            .send()
            .await
            .map_err(|_| "Couldn't download the speech model. Check your connection.")?;
        let status = response.status();
        if !status.is_success() {
            return Err(format!("The speech model download failed (HTTP {status})."));
        }
        // The server ignored the range: start over.
        if downloaded > 0 && status != reqwest::StatusCode::PARTIAL_CONTENT {
            downloaded = 0;
        }

        let mut file = tokio::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .append(downloaded > 0)
            .truncate(downloaded == 0)
            .open(&partial)
            .await
            .map_err(error)?;
        let mut stream = response.bytes_stream();
        let mut last_reported = 0;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk
                .map_err(|_| "The speech model download was interrupted. It resumes next time.")?;
            file.write_all(&chunk).await.map_err(error)?;
            downloaded += chunk.len() as u64;
            // About every 8 MB is plenty for a progress bar.
            if downloaded - last_reported >= 8 * 1024 * 1024 || downloaded == MODEL_BYTES {
                last_reported = downloaded;
                let _ = on_progress.send(DownloadProgress {
                    downloaded_bytes: downloaded,
                    total_bytes: MODEL_BYTES,
                });
            }
        }
        file.flush().await.map_err(error)?;
    }

    if sha256_of(&partial).await? != MODEL_SHA256 {
        let _ = tokio::fs::remove_file(&partial).await;
        return Err("The downloaded speech model was corrupted. Try again.".into());
    }
    tokio::fs::rename(&partial, path).await.map_err(error)?;
    Ok(())
}

#[derive(Serialize)]
pub struct Word {
    text: String,
    start: f32,
    end: f32,
}

fn read_wav(path: &Path) -> Result<Vec<f32>, String> {
    let mut reader = hound::WavReader::open(path).map_err(error)?;
    let spec = reader.spec();
    if spec.channels != 1 || spec.sample_rate != 16_000 || spec.bits_per_sample != 16 {
        return Err("The prepared audio isn't 16 kHz mono 16-bit.".into());
    }
    reader
        .samples::<i16>()
        .map(|sample| {
            sample
                .map(|value| f32::from(value) / 32_768.0)
                .map_err(error)
        })
        .collect()
}

/// whisper.cpp logits filter: gives [UM]/[UH] back the logits the language
/// suppression took. The unfiltered logits are in the state, one row per
/// batch token: the single greedy decoder reads row 0, or on its first step
/// the last row of the verbatim prompt. The reference tokens must match the
/// filtered logits exactly (decoding runs at temperature 0); otherwise
/// nothing is touched. Right after a filler no filler may follow: at
/// temperature 0 one "uh" would otherwise repeat until the window ends.
unsafe extern "C" fn allow_fillers(
    _ctx: *mut whisper_rs_sys::whisper_context,
    state: *mut whisper_rs_sys::whisper_state,
    tokens: *const whisper_rs_sys::whisper_token_data,
    n_tokens: std::os::raw::c_int,
    logits: *mut f32,
    _user_data: *mut std::os::raw::c_void,
) {
    // SAFETY: whisper.cpp calls this during decoding with a live state and
    // its filtered logits (MODEL_VOCAB floats, checked before enabling).
    // Rows are only read inside the current batch: 1 token per greedy step,
    // the verbatim prompt on a window's first step.
    unsafe {
        let raw = whisper_rs_sys::whisper_get_logits_from_state(state);
        if raw.is_null() || logits.is_null() {
            return;
        }
        let row = if n_tokens == 0 {
            VERBATIM_PROMPT_TOKENS - 1
        } else {
            0
        };
        let base = raw.add(row * MODEL_VOCAB);
        let is_this_row = REFERENCE_TOKENS.iter().all(|&token| {
            let filtered = *logits.add(token);
            filtered.is_finite() && (filtered - *base.add(token)).abs() <= 1e-4
        });
        let count = usize::try_from(n_tokens).unwrap_or(0);
        let after_filler = count > 0
            && !tokens.is_null()
            && usize::try_from((*tokens.add(count - 1)).id)
                .is_ok_and(|id| id == TOKEN_UM || id == TOKEN_UH);
        for token in [TOKEN_UM, TOKEN_UH] {
            let slot = logits.add(token);
            if after_filler {
                *slot = f32::NEG_INFINITY;
            } else if is_this_row && !(*slot).is_finite() {
                *slot = *base.add(token);
            }
        }
    }
}

/// True when this model has CrisperWhisper's filler tokens where expected.
fn has_filler_tokens(context: &WhisperContext) -> bool {
    let id = |token: usize| i32::try_from(token).unwrap_or(-1);
    usize::try_from(context.n_vocab()).is_ok_and(|n| n == MODEL_VOCAB)
        && context
            .token_to_str(id(TOKEN_UM))
            .is_ok_and(|text| text == "[UM]")
        && context
            .token_to_str(id(TOKEN_UH))
            .is_ok_and(|text| text == "[UH]")
}

/// Words from the decoded tokens: a token starting with a space starts a new
/// word, others continue it; [UM]/[UH] become the words "um"/"uh"; other
/// special tokens (timestamps, markers) are skipped. A word starts at its
/// first token's aligned (DTW) time and ends where the next word starts;
/// silences between words come from Praat, not from these times.
fn words_from_tokens(context: &WhisperContext, state: &whisper_rs::WhisperState) -> Vec<Word> {
    #[allow(clippy::cast_precision_loss)]
    let seconds = |centiseconds: i64| centiseconds as f32 / 100.0;
    let eot = context.token_eot();
    let mut words: Vec<(Vec<u8>, f32, f32)> = Vec::new();

    for segment in state.as_iter() {
        for index in 0..segment.n_tokens() {
            let Some(token) = segment.get_token(index) else {
                continue;
            };
            let data = token.token_data();
            // Aligned onset when DTW produced one, the decoder's guess otherwise.
            let start = seconds(if data.t_dtw >= 0 { data.t_dtw } else { data.t0 });
            let end = start.max(seconds(data.t1));
            let filler = match usize::try_from(data.id) {
                Ok(TOKEN_UM) => Some("um"),
                Ok(TOKEN_UH) => Some("uh"),
                _ => None,
            };
            if let Some(filler) = filler {
                words.push((filler.as_bytes().to_vec(), start, end));
                continue;
            }
            if data.id >= eot {
                continue;
            }
            let Ok(bytes) = token.to_bytes() else {
                continue;
            };
            match words.last_mut() {
                Some(word) if !bytes.starts_with(b" ") => {
                    word.0.extend_from_slice(bytes);
                    word.2 = end;
                }
                _ => words.push((bytes.to_vec(), start, end)),
            }
        }
    }

    let mut words: Vec<Word> = words
        .into_iter()
        .filter_map(|(bytes, start, end)| {
            let text = String::from_utf8_lossy(&bytes).trim().to_owned();
            (!text.is_empty()).then_some(Word { text, start, end })
        })
        .collect();
    // Onsets only move forward; each word lasts until the next one starts.
    for index in 1..words.len() {
        let previous = words[index - 1].start;
        if words[index].start < previous {
            words[index].start = previous;
        }
    }
    for index in 0..words.len().saturating_sub(1) {
        let next = words[index + 1].start;
        words[index].end = next.max(words[index].start);
    }
    words
}

// Chunk boundaries in samples: at most MAX_CHUNK_SECONDS, cut at the
// quietest 100 ms after MIN_CHUNK_SECONDS; silent chunks are left out.
fn chunk_bounds(samples: &[f32]) -> Vec<(usize, usize)> {
    #[allow(clippy::cast_precision_loss)]
    let rms: Vec<f32> = samples
        .chunks(FRAME_SAMPLES)
        .map(|frame| (frame.iter().map(|x| x * x).sum::<f32>() / frame.len() as f32).sqrt())
        .collect();
    let mut bounds = Vec::new();
    let mut start = 0;

    while start < samples.len() {
        if samples.len() - start <= MAX_CHUNK_SECONDS * SAMPLE_RATE {
            bounds.push((start, samples.len()));
            break;
        }
        let first = (start + MIN_CHUNK_SECONDS * SAMPLE_RATE) / FRAME_SAMPLES;
        let last = (start + MAX_CHUNK_SECONDS * SAMPLE_RATE) / FRAME_SAMPLES;
        let quietest = (first..last)
            .min_by(|a, b| rms[*a].total_cmp(&rms[*b]))
            .unwrap_or(last);
        let cut = quietest * FRAME_SAMPLES + FRAME_SAMPLES / 2;
        bounds.push((start, cut));
        start = cut;
    }

    bounds
        .into_iter()
        .filter(|&(from, to)| {
            rms[from / FRAME_SAMPLES..to.div_ceil(FRAME_SAMPLES).min(rms.len())]
                .iter()
                .any(|&value| value >= SILENT_RMS)
        })
        .collect()
}

/// Where a decoding loop starts repeating, as the index of the first word to
/// drop (one copy of the repeated n-gram is kept).
fn loop_start(words: &[Word]) -> Option<usize> {
    let texts: Vec<String> = words
        .iter()
        .map(|word| {
            word.text
                .to_lowercase()
                .trim_matches(|c: char| !c.is_alphanumeric())
                .to_owned()
        })
        .collect();
    (0..texts.len()).find_map(|i| {
        LOOP_THRESHOLDS.iter().find_map(|&(n, reps)| {
            let gram = texts.get(i..i + n)?;
            let repeats = (1..reps).all(|r| texts.get(i + r * n..i + (r + 1) * n) == Some(gram));
            repeats.then_some(i + n)
        })
    })
}

struct Decoder<'a> {
    cancel: &'a Arc<AtomicBool>,
    context: &'a WhisperContext,
    fillers: bool,
    on_progress: Channel<u8>,
    state: whisper_rs::WhisperState,
    threads: i32,
}

impl Decoder<'_> {
    /// Decodes samples[from..to] as one window; word times are absolute.
    /// `verbatim` keeps fillers; without it the model writes the intended text
    /// (used when verbatim decoding keeps looping).
    fn decode(
        &mut self,
        samples: &[f32],
        verbatim: bool,
        progress: (usize, usize),
    ) -> Result<Vec<Word>, String> {
        // Greedy at temperature 0, one decoder (as CrisperWhisper's own
        // pipeline decodes), which `allow_fillers` relies on; loops are
        // repaired by the caller instead of temperature fallback.
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("en"));
        params.set_translate(false);
        params.set_temperature_inc(0.0);
        params.set_no_context(true);
        params.set_single_segment(true);
        params.set_token_timestamps(true);
        if verbatim {
            params.set_tokens(&VERBATIM_TAGS);
            if self.fillers {
                // SAFETY: `allow_fillers` only touches the logits whisper.cpp
                // hands it and rows of the current batch (see its comment).
                unsafe { params.set_filter_logits_callback(Some(allow_fillers)) };
            }
        }
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_special(false);
        params.set_print_timestamps(false);
        params.set_n_threads(self.threads);
        let on_progress = self.on_progress.clone();
        let (index, count) = progress;
        params.set_progress_callback_safe(move |percent: i32| {
            let done = index * 100 + usize::try_from(percent.clamp(0, 100)).unwrap_or(0);
            let _ = on_progress.send(u8::try_from(done / count.max(1)).unwrap_or(100));
        });
        let cancel_flag = Arc::clone(self.cancel);
        // whisper-rs 0.16 stores this callback as Box<dyn FnMut> but its
        // trampoline reads it back as the closure's own type; passing an
        // already boxed `dyn FnMut` makes both the same type (a plain closure
        // here reads garbage and aborts the encoder).
        let abort: Box<dyn FnMut() -> bool> = Box::new(move || cancel_flag.load(Ordering::SeqCst));
        params.set_abort_callback_safe(abort);

        let result = self.state.full(params, samples);
        if self.cancel.load(Ordering::SeqCst) {
            return Err("Cancelled".into());
        }
        result.map_err(|e| format!("Transcription failed: {e}"))?;
        Ok(words_from_tokens(self.context, &self.state))
    }

    /// One chunk, repairing decoding loops: the words before a loop are kept
    /// and the rest is decoded again from there, verbatim once more, then as
    /// intended text. An empty decode also moves on to the next mode.
    fn chunk(
        &mut self,
        samples: &[f32],
        (from, to): (usize, usize),
        progress: (usize, usize),
    ) -> Result<Vec<Word>, String> {
        #[allow(clippy::cast_precision_loss)]
        let seconds = |sample: usize| sample as f32 / SAMPLE_RATE as f32;
        let mut words = Vec::new();
        let mut start = from;

        for verbatim in [true, true, false] {
            let offset = seconds(start);
            let end = seconds(to);
            let mut decoded: Vec<Word> = self
                .decode(&samples[start..to], verbatim, progress)?
                .into_iter()
                .map(|word| Word {
                    end: (word.end + offset).min(end),
                    start: word.start + offset,
                    text: word.text,
                })
                .filter(|word| word.start < end)
                .collect();

            // Nothing came out of audio that isn't silent: try the next mode.
            if decoded.is_empty() {
                continue;
            }
            let Some(cut) = loop_start(&decoded) else {
                words.append(&mut decoded);
                break;
            };
            decoded.truncate(cut);
            let resume = decoded.last().map_or(offset, |word| word.end);
            words.append(&mut decoded);
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            let resume_sample = (resume * SAMPLE_RATE as f32) as usize;
            // Under a second left: nothing worth decoding again.
            if resume_sample + SAMPLE_RATE >= to {
                break;
            }
            start = resume_sample;
        }

        Ok(words)
    }
}

fn transcribe_blocking(
    model: &Path,
    wav: &Path,
    cancel: &Arc<AtomicBool>,
    on_progress: Channel<u8>,
) -> Result<Vec<Word>, String> {
    let mut system = System::new();
    system.refresh_memory();
    if system.available_memory() < MIN_FREE_BYTES {
        return Err("Not enough free memory to transcribe. Close some apps and try again.".into());
    }

    let samples = read_wav(wav)?;
    let context = WhisperContext::new_with_params(
        model.to_str().ok_or("Model path isn't valid UTF-8")?,
        WhisperContextParameters {
            dtw_parameters: DtwParameters {
                mode: DtwMode::Custom {
                    aheads: &ALIGNMENT_HEADS,
                },
                ..DtwParameters::default()
            },
            ..WhisperContextParameters::default()
        },
    )
    .map_err(|_| "Couldn't load the speech model.")?;
    let threads = std::thread::available_parallelism().map_or(4, |count| count.get().min(8));
    let mut decoder = Decoder {
        cancel,
        context: &context,
        fillers: has_filler_tokens(&context),
        on_progress,
        state: context.create_state().map_err(error)?,
        threads: i32::try_from(threads).unwrap_or(4),
    };

    let chunks = chunk_bounds(&samples);
    let mut words = Vec::new();
    for (index, bounds) in chunks.iter().enumerate() {
        words.append(&mut decoder.chunk(&samples, *bounds, (index, chunks.len()))?);
    }
    Ok(words)
}

/// Verbatim transcript (fillers included) with word timings. Loads the model,
/// transcribes, and unloads it again (one model in memory at a time).
#[tauri::command]
pub async fn speech_transcribe(
    app: AppHandle,
    speech: State<'_, Speech>,
    attempt_id: String,
    wav_path: String,
    on_progress: Channel<u8>,
) -> Result<Vec<Word>, String> {
    let model = model_path(&app)?;
    if !model.exists() {
        return Err("The speech model isn't downloaded yet.".into());
    }
    let wav = recording_path(&app, &wav_path)?;
    let cancel = Arc::new(AtomicBool::new(false));
    speech
        .cancels
        .lock()
        .map_err(error)?
        .insert(attempt_id.clone(), Arc::clone(&cancel));

    let task_cancel = Arc::clone(&cancel);
    let result = tokio::task::spawn_blocking(move || {
        transcribe_blocking(&model, &wav, &task_cancel, on_progress)
    })
    .await
    .map_err(error)
    .and_then(|result| result);

    speech.cancels.lock().map_err(error)?.remove(&attempt_id);
    result
}

/// Stops a running transcription (its attempt was deleted).
#[tauri::command]
pub fn speech_cancel(speech: State<'_, Speech>, attempt_id: String) -> Result<(), String> {
    if let Some(cancel) = speech.cancels.lock().map_err(error)?.get(&attempt_id) {
        cancel.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[derive(Serialize, Default)]
pub struct Prosody {
    duration: f32,
    /// [seconds, Hz] every 20 ms; 0 Hz where unvoiced.
    pitch: Vec<[f32; 2]>,
    /// [seconds, dB] every 100 ms.
    intensity: Vec<[f32; 2]>,
    /// [start, end] of silences of at least 0.3 s.
    silences: Vec<[f32; 2]>,
}

fn parse_prosody(output: &str) -> Prosody {
    let mut prosody = Prosody::default();
    for line in output.lines() {
        let mut parts = line.split_whitespace();
        let kind = parts.next();
        let mut number = || parts.next().and_then(|value| value.parse::<f32>().ok());
        match (kind, number(), number()) {
            (Some("duration"), Some(duration), _) => prosody.duration = duration,
            (Some("p"), Some(time), Some(hertz)) => prosody.pitch.push([time, hertz]),
            (Some("i"), Some(time), Some(db)) => prosody.intensity.push([time, db]),
            (Some("s"), Some(start), Some(end)) => prosody.silences.push([start, end]),
            _ => {}
        }
    }
    prosody
}

/// Praat ships next to the app's executable (Tauri externalBin).
fn praat_path() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(error)?;
    let dir = exe.parent().ok_or("No executable directory")?;
    Ok(dir.join(if cfg!(windows) { "praat.exe" } else { "praat" }))
}

fn prosody_blocking(wav: &Path) -> Result<Prosody, String> {
    let praat = praat_path()?;
    if !praat.exists() {
        return Err("Praat is missing from this installation.".into());
    }
    let script = tempfile_path("rehearse-prosody", "praat");
    std::fs::File::create(&script)
        .and_then(|mut file| file.write_all(PROSODY_SCRIPT.as_bytes()))
        .map_err(error)?;
    let output = Command::new(&praat)
        .arg("--run")
        .arg(&script)
        .arg(wav)
        .output()
        .map_err(|_| "Couldn't start Praat.");
    let _ = std::fs::remove_file(&script);
    let output = output?;
    if !output.status.success() {
        return Err(format!(
            "Praat failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let prosody = parse_prosody(&String::from_utf8_lossy(&output.stdout));
    if prosody.duration <= 0.0 {
        return Err("Praat returned no measurements.".into());
    }
    Ok(prosody)
}

fn tempfile_path(prefix: &str, extension: &str) -> PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |duration| duration.as_nanos());
    std::env::temp_dir().join(format!(
        "{prefix}-{}-{nanos}.{extension}",
        std::process::id()
    ))
}

/// Pitch contour, loudness and silences, measured by Praat (not AI).
#[tauri::command]
pub async fn speech_prosody(app: AppHandle, wav_path: String) -> Result<Prosody, String> {
    let wav = recording_path(&app, &wav_path)?;
    tokio::task::spawn_blocking(move || prosody_blocking(&wav))
        .await
        .map_err(error)?
}

#[cfg(test)]
mod tests {
    use super::parse_prosody;

    /// Transcribes a real recording with the downloaded model and prints the
    /// words, to check filler detection by ear:
    /// `REHEARSE_TEST_WAV=/path/talk.wav cargo test --release transcribes_wav -- --ignored --nocapture`
    /// (16 kHz mono 16-bit WAV, e.g. `ffmpeg -i talk.webm -ar 16000 -ac 1 talk.wav`).
    #[test]
    #[ignore = "needs the downloaded model and a recording"]
    fn transcribes_wav() {
        let wav = std::env::var("REHEARSE_TEST_WAV").expect("set REHEARSE_TEST_WAV");
        let home = std::env::var("HOME").expect("HOME");
        let model = std::path::PathBuf::from(format!(
            "{home}/Library/Application Support/app.rehearse.desktop/models/{}",
            super::MODEL_FILE
        ));
        let cancel = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let words = super::transcribe_blocking(
            &model,
            std::path::Path::new(&wav),
            &cancel,
            tauri::ipc::Channel::new(|_| Ok(())),
        )
        .expect("transcription");
        let fillers: Vec<String> = words
            .iter()
            .filter(|word| {
                matches!(
                    word.text
                        .to_lowercase()
                        .trim_matches(|c: char| !c.is_alphanumeric()),
                    "um" | "uh"
                )
            })
            .map(|word| format!("{}@{:.1}s", word.text, word.start))
            .collect();
        println!(
            "{} words, {} fillers: {fillers:?}",
            words.len(),
            fillers.len()
        );
        println!(
            "{}",
            words
                .iter()
                .map(|word| word.text.as_str())
                .collect::<Vec<_>>()
                .join(" ")
        );
    }

    #[test]
    fn parses_praat_output() {
        let prosody = parse_prosody(
            "duration 11.659\np 0.03 0\np 0.05 182.4\ni 0.10 61.2\ns 5.625 7.833\nnoise\n",
        );
        assert!((prosody.duration - 11.659).abs() < 1e-3);
        assert_eq!(prosody.pitch, vec![[0.03, 0.0], [0.05, 182.4]]);
        assert_eq!(prosody.intensity, vec![[0.10, 61.2]]);
        assert_eq!(prosody.silences, vec![[5.625, 7.833]]);
    }
}
