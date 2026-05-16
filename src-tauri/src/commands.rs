use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

use crate::keychain;
use crate::l2tp;
use crate::store::{self, Connection};
use crate::{export_import, log};

#[cfg(target_os = "macos")]
use crate::sudo::SudoSession;

use crate::l2tp::VpnStatus;
use tauri_plugin_dialog::DialogExt;

fn service_hash(conn: &Connection, password: &str, shared_secret: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    conn.server.hash(&mut h);
    conn.username.hash(&mut h);
    conn.name.hash(&mut h);
    conn.send_all_traffic.hash(&mut h);
    password.hash(&mut h);
    shared_secret.hash(&mut h);
    format!("{:x}", h.finish())
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_connections(app_handle: tauri::AppHandle) -> Vec<Connection> {
    log!("[get_connections] called");
    tokio::task::spawn_blocking(move || store::load(app_handle.config()).connections)
        .await
        .unwrap_or_default()
}

#[derive(serde::Deserialize)]
pub struct SaveConnectionInput {
    pub id: Option<String>,
    pub server: String,
    pub username: String,
    pub password: String,
    pub shared_secret: String,
    pub send_all_traffic: bool,
    pub labels: HashMap<String, String>,
}

#[tauri::command]
pub async fn save_connection(
    app_handle: tauri::AppHandle,
    input: SaveConnectionInput,
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
            send_all_traffic: input.send_all_traffic,
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

// ─── VPN CONTROL ─────────────────────────────────────────────────────────────

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
                conn.send_all_traffic,
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

        let hash = service_hash(&conn, &password, &shared_secret);
        let needs_recreate = conn.service_hash.as_deref() != Some(hash.as_str());

        if needs_recreate {
            l2tp::create_vpn_service(
                &conn.name,
                &conn.server,
                &conn.username,
                &password,
                &shared_secret,
                conn.send_all_traffic,
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
pub async fn get_vpn_status(id: String, app_handle: tauri::AppHandle) -> l2tp::VpnStatus {
    tokio::task::spawn_blocking(move || {
        let store = store::load(app_handle.config());
        match store.connections.iter().find(|c| c.id == id) {
            Some(conn) => l2tp::get_vpn_status(&conn.name),
            None => l2tp::VpnStatus::Unknown,
        }
    })
    .await
    .unwrap_or(l2tp::VpnStatus::Unknown)
}

// ─── SUDO (только macOS) ─────────────────────────────────────────────────────

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn authenticate_sudo(
    password: String,
    sudo: State<'_, SudoSession>,
) -> Result<(), String> {
    log!("[authenticate_sudo] called");
    let sudo = sudo.inner().clone();
    tokio::task::spawn_blocking(move || sudo.authenticate(&password))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn check_sudo_session(sudo: State<'_, SudoSession>) -> bool {
    sudo.is_authenticated()
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn authenticate_sudo(_password: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_sudo_session() -> bool {
    true
}

// ─── LABELS ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_labels(app_handle: tauri::AppHandle) -> Vec<store::Label> {
    tokio::task::spawn_blocking(move || store::load(app_handle.config()).labels)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn save_label(
    app_handle: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<store::Label, String> {
    tokio::task::spawn_blocking(move || {
        let mut s = store::load(app_handle.config());
        let label = if let Some(l) = s.labels.iter_mut().find(|l| l.id == id) {
            l.name = name;
            l.clone()
        } else {
            let l = store::Label {
                id: id.clone(),
                name,
                built_in: false,
            };
            s.labels.push(l.clone());
            l
        };
        store::save(&s)?;
        Ok(label)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_label(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut s = store::load(app_handle.config());
        let label = s
            .labels
            .iter()
            .find(|l| l.id == id)
            .ok_or("Метка не найдена")?;
        if label.built_in {
            return Err("Нельзя удалить встроенную метку".into());
        }
        s.labels.retain(|l| l.id != id);
        for conn in &mut s.connections {
            conn.labels.remove(&id);
        }
        store::save(&s)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || open::that(url).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

// ─── EXPORT / IMPORT ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_config_dialog(
    app_handle: tauri::AppHandle,
    password: String,
) -> Result<bool, String> {
    log!("[export_config_dialog] called");

    let bytes = tokio::task::spawn_blocking({
        let app_handle = app_handle.clone();
        move || {
            let store = store::load(app_handle.config());
            export_import::export_config(&store, &password)
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    let path = tokio::task::spawn_blocking({
        let app_handle = app_handle.clone();
        move || {
            app_handle
                .dialog()
                .file()
                .set_file_name("backup.l2tphub.conf")
                .add_filter("L2TP Hub Config", &["conf"])
                .blocking_save_file()
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_buf = p.as_path().ok_or("Не удалось получить путь")?.to_path_buf();
            tokio::fs::write(&path_buf, &bytes)
                .await
                .map_err(|e| format!("Ошибка записи файла: {}", e))?;
            log!("[export_config_dialog] Saved to {:?}", path_buf);
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
pub async fn import_config_dialog(
    app_handle: tauri::AppHandle,
    password: String,
) -> Result<bool, String> {
    log!("[import_config_dialog] called");

    let path = tokio::task::spawn_blocking({
        let app_handle = app_handle.clone();
        move || {
            app_handle
                .dialog()
                .file()
                .add_filter("L2TP Hub Config", &["conf"])
                .blocking_pick_file()
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_buf = p.as_path().ok_or("Не удалось получить путь")?.to_path_buf();
            let data = tokio::fs::read(&path_buf)
                .await
                .map_err(|e| format!("Ошибка чтения файла: {}", e))?;

            tokio::task::spawn_blocking(move || {
                let (connections, labels) = export_import::import_config(&data, &password)?;
                let mut store = store::load(app_handle.config());

                for imported_conn in connections {
                    if let Some(idx) = store
                        .connections
                        .iter()
                        .position(|c| c.id == imported_conn.id)
                    {
                        store.connections[idx] = imported_conn;
                    } else {
                        store.connections.push(imported_conn);
                    }
                }

                for imported_label in labels {
                    if imported_label.built_in {
                        continue;
                    }
                    if let Some(idx) = store.labels.iter().position(|l| l.id == imported_label.id) {
                        store.labels[idx] = imported_label;
                    } else {
                        store.labels.push(imported_label);
                    }
                }

                store::save(&store)
            })
            .await
            .map_err(|e| e.to_string())??;

            log!("[import_config_dialog] done");
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
pub async fn reset_all(app_handle: tauri::AppHandle) -> Result<(), String> {
    log!("[reset_all] called");
    tokio::task::spawn_blocking(move || {
        let mut store = store::load(app_handle.config());
        // удаляем пароли из keychain
        for conn in &store.connections {
            let _ = keychain::delete_password(&conn.keychain_key);
            let _ = keychain::delete_password(&conn.shared_secret_key);
        }
        // записываем чистый стор
        store::save(&store::Store::default())
    })
    .await
    .map_err(|e| e.to_string())?
}
