use crate::log;
use crate::models::label::Label;
use crate::models::workspace::Workspace;
use crate::state::get_state;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct Store {
    pub workspaces: Vec<Workspace>,
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
            .unwrap_or(&self.workspaces[0])
    }

    pub fn active_workspace_mut(&mut self) -> &mut Workspace {
        let idx = self
            .workspaces
            .iter()
            .position(|w| w.id == self.active_workspace_id)
            .unwrap_or(0);
        &mut self.workspaces[idx]
    }
}

fn store_path() -> PathBuf {
    log!("[store_path] Resolving application handle");
    let app = get_state().app.clone();

    let path = app
        .path()
        .resolve("connections.json", BaseDirectory::AppData)
        .expect("Не удалось вычислить путь");

    log!("[store_path] Resolved path: {:?}", path);
    path
}

#[derive(Deserialize)]
struct LegacyStore {
    connections: Vec<crate::models::connection::Connection>,
    labels: Vec<Label>,
}

pub fn load(_config: &tauri::Config) -> Store {
    log!("[load] Starting to load store");
    let path = store_path();

    if !path.exists() {
        log!("[load] Store file does not exist, returning default Store");
        return Store::default();
    }

    log!("[load] Reading file content");
    match fs::read_to_string(&path) {
        Ok(data) => {
            log!("[load] File read successfully ({} bytes)", data.len());

            // Try new format first
            if let Ok(store) = serde_json::from_str::<Store>(&data) {
                log!("[load] Parsed as Workspace store, workspaces: {}", store.workspaces.len());
                return store;
            }

            // Try legacy format (flat connections)
            if let Ok(legacy) = serde_json::from_str::<LegacyStore>(&data) {
                log!("[load] Migrating legacy store, connections: {}", legacy.connections.len());
                let ws = Workspace {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: "Основной".into(),
                    connections: legacy.connections,
                    group_by: vec!["company".into(), "branch".into()],
                };
                let id = ws.id.clone();
                let store = Store {
                    workspaces: vec![ws],
                    active_workspace_id: id,
                    labels: legacy.labels,
                };
                // Save migrated store
                if let Err(e) = save(&store) {
                    log!("[load] Failed to save migrated store: {}", e);
                }
                return store;
            }

            log!("[load] Failed to parse JSON, returning default Store");
            Store::default()
        }
        Err(e) => {
            log!("[load] ERROR: Failed to read file: {}", e);
            Store::default()
        }
    }
}

pub fn save(store: &Store) -> Result<(), String> {
    log!(
        "[save] Starting save process. Workspaces: {}",
        store.workspaces.len()
    );
    let path = store_path();

    if let Some(parent) = path.parent() {
        log!("[save] Ensuring directory exists: {:?}", parent);
        fs::create_dir_all(parent).map_err(|e| {
            let err = format!("[save] ERROR: Could not create directory: {}", e);
            log!("{}", err);
            e.to_string()
        })?;
    }

    log!("[save] Serializing store to pretty JSON");
    let data = serde_json::to_string_pretty(store).map_err(|e| {
        let err = format!("[save] ERROR: Serialization failed: {}", e);
        log!("{}", err);
        e.to_string()
    })?;

    log!("[save] Writing data to {:?}", path);
    fs::write(&path, data).map_err(|e| {
        let err = format!("[save] ERROR: File write failed: {}", e);
        log!("{}", err);
        e.to_string()
    })?;

    log!("[save] Store saved successfully");
    Ok(())
}
