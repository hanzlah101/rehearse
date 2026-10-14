// One timeline for the hero, in seconds after it mounts, so the headline's
// "um" and the waveform's filler are flagged and dropped together.
export const HERO_EASE = [0.65, 0, 0.35, 1] as const;
export const FLAG_AT = 0.6;
export const DROP_AT = 1.9;
export const DROP_DURATION = 0.65;
