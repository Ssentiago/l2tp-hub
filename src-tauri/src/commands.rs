use tauri::State;
use uuid::Uuid;

use crate::keychain;
use crate::l2tp;
use crate::store::{self, Connection};

#[cfg(target_os = "macos")]
use crate::sudo::SudoSession;

// Универсальная функция логирования
fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;

    // Выбор пути в зависимости от ОС, чтобы избежать паники при unwrap
    let path = if cfg!(target_os = "windows") {
        "C:\\l2tp-hub-debug.log"
    } else {
        "/tmp/l2tp-hub-debug.log"
    };

    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "[{}] {}", timestamp, msg);
    }
}

fn service_hash(conn: &Connection, password: &str, shared_secret: &str) -> String {
    log(&format!("[service_hash] Start for conn: {}, user: {}", conn.name, conn.username));
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    conn.server.hash(&mut h);
    conn.username.hash(&mut h);
    conn.name.hash(&mut h);
    conn.send_all_traffic.hash(&mut h);
    password.hash(&mut h);
    shared_secret.hash(&mut h);
    let result = format!("{:x}", h.finish());
    log(&format!("[service_hash] Result hash: {}", result));
    result
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_connections(app_handle: tauri::AppHandle) -> Vec<Connection> {
    log("[get_connections] Entering function");
    let connections = store::load(app_handle.config()).connections;
    log(&format!("[get_connections] Loaded {} connections", connections.len()));
    connections
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

#[tauri::command]
pub fn save_connection(
    app_handle: tauri::AppHandle,
    input: SaveConnectionInput,
) -> Result<Connection, String> {
    log(&format!(
        "[save_connection] Called for name: {}, server: {}, pass_len: {}, secret_len: {}",
        input.name, input.server, input.password.len(), input.shared_secret.len()
    ));

    let mut store = store::load(app_handle.config());
    let id = input.id.clone().unwrap_or_else(|| {
        let new_id = Uuid::new_v4().to_string();
        log(&format!("[save_connection] Generated new UUID: {}", new_id));
        new_id
    });

    let keychain_key = format!("password_{}", id);
    let shared_secret_key = format!("shared_{}", id);

    if !input.password.is_empty() {
        log(&format!("[save_connection] Setting password in keychain for {}", keychain_key));
        keychain::set_password(&keychain_key, &input.password)?;
    }

    if !input.shared_secret.is_empty() {
        log(&format!("[save_connection] Setting shared secret in keychain for {}", shared_secret_key));
        keychain::set_password(&shared_secret_key, &input.shared_secret)?;
    }

    let conn = Connection {
        id: id.clone(),
        name: input.name.clone(), // Исправлено: имя берем из инпута
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

    log(&format!("[save_connection] Updating store for ID: {}", id));
    if let Some(idx) = store.connections.iter().position(|c| c.id == id) {
        log(&format!("[save_connection] Existing connection found at index {}, updating", idx));
        store.connections[idx] = conn.clone();
    } else {
        log("[save_connection] New connection, pushing to store");
        store.connections.push(conn.clone());
    }

    store::save(&store).map_err(|e| {
        log(&format!("[save_connection] ERROR saving store: {}", e));
        e
    })?;

    log("[save_connection] Success");
    Ok(conn)
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn delete_connection(
    app_handle: tauri::AppHandle,
    id: String,
    sudo: State<SudoSession>,
) -> Result<(), String> {
    log(&format!("[delete_connection] Called for ID: {} (macOS)", id));
    let mut store = store::load(app_handle.config());

    if let Some(conn) = store.connections.iter().find(|c| c.id == id) {
        log(&format!("[delete_connection] Found connection {}, deleting passwords and service", conn.name));
        let _ = keychain::delete_password(&conn.keychain_key);
        let _ = keychain::delete_password(&conn.shared_secret_key);
        let _ = l2tp::delete_vpn_service(&sudo, &conn.name);
    } else {
        log("[delete_connection] Warning: Connection ID not found in store");
    }

    store.connections.retain(|c| c.id != id);
    store::save(&store).map_err(|e| {
        log(&format!("[delete_connection] ERROR: {}", e));
        e
    })?;

    log("[delete_connection] Success");
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn delete_connection(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    log(&format!("[delete_connection] Called for ID: {} (Windows)", id));
    let mut store = store::load(app_handle.config());

    if let Some(conn) = store.connections.iter().find(|c| c.id == id) {
        log(&format!("[delete_connection] Found connection {}, cleaning up", conn.name));
        let _ = keychain::delete_password(&conn.keychain_key);
        let _ = keychain::delete_password(&conn.shared_secret_key);
        let _ = l2tp::delete_vpn_service(&conn.name);
    }

    store.connections.retain(|c| c.id != id);
    store::save(&store)?;
    log("[delete_connection] Success");
    Ok(())
}

// ─── VPN CONTROL ─────────────────────────────────────────────────────────────

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn connect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
    sudo: State<SudoSession>,
) -> Result<(), String> {
    log(&format!("[connect_vpn] Called for ID: {} (macOS)", id));
    let mut store = store::load(app_handle.config());
    let conn = store.connections.iter().find(|c| c.id == id)
        .ok_or_else(|| {
            log("[connect_vpn] ERROR: Connection not found");
            "Подключение не найдено".to_string()
        })?.clone();

    log("[connect_vpn] Fetching credentials from keychain");
    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    let hash = service_hash(&conn, &password, &shared_secret);
    let needs_recreate = conn.service_hash.as_deref() != Some(hash.as_str());
    log(&format!("[connect_vpn] Needs recreate: {}", needs_recreate));

    if needs_recreate {
        log("[connect_vpn] Recreating VPN service...");
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
        log("[connect_vpn] Service recreated and store updated, sleeping 1500ms");
        std::thread::sleep(std::time::Duration::from_millis(1500));
    }

    log(&format!("[connect_vpn] Calling l2tp::connect_vpn for {}", conn.name));
    l2tp::connect_vpn(&conn.name)
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn connect_vpn(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    log(&format!("[connect_vpn] Called for ID: {} (Windows)", id));
    let mut store = store::load(app_handle.config());
    let conn = store.connections.iter().find(|c| c.id == id)
        .ok_or_else(|| {
            log("[connect_vpn] ERROR: Connection not found");
            "Подключение не найдено".to_string()
        })?.clone();

    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    if shared_secret.is_empty() {
        log("[connect_vpn] WARNING: Shared secret is empty");
    }

    let hash = service_hash(&conn, &password, &shared_secret);
    let needs_recreate = conn.service_hash.as_deref() != Some(hash.as_str());
    log(&format!("[connect_vpn] Needs recreate: {}", needs_recreate));

    if needs_recreate {
        log("[connect_vpn] Recreating Windows VPN profile...");
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

    log(&format!("[connect_vpn] Executing rasdial for {}", conn.name));
    l2tp::connect_vpn(&conn.name)
}

#[tauri::command]
pub fn disconnect_vpn(id: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    log(&format!("[disconnect_vpn] Called for ID: {}", id));
    let store = store::load(app_handle.config());
    let conn = store.connections.iter().find(|c| c.id == id)
        .ok_or_else(|| {
            log("[disconnect_vpn] ERROR: Connection not found");
            "Подключение не найдено".to_string()
        })?;

    log(&format!("[disconnect_vpn] Calling l2tp::disconnect_vpn for {}", conn.name));
    l2tp::disconnect_vpn(&conn.name)
}

#[tauri::command]
pub fn get_vpn_status(id: String, app_handle: tauri::AppHandle) -> l2tp::VpnStatus {
    log(&format!("[get_vpn_status] Checking status for ID: {}", id));
    let store = store::load(app_handle.config());
    match store.connections.iter().find(|c| c.id == id) {
        Some(conn) => {
            let status = l2tp::get_vpn_status(&conn.name);
            log(&format!("[get_vpn_status] Status for {}: {:?}", conn.name, status));
            status
        },
        None => {
            log("[get_vpn_status] Connection not found, returning Unknown");
            l2tp::VpnStatus::Unknown
        },
    }
}

// ─── SUDO (только macOS) ─────────────────────────────────────────────────────

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn authenticate_sudo(password: String, sudo: State<SudoSession>) -> Result<(), String> {
    log("[authenticate_sudo] Attempting sudo authentication");
    let result = sudo.authenticate(&password);
    log(&format!("[authenticate_sudo] Result: {:?}", result));
    result
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn check_sudo_session(sudo: State<SudoSession>) -> bool {
    let auth = sudo.is_authenticated();
    log(&format!("[check_sudo_session] Status: {}", auth));
    auth
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn authenticate_sudo(_password: String) -> Result<(), String> {
    log("[authenticate_sudo] Called on Windows (No-op)");
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_sudo_session() -> bool {
    log("[check_sudo_session] Called on Windows (Always true)");
    true
}