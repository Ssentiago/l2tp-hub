use crate::l2tp;
use crate::models::connection::Connection;
use crate::models::connection_payload::ConnectionPayload;
use crate::sudo::SudoSession;
use crate::{keychain, log, store};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_connections(app_handle: tauri::AppHandle) -> Vec<Connection> {
    log!("[get_connections] called");
    tokio::task::spawn_blocking(move || store::load(app_handle.config()).connections)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn save_connection(
    app_handle: tauri::AppHandle,
    input: ConnectionPayload,
) -> Result<Connection, String> {
    log!("[save_connection] called, id={:?}", input.id);
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_handle.config());

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
            server: input.server,
            username: input.username,
            keychain_key,
            shared_secret_key,
            service_hash: None,
            labels: input.labels,
        };

        if let Some(idx) = store.connections.iter().position(|c| c.id == id) {
            store.connections[idx] = conn.clone();
        } else {
            store.connections.push(conn.clone());
        }

        store::save(&store)?;
        log!("[save_connection] success");
        Ok(conn)
    })
    .await
    .map_err(|e| e.to_string())?
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
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_handle.config());
        if let Some(conn) = store.connections.iter().find(|c| c.id == id) {
            let _ = keychain::delete_password(&conn.keychain_key);
            let _ = keychain::delete_password(&conn.shared_secret_key);
            let _ = l2tp::delete_vpn_service(&sudo, &conn.name);
        }
        store.connections.retain(|c| c.id != id);
        store::save(&store)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn delete_connection(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    log!("[delete_connection] (windows) called for id={}", id);
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_handle.config());
        if let Some(conn) = store.connections.iter().find(|c| c.id == id) {
            let _ = keychain::delete_password(&conn.keychain_key);
            let _ = keychain::delete_password(&conn.shared_secret_key);
            let _ = l2tp::delete_vpn_service(&conn.name);
        }
        store.connections.retain(|c| c.id != id);
        store::save(&store)
    })
    .await
    .map_err(|e| e.to_string())?
}
