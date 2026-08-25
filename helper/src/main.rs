use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixListener;
use std::process::Command;

const SOCKET_PATH: &str = "/var/run/l2tp-hub-helper.sock";
const HELPER_VERSION: &str = env!("CARGO_PKG_VERSION");

fn main() {
    // Удаляем старый сокет если остался
    let _ = std::fs::remove_file(SOCKET_PATH);

    let listener = match UnixListener::bind(SOCKET_PATH) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind socket {}: {}", SOCKET_PATH, e);
            std::process::exit(1);
        }
    };

    // Сокет доступен всем (Tauri-процесс под пользователем должен стучаться)
    let _ = std::fs::set_permissions(
        SOCKET_PATH,
        std::os::unix::fs::PermissionsExt::from_mode(0o777),
    );

    eprintln!("l2tp-hub-helper v{} listening on {}", HELPER_VERSION, SOCKET_PATH);

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let peer = stream.peer_addr().ok();
                let mut reader = BufReader::new(&stream);
                let mut line = String::new();

                if reader.read_line(&mut line).is_err() {
                    continue;
                }

                let response = handle_command(line.trim());
                let mut writer = stream;
                let _ = writer.write_all(response.as_bytes());
                let _ = writer.write_all(b"\n");
                let _ = writer.flush();

                let _ = peer; // suppress unused warning
            }
            Err(e) => {
                eprintln!("Connection error: {}", e);
            }
        }
    }
}

fn handle_command(line: &str) -> String {
    let args: Vec<String> = match serde_json::from_str(line) {
        Ok(a) => a,
        Err(e) => {
            return serde_json::json!({"ok": false, "stderr": format!("invalid json: {}", e)}).to_string();
        }
    };

    if args.is_empty() {
        return serde_json::json!({"ok": false, "stderr": "empty command"}).to_string();
    }

    // Специальная команда: version — возвращает версию хелпера
    if args[0] == "version" {
        return serde_json::json!({"ok": true, "stdout": HELPER_VERSION}).to_string();
    }

    let output = Command::new(&args[0])
        .args(&args[1..])
        .output();

    match output {
        Ok(o) => {
            serde_json::json!({
                "ok": o.status.success(),
                "stdout": String::from_utf8_lossy(&o.stdout),
                "stderr": String::from_utf8_lossy(&o.stderr),
            })
            .to_string()
        }
        Err(e) => {
            serde_json::json!({"ok": false, "stderr": format!("exec error: {}", e)}).to_string()
        }
    }
}
