#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use crate::logger::Logger;
use fix_path_env;
use std::sync::Arc;
use tauri::{Emitter, Manager};

pub mod backup;
pub mod commands;
pub mod db;
pub mod guardian;
pub mod helper;
pub mod keychain;
pub mod l2tp;
pub mod logger;
pub mod models;
pub mod startup;
mod sleep_wake;
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

    // Глобальная очистка при старте — убить сиротские процессы от прошлого запуска
    state::cleanup_all_vpn_state();

    let tray_state = state::TrayState {
        tray: std::sync::Mutex::new(None),
        poller_running: std::sync::Mutex::new(false),
    };

    tauri::Builder::default()
        .manage(tray_state)
        .setup(|app| {
            let logger = Arc::new(logger::Logger::new(app.handle().clone()));
            LOGGER.set(logger).ok();

            // SudoSession — управление privileged helper
            let sudo = sudo::SudoSession::new();
            app.manage(sudo.clone());

            // Регистрируем L2tpManager — централизованный VPN-менеджер
            let manager = l2tp::manager::L2tpManager::new(sudo, app.handle().clone());
            app.manage(manager);

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

            match tray::create_tray() {
                Ok(tray) => {
                    let tray_state = app.state::<state::TrayState>();
                    *tray_state.tray.lock().unwrap() = Some(tray);
                }
                Err(e) => eprintln!("Failed to create tray: {}", e),
            }

            // Sleep/Wake — проверяем VPN после пробуждения
            let wake_app = app.handle().clone();
            sleep_wake::subscribe_sleep_wake(
                || {
                    crate::log!("[sleep-wake] system going to sleep");
                },
                move || {
                    crate::log!("[sleep-wake] system woke up");
                    let app = wake_app.clone();
                    // Даём сети время подняться после wake
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    // Проверяем и переподключаем VPN если нужно
                    on_system_wake(&app);
                },
            );

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_connections,
            commands::save_connection,
            commands::delete_connection,
            commands::connect_vpn,
            commands::disconnect_vpn,
            commands::get_vpn_status,
            commands::get_all_vpn_statuses,
            commands::check_connection,
            commands::authenticate_sudo,
            commands::check_sudo_session,
            commands::check_helper_status,
            commands::get_helper_status_text,
            commands::get_labels,
            commands::open_url,
            commands::save_label,
            commands::delete_label,
            commands::import,
            commands::import_file,
            commands::export,
            commands::reset,
            commands::check_update,
            commands::apply_update,
            commands::check_keychain_access,
            commands::get_workspaces,
            commands::get_active_workspace_id,
            commands::create_workspace,
            commands::rename_workspace,
            commands::delete_workspace,
            commands::switch_workspace,
            commands::switch_tunnel_mode,
            commands::get_connection_history,
            commands::get_session_logs,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            match event {
                tauri::RunEvent::Exit => {
                    // Штатное отключение всех активных подключений
                    // Обёрнуто в catch_unwind — tokio runtime может быть уже мёртв
                    // к моменту application_will_terminate. Cleanup daemon восстановит
                    // VPN state при следующем запуске.
                    if let Some(manager) = app.try_state::<l2tp::manager::L2tpManager>() {
                        let active = manager.active_connections();
                        for id in active {
                            eprintln!("[exit] disconnecting: {}", id);
                            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                                // Создаём свой runtime — основной может быть уже остановлен
                                if let Ok(rt) = tokio::runtime::Runtime::new() {
                                    rt.block_on(manager.disconnect(&id))
                                } else {
                                    Err("Failed to create tokio runtime for cleanup".to_string())
                                }
                            }));
                            match result {
                                Ok(Ok(())) => eprintln!("[exit] disconnected: {}", id),
                                Ok(Err(e)) => eprintln!("[exit] disconnect failed for {}: {}", id, e),
                                Err(_) => eprintln!("[exit] disconnect panicked for {} (runtime likely shut down)", id),
                            }
                        }
                    }
                    // Глобальная очистка при выходе — убить все VPN-процессы
                    state::cleanup_all_vpn_state();
                }
                _ => {}
            }
        });
}

/// Обработчик wake — проверяет IPSec SA и переподключает если нужно.
/// Debounce: если проверка уже идёт — игнорируем повторный wake.
fn on_system_wake(app: &tauri::AppHandle) {
    static WAKE_IN_PROGRESS: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

    if WAKE_IN_PROGRESS.compare_exchange(false, true,
        std::sync::atomic::Ordering::SeqCst,
        std::sync::atomic::Ordering::SeqCst).is_err() {
        crate::log!("[sleep-wake] wake check already in progress, skipping");
        return;
    }

    let result = do_wake_check(app);
    WAKE_IN_PROGRESS.store(false, std::sync::atomic::Ordering::SeqCst);

    if let Err(e) = result {
        crate::log!("[sleep-wake] wake check error: {}", e);
    }
}

fn do_wake_check(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    // IOKit callback thread не в tokio контексте — создаём свой runtime
    // (или используем существующий, если вдруг вызван из tokio)
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| format!("Failed to create tokio runtime: {}", e))?;

    let manager = app.try_state::<l2tp::manager::L2tpManager>()
        .ok_or("no L2tpManager")?
        .inner()
        .clone();

    let active_ids = manager.active_connections();
    if active_ids.is_empty() {
        crate::log!("[sleep-wake] no active connections, nothing to check");
        return Ok(());
    }

    // Проверяем SA для каждого активного подключения
    let store = rt.block_on(store::load(app.config()));
    let sudo = app.state::<sudo::SudoSession>().inner().clone();
    let mut any_dead = false;

    for active_id in &active_ids {
        let conn_name = store.workspaces.iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == *active_id)
            .map(|c| c.service_name.clone());

        if let Some(name) = conn_name {
            crate::log!("[sleep-wake] checking SA for: {}", name);
            let alive = crate::l2tp::macos::check_ipsec_sa_alive(&sudo, &name);
            if !alive {
                crate::log!("[sleep-wake] SA dead for {}, will reconnect", name);
                any_dead = true;
            }
        }
    }

    if !any_dead {
        crate::log!("[sleep-wake] all SAs alive, nothing to do");
        return Ok(());
    }

    // Переподключаем мёртвые подключения
    for active_id in &active_ids {
        crate::log!("[sleep-wake] reconnecting {}", active_id);
        let _ = app.emit("vpn-status-changed", serde_json::json!({
            "id": active_id,
            "status": "reconnecting"
        }));
        if let Err(e) = rt.block_on(manager.disconnect(active_id)) {
            crate::log!("[sleep-wake] disconnect failed: {}", e);
        }
        std::thread::sleep(std::time::Duration::from_secs(1));
        match rt.block_on(manager.connect(active_id)) {
            Ok(()) => {
                crate::log!("[sleep-wake] reconnect success: {}", active_id);
                let _ = app.emit("vpn-status-changed", serde_json::json!({
                    "id": active_id,
                    "status": "connected"
                }));
            }
            Err(e) => {
                crate::log!("[sleep-wake] reconnect failed: {}: {}", active_id, e);
                let _ = app.emit("vpn-status-changed", serde_json::json!({
                    "id": active_id,
                    "status": "disconnected"
                }));
            }
        }
    }

    Ok(())
}
