use serde::Serialize;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

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
    #[cfg(target_os = "macos")]
    return "/tmp/l2tp-hub-debug.log";
}

pub struct Logger {
    app: Mutex<AppHandle>,
}

impl Logger {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app: Mutex::new(app),
        }
    }

    fn send_log_to_file(&self, message: &str) {
        if let Ok(mut f) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path())
        {
            let _ = writeln!(f, "{}", message);
        }
    }

    fn send_log_to_front(&self, message: &str) {
        let handle = self.app.lock().unwrap();
        let event = LogEvent {
            message: message.to_string(),
            timestamp: now_ms(),
        };
        let _ = handle.emit("app:log", event);
    }

    pub fn log(&self, message: &str) {
        self.send_log_to_file(message);
        self.send_log_to_front(message);
    }
}
