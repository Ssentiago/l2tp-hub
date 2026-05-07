// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod commands;
mod keychain;
#[cfg(target_os = "macos")]
pub mod l2tp;

#[cfg(target_os = "windows")]
#[path = "l2tp_windows.rs"]
pub mod l2tp;
mod store;
mod sudo;
mod app_handle_storage;
pub mod export_import;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app_handle_storage::init_app_handle(app.handle().clone());

            let window = app
                .get_webview_window("main")
                .expect("Main window not found");
            app_handle_storage::init_main_window(window);

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
commands::import_config_dialog,
commands::export_config_dialog,
commands::reset_all,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}