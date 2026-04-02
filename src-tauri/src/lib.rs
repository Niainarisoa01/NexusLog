// NexusLog — Ultra-fast Windows Event Log Viewer
// Module declarations
pub mod commands;
pub mod engine;
pub mod db;
pub mod plugins;

use commands::evtx::{load_file_command, get_paginated_events};
use engine::state::AppState;#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Using tauri_plugin_log for logging instead of tracing_subscriber directly

    tracing::info!("NexusLog starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            tracing::info!("NexusLog initialized successfully");
            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            load_file_command,
            get_paginated_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running NexusLog");
}
