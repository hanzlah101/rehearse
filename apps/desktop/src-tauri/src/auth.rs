//! The session token, kept in the OS credential store (macOS Keychain,
//! Windows Credential Manager, the Secret Service on Linux), never in
//! localStorage or a file. The API is cross-site to the installed app, so the
//! session cookie isn't sent and the token travels as a bearer token instead.

use keyring::{Entry, Error};

const SERVICE: &str = "app.rehearse.desktop";
const ACCOUNT: &str = "session";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|error| error.to_string())
}

// Credential stores can block (a Keychain prompt, D-Bus), so off the runtime.
async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|error| error.to_string())?
}

/// The stored token, or null when logged out.
#[tauri::command]
pub async fn auth_token_get() -> Result<Option<String>, String> {
    blocking(|| match entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    })
    .await
}

#[tauri::command]
pub async fn auth_token_set(token: String) -> Result<(), String> {
    blocking(move || {
        entry()?
            .set_password(&token)
            .map_err(|error| error.to_string())
    })
    .await
}

#[tauri::command]
pub async fn auth_token_clear() -> Result<(), String> {
    blocking(|| match entry()?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    })
    .await
}
