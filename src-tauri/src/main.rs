#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use crate::logger::Logger;
use fix_path_env;
use std::sync::Arc;
use tauri::Manager;

pub mod backup;
pub mod commands;

pub mod keychain;
pub mod l2tp;
pub mod logger;
pub mod models;
pub mod startup;
mod state;
mod store;
mod sudo;

pub static LOGGER: std::sync::OnceLock<Arc<Logger>> = std::sync::OnceLock::new();

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

    tauri::Builder::default()
        .setup(|app| {
            let logger = Arc::new(logger::Logger::new(app.handle().clone()));
            LOGGER.set(logger).ok();

            let window = app
                .get_webview_window("main")
                .expect("Main window not found");

            state::init_state(app.handle().clone(), window);
            Ok(())
        })
        .manage(sudo::SudoSession::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_connections,
            commands::save_connection,
            commands::delete_connection,
            commands::connect_vpn,
            commands::disconnect_vpn,
            commands::get_vpn_status,
            commands::authenticate_sudo,
            commands::check_sudo_session,
            commands::get_labels,
            commands::open_url,
            commands::save_label,
            commands::delete_label,
            commands::import,
            commands::export,
            commands::reset,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
