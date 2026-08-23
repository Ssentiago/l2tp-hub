use crate::l2tp::VpnStatus;
use crate::l2tp::manager::L2tpManager;
use crate::log;
use crate::store;
use tauri::{Emitter, State};

// ---------------------------------------------------------------------------
// macOS — всё через L2tpManager
// ---------------------------------------------------------------------------

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn connect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
    manager: State<'_, L2tpManager>,
) -> Result<(), String> {
    log!("[connect_vpn] (macos) id={}", id);
    let manager = manager.inner().clone();
    let id_clone = id.clone();
    let app = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || manager.connect(&id_clone))
        .await
        .map_err(|e| e.to_string())?;

    match &result {
        Ok(()) => {
            // Читаем connected_since из store для фронта
            let connected_since = {
                let store = store::load(app.config());
                store.workspaces.iter()
                    .flat_map(|ws| ws.connections.iter())
                    .find(|c| c.id == id)
                    .and_then(|c| c.connected_since)
            };
            log!("[connect_vpn] success, emitting connected event (connected_since={:?})", connected_since);
            let _ = app.emit("vpn-status-changed", serde_json::json!({
                "id": id,
                "status": "connected",
                "connected_since": connected_since
            }));
        }
        Err(e) => {
            log!("[connect_vpn] failed: {}, emitting disconnected event", e);
            let _ = app.emit("vpn-status-changed", serde_json::json!({ "id": id, "status": "disconnected" }));
        }
    }
    result
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn disconnect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
    manager: State<'_, L2tpManager>,
) -> Result<(), String> {
    log!("[disconnect_vpn] (macos) id={}", id);
    let manager = manager.inner().clone();
    let id_clone = id.clone();
    let app = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || manager.disconnect(&id_clone))
        .await
        .map_err(|e| e.to_string())?;

    log!("[disconnect_vpn] emitting disconnected event");
    let _ = app.emit("vpn-status-changed", serde_json::json!({ "id": id, "status": "disconnected" }));
    result
}

// ---------------------------------------------------------------------------
// Windows — заглушки (не трогаем)
// ---------------------------------------------------------------------------

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn connect_vpn(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    log!("[connect_vpn] (windows) called for id={}", id);
    let app_clone = app_handle.clone();
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_clone.config());
        let conn = store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        let password = crate::keychain::get_password(&conn.keychain_key)?;
        let shared_secret = crate::keychain::get_password(&conn.shared_secret_key)?;

        l2tp::create_vpn_service(
            &conn.name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
        )?;

        l2tp::connect_vpn(&conn.name, &conn.username, &password)?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn disconnect_vpn(id: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    log!("[disconnect_vpn] (windows) id={}", id);
    let app_clone = app_handle.clone();
    tokio::task::spawn_blocking(move || {
        let store = store::load(app_clone.config());
        let conn = store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();
        l2tp::disconnect_vpn(&conn.name)?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------------------------------------------------------------------------
// Cross-platform status
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn get_vpn_status(
    id: String,
    manager: State<'_, L2tpManager>,
) -> Result<VpnStatus, String> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || {
        let store = store::load(manager.app_config());
        match store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
        {
            Some(_conn) => manager.status(&id),
            None => VpnStatus::Unknown,
        }
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_vpn_statuses(
    manager: State<'_, L2tpManager>,
) -> Result<std::collections::HashMap<String, VpnStatus>, String> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || {
        manager.all_statuses()
    })
    .await
    .map_err(|e| e.to_string())
}
