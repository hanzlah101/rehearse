import type { Options } from "@node-rs/argon2";

export const SESSION_COOKIE_NAME = "session";

// 30 days
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TOKEN_BYTES = 32;

export const CREDENTIAL_MAX_LENGTH = 256;
export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 100;

export const DUMMY_PASSWORD_BYTES = 32;

export const PASSWORD_HASH_OPTIONS = {
  // argon2id
  algorithm: 2,
  // 19 MiB
  memoryCost: 19_456,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
} as const satisfies Options;
