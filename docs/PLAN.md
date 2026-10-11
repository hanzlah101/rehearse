# Rehearse: Product & Technical Plan

Status: draft for review · Owner: hanzlah101 · Last updated: 2026-10-11

Rehearse helps college students speak English fluently. A student is given (or types) a topic, talks about it from their own head for **up to 5–10 minutes**, and the app returns a clearly laid out report focused on **English**: filler words, repeated words and phrases, pauses, pace, grammar, vocabulary, and how well they kept talking on one topic. A secondary section flags **content mistakes** (for example, wrong C++ logic) without letting them affect the score.

---

## 1. Goals and non-goals

### Goals

1. Students speak **continuously on one topic for up to 5–10 minutes**, not one line per random point.
2. Students speak from their own head: the topic is the only prompt. Nothing is shown to read from while speaking; after each attempt the report shows the key points they could add next time.
3. Feedback is mostly about **language**: fillers, repetition, pauses, pace, grammar, vocabulary, linking words, coherence.
4. Every problem is **visible in place**: fillers, repetitions, pauses and mistakes are highlighted inside the student's own transcript.
5. Content correctness is checked and reported, but **separately** and outside the score.
6. Every attempt can be **retried** on the same topic so improvement is visible in numbers.
7. **Audio never leaves the student's machine.**
8. Runs on 16 GB laptops (macOS, Windows, Linux) without freezing them.

### Non-goals (for now)

- Meeting/business roleplay, interviews, slide decks, Q&A simulation.
- Live corrections while the student is speaking.
- Pronunciation scoring per phoneme.
- Mobile apps.
- Teacher dashboards and grading (possible later, see §16).

---

## 2. Core experience

### 2.1 Topic selection

**Decision:** the system offers a topic by default; the student can shuffle or type their own.

| Source | How it works | Why |
| --- | --- | --- |
| **Topic sets (default)** | Curated lists we maintain, grouped by subject and level (e.g. "C++ Basics", "OOP", "Data Structures", "General Speaking"). The app picks a random topic from the student's selected set, skipping recently used ones. | Zero effort to start; topics match what students study. |
| **Shuffle** | Picks another topic from the same set. | Escape hatch without typing. |
| **Custom topic** | Student types any topic (e.g. "Pointers vs references in C++"). | Practise for a real class or presentation. |

Not offered: a blank "just speak" mode. Without a topic students ramble or stop, and attempts can't be compared.

### 2.2 Session length

| Level    | Target | Unlocks after                                       |
| -------- | ------ | --------------------------------------------------- |
| Warm-up  | 1 min  | start                                               |
| Standard | 4 min  | 2 attempts filling ≥90% of target with no stall >5s |
| Long     | 7 min  | same rule                                           |
| Full     | 10 min | same rule                                           |

Students can always pick a shorter target manually. 5–10 minutes is the goal range; shorter targets build up to it.

### 2.3 Key points (hidden reference)

The student speaks from their own head, so nothing is shown to read from before or during the talk. For every topic the LLM still generates a short list of **key points** that a good talk would cover; they are used only for analysis and revealed in the report afterwards.

- **Count scales with target:** roughly one point per 45–60 seconds of speech.

  | Target | Key points |
  | ------ | ---------- |
  | 1 min  | 2–3        |
  | 4 min  | 4–6        |
  | 7 min  | 7–9        |
  | 10 min | 9–12       |

- Each point is **2–6 words** (e.g. "What a condition is", "if / else syntax", "Nested conditions", "switch vs if-else", "Common mistakes"), ordered as one natural flow (introduce → explain → example → compare → wrap up).
- Each point stores 1–3 **key terms** (used for coverage, the content check, and to exclude topic words from repetition warnings).
- Used for: the **flow and coverage** section and score (§4), the content check, and the "points you could add" guidance on retries.

Caching:

- Key points for topic-set topics are generated **once on the server** per topic and target, cached in Postgres, shared by all students (fair comparison, no repeated LLM cost).
- Custom-topic key points are generated on demand and cached per student.

