use crate::db;
use crate::models::label::Label;
use crate::models::workspace::Workspace;
use serde::{Deserialize, Serialize};

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
            &mut self.workspaces[idx]
        } else {
            &mut self.workspaces[0]
        }
    }

    pub fn find_connection(&self, id: &str) -> Option<&crate::models::Connection> {
        self.workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
    }

    pub fn find_connection_mut(&mut self, id: &str) -> Option<&mut crate::models::Connection> {
        self.workspaces
            .iter_mut()
            .flat_map(|ws| ws.connections.iter_mut())
            .find(|c| c.id == id)
    }

    /// Все подключения из всех воркспейсов
    pub fn all_connections(&self) -> Vec<&crate::models::Connection> {
        self.workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .collect()
    }
}

fn debug_log(msg: &str) {
    log::debug!("{}", msg);
}

fn needs_migration(store: &Store) -> bool {
    store.workspaces.is_empty()
}

/// Загрузить store из SQLite.
pub async fn load(pool: &sqlx::SqlitePool) -> Store {
    let db_result = db::load_store(pool).await;
    match db_result {
        Ok(store) => {
            if needs_migration(&store) {
                debug_log("[store::load] empty store, creating default");
                let default_store = Store::default();
                let _ = db::save_store(pool, &default_store).await;
                return default_store;
            }
            store
        }
        Err(e) => {
            debug_log(&format!("[store::load] DB error: {}", e));
            Store::default()
        }
    }
}

/// Сохранить store в SQLite.
pub async fn save(pool: &sqlx::SqlitePool, store: &Store) -> Result<(), String> {
    db::save_store(pool, store).await
}
