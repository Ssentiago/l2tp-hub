use std::fs::OpenOptions;
use std::io::Write;

fn log_path() -> &'static str {
    #[cfg(target_os = "windows")]
    return "C:\\l2tp-hub-debug.log";
    #[cfg(target_os = "macos")]
    return "/tmp/l2tp-hub-debug.log";
}

pub struct Logger;

impl Logger {
    pub fn new() -> Self {
        Self
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

    pub fn log(&self, message: &str) {
        self.send_log_to_file(message);
    }
}
