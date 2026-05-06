use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri::path::BaseDirectory;
use crate::app_handle_storage::get_app_handle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub server: String,
    pub username: String,
    pub keychain_key: String,
    pub company: String,
    pub branch: String,
    pub tags: Vec<String>,
    pub description: String,
    pub group: String,
    pub priority: u8,
    pub shared_secret_key: String,
    pub send_all_traffic: bool,
    pub service_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Store {
    pub connections: Vec<Connection>,
}

// Вспомогательная функция логирования
fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    use chrono::Local;

    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\l2tp-hub-debug.log") {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "[{}] {}", timestamp, msg);
    }
}

fn store_path() -> PathBuf {
    log("[store_path] Resolving application handle");
    let app = get_app_handle();

    let path = app.path().resolve("connections.json", BaseDirectory::AppData)
        .expect("Не удалось вычислить путь");

    log(&format!("[store_path] Resolved path: {:?}", path));
    path
}

pub fn load(_config: &tauri::Config) -> Store {
    log("[load] Starting to load store");
    let path = store_path();

    if !path.exists() {
        log("[load] Store file does not exist, returning default Store");
        return Store::default();
    }

    log("[load] Reading file content");
    match fs::read_to_string(&path) {
        Ok(data) => {
            log(&format!("[load] File read successfully ({} bytes)", data.len()));
            match serde_json::from_str::<Store>(&data) {
                Ok(store) => {
                    log(&format!("[load] JSON parsed successfully. Connections count: {}", store.connections.len()));
                    store
                },
                Err(e) => {
                    log(&format!("[load] ERROR: Failed to parse JSON: {}", e));
                    Store::default()
                }
            }
        },
        Err(e) => {
            log(&format!("[load] ERROR: Failed to read file: {}", e));
            Store::default()
        }
    }
}

pub fn save(store: &Store) -> Result<(), String> {
    log(&format!("[save] Starting save process. Connections to save: {}", store.connections.len()));
    let path = store_path();

    if let Some(parent) = path.parent() {
        log(&format!("[save] Ensuring directory exists: {:?}", parent));
        fs::create_dir_all(parent).map_err(|e| {
            let err = format!("[save] ERROR: Could not create directory: {}", e);
            log(&err);
            e.to_string()
        })?;
    }

    log("[save] Serializing store to pretty JSON");
    let data = serde_json::to_string_pretty(store).map_err(|e| {
        let err = format!("[save] ERROR: Serialization failed: {}", e);
        log(&err);
        e.to_string()
    })?;

    log(&format!("[save] Writing data to {:?}", path));
    fs::write(&path, data).map_err(|e| {
        let err = format!("[save] ERROR: File write failed: {}", e);
        log(&err);
        e.to_string()
    })?;

    log("[save] Store saved successfully");
    Ok(())
}