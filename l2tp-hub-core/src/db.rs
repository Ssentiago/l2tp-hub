
use crate::models::connection::Connection;
use crate::models::label::Label;
use crate::models::workspace::Workspace;
use crate::store::Store;
use sqlx::sqlite::{SqliteConnection, SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;

pub async fn init_pool(db_path: &PathBuf) -> Result<SqlitePool, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create dir: {}", e))?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(4)
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

pub(crate) async fn create_tables(pool: &SqlitePool) -> Result<(), String> {
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
            tunnel_mode TEXT NOT NULL DEFAULT 'full',
            split_routes TEXT NOT NULL DEFAULT '[]',
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

    // Миграция: добавляем колонки для split tunneling (если их нет)
    // Игнорируем ошибку если колонка уже существует
    let _ = sqlx::query("ALTER TABLE connections ADD COLUMN tunnel_mode TEXT NOT NULL DEFAULT 'full'")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE connections ADD COLUMN split_routes TEXT NOT NULL DEFAULT '[]'")
        .execute(pool)
        .await;

    Ok(())
}

pub async fn load_store(pool: &SqlitePool) -> Result<Store, String> {
    let mut conn = pool
        .acquire()
        .await
        .map_err(|e| format!("acquire connection: {}", e))?;
    load_store_conn(&mut conn).await
}

pub(crate) async fn load_store_conn(db_conn: &mut SqliteConnection) -> Result<Store, String> {
    let labels = sqlx::query_as::<_, LabelRow>("SELECT id, name, built_in FROM labels")
        .fetch_all(&mut *db_conn)
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
        .fetch_all(&mut *db_conn)
        .await
        .map_err(|e| format!("load workspaces: {}", e))?;

    let mut result_workspaces = Vec::new();
    for ws_row in &workspaces {
        let conns = sqlx::query_as::<_, ConnectionRow>(
            "SELECT id, workspace_id, name, display_name, server, username, keychain_key, shared_secret_key, service_hash, labels, connect_count, connected_since, last_connected_at, last_disconnected_at, tunnel_mode, split_routes FROM connections WHERE workspace_id = ?",
        )
        .bind(&ws_row.id)
        .fetch_all(&mut *db_conn)
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
                        service_name: c.name,
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
                        tunnel_mode: c.tunnel_mode,
                        split_routes: serde_json::from_str(&c.split_routes).unwrap_or_default(),
                    }
                })
                .collect(),
        });
    }

    let active_workspace_id = sqlx::query_scalar::<_, String>(
        "SELECT value FROM settings WHERE key = 'active_workspace_id'",
    )
    .fetch_optional(&mut *db_conn)
    .await
    .map_err(|e| format!("load settings: {}", e))?
    .unwrap_or_else(|| {
        result_workspaces
            .first()
            .map(|w| w.id.clone())
            .unwrap_or_default()
    });

    // Guarantee at least one workspace exists
    if result_workspaces.is_empty() {
        let ws = Workspace::new("Основной");
        let id = ws.id.clone();
        result_workspaces.push(ws);
        // Persist the default workspace only while the table is still empty so
        // concurrent bootstrap loads cannot create duplicates
        if let Err(e) = sqlx::query(
            "INSERT INTO workspaces (id, name, group_by) \
             SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM workspaces)",
        )
        .bind(&id)
        .bind("Основной")
        .bind("[]")
        .execute(&mut *db_conn)
        .await
        {
            log::warn!("[db] bootstrap workspace insert failed: {}", e);
        }
        return Ok(Store {
            workspaces: result_workspaces,
            active_workspace_id: id,
            labels,
        });
    }

    Ok(Store {
        workspaces: result_workspaces,
        active_workspace_id,
        labels,
    })
}

pub async fn save_store(pool: &SqlitePool, store: &Store) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| format!("begin tx: {}", e))?;
    save_store_tx(&mut *tx, store).await?;
    tx.commit().await.map_err(|e| format!("commit tx: {}", e))
}

