mod auth;
mod db;
mod speech;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let database = db::open(app.handle())?;
            app.manage(database);
            app.manage(speech::Speech::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::auth_token_get,
            auth::auth_token_set,
            auth::auth_token_clear,
            db::db_execute,
            db::db_batch,
            speech::speech_model_status,
            speech::speech_download_model,
            speech::speech_transcribe,
            speech::speech_cancel,
            speech::speech_prosody
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
