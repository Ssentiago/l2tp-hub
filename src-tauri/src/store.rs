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
    // password хранится в Keychain, здесь только ключ
    pub keychain_key: String,

    // Категоризация
    pub company: String,
    pub branch: String,
    pub tags: Vec<String>,
    pub description: String,
    pub group: String,
    pub priority: u8, // 1-5

    // Технические параметры
    pub shared_secret_key: String, // keychain key для shared secret
    pub send_all_traffic: bool,
    pub service_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Store {
    pub connections: Vec<Connection>,
}

fn store_path() -> PathBuf {
    let app = get_app_handle();
    let path = app.path().resolve("connections.json", BaseDirectory::AppData)
        .expect("Не удалось вычислить путь");

    path
}

pub fn load(config: &tauri::Config) -> Store {
    let path = store_path();
    if !path.exists() {
        return Store::default();
    }
    let data = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

pub fn save( store: &Store) -> Result<(), String> {
    let path = store_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())
}