use crate::log;
use crate::models::connection::Connection;
use crate::models::label::Label;
use crate::models::workspace::Workspace;
use crate::store::Store;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;
use uuid::Uuid;

pub async fn init_pool(db_path: &PathBuf) -> Result<SqlitePool, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create dir: {}", e))?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&format!("sqlite://{}?mode=rwc", db_path.display()))
        .await
        .map_err(|e| format!("db connect: {}", e))?;

    sqlx::query("PRAGMA journal_mode=WAL")
        .execute(&pool)
        .await
        .ok();

    create_tables(&pool).await?;
    Ok(pool)
}

async fn create_tables(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS labels (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            built_in INTEGER NOT NULL DEFAULT 0
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("create labels: {}", e))?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_by TEXT NOT NULL DEFAULT '[]'
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("create workspaces: {}", e))?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT '',
            server TEXT NOT NULL,
            username TEXT NOT NULL,
            keychain_key TEXT NOT NULL,
            shared_secret_key TEXT NOT NULL,
            service_hash TEXT,
            labels TEXT NOT NULL DEFAULT '{}',
            connect_count INTEGER NOT NULL DEFAULT 0,
            connected_since INTEGER,
            last_connected_at INTEGER,
            last_disconnected_at INTEGER,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("create connections: {}", e))?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("create settings: {}", e))?;

    Ok(())
}

pub async fn load_store(pool: &SqlitePool) -> Result<Store, String> {
    let labels = sqlx::query_as::<_, LabelRow>("SELECT id, name, built_in FROM labels")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("load labels: {}", e))?
        .into_iter()
        .map(|r| Label {
            id: r.id,
            name: r.name,
            built_in: r.built_in != 0,
        })
        .collect::<Vec<_>>();

    let workspaces = sqlx::query_as::<_, WorkspaceRow>("SELECT id, name, group_by FROM workspaces")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("load workspaces: {}", e))?;

    let mut result_workspaces = Vec::new();
    for ws_row in &workspaces {
        let conns = sqlx::query_as::<_, ConnectionRow>(
            "SELECT id, name, display_name, server, username, keychain_key, shared_secret_key, service_hash, labels, connect_count, connected_since, last_connected_at, last_disconnected_at FROM connections WHERE workspace_id = ?",
        )
        .bind(&ws_row.id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("load connections: {}", e))?;

        let group_by: Vec<String> =
            serde_json::from_str(&ws_row.group_by).unwrap_or_default();

        result_workspaces.push(Workspace {
            id: ws_row.id.clone(),
            name: ws_row.name.clone(),
            group_by,
            connections: conns
                .into_iter()
                .map(|c| {
                    let labels_map: std::collections::HashMap<String, String> =
                        serde_json::from_str(&c.labels).unwrap_or_default();
                    Connection {
                        id: c.id,
                        name: c.name,
                        display_name: c.display_name,
                        server: c.server,
                        username: c.username,
                        keychain_key: c.keychain_key,
                        shared_secret_key: c.shared_secret_key,
                        service_hash: c.service_hash,
                        labels: labels_map,
                        connect_count: c.connect_count as u32,
                        connected_since: c.connected_since,
                        last_connected_at: c.last_connected_at,
                        last_disconnected_at: c.last_disconnected_at,
                    }
                })
                .collect(),
        });
    }

    let active_workspace_id = sqlx::query_scalar::<_, String>(
        "SELECT value FROM settings WHERE key = 'active_workspace_id'",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("load settings: {}", e))?
    .unwrap_or_else(|| {
        result_workspaces
            .first()
            .map(|w| w.id.clone())
            .unwrap_or_default()
    });

    Ok(Store {
        workspaces: result_workspaces,
        active_workspace_id,
        labels,
    })
}

