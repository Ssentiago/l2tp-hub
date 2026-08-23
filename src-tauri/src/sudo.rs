use std::process::Command;
use std::sync::{Arc, Mutex};

// ---------------------------------------------------------------------------
// SudoSession — ONLY authentication + command execution
// Процессы управляются через LaunchDaemon, не через child process handles.
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct SudoSession {
    authenticated: Arc<Mutex<bool>>,
}

impl SudoSession {
    pub fn new() -> Self {
        Self {
            authenticated: Arc::new(Mutex::new(false)),
        }
    }

    /// sudo -v → macOS показывает системный диалог (pam_tid.so)
    pub fn authenticate(&self) -> Result<(), String> {
        let status = Command::new("sudo")
            .arg("-v")
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| e.to_string())?
            .wait()
            .map_err(|e| e.to_string())?;

        if status.success() {
            *self.authenticated.lock().unwrap() = true;
            Ok(())
        } else {
            Err("Аутентификация не пройдена".to_string())
        }
    }

    pub fn is_authenticated(&self) -> bool {
        *self.authenticated.lock().unwrap()
    }

    /// sudo с кешированными credentials (после -v кэш живёт ~5 мин)
    pub fn run_sudo(&self, args: &[&str]) -> Result<String, String> {
        let output = Command::new("sudo")
            .arg("-n")
            .args(args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}
