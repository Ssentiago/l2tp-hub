use crate::log;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const MAX_SESSIONS: usize = 10;

fn history_dir() -> PathBuf {
    let app = crate::state::get_state().app.clone();
    app.path()
        .resolve("session-logs", tauri::path::BaseDirectory::AppData)
        .unwrap_or_else(|_| PathBuf::from("/tmp/l2tp-hub/session-logs"))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionMeta {
    pub timestamp: i64,
    pub started_at: Option<i64>,
    pub ended_at: Option<i64>,
    pub status: String,
    pub error: Option<String>,
    pub server: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionLogs {
    pub meta: SessionMeta,
    pub charon: String,
    pub pppd: String,
    pub xl2tpd: String,
    pub app: String,
}

/// Сохраняет логи текущей сессии перед cleanup.
/// Копирует /tmp/l2tp/{name}-* в history dir.
pub fn save_session_logs(
    connection_id: &str,
    service_name: &str,
    server: &str,
    started_at: Option<i64>,
    error: Option<&str>,
) {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let session_dir = history_dir().join(connection_id)
        .join(ts.to_string());

    if let Err(e) = fs::create_dir_all(&session_dir) {
        log!("[logs] failed to create session dir: {}", e);
        return;
    }

    // Копируем лог-файлы
    let sanitized = sanitize_name(service_name);
    let sources = [
        // Per-connection
        (format!("/tmp/l2tp/{}-charon", sanitized), "charon.log"),
        (format!("/tmp/l2tp/{}-pppd.log", sanitized), "pppd.log"),
        (format!("/tmp/l2tp/{}-xl2tpd.log", sanitized), "xl2tpd.log"),
        // Daemon-level (общие логи демонов, содержат вывод charon/xl2tpd)
        ("/tmp/l2tp/charon-stdout.log".to_string(), "charon.log"),
        ("/tmp/l2tp/charon-stderr.log".to_string(), "charon.log"),
        ("/tmp/l2tp/xl2tpd-stdout.log".to_string(), "xl2tpd.log"),
        ("/tmp/l2tp/xl2tpd-stderr.log".to_string(), "xl2tpd.log"),
    ];

    for (src, dst_name) in &sources {
        if let Ok(content) = fs::read_to_string(src) {
            if !content.trim().is_empty() {
                let dst = session_dir.join(dst_name);
                // Для daemon-level логов: дописываем если per-connection уже создал файл
                if dst.exists() {
                    if let Ok(existing) = fs::read_to_string(&dst) {
                        let _ = fs::write(&dst, format!("{}\n{}", existing, content));
                        continue;
                    }
                }
                let _ = fs::write(dst, &content);
            }
        }
    }

    // Сохраняем app log (последние 500 строк)
    if let Ok(app_log) = fs::read_to_string("/tmp/l2tp-hub-debug.log") {
        let lines: Vec<&str> = app_log.lines().collect();
        let start = lines.len().saturating_sub(500);
        let _ = fs::write(session_dir.join("app.log"), lines[start..].join("\n"));
    }

    // Сохраняем meta
    let meta = SessionMeta {
        timestamp: ts,
        started_at,
        ended_at: Some(ts),
        status: if error.is_some() { "error".to_string() } else { "disconnected".to_string() },
        error: error.map(|s| s.to_string()),
        server: server.to_string(),
    };
    let _ = fs::write(
        session_dir.join("meta.json"),
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    );

    log!("[logs] saved session logs to {}", session_dir.display());

    // Ротация
    rotate_sessions(connection_id);
}

/// Ротация: оставляем только последние MAX_SESSIONS сессий.
fn rotate_sessions(connection_id: &str) {
    let conn_dir = history_dir().join(connection_id);
    let Ok(entries) = fs::read_dir(&conn_dir) else { return };

    let mut timestamps: Vec<i64> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().to_string_lossy().parse::<i64>().ok())
        .collect();

    if timestamps.len() <= MAX_SESSIONS {
        return;
    }

    timestamps.sort_unstable();
    let to_remove = timestamps.len() - MAX_SESSIONS;
    for ts in &timestamps[..to_remove] {
        let dir = conn_dir.join(ts.to_string());
        let _ = fs::remove_dir_all(&dir);
    }
    log!("[logs] rotated {} old sessions for {}", to_remove, connection_id);
}

/// Получить историю сессий для connection.
pub fn get_connection_history(connection_id: &str) -> Vec<SessionMeta> {
    let conn_dir = history_dir().join(connection_id);
    let Ok(entries) = fs::read_dir(&conn_dir) else { return vec![] };

    let mut sessions: Vec<SessionMeta> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let meta_path = e.path().join("meta.json");
            let content = fs::read_to_string(meta_path).ok()?;
            serde_json::from_str(&content).ok()
        })
        .collect();

    sessions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    sessions
}

/// Получить логи конкретной сессии.
pub fn get_session_logs(connection_id: &str, timestamp: i64) -> Option<SessionLogs> {
    let session_dir = history_dir().join(connection_id)
        .join(timestamp.to_string());

    if !session_dir.exists() {
        return None;
    }

    let meta: SessionMeta = fs::read_to_string(session_dir.join("meta.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())?;

    Some(SessionLogs {
        meta,
        charon: read_log_file(&session_dir, &["charon.log"]),
        pppd: read_log_file(&session_dir, &["pppd.log"]),
        xl2tpd: read_log_file(&session_dir, &["xl2tpd.log"]),
        app: read_log_file(&session_dir, &["app.log"]),
    })
}

fn read_log_file(dir: &PathBuf, names: &[&str]) -> String {
    for name in names {
        if let Ok(content) = fs::read_to_string(dir.join(name)) {
            if !content.is_empty() {
                return content;
            }
        }
    }
    String::new()
}

fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}