/// Sync the snapshot into the database using an existing connection.
///
/// The caller owns the surrounding transaction and its commit.
pub(crate) async fn save_store_tx(db_conn: &mut SqliteConnection, store: &Store) -> Result<(), String> {
    // Labels: upsert changed rows, delete vanished rows
    let existing_labels = sqlx::query_as::<_, LabelRow>("SELECT id, name, built_in FROM labels")
        .fetch_all(&mut *db_conn)
        .await
        .map_err(|e| format!("load labels: {}", e))?;
    for label in &store.labels {
        let unchanged = existing_labels
            .iter()
            .any(|row| row.id == label.id && row.name == label.name && (row.built_in != 0) == label.built_in);
        if unchanged {
            continue;
        }
        sqlx::query("INSERT OR REPLACE INTO labels (id, name, built_in) VALUES (?, ?, ?)")
            .bind(&label.id)
            .bind(&label.name)
            .bind(label.built_in as i32)
            .execute(&mut *db_conn)
            .await
            .map_err(|e| format!("upsert label: {}", e))?;
    }
    for row in &existing_labels {
        if !store.labels.iter().any(|l| l.id == row.id) {
            sqlx::query("DELETE FROM labels WHERE id = ?")
                .bind(&row.id)
                .execute(&mut *db_conn)
                .await
                .map_err(|e| format!("delete label: {}", e))?;
        }
    }

    // Workspaces: upsert changed rows; deletes are deferred until after the
    // connections pass
    let existing_workspaces =
        sqlx::query_as::<_, WorkspaceRow>("SELECT id, name, group_by FROM workspaces")
            .fetch_all(&mut *db_conn)
            .await
            .map_err(|e| format!("load workspaces: {}", e))?;
    for ws in &store.workspaces {
        let unchanged = existing_workspaces.iter().any(|row| {
            if row.id != ws.id || row.name != ws.name {
                return false;
            }
            serde_json::from_str::<Vec<String>>(&row.group_by)
                .map(|g| g == ws.group_by)
                .unwrap_or(false)
        });
        if unchanged {
            continue;
        }
        let group_by = serde_json::to_string(&ws.group_by).unwrap_or_default();
        sqlx::query("INSERT OR REPLACE INTO workspaces (id, name, group_by) VALUES (?, ?, ?)")
            .bind(&ws.id)
            .bind(&ws.name)
            .bind(&group_by)
            .execute(&mut *db_conn)
            .await
            .map_err(|e| format!("upsert workspace: {}", e))?;
    }

    // Connections: upsert changed and moved rows, delete vanished rows
    let existing_connections = sqlx::query_as::<_, ConnectionRow>(
        "SELECT id, workspace_id, name, display_name, server, username, keychain_key, shared_secret_key, service_hash, labels, connect_count, connected_since, last_connected_at, last_disconnected_at, tunnel_mode, split_routes FROM connections",
    )
    .fetch_all(&mut *db_conn)
    .await
    .map_err(|e| format!("load connections: {}", e))?;

    let mut live_ids = std::collections::HashSet::new();
    for ws in &store.workspaces {
        for conn in &ws.connections {
            live_ids.insert(conn.id.as_str());
            let unchanged = existing_connections
                .iter()
                .any(|row| row.id == conn.id && connection_matches(row, &ws.id, conn));
            if unchanged {
                continue;
            }
            let labels_json = serde_json::to_string(&conn.labels).unwrap_or_default();
            let split_routes_json = serde_json::to_string(&conn.split_routes).unwrap_or_default();
            sqlx::query(
                "INSERT OR REPLACE INTO connections (id, workspace_id, name, display_name, server, username, keychain_key, shared_secret_key, service_hash, labels, connect_count, connected_since, last_connected_at, last_disconnected_at, tunnel_mode, split_routes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&conn.id)
            .bind(&ws.id)
            .bind(&conn.service_name)
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
            .bind(&conn.tunnel_mode)
            .bind(&split_routes_json)
            .execute(&mut *db_conn)
            .await
            .map_err(|e| format!("upsert connection: {}", e))?;
        }
    }
    for row in &existing_connections {
        if !live_ids.contains(row.id.as_str()) {
            sqlx::query("DELETE FROM connections WHERE id = ?")
                .bind(&row.id)
                .execute(&mut *db_conn)
                .await
                .map_err(|e| format!("delete connection: {}", e))?;
        }
    }

    // Delete workspaces after the connections pass so moved connections get
    // their new workspace_id before the cascade can drop them
    for row in &existing_workspaces {
        if !store.workspaces.iter().any(|w| w.id == row.id) {
            sqlx::query("DELETE FROM workspaces WHERE id = ?")
                .bind(&row.id)
                .execute(&mut *db_conn)
                .await
                .map_err(|e| format!("delete workspace: {}", e))?;
        }
    }

    // Settings
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_workspace_id', ?)")
        .bind(&store.active_workspace_id)
        .execute(&mut *db_conn)
        .await
        .map_err(|e| format!("save settings: {}", e))?;

    Ok(())
}

fn connection_matches(row: &ConnectionRow, ws_id: &str, conn: &Connection) -> bool {
    let labels_match = serde_json::from_str::<std::collections::HashMap<String, String>>(&row.labels)
        .map(|m| m == conn.labels)
        .unwrap_or(false);
    let split_routes_match = serde_json::from_str::<Vec<String>>(&row.split_routes)
        .map(|r| r == conn.split_routes)
        .unwrap_or(false);

    row.workspace_id == ws_id
        && row.name == conn.service_name
        && row.display_name == conn.display_name
        && row.server == conn.server
        && row.username == conn.username
        && row.keychain_key == conn.keychain_key
        && row.shared_secret_key == conn.shared_secret_key
        && row.service_hash == conn.service_hash
        && labels_match
        && row.connect_count == conn.connect_count as i64
        && row.connected_since == conn.connected_since
        && row.last_connected_at == conn.last_connected_at
        && row.last_disconnected_at == conn.last_disconnected_at
        && row.tunnel_mode == conn.tunnel_mode
        && split_routes_match
}

pub async fn active_workspace_id(pool: &SqlitePool) -> Option<String> {
    sqlx::query_scalar("SELECT value FROM settings WHERE key = 'active_workspace_id'")
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

pub async fn connections_for_workspace(
    pool: &SqlitePool,
    ws_id: &str,
) -> Result<Vec<Connection>, String> {
    let rows = sqlx::query_as::<_, ConnectionRow>(
        "SELECT id, workspace_id, name, display_name, server, username, keychain_key, shared_secret_key, \
         service_hash, labels, connect_count, connected_since, last_connected_at, last_disconnected_at, \
         tunnel_mode, split_routes \
         FROM connections WHERE workspace_id = ?",
    )
    .bind(ws_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("query connections: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|c| {
            let labels_map: std::collections::HashMap<String, String> =
                serde_json::from_str(&c.labels).unwrap_or_default();
            Connection {
                id: c.id,
                service_name: c.name,
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
                tunnel_mode: c.tunnel_mode,
                split_routes: serde_json::from_str(&c.split_routes).unwrap_or_default(),
            }
        })
        .collect())
}

pub async fn workspace_infos(pool: &SqlitePool) -> Result<Vec<WorkspaceInfoRow>, String> {
    sqlx::query_as::<_, WorkspaceInfoRow>("SELECT id, name, group_by FROM workspaces")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("query workspaces: {}", e))
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
        log::debug!("[db] migrated {} workspaces from JSON (Store format)", store.workspaces.len());
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
        log::debug!("[db] migrated legacy store, {} connections", store.workspaces[0].connections.len());
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
    workspace_id: String,
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
    tunnel_mode: String,
    split_routes: String,
}

