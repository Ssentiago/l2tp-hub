use crate::l2tp;
use crate::models::connection::Connection;
use crate::models::connection_payload::ConnectionPayload;
use crate::sudo::SudoSession;
use crate::tray;
use crate::{keychain, log, store};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_connections(app_handle: tauri::AppHandle) -> Vec<Connection> {
    log!("[get_connections] called");
    let pool = crate::DB_POOL.get().expect("DB pool not initialized");
    let ws_id = crate::db::active_workspace_id(pool).await.unwrap_or_default();
    if ws_id.is_empty() {
        return vec![];
    }
    crate::db::connections_for_workspace(pool, &ws_id)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn save_connection(
    app_handle: tauri::AppHandle,
    input: ConnectionPayload,
) -> Result<Connection, String> {
    log!("[save_connection] called, id={:?}", input.id);
    let app_clone = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_clone.config());

        let id = input
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let keychain_key = format!("password_{}", id);
        let shared_secret_key = format!("shared_{}", id);

        if !input.password.is_empty() {
            keychain::set_password(&keychain_key, &input.password)?;
        }
        if !input.shared_secret.is_empty() {
            keychain::set_password(&shared_secret_key, &input.shared_secret)?;
        }

        let conn = Connection {
            id: id.clone(),
            name: id.clone(),
            display_name: input.display_name,
            server: input.server,
            username: input.username,
            keychain_key,
            shared_secret_key,
            labels: input.labels,
            ..Default::default()
        };

        let ws = store.active_workspace_mut();
        if let Some(idx) = ws.connections.iter().position(|c| c.id == id) {
            ws.connections[idx] = conn.clone();
        } else {
            ws.connections.push(conn.clone());
        }

        store::save(&store)?;
        log!("[save_connection] success");
        Ok(conn)
    })
    .await
    .map_err(|e| e.to_string())?;

    let _ = tray::refresh_tray(&app_handle);
    result
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn delete_connection(
    app_handle: tauri::AppHandle,
    id: String,
    sudo: State<'_, SudoSession>,
) -> Result<(), String> {
    log!("[delete_connection] (macos) called for id={}", id);
    let sudo = sudo.inner().clone();
    let app_clone = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_clone.config());
        let ws = store.active_workspace_mut();
        if let Some(conn) = ws.connections.iter().find(|c| c.id == id) {
            let _ = keychain::delete_password(&conn.keychain_key);
            let _ = keychain::delete_password(&conn.shared_secret_key);
            let _ = l2tp::delete_vpn_service(&sudo, &conn.name);
        }
        ws.connections.retain(|c| c.id != id);
        store::save(&store)
    })
    .await
    .map_err(|e| e.to_string())?;

    let _ = tray::refresh_tray(&app_handle);
    result
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn delete_connection(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    log!("[delete_connection] (windows) called for id={}", id);
    let app_clone = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_clone.config());
        let ws = store.active_workspace_mut();
        if let Some(conn) = ws.connections.iter().find(|c| c.id == id) {
            let _ = keychain::delete_password(&conn.keychain_key);
            let _ = keychain::delete_password(&conn.shared_secret_key);
            let _ = l2tp::delete_vpn_service(&conn.name);
        }
        ws.connections.retain(|c| c.id != id);
        store::save(&store)
    })
    .await
    .map_err(|e| e.to_string())?;

    let _ = tray::refresh_tray(&app_handle);
    result
}
