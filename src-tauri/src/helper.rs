use serde::Deserialize;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;

const SOCKET_PATH: &str = "/var/run/l2tp-hub-helper.sock";

#[derive(Debug, Deserialize)]
pub struct HelperResponse {
    pub ok: bool,
    #[serde(default)]
    pub stdout: String,
    #[serde(default)]
    pub stderr: String,
}

/// Проверяет, запущен ли хелпер (сокет существует и отвечает)
pub fn is_helper_running() -> bool {
    if !std::path::Path::new(SOCKET_PATH).exists() {
        return false;
    }
    match send_command(&["true"]) {
        Ok(resp) => resp.ok,
        Err(_) => false,
    }
}

/// Запрашивает версию установленного хелпера через сокет.
/// Старые версии хелпера (без команды `version`) вернут ошибку — это ok,
/// вызывающий код трактует это как "версия неизвестна → переустановить".
pub fn query_helper_version() -> Result<String, String> {
    let resp = send_command(&["version"])?;
    if resp.ok {
        Ok(resp.stdout.trim().to_string())
    } else {
        Err(resp.stderr)
    }
}

/// Запустить guardian-скрипт в фоне через helper (не блокирует helper).
/// Использует специальную команду guardian_start которую helper обрабатывает отдельно.
pub fn send_guardian_start(script_path: &str, args: &[&str]) -> Result<HelperResponse, String> {
    let mut cmd_args: Vec<&str> = vec!["guardian_start", script_path];
    cmd_args.extend_from_slice(args);
    send_command(&cmd_args)
}

/// Отправить команду хелперу и получить результат
pub fn send_command(args: &[&str]) -> Result<HelperResponse, String> {
    let stream = UnixStream::connect(SOCKET_PATH)
        .map_err(|e| format!("helper connect: {}", e))?;

    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(30)))
        .map_err(|e| format!("set timeout: {}", e))?;

    let mut writer = &stream;
    let json = serde_json::to_string(args).map_err(|e| format!("json encode: {}", e))?;
    writer
        .write_all(json.as_bytes())
        .map_err(|e| format!("write: {}", e))?;
    writer
        .write_all(b"\n")
        .map_err(|e| format!("write newline: {}", e))?;
    writer.flush().map_err(|e| format!("flush: {}", e))?;

    let mut reader = BufReader::new(&stream);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .map_err(|e| format!("read: {}", e))?;

    serde_json::from_str(&line).map_err(|e| format!("json decode: {}", e))
}
