use std::process::Command;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct SudoSession {
    pub password: Arc<Mutex<Option<String>>>,
}

impl SudoSession {
    pub fn new() -> Self {
        Self {
            password: Arc::new(Mutex::new(None)),
        }
    }

    pub fn authenticate(&self, password: &str) -> Result<(), String> {
        let output = Command::new("sudo")
            .args(["-S", "true"])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| e.to_string())
            .and_then(|mut child| {
                use std::io::Write;
                if let Some(stdin) = child.stdin.as_mut() {
                    let input = format!("{}\n", password);
                    stdin
                        .write_all(input.as_bytes())
                        .map_err(|e| e.to_string())?;
                }
                child.wait().map_err(|e| e.to_string())
            })?;

        if output.success() {
            let mut pw = self.password.lock().unwrap();
            *pw = Some(password.to_string());
            Ok(())
        } else {
            Err("Неверный пароль".to_string())
        }
    }

    pub fn is_authenticated(&self) -> bool {
        self.password.lock().unwrap().is_some()
    }

    pub fn run_sudo(&self, args: &[&str]) -> Result<String, String> {
        let pw = self
            .password
            .lock()
            .unwrap()
            .clone()
            .ok_or("sudo не авторизован")?;

        let output = Command::new("sudo")
            .arg("-S")
            .args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())
            .and_then(|mut child| {
                use std::io::Write;
                if let Some(stdin) = child.stdin.as_mut() {
                    let input = format!("{}\n", pw);
                    stdin
                        .write_all(input.as_bytes())
                        .map_err(|e| e.to_string())?;
                }
                child.wait_with_output().map_err(|e| e.to_string())
            })?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}