pub async fn save_store(pool: &SqlitePool, store: &Store) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| format!("begin tx: {}", e))?;

    // Labels: delete all, re-insert
    sqlx::query("DELETE FROM labels")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("delete labels: {}", e))?;
    for label in &store.labels {
        sqlx::query("INSERT INTO labels (id, name, built_in) VALUES (?, ?, ?)")
            .bind(&label.id)
            .bind(&label.name)
            .bind(label.built_in as i32)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("insert label: {}", e))?;
    }

    // Workspaces and connections: delete all, re-insert
    sqlx::query("DELETE FROM connections")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("delete connections: {}", e))?;
    sqlx::query("DELETE FROM workspaces")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("delete workspaces: {}", e))?;

    for ws in &store.workspaces {
        let group_by = serde_json::to_string(&ws.group_by).unwrap_or_default();
        sqlx::query("INSERT INTO workspaces (id, name, group_by) VALUES (?, ?, ?)")
            .bind(&ws.id)
            .bind(&ws.name)
            .bind(&group_by)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("insert workspace: {}", e))?;

        for conn in &ws.connections {
            let labels_json = serde_json::to_string(&conn.labels).unwrap_or_default();
            sqlx::query(
                "INSERT INTO connections (id, workspace_id, name, display_name, server, username, keychain_key, shared_secret_key, service_hash, labels, connect_count, connected_since, last_connected_at, last_disconnected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&conn.id)
            .bind(&ws.id)
            .bind(&conn.name)
            .bind(&conn.display_name)
            .bind(&conn.server)
            .bind(&conn.username)
            .bind(&conn.keychain_key)
            .bind(&conn.shared_secret_key)
            .bind(&conn.service_hash)
            .bind(&labels_json)
            .bind(conn.connect_count as i64)
            .bind(conn.connected_since)
            .bind(conn.last_connected_at)
            .bind(conn.last_disconnected_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("insert connection: {}", e))?;
        }
    }

    // Settings
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_workspace_id', ?)")
        .bind(&store.active_workspace_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("save settings: {}", e))?;

    tx.commit().await.map_err(|e| format!("commit tx: {}", e))?;
    Ok(())
}

pub async fn store_is_empty(pool: &SqlitePool) -> Result<bool, String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM labels")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("count labels: {}", e))?;
    Ok(count == 0)
}

pub async fn migrate_from_json(
    pool: &SqlitePool,
    json_path: &PathBuf,
) -> Result<bool, String> {
    if !json_path.exists() {
        return Ok(false);
    }
    let data = std::fs::read_to_string(json_path).map_err(|e| format!("read json: {}", e))?;

    // Try new Store format first
    if let Ok(store) = serde_json::from_str::<Store>(&data) {
        save_store(pool, &store).await?;
        log!("[db] migrated {} workspaces from JSON (Store format)", store.workspaces.len());
        return Ok(true);
    }

    // Try legacy format (flat connections, no workspaces)
    #[derive(serde::Deserialize)]
    struct LegacyStore {
        connections: Vec<crate::models::connection::Connection>,
        labels: Vec<Label>,
    }

    if let Ok(legacy) = serde_json::from_str::<LegacyStore>(&data) {
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
        save_store(pool, &store).await?;
        log!("[db] migrated legacy store, {} connections", store.workspaces[0].connections.len());
        return Ok(true);
    }

    Ok(false)
}

// Row types for sqlx query_as
#[derive(sqlx::FromRow)]
struct LabelRow {
    id: String,
    name: String,
    built_in: i32,
}

#[derive(sqlx::FromRow)]
struct WorkspaceRow {
    id: String,
    name: String,
    group_by: String,
}

#[derive(sqlx::FromRow)]
struct ConnectionRow {
    id: String,
    name: String,
    display_name: String,
    server: String,
    username: String,
    keychain_key: String,
    shared_secret_key: String,
    service_hash: Option<String>,
    labels: String,
    connect_count: i64,
    connected_since: Option<i64>,
    last_connected_at: Option<i64>,
    last_disconnected_at: Option<i64>,
}
