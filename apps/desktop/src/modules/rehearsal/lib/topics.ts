// Talk lengths (PLAN §2.2).
export const TARGET_LENGTHS = [
  { label: "Warm-up", minutes: 1 },
  { label: "Standard", minutes: 4 },
  { label: "Long", minutes: 7 },
  { label: "Full", minutes: 10 },
] as const;

export type TargetLength = (typeof TARGET_LENGTHS)[number];

const LENGTH_STORAGE_KEY = "target-length";

// The last length the student picked; 7 minutes the first time.
export function loadTargetLength(): TargetLength {
  const stored = Number(localStorage.getItem(LENGTH_STORAGE_KEY));

  return (
    TARGET_LENGTHS.find((option) => option.minutes === stored) ??
    TARGET_LENGTHS[2]
  );
}

export function saveTargetLength(length: TargetLength) {
  localStorage.setItem(LENGTH_STORAGE_KEY, String(length.minutes));
}

// A random topic to suggest, or undefined when there are none yet.
export function pickTopic<T>(topics: readonly T[]): T | undefined {
  return topics[Math.floor(Math.random() * topics.length)];
}
