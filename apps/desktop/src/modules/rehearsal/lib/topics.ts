// ponytail: one hardcoded set until topic sets come from the API (PLAN §12).
export const TOPIC_SET = {
  name: "Programming Basics",
  topics: [
    "Variables and data types",
    "Conditional statements in C++",
    "Loops: for vs while",
    "Functions and parameters",
    "Arrays and indexing",
    "Pointers vs references in C++",
    "Recursion explained simply",
    "How a compiler turns code into a program",
  ],
};

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

// Shown in place of the set name for a topic the student typed.
export const CUSTOM_SET = "Your topic";

export type Topic = {
  set: string;
  title: string;
};

// A random topic from the set other than the current one.
export function pickTopic(current?: string): Topic {
  const topics = TOPIC_SET.topics.filter((topic) => topic !== current);

  return {
    set: TOPIC_SET.name,
    title: topics[Math.floor(Math.random() * topics.length)],
  };
}
