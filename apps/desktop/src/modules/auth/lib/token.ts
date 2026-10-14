import { invoke } from "@tauri-apps/api/core";

// The session token lives in the OS credential store (src-tauri/src/auth.rs)
// and is sent as `Authorization: Bearer`: the installed app is cross-site to
// the API, so the session cookie wouldn't be sent. Read from the store once
// per launch, then kept in memory.
let token: Promise<string | null> | null = null;

async function readToken() {
  try {
    return await invoke<string | null>("auth_token_get");
  } catch {
    // Store unavailable (e.g. no Secret Service on Linux): logged out.
    return null;
  }
}

export async function getToken() {
  token ??= readToken();
  return await token;
}

export async function setToken(value: string) {
  token = Promise.resolve(value);
  await invoke("auth_token_set", { token: value });
}

export async function clearToken() {
  token = Promise.resolve(null);
  await invoke("auth_token_clear");
}
