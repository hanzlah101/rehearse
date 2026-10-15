//! Opens the main window at its final size and place in one step, so launch
//! doesn't flicker. The window-state plugin's own restore can't: on macOS it
//! maximizes with an animated "zoom" that tao queues asynchronously, so its
//! `show()` comes first and the window appears at its old size, then zooms to
//! full screen. Here the window gets its saved size and position while still
//! hidden; one that was maximized (or opens for the first time) gets the
//! monitor's work area instead, which macOS already treats as zoomed. Then
//! it's shown once.

use tauri::{Manager, WebviewWindow};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

/// The window from `tauri.conf.json` (no label there, so Tauri's default).
pub const MAIN: &str = "main";

/// Whether the window was maximized when the app last closed. True on first
/// launch, when nothing is saved yet: the app opens maximized.
fn was_maximized(window: &WebviewWindow) -> bool {
    let read = || -> Option<bool> {
        let path = window
            .path()
            .app_config_dir()
            .ok()?
            .join(window.app_handle().filename());
        let saved: serde_json::Value = serde_json::from_slice(&std::fs::read(path).ok()?).ok()?;
        saved.get(MAIN)?.get("maximized")?.as_bool()
    };
    read().unwrap_or(true)
}

pub fn open(window: &WebviewWindow) -> tauri::Result<()> {
    window
        .restore_state(StateFlags::all().difference(StateFlags::MAXIMIZED | StateFlags::VISIBLE))?;

    if was_maximized(window) {
        #[cfg(target_os = "macos")]
        if let Some(monitor) = window.current_monitor()? {
            let area = monitor.work_area();
            window.set_position(area.position)?;
            window.set_size(area.size)?;
        }
        // Elsewhere maximizing is synchronous, so the window is already
        // maximized when it's shown.
        #[cfg(not(target_os = "macos"))]
        window.maximize()?;
    }

    window.show()?;
    window.set_focus()
}
