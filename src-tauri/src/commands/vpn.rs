use crate::commands::utils::service_hash;
use crate::l2tp;
use crate::l2tp::VpnStatus;
use crate::sudo::SudoSession;
use crate::{keychain, log, store};
use tauri::State;

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn connect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
    sudo: State<'_, SudoSession>,
) -> Result<(), String> {
    log!("[connect_vpn] (macos) called for id={}", id);
    let sudo = sudo.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_handle.config());
        let conn = store
            .connections
            .iter()
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        let password = keychain::get_password(&conn.keychain_key)?;
        let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

        let hash = service_hash(&conn, &password, &shared_secret);
        let status = l2tp::get_vpn_status(&id);
        let needs_recreate =
            conn.service_hash.as_deref() != Some(hash.as_str()) || status == VpnStatus::Unknown;
        log!("[connect_vpn] needs_recreate={}", needs_recreate);

        if needs_recreate {
            l2tp::create_vpn_service(
                &sudo,
                &conn.name,
                &conn.server,
                &conn.username,
                &password,
                &shared_secret,
            )?;
            if let Some(c) = store.connections.iter_mut().find(|c| c.id == id) {
                c.service_hash = Some(hash);
            }
            store::save(&store)?;
            std::thread::sleep(std::time::Duration::from_millis(1500));
        }

        l2tp::connect_vpn(&conn.name)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn connect_vpn(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    log!("[connect_vpn] (windows) called for id={}", id);
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_handle.config());
        let conn = store
            .connections
            .iter()
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        let password = keychain::get_password(&conn.keychain_key)?;
        let shared_secret = keychain::get_password(&conn.shared_secret_key)?;
        let status = l2tp::get_vpn_status(&id);

        let hash = crate::commands::utils::service_hash(&conn, &password, &shared_secret);
        let needs_recreate =
            conn.service_hash.as_deref() != Some(hash.as_str()) || status == VpnStatus::Unknown;

        if needs_recreate {
            l2tp::create_vpn_service(
                &conn.name,
                &conn.server,
                &conn.username,
                &password,
                &shared_secret,
            )?;
            if let Some(c) = store.connections.iter_mut().find(|c| c.id == id) {
                c.service_hash = Some(hash);
            }
            store::save(&store)?;
            std::thread::sleep(std::time::Duration::from_millis(1500));
        }

        l2tp::connect_vpn(&conn.name, &conn.username, &password)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn disconnect_vpn(id: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    log!("[disconnect_vpn] called for id={}", id);
    tokio::task::spawn_blocking(move || {
        let store = store::load(app_handle.config());
        let conn = store
            .connections
            .iter()
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();
        l2tp::disconnect_vpn(&conn.name)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_vpn_status(id: String, app_handle: tauri::AppHandle) -> VpnStatus {
    tokio::task::spawn_blocking(move || -> VpnStatus {
        let store = store::load(app_handle.config());
        match store.connections.iter().find(|c| c.id == id) {
            Some(conn) => l2tp::get_vpn_status(&conn.name),
            None => VpnStatus::Unknown,
        }
    })
    .await
    .unwrap_or(VpnStatus::Unknown)
}
