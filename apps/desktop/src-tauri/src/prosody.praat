# Prosody for one 16 kHz mono WAV (PLAN §3: measured, not guessed). Prints
# "duration d", then "p time hz" pitch frames (0 = unvoiced), "i time db"
# loudness every 0.1 s and "s start end" silences of 0.3 s or more.

form Prosody
  sentence Wav
endform
sound = Read from file: wav$
duration = Get total duration
writeInfoLine: "duration ", fixed$ (duration, 3)

selectObject: sound
pitch = To Pitch: 0.02, 60, 500
frames = Get number of frames
for frame to frames
  time = Get time from frame number: frame
  f0 = Get value in frame: frame, "Hertz"
  if f0 = undefined
    appendInfoLine: "p ", fixed$ (time, 2), " 0"
  else
    appendInfoLine: "p ", fixed$ (time, 2), " ", fixed$ (f0, 1)
  endif
endfor

selectObject: sound
intensity = To Intensity: 100, 0, "yes"
step = 0.1
steps = floor (duration / step)
for i to steps
  time = i * step
  db = Get value at time: time, "cubic"
  if db <> undefined
    appendInfoLine: "i ", fixed$ (time, 2), " ", fixed$ (db, 1)
  endif
endfor

selectObject: sound
grid = To TextGrid (silences): 100, 0, -25, 0.3, 0.1, "silent", "sounding"
intervals = Get number of intervals: 1
for i to intervals
  label$ = Get label of interval: 1, i
  if label$ = "silent"
    start = Get start time of interval: 1, i
    end = Get end time of interval: 1, i
    appendInfoLine: "s ", fixed$ (start, 3), " ", fixed$ (end, 3)
  endif
endfor
