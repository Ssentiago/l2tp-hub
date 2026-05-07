use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri::path::BaseDirectory;
use crate::app_handle_storage::get_app_handle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Label {
    pub id: String,
    pub name: String,      // отображаемое имя ключа
    pub built_in: bool,    // нельзя удалить
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub server: String,
    pub username: String,
    pub keychain_key: String,
    pub shared_secret_key: String,
    pub send_all_traffic: bool,
    pub service_hash: Option<String>,
    pub priority: u8,
    // убираем company/branch/group/tags/description
    pub labels: std::collections::HashMap<String, String>, // label_id → value
}


#[derive(Debug, Serialize, Deserialize)]
pub struct Store {
    pub connections: Vec<Connection>,
    pub labels: Vec<Label>,
}

impl Default for Store {
    fn default() -> Self {
        Self {
            connections: vec![],
            labels: vec![
                Label { id: "company".into(), name: "Компания".into(), built_in: true },
                Label { id: "branch".into(), name: "Филиал".into(), built_in: true },
                Label { id: "priority".into(), name: "Приоритет".into(), built_in: true },
            ],
        }
    }
}

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;

    #[cfg(target_os = "windows")]
    let path = "C:\\l2tp-hub-debug.log";

    #[cfg(not(target_os = "windows"))]
    let path = "/tmp/l2tp-hub-debug.log";  // на Mac при dev-запуске

    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .unwrap();
    writeln!(f, "{}", msg).unwrap();
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