#[derive(sqlx::FromRow)]
pub struct WorkspaceInfoRow {
    pub id: String,
    pub name: String,
    pub group_by: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::connection::Connection;
    use crate::models::label::Label;
    use crate::models::workspace::Workspace;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("connect");
        create_tables(&pool).await.expect("create tables");
        pool
    }

    fn sample_connection(id: &str) -> Connection {
        Connection {
            id: id.into(),
            service_name: format!("svc-{}", id),
            display_name: format!("Display {}", id),
            server: "vpn.example.com".into(),
            username: "user".into(),
            keychain_key: format!("password_{}", id),
            shared_secret_key: format!("shared_{}", id),
            service_hash: Some(format!("hash-{}", id)),
            labels: [("company".to_string(), "ACME".to_string())].into_iter().collect(),
            connect_count: 3,
            connected_since: Some(100),
            last_connected_at: Some(200),
            last_disconnected_at: Some(300),
            tunnel_mode: "split".into(),
            split_routes: vec!["10.0.0.0/8".into()],
        }
    }

    fn sample_store() -> Store {
        let mut ws1 = Workspace::new("Main");
        ws1.id = "ws-1".into();
        ws1.connections = vec![sample_connection("c-1"), sample_connection("c-2")];
        let mut ws2 = Workspace::new("Second");
        ws2.id = "ws-2".into();
        ws2.connections = vec![sample_connection("c-3")];
        Store {
            workspaces: vec![ws1, ws2],
            active_workspace_id: "ws-1".into(),
            labels: vec![
                Label {
                    id: "company".into(),
                    name: "Компания".into(),
                    built_in: true,
                },
                Label {
                    id: "custom".into(),
                    name: "Своя".into(),
                    built_in: false,
                },
            ],
        }
    }

    async fn rowid(pool: &SqlitePool, table: &str, id: &str) -> i64 {
        let sql = match table {
            "labels" => "SELECT rowid FROM labels WHERE id = ?",
            "workspaces" => "SELECT rowid FROM workspaces WHERE id = ?",
            "connections" => "SELECT rowid FROM connections WHERE id = ?",
            _ => panic!("unknown table"),
        };
        sqlx::query_scalar(sql)
            .bind(id)
            .fetch_one(pool)
            .await
            .expect("rowid")
    }

    #[tokio::test]
    async fn save_load_round_trip() {
        let pool = test_pool().await;
        let store = sample_store();
        save_store(&pool, &store).await.expect("save");

        let loaded = load_store(&pool).await.expect("load");
        assert_eq!(loaded.active_workspace_id, "ws-1");
        assert_eq!(loaded.workspaces.len(), 2);
        assert_eq!(loaded.labels.len(), 2);

        let ws1 = loaded.workspaces.iter().find(|w| w.id == "ws-1").unwrap();
        assert_eq!(ws1.connections.len(), 2);
        let c1 = ws1.connections.iter().find(|c| c.id == "c-1").unwrap();
        assert_eq!(c1.service_name, "svc-c-1");
        assert_eq!(c1.display_name, "Display c-1");
        assert_eq!(c1.tunnel_mode, "split");
        assert_eq!(c1.split_routes, vec!["10.0.0.0/8".to_string()]);
        assert_eq!(c1.labels.get("company").map(String::as_str), Some("ACME"));
        assert_eq!(c1.connect_count, 3);
        assert_eq!(c1.service_hash.as_deref(), Some("hash-c-1"));

        let ws2 = loaded.workspaces.iter().find(|w| w.id == "ws-2").unwrap();
        assert_eq!(ws2.connections.len(), 1);
    }

    #[tokio::test]
    async fn save_rewrites_only_changed_rows() {
        let pool = test_pool().await;
        let mut store = sample_store();
        save_store(&pool, &store).await.expect("save");

        let label_rowid = rowid(&pool, "labels", "custom").await;
        let ws_rowid = rowid(&pool, "workspaces", "ws-2").await;
        let conn_rowid = rowid(&pool, "connections", "c-1").await;

        // Меняем одно подключение, остальные строки не трогаем
        store.workspaces[0].connections[1].connect_count = 10;
        save_store(&pool, &store).await.expect("save");

        assert_eq!(rowid(&pool, "labels", "custom").await, label_rowid);
        assert_eq!(rowid(&pool, "workspaces", "ws-2").await, ws_rowid);
        assert_eq!(rowid(&pool, "connections", "c-1").await, conn_rowid);

        let loaded = load_store(&pool).await.expect("load");
        let c2 = loaded.find_connection("c-2").unwrap();
        assert_eq!(c2.connect_count, 10);
    }

    #[tokio::test]
    async fn save_deletes_missing_and_moves_connections() {
        let pool = test_pool().await;
        let mut store = sample_store();
        save_store(&pool, &store).await.expect("save");

        // c-3 переезжает в ws-1, ws-2 исчезает, c-2 удаляется
        let moved = store.workspaces[1].connections.remove(0);
        store.workspaces[0].connections.push(moved);
        store.workspaces[0].connections.retain(|c| c.id != "c-2");
        store.workspaces.remove(1);
        save_store(&pool, &store).await.expect("save");

        let loaded = load_store(&pool).await.expect("load");
        assert_eq!(loaded.workspaces.len(), 1);
        let ws1 = &loaded.workspaces[0];
        assert_eq!(ws1.connections.len(), 2);
        assert!(ws1.connections.iter().any(|c| c.id == "c-1"));
        assert!(ws1.connections.iter().any(|c| c.id == "c-3"));
        assert!(loaded.find_connection("c-2").is_none());
    }

    #[tokio::test]
    async fn save_deletes_missing_labels() {
        let pool = test_pool().await;
        let mut store = sample_store();
        save_store(&pool, &store).await.expect("save");

        store.labels.retain(|l| l.id != "custom");
        save_store(&pool, &store).await.expect("save");

        let loaded = load_store(&pool).await.expect("load");
        assert_eq!(loaded.labels.len(), 1);
        assert_eq!(loaded.labels[0].id, "company");
    }
}
