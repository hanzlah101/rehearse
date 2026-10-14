// Seconds of speech a new student may send for review per rolling 24 hours
// (stored per student in students.daily_limit_seconds). Re-submitting the
// same attempt doesn't count again.
export const FEEDBACK_DEFAULT_DAILY_SECONDS = 30 * 60;

// gpt-oss on Groq (PLAN §3). The smaller model takes over once a step has
// failed twice with the large one.
export const FEEDBACK_MODEL = "openai/gpt-oss-120b";
export const FEEDBACK_FALLBACK_MODEL = "openai/gpt-oss-20b";
export const FEEDBACK_FALLBACK_AFTER_ATTEMPTS = 2;

// Each LLM call gives up after this long; the step is then retried.
export const FEEDBACK_CALL_TIMEOUT_MS = 120_000;

// Talks are 1–10 minutes; leave headroom for overtime.
export const FEEDBACK_MAX_TARGET_SECONDS = 900;
export const FEEDBACK_MAX_SENTENCES = 800;
