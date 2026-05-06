use tauri::State;
use uuid::Uuid;

use crate::keychain;
use crate::l2tp;
use crate::store::{self, Connection};

#[cfg(target_os = "macos")]
use crate::sudo::SudoSession;

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

// ─── CRUD ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_connections(app_handle: tauri::AppHandle) -> Vec<Connection> {
    store::load(app_handle.config()).connections
}

#[derive(serde::Deserialize)]
pub struct SaveConnectionInput {
    pub id: Option<String>,
    pub name: String,
    pub server: String,
    pub username: String,
    pub password: String,
    pub shared_secret: String,
    pub company: String,
    pub branch: String,
    pub tags: Vec<String>,
    pub description: String,
    pub group: String,
    pub priority: u8,
    pub send_all_traffic: bool,
}

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\l2tp-hub-debug.log")
        .unwrap();
    writeln!(f, "{}", msg).unwrap();
}

#[tauri::command]
pub fn save_connection(
    app_handle: tauri::AppHandle,
    input: SaveConnectionInput,
) -> Result<Connection, String> {
    let mut store = store::load(app_handle.config());

    let id = input.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let keychain_key = format!("password_{}", id);
    let shared_secret_key = format!("shared_{}", id);

    keychain::set_password(&keychain_key, &input.password)?;
    keychain::set_password(&shared_secret_key, &input.shared_secret)?;

    let conn = Connection {
        id: id.clone(),
        name: id.clone(),
        server: input.server,
        username: input.username,
        keychain_key,
        shared_secret_key,
        company: input.company,
        branch: input.branch,
        tags: input.tags,
        description: input.description,
        group: input.group,
        priority: input.priority,
        send_all_traffic: input.send_all_traffic,
        service_hash: None,
    };

    if let Some(idx) = store.connections.iter().position(|c| c.id == id) {
        store.connections[idx] = conn.clone();
    } else {
        store.connections.push(conn.clone());
    }

    store::save(&store)?;
    Ok(conn)
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn delete_connection(
    app_handle: tauri::AppHandle,
    id: String,
    sudo: State<SudoSession>,
) -> Result<(), String> {
    let mut store = store::load(app_handle.config());
    if let Some(conn) = store.connections.iter().find(|c| c.id == id) {
        let _ = keychain::delete_password(&conn.keychain_key);
        let _ = keychain::delete_password(&conn.shared_secret_key);
        let _ = l2tp::delete_vpn_service(&sudo, &conn.name);
    }
    store.connections.retain(|c| c.id != id);
    store::save(&store)
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn delete_connection(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let mut store = store::load(app_handle.config());
    if let Some(conn) = store.connections.iter().find(|c| c.id == id) {
        let _ = keychain::delete_password(&conn.keychain_key);
        let _ = keychain::delete_password(&conn.shared_secret_key);
        let _ = l2tp::delete_vpn_service(&conn.name);
    }
    store.connections.retain(|c| c.id != id);
    store::save(&store)
}

// ─── VPN CONTROL ─────────────────────────────────────────────────────────────

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn connect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
    sudo: State<SudoSession>,
) -> Result<(), String> {
    let mut store = store::load(app_handle.config());
    let conn = store.connections.iter().find(|c| c.id == id)
        .ok_or("Подключение не найдено")?.clone();

    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    let hash = service_hash(&conn, &password, &shared_secret);
    let needs_recreate = conn.service_hash.as_deref() != Some(hash.as_str());

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
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn connect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let mut store = store::load(app_handle.config());
    let conn = store.connections.iter().find(|c| c.id == id)
        .ok_or("Подключение не найдено")?.clone();

    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    if shared_secret.is_empty() {
        log("Shared secret не найден в keychain".to_string())
    }

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

    l2tp::connect_vpn(&conn.name)
}

#[tauri::command]
pub fn disconnect_vpn(id: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let store = store::load(app_handle.config());
    let conn = store.connections.iter().find(|c| c.id == id)
        .ok_or("Подключение не найдено")?;
    l2tp::disconnect_vpn(&conn.name)
}

#[tauri::command]
pub fn get_vpn_status(id: String, app_handle: tauri::AppHandle) -> l2tp::VpnStatus {
    let store = store::load(app_handle.config());
    match store.connections.iter().find(|c| c.id == id) {
        Some(conn) => l2tp::get_vpn_status(&conn.name),
        None => l2tp::VpnStatus::Unknown,
    }
}

// ─── SUDO (только macOS) ─────────────────────────────────────────────────────

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn authenticate_sudo(password: String, sudo: State<SudoSession>) -> Result<(), String> {
    sudo.authenticate(&password)
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn check_sudo_session(sudo: State<SudoSession>) -> bool {
    sudo.is_authenticated()
}

// На Windows sudo не нужен — UAC решает при старте приложения
#[tauri::command]
#[cfg(target_os = "windows")]
pub fn authenticate_sudo(_password: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_sudo_session() -> bool {
    true
}