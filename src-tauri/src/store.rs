use crate::db;
use crate::models::label::Label;
use crate::models::workspace::Workspace;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Store {
    pub workspaces: Vec<Workspace>,
    #[serde(default)]
    pub active_workspace_id: String,
    pub labels: Vec<Label>,
}

impl Default for Store {
    fn default() -> Self {
        let ws = Workspace::new("Основной");
        let id = ws.id.clone();
        Self {
            workspaces: vec![ws],
            active_workspace_id: id,
            labels: vec![
                Label {
                    id: "company".into(),
                    name: "Компания".into(),
                    built_in: true,
                },
                Label {
                    id: "branch".into(),
                    name: "Филиал".into(),
                    built_in: true,
                },
            ],
        }
    }
}

impl Store {
    pub fn active_workspace(&self) -> &Workspace {
        self.workspaces
            .iter()
            .find(|w| w.id == self.active_workspace_id)
            .or_else(|| self.workspaces.first())
            .expect("Store must have at least one workspace")
    }

    pub fn active_workspace_mut(&mut self) -> &mut Workspace {
        if let Some(idx) = self.workspaces.iter().position(|w| w.id == self.active_workspace_id) {
            return &mut self.workspaces[idx];
        }
        // Fallback: если active_workspace_id не найден, берём первый
        self.workspaces.first_mut().expect("Store must have at least one workspace")
    }
}

fn json_path() -> Option<PathBuf> {
    let app = crate::state::get_state().app.clone();
    match app.path().resolve("connections.json", BaseDirectory::AppData) {
        Ok(p) => Some(p),
        Err(e) => {
            debug_log(&format!("[store] resolve failed: {}", e));
            None
        }
    }
}

fn try_load_json() -> Option<Store> {
    let path = json_path()?;
    debug_log(&format!("[store] JSON path: {:?}, exists: {}", path, path.exists()));
    if !path.exists() {
        return None;
    }
    let data = std::fs::read_to_string(&path).ok()?;
    debug_log(&format!("[store] read {} bytes from JSON", data.len()));

    if let Ok(store) = serde_json::from_str::<Store>(&data) {
        debug_log(&format!("[store] parsed {} workspaces", store.workspaces.len()));
        return Some(store);
    }

    debug_log("[store] JSON parse failed");
    None
}

fn debug_log(msg: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/l2tp-hub-debug.log")
    {
        let _ = writeln!(f, "{}", msg);
    }
}

const DB_VERSION: &str = "1";

fn needs_migration() -> bool {
    let pool = crate::DB_POOL.get().expect("DB pool not initialized");
    let version: Option<String> = tauri::async_runtime::block_on(
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'db_version'")
            .fetch_optional(pool)
    ).ok().flatten();
    version.as_deref() != Some(DB_VERSION)
}

fn mark_migrated() {
    let pool = crate::DB_POOL.get().expect("DB pool not initialized");
    let _ = tauri::async_runtime::block_on(
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', ?)")
            .bind(DB_VERSION)
            .execute(pool)
    );
}

pub fn load(_config: &tauri::Config) -> Store {
    let pool = crate::DB_POOL.get().expect("DB pool not initialized");
    
    if needs_migration() {
        debug_log("[store::load] DB version mismatch or empty, trying JSON migration");
        if let Some(json_store) = try_load_json() {
            let _ = tauri::async_runtime::block_on(db::save_store(pool, &json_store));
            mark_migrated();
            debug_log(&format!("[store::load] migrated {} workspaces from JSON", json_store.workspaces.len()));
            return json_store;
        }
        debug_log("[store::load] no JSON, returning default");
        let default_store = Store::default();
        // Сохраняем дефолтный store в БД, чтобы следующий load не вернул пустые workspaces
        let _ = tauri::async_runtime::block_on(db::save_store(pool, &default_store));
        mark_migrated();
        return default_store;
    }

    let db_result = tauri::async_runtime::block_on(db::load_store(pool));
    match db_result {
        Ok(store) => store,
        Err(e) => {
            debug_log(&format!("[store::load] DB error: {}", e));
            Store::default()
        }
    }
}

pub fn save(store: &Store) -> Result<(), String> {
    let pool = crate::DB_POOL.get().expect("DB pool not initialized");
    tauri::async_runtime::block_on(db::save_store(pool, store))
}