### 2.4 Session flow

```
Home ─▶ Topic card ─▶ Speak (1–10 min) ─▶ Finishing analysis ─▶ Report ─▶ Retry / Next
```

1. **Home:** the topic (set, title, target length) with **Start**, **Change topic** (pick from the set or type your own), and a length picker. Below it: streak and last score.
2. **Speak** (starts as soon as the student presses Start; no countdown):
   - Only the topic is on screen; the student speaks from their own head.
   - Timer counts up with the target marked; a thin progress bar fills toward the target.
   - **Stall nudge:** after ~3s of silence (local voice-activity detection on mic level), a short prompt appears ("Keep going, add an example or your next idea"). It disappears when speech resumes.
   - **Pause / resume** allowed (paused time excluded from metrics).
   - No live corrections.
   - Finish (enabled after 30s; shorter recordings aren't analysed) and Cancel (asks first, discards the attempt); auto-stop at target + 1 min.
3. **Finishing analysis:** transcription runs in chunks **while the student speaks** (see §3.1), so after Stop only the final chunk, Praat, metrics and feedback remain (target: report in under 30s on Apple Silicon for a 10-minute talk).
4. **Report:** see §4.
5. **Retry:** same topic and target, "Focus on these 3" carried over from the last report (plus key points they missed); the report then shows before/after deltas. **Next** picks a new topic.

### 2.5 Rehearsal threads

Every topic the student practises becomes a **rehearsal** (a thread) that collects all its attempts.

- The sidebar lists rehearsals by last activity (Today, Yesterday, Previous 7 days, Earlier) with their latest score.
- Each rehearsal has its own page: topic, target, a **score trend** across attempts that doubles as the attempt picker, and **Try again**.
- Picking an attempt shows its guide: score and delta, stats vs the previous attempt, subscores, the top 3 fixes (carried into the next attempt) and key-point coverage. The full report (§4) opens from there.

---

## 3. Analysis pipeline

| # | Step | Where | Tool | Output |
| --- | --- | --- | --- | --- |
| 1 | Record | Desktop | Browser `MediaRecorder` → Web Audio resample → 16 kHz mono WAV, written in 30s chunks (Rust `cpal` fallback if Linux mic capture is unreliable) | chunk WAVs + one compressed `attempt.opus` |
| 2 | Transcribe | Desktop | **CrisperWhisper 2.0 large** via `whisper-server` (whisper.cpp) sidecar, chunk by chunk during recording | Verbatim transcript **including fillers**, word timestamps |
| 3 | Prosody | Desktop | **Praat** sidecar on the full recording | Pitch contour, intensity, silence intervals |
| 4 | Metrics | Desktop (TypeScript) | Our code, no AI | WPM per minute, fillers, **repetition counts**, pauses, stalls, pitch variation, time vs target |
| 5 | Language feedback | Backend → LLM | **gpt-oss-120b on Groq** (offline fallback: local **Qwen3.5 9B**) | Grammar, vocabulary, rephrasings, repetition alternatives, linking words, coverage, coherence |
| 6 | Content check | Backend → LLM | Same model, separate call | Technical/logic mistakes with corrections |
| 7 | Score + save | Desktop | Our code + local SQLite | Attempt record, deltas vs previous attempt |

### 3.1 Chunked transcription (needed for 5–10 minute talks)

- Audio is cut at the nearest silence after every ~30s and each chunk is sent to `whisper-server` while recording continues.
- Chunks overlap by 1s; words in the overlap are de-duplicated by timestamp.
- The model stays loaded during the session (~2–2.5 GB RAM) and is unloaded after the last chunk.
- Without chunking, a 10-minute talk would take ~1–2 min to transcribe on Apple Silicon and 10+ min on CPU-only machines after Stop.
- On slow CPU-only machines the app falls back to CrisperWhisper **turbo** if a chunk takes longer than real time.

### 3.2 Filler and repetition detection

**Fillers (code):** a per-language list matched against the verbatim transcript: `um, uh, er, ah, hmm, like, you know, I mean, basically, actually, literally, so (sentence-initial), kind of, sort of, right?, okay so`. Each hit keeps its timestamp. Ambiguous words (`like`, `so`, `actually`, `right`) are only counted when the LLM confirms they were used as fillers (Call A returns confirmations by index).

**Repetition (code finds, AI judges):**

1. Code counts **words and phrases (1–4 word n-grams)** after lowercasing and removing stop-words, plus **sentence starters** (first 2 words of each sentence) and **repeated adjacent words** ("the the", false starts).
2. A word/phrase is a candidate when it appears **≥3 times per 5 minutes** (scaled by duration), excluding the key points' key terms and the topic's own nouns (saying "condition" in a talk about conditions is fine).
3. Candidates (with counts and timestamps) go to the LLM, which:
   - drops necessary repeats (technical terms, unavoidable words),
   - labels the rest: **overused word**, **crutch phrase** ("as I said", "the thing is"), **repetitive sentence opener** ("And then…", "So basically…"), **circular point** (same idea explained twice),
   - suggests 2–3 **alternatives** for each.

### 3.3 Suggested pauses

Besides reviewing pauses the student made, the report suggests **where to add pauses** so the talk sounds more professional.

**Code finds candidates** (boundaries with no silence ≥300 ms in Praat's silence intervals):

| Candidate | Detected by |
| --- | --- |
| **Before a key point** | sentence containing a number, result, definition or conclusion phrase ("the result", "in short", "the main reason") with no gap before it |
| **Between ideas** | change of key point (from `coverage`) with no gap |
| **After a question or strong statement** | sentence ending in `?` or an emphatic claim, followed immediately by speech |
| **Instead of a filler** | every confirmed filler; a silent 0.5s pause replaces it |
| **Inside a rushed sentence** | sentence longer than ~25 words spoken above 170 WPM with no internal gap |

**The AI picks and explains:** the candidates go to Call A, which selects the **3–8 most valuable** (scaled by duration, up to ~15 for 10 minutes), says where exactly to pause (before which word), how long (short ~0.5s / medium ~1s / long ~1.5–2s), and why ("let your main result land").

Suggested pauses are advice, not errors: they don't lower the score directly. Missing pauses between ideas are reflected in the **fluency** subscore only through the existing pause-quality measure.

### 3.4 Why each tool

- **CrisperWhisper 2.0 large:** fine-tuned Whisper that transcribes **verbatim** ("um", "uh", repetitions, false starts). Plain Whisper deletes fillers, which defeats the product.
- **whisper.cpp (`whisper-server`)**: C++, runs on Metal (macOS), CPU/Vulkan/CUDA (Windows/Linux), no Python to ship.
- **Praat:** not an AI. It is a free, open-source phonetics program from the University of Amsterdam (Paul Boersma and David Weenink), used by linguists for decades to **measure speech acoustics**: pitch, loudness, pauses, formants. It does exact signal processing, so pause lengths and pitch values are measured, not guessed. We run it headless with a script, as a separate process (GPL-safe).
- **Metrics in TypeScript:** numbers must be deterministic and testable; LLMs miscount.
- **gpt-oss-120b on Groq:** a 120B model writes much better rephrasings, judges repetition sensibly, and is far more reliable at judging **technical correctness** than a 9B local model. Only text is sent, through our backend, so no API key ships in the desktop app.
- **Qwen3.5 9B (Q4_K_M) via `llama-server`:** offline fallback with the same prompts and JSON schemas; clearly labelled "offline feedback".

### 3.5 What the LLM receives (never audio)

```json
{
  "topic": "Conditional statements in C++",
  "keyPoints": [
    {
      "point": "if / else syntax",
      "keyTerms": ["condition", "else branch"]
    }
  ],
  "targetSeconds": 420,
  "transcript": [
    {
      "i": 0,
      "t": 0.0,
      "text": "So, um, an if statement basically checks a condition..."
    }
  ],
  "metrics": {
    "wpm": 141,
    "fillersPerMin": 5.8,
    "longestStallMs": 4100,
    "pitchVariation": "low"
  },
  "fillerCandidates": [{ "i": 0, "word": "basically", "t": 3.2 }],
  "repetitionCandidates": [
    { "phrase": "and then", "count": 14, "at": [12.1, 40.8, 77.3] }
  ],
  "longPauses": [{ "t": 41.0, "ms": 2100 }],
  "pauseCandidates": [{ "i": 14, "beforeWord": "forty", "kind": "key_point" }]
}
```

The transcript is sent as **numbered sentences with timestamps** so every finding can point to a sentence and be highlighted in the report. For a 10-minute talk (~1,300–1,500 words) this is about **3,000–4,000 tokens in** and **2,000–3,000 out** per call.

### 3.6 LLM calls and output contracts

Two calls per attempt, JSON-schema-constrained output, temperature 0.2, reasoning effort low. List limits scale with duration (base limit × minutes / 2, capped).

**Call A: language, repetition, coverage** (primary)

```json
{
  "fillerConfirmations": [{ "i": 0, "word": "basically", "isFiller": true }],
  "repetition": [{ "phrase": "and then", "kind": "repetitive_opener", "count": 14, "alternatives": ["after that", "next", "following this"], "why": "..." }],
  "grammar": [{ "i": 4, "quote": "...", "fix": "...", "type": "tense" | "article" | "preposition" | "agreement" | "word_order" | "other", "why": "..." }],
  "vocabulary": [{ "i": 7, "quote": "very good", "better": ["excellent", "effective"], "why": "..." }],
  "rephrasings": [{ "i": 9, "quote": "...", "better": "...", "why": "..." }],
  "suggestedPauses": [{ "i": 14, "beforeWord": "forty", "length": "short" | "medium" | "long", "kind": "key_point" | "between_ideas" | "after_question" | "replace_filler" | "rushed_sentence", "why": "Pause before your main result so it lands." }],
  "linking": [{ "i": 12, "suggestion": "Add a transition such as 'Next,' before moving to switch statements." }],
  "coverage": [{ "point": "Nested conditions", "startI": 15, "endI": 21, "depth": "brief" | "good" | "missed" }],
  "coherence": { "stayedOnTopic": true, "jumps": [{ "i": 30, "note": "..." }] },
  "topThree": ["...", "...", "..."],
  "rubric": { "grammar": 1-5, "vocabulary": 1-5, "coherence": 1-5 }
}
```

Prompt rules: quote the student's exact words; reference sentence index `i`; never flag normal spoken fragments; keep feedback at the student's level.

**Call B: content check** (secondary)

```json
{
  "mistakes": [{ "i": 18, "quote": "else runs when the condition is true", "correction": "else runs when the condition is false", "severity": "major" | "minor" }],
  "missingKeyIdeas": ["switch requires break to avoid fall-through"],
  "verdict": "accurate" | "mostly_accurate" | "has_errors"
}
```

Prompt rules: only clear factual/logic errors; no penalty for simplifications; at most 10 mistakes for 10-minute talks.

**Key points generation** (once per topic and target):

```json
{
  "keyPoints": [
    { "point": "if / else syntax", "keyTerms": ["condition", "else branch"] }
  ]
}
```

---

## 4. Report

The report is a single scrollable page made of clearly separated sections. Each section is a card with a title, a one-line summary, and its details. The legend colours are used consistently everywhere (transcript, charts, lists).

### 4.1 Highlight legend

| Category | Highlight style | Example |
| --- | --- | --- |
| Filler word | amber pill | <code>[um]</code> |
| Repeated word / phrase | purple underline, same colour per phrase | <u>and then</u> |
| Long pause (>1.5s) | grey inline chip with length | `⏸ 2.4s` |
| Suggested pause | green inline marker with length | `⏸+ 1s` |
| Grammar mistake | red wavy underline | ~~he go~~ → he goes |
| Vocabulary upgrade | blue dotted underline | _very good_ → excellent |
| Content mistake | red outline box (only when the content toggle is on) |  |

Every highlight is clickable: it shows the fix/explanation and plays the audio from 2s before that point (audio is stored locally).

### 4.2 Sections (top to bottom)

**1. Summary**

- Score ring (0–100) and level, with delta vs previous attempt on retries.
- Time spoken vs target (e.g. _6:48 of 7:00_).
- Four stat tiles: **Fillers** (total + per minute), **Repeated phrases** (count of flagged items), **Longest pause**, **Pace** (avg WPM).
- Subscore bars: Fluency · Variety · Pace · Delivery · Grammar · Vocabulary · Flow.

**2. Top 3 fixes**

- The three most important changes, each with a quote from the student, the better version, and a "Jump to" link into the transcript. Always expanded.

**3. Annotated transcript**

- The full transcript, split by key point (from `coverage`), with all highlights from the legend.
- Toggle chips above it to show/hide each category (fillers, repetition, pauses, suggested pauses, grammar, vocabulary, content).
- A timeline bar above the transcript shows marks for every highlight; clicking a mark scrolls to it. Dense clusters of fillers are visible at a glance.

**4. Filler words**

- Table: filler → count → per minute, sorted by count (e.g. _um 23 · basically 14 · you know 9_).
- Bar chart of fillers per minute across the talk (shows whether they get worse when tired or at transitions).
- One tip per top filler (e.g. "Pause silently instead of saying _um_").

**5. Repetition**

- Grouped list by kind: **Overused words** · **Crutch phrases** · **Repetitive sentence openers** · **Repeated ideas**.
- Each row: phrase, count, timestamps (clickable), 2–3 alternatives, why.
- Highlighted in the transcript in the same colour as its row.

**6. Pauses and pace**

- Line chart of WPM per minute against the 130–160 target band.
- Pause list split into **good pauses** (at sentence or idea boundaries) and **hesitations** (mid-sentence), with timestamps.
- Longest stall and where it happened.
- **Suggested pauses:** list of 3–8 places (up to ~15 for 10 minutes) to add a pause, each with the sentence, the word to pause before, the length (short / medium / long), and why. Each row jumps to its green `⏸+` marker in the transcript and plays that moment.

**7. Grammar**

- Grouped by type (tense, articles, prepositions, subject–verb agreement, word order, other) with a count per type, so students see their pattern ("Most of your mistakes are articles").
- Each item: quote → fix → short why.

**8. Vocabulary**

- Casual or weak words with stronger, more academic alternatives.

**9. Better ways to say it**

- 3–8 full sentences rewritten, side by side (original | improved).

**10. Flow and coverage**

- The topic's key points (first revealed here), each marked **Covered well / Brief / Missed**, with time spent on each; missed ones become suggestions for the next attempt.
- Topic jumps and missing linking words, with transcript links.

**11. Delivery**

- Pitch-over-time chart with **monotone stretches** shaded; volume consistency.

**12. Content check** (collapsed by default, clearly labelled _not part of your score_)

- Verdict, technical mistakes (quote → correction → severity), missing key ideas.

**13. History** (footer)

- Previous attempts on this topic with score and filler trend, and a **Retry** button.

### 4.3 Score formula

Numbers come from code; the LLM only provides 1–5 rubric values.

```
score = 0.25 × fluency     (fillers/min, longest stall, hesitation pauses)
      + 0.10 × variety     (flagged repetitions per minute)
      + 0.10 × pace        (WPM vs 130–160, time vs target)
      + 0.05 × delivery    (pitch variation, volume)
      + 0.20 × grammar     (LLM rubric, adjusted by errors per 100 words)
      + 0.15 × vocabulary  (LLM rubric)
      + 0.15 × flow        (key-point coverage + coherence rubric)
```

Content accuracy is **not** in the score. The product measures English; a student who explains C++ imperfectly but fluently should still see their English improve.

---

## 5. Architecture

```
┌──────────────────── Desktop app (Tauri 2, student's machine) ────────────────────┐
│ React UI (TanStack Router, shadcn aria-nova, Tailwind v4)                         │
│  topic card · speak · analyzing · report · rehearsal threads                      │
│                                                                                    │
│ TypeScript orchestration                                                           │
│  record (30s chunks) → whisper-server (live) → praat → metrics + repetition        │
│  → backend LLM (or local fallback) → score → SQLite                                │
│                                                                                    │
│ Sidecars (bundled per platform)      Local data                                   │
│  whisper-server (whisper.cpp)         SQLite via tauri-plugin-sql + Drizzle       │
│  praat                                audio (.opus) in app data dir                │
│  llama-server (offline fallback)      models (downloaded on first run)             │
└──────────────────────────────────────────────┬─────────────────────────────────────┘
                                               │ HTTPS: typed oRPC client
                                               │ (text only, never audio)
┌──────────────────────── Web app (TanStack Start + oRPC) ─────────────────────────┐
│ auth: student ID + password, bearer tokens, no signups                             │
│ topics: sets, random pick, key points (cached)                                     │
│ feedback: calls Groq with the institution key, per-student rate limits             │
│ sync (later): attempt summaries for progress across devices                        │
│ Postgres (Drizzle)                                                                 │
└──────────────────────────────────────────────┬─────────────────────────────────────┘
                                               │
                                     Groq API: openai/gpt-oss-120b
```

### 5.1 Desktop app

- **Tauri 2**, React 19, TypeScript 7, TanStack Router (file routes, code splitting), shadcn `aria-nova` on react-aria-components, Tailwind v4.
- Almost no Rust: plugin registration and, if needed, `cpal` mic capture.
- Plugins: `tauri-plugin-shell` (sidecars), `tauri-plugin-sql` (SQLite), `tauri-plugin-fs` (audio files), `tauri-plugin-http` (backend calls), Stronghold/keychain (session token).
- Uses the **same typed oRPC router types** as the web app, so request, response and error types are shared end to end.
- Charts: a lightweight chart library (decided at implementation) for fillers per minute, WPM over time, and pitch.

### 5.2 Web app / backend

- TanStack Start, oRPC v2 (typed errors, OpenAPI docs, CORS), Drizzle + Postgres, t3-env.
- Auth: student ID + password (argon2id); students are added by an admin; no signups. Desktop authenticates with a bearer token (cookies don't work cross-origin from Tauri).
- Holds the Groq API key; the desktop never sees it.

### 5.3 Why this split

- Audio and speech models stay local: private, free, no upload of large recordings.
- The LLM part needs a large model for good rephrasings, sensible repetition judgement and correct technical checks; running it via our backend keeps keys secret and caps usage per student.
- If the backend is down, the app still works with the local fallback model.

---

## 6. Models and tools

| Component | Choice | Size / RAM | License | Notes |
| --- | --- | --- | --- | --- |
| Speech-to-text | CrisperWhisper 2.0 **large**, GGML q8 (community conversion) | ~1.6 GB disk, ~2–2.5 GB RAM | **Nyra Health non-commercial** | Validate filler accuracy vs the official pipeline before relying on the conversion; turbo as fallback for slow CPUs |
| ASR runtime | whisper.cpp `whisper-server` | ~10 MB | MIT | Metal / CPU / Vulkan / CUDA builds |
| Prosody | Praat CLI (not AI: acoustic measurement) | ~40 MB | GPL | Separate process only |
| Feedback LLM | gpt-oss-120b on Groq | cloud | Apache-2.0 model, Groq ToS | ~10–14K tokens per 10-minute attempt; free tier won't cover many students, plan for the paid tier |
| Offline LLM | Qwen3.5 9B Q4_K_M | 6.6 GB disk, ~7.5–8 GB RAM (8K context) | Apache-2.0 | Optional download; slow on long talks (minutes) |
| LLM runtime | llama.cpp `llama-server` | ~20 MB | MIT | JSON-schema constrained output |
| Key points generation | gpt-oss-120b on Groq (server, cached) | cloud | as above | Once per topic and target |

### 6.1 Machine requirements

| Mode | RAM | Disk | Notes |
| --- | --- | --- | --- |
| Online (default) | 8 GB works, peak ~2.5 GB | ~2 GB + ~2 MB per 10-min recording | Internet needed for feedback |
| Offline fallback enabled | 16 GB, peak ~8 GB | ~9 GB | Whisper is unloaded before Qwen loads |

Before loading any model the app checks free RAM; if too low it refuses with a clear message instead of freezing the machine.

---

## 7. Data model

### 7.1 Server (Postgres)

| Table | Key columns |
| --- | --- |
| `students` | id, student_id (unique), name, password_hash, created_at |
| `sessions` | id (token hash), student_id, expires_at, ip_address, user_agent |
| `topic_sets` | id, name, subject, level, is_active |
| `topics` | id, set_id, title, level |
| `key_points` | id, topic_id or custom_topic_id, target_seconds, points (jsonb), model, created_at |
| `custom_topics` | id, student_id, title, created_at |
| `llm_usage` | id, student_id, kind (key_points / language / content), tokens_in, tokens_out, created_at |
| `attempt_summaries` (later, sync) | id, student_id, topic ref, score, subscores (jsonb), duration_ms, created_at |

### 7.2 Desktop (SQLite)

| Table | Key columns |
| --- | --- |
| `rehearsals` | id (UUID v7), topic ref, target_seconds, created_at, updated_at |
| `attempts` | id (UUID v7), rehearsal_id, key points snapshot (json), target_seconds, duration_ms, score, subscores (json), audio_path, created_at, updated_at |
| `attempt_feedback` | attempt_id, metrics (json), fillers (json), repetition (json), language (json), content (json), model, offline (bool) |
| `settings` | key, value |

Word timings and pitch data are stored as compressed JSON files next to the audio, not in SQLite. UUID v7 ids and `updated_at` everywhere so sync can be added later without migration pain.

---

## 8. API (oRPC procedures)

All procedures declare their errors; validation failures return 422 with prettified issues; unexpected failures return a typed 500.

| Procedure | Purpose | Notable errors |
| --- | --- | --- |
| `auth.login` | student ID + password → bearer token | `AUTH_INVALID_CREDENTIALS` 401 |
| `auth.session` | current student | 401 |
| `auth.logout` | revoke token |  |
| `topics.sets` | list active topic sets |  |
| `topics.random` | random topic from a set (excluding recent ones) | `TOPIC_SET_NOT_FOUND` 404 |
| `keyPoints.get` | key points for topic + target (generate and cache if missing) | `KEY_POINTS_UNAVAILABLE` 503 |
| `keyPoints.custom` | key points for a custom topic | `TOPIC_TOO_LONG` 422 |
| `feedback.language` | Call A | `FEEDBACK_RATE_LIMITED` 429 |
| `feedback.content` | Call B | `FEEDBACK_RATE_LIMITED` 429 |

Initial per-student limits: 30 feedback attempts/day, 20 custom topics/day. Tunable constants.

---

## 9. Privacy and security

- Audio is recorded, stored and analysed **only on the device**. Students can delete attempts (audio + data).
- Sent to the backend: topic, key points, transcript text, metrics, candidates. Forwarded to Groq for feedback.
- The Groq key lives only on the server.
- Desktop stores the session token in the OS keychain/Stronghold, not localStorage.
- Passwords: argon2id. Sessions: random token, only its SHA-256 stored server-side.
- CORS restricted to desktop origins (`tauri://localhost`, `http://tauri.localhost`, dev `http://localhost:1420`).

---

## 10. Offline and failure behaviour

| Failure | Behaviour |
| --- | --- |
| No internet / backend down | Topic sets cached locally from last sync; custom key points and feedback use local Qwen if downloaded; otherwise the attempt is saved and feedback runs when online |
| Groq rate limit hit | Backend returns `FEEDBACK_RATE_LIMITED`; desktop offers local fallback or "try again later" |
| Not enough RAM | Refuse to load the model with a clear message |
| Transcription slower than real time | Switch to CrisperWhisper turbo for the rest of the session |
| Mic permission denied | Explain per OS how to enable it |
| Recording shorter than 30s | Finish stays disabled until 30s; Cancel discards it |
| App closed mid-recording | Saved chunks kept; offer to analyse the partial recording on next launch |

---

## 11. Performance targets

| Step | Apple Silicon | CPU-only Windows/Linux |
| --- | --- | --- |
| Transcription | during recording (chunked) | during recording; turbo fallback if behind |
| Final chunk after Stop | ~3–5s | ~10–30s |
| Praat + metrics + repetition (10 min audio) | ~3–5s | ~5–10s |
| Feedback via Groq (2 calls, 10 min talk) | ~8–20s | ~8–20s |
| Feedback via local Qwen | ~2–5 min | ~5–15 min |

The report streams in: summary, fillers, repetition, pauses and pace appear first (no AI needed); language sections next; content check last.

---

## 12. Topic library (initial)

Owned by us; seeded via a script, editable later.

| Set | Level | Examples |
| --- | --- | --- |
| General Speaking | 1 | My hometown · A teacher who influenced me · How I prepare for exams |
| Programming Basics | 1–2 | Variables and data types · Conditional statements in C++ · Loops: for vs while |
| OOP | 2 | Classes and objects · Inheritance · Encapsulation vs abstraction |
| Data Structures | 2–3 | Arrays vs linked lists · How a stack works · When to use a hash map |
| Opinion | 3 | Should attendance be mandatory? · AI tools in assignments · Online vs in-person classes |

Target: 150–200 topics at launch, each broad enough to fill 10 minutes.

---

## 13. Licensing risks

- **CrisperWhisper 2.0 standard weights are non-commercial.** Fine for a free tool or research; a paid product needs a Nyra licence or a switch to Whisper large-v3-turbo (MIT) with weaker filler detection.
- **Praat is GPL:** run as a separate process only, never linked.
- oRPC v2 is beta and pinned to `2.0.0-beta.43`.

---

## 14. Cost estimate (Groq, verify before launch)

- One 10-minute attempt ≈ 10–14K tokens across both calls; a 2-minute attempt ≈ 4–5K.
- The free tier (~200K tokens/day per organisation) covers roughly 15–20 long attempts per day for **everyone combined**, so production needs the paid tier.
- At current gpt-oss-120b list prices (check Groq's pricing page), a long attempt costs a fraction of a cent.

---

## 15. Milestones

1. **Speech core (desktop):** chunked recording → whisper-server → Praat → metrics, fillers and repetition counts → local report sections 1, 3 (fillers/pauses only), 4, 5 (counts only), 6. Validate filler detection on 10 real clips.
2. **Topics + key points:** topic sets in Postgres, `topics.random`, `keyPoints.get` with caching; topic card, length picker, speak screen with stall nudge.
3. **Language feedback:** `feedback.language` via Groq; full report sections 1–11; score formula; retry with deltas.
4. **Content check:** `feedback.content`; collapsed content section.
5. **Auth on desktop:** bearer-token login, keychain storage, per-student rate limits.
6. **Progression:** length ladder (1 → 4 → 7 → 10 min), level suggestions, rehearsal threads.
7. **Offline fallback:** optional Qwen download, llama-server sidecar, offline labelling.
8. **Sync (optional):** attempt summaries to Postgres for multi-device progress.

---

## 16. Open questions

1. Who maintains topic sets long term: only us, or teachers per course?
2. Should teachers eventually see class progress, or is the tool student-only?
3. Paid Groq tier from day one, or start on the free tier with strict limits?
4. Keep CrisperWhisper large by default on slow CPU-only machines, or start with turbo there?
