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
    let result = manager.connect(&id_clone).await;

    match &result {
        Ok(()) => {
            // Читаем connected_since из store для фронта
            let store = store::load(app.config()).await;
            let connected_since = store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == id)
                .and_then(|c| c.connected_since);

            log!("[connect_vpn] success, emitting connected event (connected_since={:?})", connected_since);
            let _ = app.emit("vpn-status-changed", serde_json::json!({
                "id": id,
                "status": "connected",
                "connected_since": connected_since
            }));

            // При multi-connection xl2tpd рестартится — все ppp пересоздаются.
            // Re-emit "connected" для ВСЕХ активных подключений чтобы UI не показал
            // ложное "disconnected" для существующих connection'ов.
            let active_ids = manager.active_connections();
            if active_ids.len() > 1 {
                log!("[connect_vpn] multi-connection: re-emitting connected for {} active connections", active_ids.len());
                for active_id in &active_ids {
                    if *active_id != id {
                        let active_since = store.workspaces.iter()
                            .flat_map(|ws| ws.connections.iter())
                            .find(|c| c.id == *active_id)
                            .and_then(|c| c.connected_since);
                        let _ = app.emit("vpn-status-changed", serde_json::json!({
                            "id": active_id,
                            "status": "connected",
                            "connected_since": active_since
                        }));
                    }
                }
            }
        }
        Err(e) => {
            log!("[connect_vpn] failed: {}, emitting disconnected event", e);
            // Сохраняем логи неудачного подключения
            let store = store::load(app.config()).await;
            if let Some(conn) = store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == id)
            {
                crate::l2tp::logs::save_session_logs(
                    &id,
                    &conn.service_name,
                    &conn.server,
                    conn.connected_since,
                    Some(e),
                );
            }
            let _ = app.emit("vpn-status-changed", serde_json::json!({
                "id": id,
                "status": "disconnected",
                "error": e
            }));
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
    let result = manager.disconnect(&id_clone).await;

    log!("[disconnect_vpn] emitting disconnected event");
    let _ = app.emit("vpn-status-changed", serde_json::json!({ "id": id, "status": "disconnected" }));

    // При multi-connection disconnect xl2tpd рестартится — re-emit "connected" для оставшихся
    let active_ids = manager.active_connections();
    if !active_ids.is_empty() {
        log!("[disconnect_vpn] re-emitting connected for {} remaining connections", active_ids.len());
        let store = store::load(app.config()).await;
        for active_id in &active_ids {
            let active_since = store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == *active_id)
                .and_then(|c| c.connected_since);
            let _ = app.emit("vpn-status-changed", serde_json::json!({
                "id": active_id,
                "status": "connected",
                "connected_since": active_since
            }));
        }
    }
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
            &conn.service_name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
        )?;

        l2tp::connect_vpn(&conn.service_name, &conn.username, &password)?;
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
        l2tp::disconnect_vpn(&conn.service_name)?;
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
    let store = store::load(manager.app_config()).await;
    let has_conn = store.workspaces.iter()
        .flat_map(|ws| ws.connections.iter())
        .any(|c| c.id == id);
    if has_conn {
        Ok(manager.status(&id).await)
    } else {
        Ok(VpnStatus::Unknown)
    }
}

#[tauri::command]
pub async fn get_all_vpn_statuses(
    manager: State<'_, L2tpManager>,
) -> Result<std::collections::HashMap<String, VpnStatus>, String> {
    let manager = manager.inner().clone();
    Ok(manager.all_statuses().await)
}

// ---------------------------------------------------------------------------
// Split tunnel commands
// ---------------------------------------------------------------------------

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn switch_tunnel_mode(
    id: String,
    new_mode: String,
    manager: State<'_, L2tpManager>,
) -> Result<(), String> {
    log!("[switch_tunnel_mode] id={}, new_mode={}", id, new_mode);
    let manager = manager.inner().clone();

    let store = store::load(manager.app_config()).await;
    let conn = store.workspaces.iter()
        .flat_map(|ws| ws.connections.iter())
        .find(|c| c.id == id)
        .ok_or("Подключение не найдено")?
        .clone();

    // Проверяем что подключение активно
    if manager.status(&id).await != VpnStatus::Connected {
        return Err("Подключение не активно".to_string());
    }

    let sudo = manager.sudo();
    let original_gw = crate::l2tp::get_default_gateway()?;
    let (original_iface, _) = crate::l2tp::macos::capture_physical_route()
        .unwrap_or_else(|_| (String::new(), original_gw.clone()));

    crate::l2tp::macos::switch_tunnel_mode(
        sudo,
        &conn.server,
        &original_iface,
        &original_gw,
        &conn.tunnel_mode,
        &new_mode,
        &conn.split_routes,
    )?;

    // Обновляем tunnel_mode в store
    let mut store = store::load(manager.app_config()).await;
    for ws in &mut store.workspaces {
        if let Some(c) = ws.connections.iter_mut().find(|c| c.id == id) {
            c.tunnel_mode = new_mode.clone();
        }
    }
    store::save(&store).await?;

    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn switch_tunnel_mode(_id: String, _new_mode: String) -> Result<(), String> {
    Err("Split tunneling не поддерживается на Windows".to_string())
}

// ---------------------------------------------------------------------------
// Connection Logs + History
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn get_connection_history(
    id: String,
) -> Result<Vec<crate::l2tp::logs::SessionMeta>, String> {
    Ok(crate::l2tp::logs::get_connection_history(&id))
}

#[tauri::command]
pub async fn get_session_logs(
    id: String,
    timestamp: i64,
) -> Result<crate::l2tp::logs::SessionLogs, String> {
    crate::l2tp::logs::get_session_logs(&id, timestamp)
        .ok_or_else(|| "Сессия не найдена".to_string())
}
