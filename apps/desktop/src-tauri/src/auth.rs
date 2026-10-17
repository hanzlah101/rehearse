//! The session token, never in localStorage. The API is cross-site to the
//! installed app, so the session cookie isn't sent and the token travels as a
//! bearer token instead.
//!
//! Windows keeps it in the Credential Manager. macOS and Linux keep it in an
//! owner-only file in the app data folder: the macOS bundle is ad-hoc signed,
//! so every update has a new signature and the Keychain would ask for access
//! again after each one; many Linux desktops have no Secret Service, and
//! without one the token couldn't be saved, so login failed. Switch macOS back
//! to the Keychain once releases are signed with a Developer ID.

use tauri::AppHandle;

// Stores can block (a Keychain prompt, D-Bus), so off the runtime.
async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|error| error.to_string())?
}

/// The stored token, or null when logged out.
#[tauri::command]
pub async fn auth_token_get(app: AppHandle) -> Result<Option<String>, String> {
    blocking(move || store::get(&app)).await
}

#[tauri::command]
pub async fn auth_token_set(app: AppHandle, token: String) -> Result<(), String> {
    blocking(move || store::set(&app, &token)).await
}

#[tauri::command]
pub async fn auth_token_clear(app: AppHandle) -> Result<(), String> {
    blocking(move || store::clear(&app)).await
}

#[cfg(unix)]
mod store {
    use std::fs::{self, OpenOptions};
    use std::io::{ErrorKind, Write};
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
    use std::path::PathBuf;

    use tauri::{AppHandle, Manager};

    fn path(app: &AppHandle) -> Result<PathBuf, String> {
        Ok(app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("session"))
    }

    pub fn get(app: &AppHandle) -> Result<Option<String>, String> {
        match fs::read_to_string(path(app)?) {
            Ok(token) if !token.is_empty() => Ok(Some(token)),
            Ok(_) => Ok(None),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    pub fn set(app: &AppHandle, token: &str) -> Result<(), String> {
        let path = path(app)?;
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&path)
            .map_err(|error| error.to_string())?;
        // `mode` only applies to a new file.
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
        file.write_all(token.as_bytes())
            .map_err(|error| error.to_string())
    }

    pub fn clear(app: &AppHandle) -> Result<(), String> {
        match fs::remove_file(path(app)?) {
            Err(error) if error.kind() != ErrorKind::NotFound => Err(error.to_string()),
            _ => Ok(()),
        }
    }
}

#[cfg(windows)]
mod store {
    use keyring::{Entry, Error};
    use tauri::AppHandle;

    const SERVICE: &str = "app.rehearse.desktop";
    const ACCOUNT: &str = "session";

    fn entry() -> Result<Entry, String> {
        Entry::new(SERVICE, ACCOUNT).map_err(|error| error.to_string())
    }

    pub fn get(_app: &AppHandle) -> Result<Option<String>, String> {
        match entry()?.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(Error::NoEntry) => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    pub fn set(_app: &AppHandle, token: &str) -> Result<(), String> {
        entry()?
            .set_password(token)
            .map_err(|error| error.to_string())
    }

    pub fn clear(_app: &AppHandle) -> Result<(), String> {
        match entry()?.delete_credential() {
            Ok(()) | Err(Error::NoEntry) => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }
}
