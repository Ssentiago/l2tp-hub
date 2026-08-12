#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use crate::logger::Logger;
use fix_path_env;
use std::sync::Arc;
use tauri::Manager;

pub mod backup;
pub mod commands;
pub mod db;
pub mod keychain;
pub mod l2tp;
pub mod logger;
pub mod models;
pub mod startup;
mod state;
mod store;
mod sudo;
pub mod tray;

pub static LOGGER: std::sync::OnceLock<Arc<Logger>> = std::sync::OnceLock::new();
pub static DB_POOL: std::sync::OnceLock<sqlx::SqlitePool> = std::sync::OnceLock::new();

#[macro_export]
macro_rules! log {
    ($($arg:tt)*) => {
        if let Some(logger) = $crate::LOGGER.get() {
            logger.log(&format!($($arg)*))
        }
    };
}

fn main() {
    let _ = fix_path_env::fix();

    #[cfg(target_os = "macos")]
    {
        if let Err(msg) = startup::macos::check_os_version() {
            startup::macos::show_alert(&msg);
            std::process::exit(1);
        }

        if let Err(msg) = startup::macos::check_macosvpn() {
            startup::macos::show_alert(&msg);
            std::process::exit(1);
        }
    }

    let tray_state = state::TrayState {
        tray: std::sync::Mutex::new(None),
        poller_running: std::sync::Mutex::new(false),
    };

    tauri::Builder::default()
        .manage(sudo::SudoSession::new())
        .manage(tray_state)
        .setup(|app| {
            let logger = Arc::new(logger::Logger::new(app.handle().clone()));
            LOGGER.set(logger).ok();

            let db_path = app
                .path()
                .resolve("l2tp-hub.db", tauri::path::BaseDirectory::AppData)
                .expect("db path");
            let pool = tauri::async_runtime::block_on(db::init_pool(&db_path))?;
            if tauri::async_runtime::block_on(db::store_is_empty(&pool)).unwrap_or(false) {
                let json_path = app
                    .path()
                    .resolve("connections.json", tauri::path::BaseDirectory::AppData)
                    .expect("json path");
                let _ = tauri::async_runtime::block_on(db::migrate_from_json(&pool, &json_path));
            }
            DB_POOL.set(pool).ok();

            let window = app
                .get_webview_window("main")
                .expect("Main window not found");

            state::init_state(app.handle().clone(), window);

            match tray::create_tray(app.handle()) {
                Ok(tray) => {
                    let tray_state = app.state::<state::TrayState>();
                    *tray_state.tray.lock().unwrap() = Some(tray);
                }
                Err(e) => eprintln!("Failed to create tray: {}", e),
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_connections,
            commands::save_connection,
            commands::delete_connection,
            commands::connect_vpn,
            commands::disconnect_vpn,
            commands::get_vpn_status,
            commands::check_connection,
            commands::authenticate_sudo,
            commands::check_sudo_session,
            commands::get_labels,
            commands::open_url,
            commands::save_label,
            commands::delete_label,
            commands::import,
            commands::export,
            commands::reset,
            commands::check_update,
            commands::apply_update,
            commands::get_workspaces,
            commands::get_active_workspace_id,
            commands::create_workspace,
            commands::rename_workspace,
            commands::delete_workspace,
            commands::switch_workspace,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
