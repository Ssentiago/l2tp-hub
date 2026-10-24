use serde::Deserialize;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;

const SOCKET_PATH: &str = "/tmp/l2tp-hub-guardian.sock";

#[derive(Debug, Deserialize)]
pub struct GuardianResponse {
    pub ok: bool,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub mode: Option<String>,
    #[serde(default)]
    pub vpn_alive: Option<bool>,
    #[serde(default)]
    pub pppd: Option<bool>,
    #[serde(default)]
    pub charon: Option<bool>,
    #[serde(default)]
    pub xl2tpd: Option<bool>,
}

/// Проверяет, запущен ли guardian (сокет существует и отвечает)
pub fn is_guardian_running() -> bool {
    if !std::path::Path::new(SOCKET_PATH).exists() {
        return false;
    }
    send_command("heartbeat").is_ok()
}

/// Heartbeat — обновляет last_heartbeat на стороне guardian
pub fn heartbeat() -> Result<GuardianResponse, String> {
    send_command("heartbeat")
}

/// Активировать мониторинг — guardian начинает следить за VPN и Tauri
pub fn set_state(server: &str, iface: &str, gateway: &str, tunnel_mode: &str, split_routes: &[String]) -> Result<GuardianResponse, String> {
    send_command_full("set_state", server, iface, gateway, tunnel_mode, split_routes)
}

/// Деактивировать мониторинг — VPN отключён штатно
pub fn clear_state() -> Result<GuardianResponse, String> {
    send_command("clear_state")
}

/// Запросить cleanup (routes + VPN processes)
pub fn cleanup() -> Result<GuardianResponse, String> {
    send_command("cleanup")
}

/// Статус
pub fn status() -> Result<GuardianResponse, String> {
    send_command("status")
}

fn send_command(cmd: &str) -> Result<GuardianResponse, String> {
    let stream = UnixStream::connect(SOCKET_PATH)
        .map_err(|e| format!("guardian connect: {}", e))?;
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(5)))
        .map_err(|e| format!("set timeout: {}", e))?;

    let payload = serde_json::json!({ "cmd": cmd }).to_string();
    let mut writer = &stream;
    writer.write_all(payload.as_bytes()).map_err(|e| format!("write: {}", e))?;
    writer.write_all(b"\n").map_err(|e| format!("write newline: {}", e))?;
    writer.flush().map_err(|e| format!("flush: {}", e))?;

    let mut reader = BufReader::new(&stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| format!("read: {}", e))?;
    serde_json::from_str(&line).map_err(|e| format!("json decode: {}", e))
}

fn send_command_full(cmd: &str, server: &str, iface: &str, gateway: &str, tunnel_mode: &str, split_routes: &[String]) -> Result<GuardianResponse, String> {
    let stream = UnixStream::connect(SOCKET_PATH)
        .map_err(|e| format!("guardian connect: {}", e))?;
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(5)))
        .map_err(|e| format!("set timeout: {}", e))?;

    let payload = serde_json::json!({
        "cmd": cmd,
        "server": server,
        "iface": iface,
        "gateway": gateway,
        "tunnel_mode": tunnel_mode,
        "split_routes": split_routes,
    }).to_string();
    let mut writer = &stream;
    writer.write_all(payload.as_bytes()).map_err(|e| format!("write: {}", e))?;
    writer.write_all(b"\n").map_err(|e| format!("write newline: {}", e))?;
    writer.flush().map_err(|e| format!("flush: {}", e))?;

    let mut reader = BufReader::new(&stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| format!("read: {}", e))?;
    serde_json::from_str(&line).map_err(|e| format!("json decode: {}", e))
}