use l2tp_hub_core::error::{AppError, AppErrorCode};
use crate::l2tp;
use crate::models::connection::Connection;
use crate::models::connection_payload::ConnectionPayload;
#[cfg(target_os = "macos")]
use crate::sudo::SudoSession;
use crate::{keychain, log, store};
#[cfg(target_os = "macos")]
use tauri::State;
use uuid::Uuid;

#[tauri::command]
#[specta::specta]
pub async fn get_connections(__app_handle: tauri::AppHandle) -> Vec<Connection> {
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
#[specta::specta]
pub async fn save_connection(
    _app_handle: tauri::AppHandle,
    input: ConnectionPayload,
) -> Result<Connection, AppError> {
    log!("[save_connection] called, id={:?}", input.id);
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

    let conn_id = id.clone();
    let state = crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            let ws = s.active_workspace_mut();
            // При обновлении сохраняем статистику и service_name
            let conn = if let Some(idx) = ws.connections.iter().position(|c| c.id == conn_id) {
                let existing = &ws.connections[idx];
                Connection {
                    id: conn_id.clone(),
                    service_name: existing.service_name.clone(),
                    display_name: input.display_name,
                    server: input.server,
                    username: input.username,
                    keychain_key,
                    shared_secret_key,
                    service_hash: existing.service_hash.clone(),
                    labels: input.labels,
                    connect_count: existing.connect_count,
                    connected_since: existing.connected_since,
                    last_connected_at: existing.last_connected_at,
                    last_disconnected_at: existing.last_disconnected_at,
                    tunnel_mode: input.tunnel_mode,
                    split_routes: input.split_routes,
                }
            } else {
                Connection {
                    id: conn_id.clone(),
                    service_name: conn_id.clone(),
                    display_name: input.display_name,
                    server: input.server,
                    username: input.username,
                    keychain_key,
                    shared_secret_key,
                    labels: input.labels,
                    tunnel_mode: input.tunnel_mode,
                    split_routes: input.split_routes,
                    ..Default::default()
                }
            };

            if let Some(idx) = ws.connections.iter().position(|c| c.id == conn_id) {
                ws.connections[idx] = conn;
            } else {
                ws.connections.push(conn);
            }
            Ok(())
        })
        .await?;

    let conn = state
        .find_connection(&id)
        .cloned()
        .ok_or(AppError::new(AppErrorCode::ConnectionNotFound))?;
    log!("[save_connection] success");
    Ok(conn)
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "macos")]
pub async fn delete_connection(
    _app_handle: tauri::AppHandle,
    id: String,
    sudo: State<'_, SudoSession>,
) -> Result<(), AppError> {
    log!("[delete_connection] (macos) called for id={}", id);
    let sudo = sudo.inner().clone();

    // Keychain entries and the VPN service are removed outside the store
    // transaction; their keys depend only on the connection id
    let snapshot = store::load(&crate::DB_POOL.get().expect("pool")).await;
    if let Some(conn) = snapshot.find_connection(&id) {
        let _ = keychain::delete_password(&conn.keychain_key);
        let _ = keychain::delete_password(&conn.shared_secret_key);
        let _ = l2tp::delete_vpn_service(&sudo, &conn.service_name);
    }

    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            s.active_workspace_mut().connections.retain(|c| c.id != id);
            Ok(())
        })
        .await
        .map(|_| ())
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "windows")]
pub async fn delete_connection(_app_handle: tauri::AppHandle, id: String) -> Result<(), AppError> {
    log!("[delete_connection] (windows) called for id={}", id);

    // Keychain entries and the VPN service are removed outside the store
    // transaction; their keys depend only on the connection id
    let snapshot = store::load(&crate::DB_POOL.get().expect("pool")).await;
    if let Some(conn) = snapshot.find_connection(&id) {
        let _ = keychain::delete_password(&conn.keychain_key);
        let _ = keychain::delete_password(&conn.shared_secret_key);
        let _ = l2tp::delete_vpn_service(&conn.service_name);
    }

    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            s.active_workspace_mut().connections.retain(|c| c.id != id);
            Ok(())
        })
        .await
        .map(|_| ())
}
