use std::fs::OpenOptions;
use std::io::Write;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct LogEvent {
    pub message: String,
    pub timestamp: u64,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn log_path() -> &'static str {
    #[cfg(target_os = "windows")]
    return "C:\\l2tp-hub-debug.log";
    #[cfg(not(target_os = "windows"))]
    return "/tmp/l2tp-hub-debug.log";
}

pub struct AppLogger {
    app: Mutex<Option<AppHandle>>,
}

impl AppLogger {
    pub fn new() -> Self {
        Self {
            app: Mutex::new(None),
        }
    }

    pub fn init(&self, handle: AppHandle) {
        *self.app.lock().unwrap() = Some(handle);
    }

    pub fn log(&self, message: &str) {
        // пишем в файл
        if let Ok(mut f) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path())
        {
            let _ = writeln!(f, "{}", message);
        }

        // шлём на фронт если handle уже есть
        let guard = self.app.lock().unwrap();
        if let Some(handle) = guard.as_ref() {
            let event = LogEvent {
                message: message.to_string(),
                timestamp: now_ms(),
            };
            let _ = handle.emit("app:log", event);
        }
    }
}

