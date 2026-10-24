use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixListener;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

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

const CMD_TIMEOUT: Duration = Duration::from_secs(25);

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

    // Специальная команда: guardian_start — запуск скрипта в фоне (без ожидания)
    if args[0] == "guardian_start" {
        return start_guardian(&args[1..]);
    }

    exec_with_timeout(&args)
}

/// Запуск guardian-скрипта в фоне — не блокирует helper.
/// Ожидается: guardian_start <script_path> <args...>
fn start_guardian(args: &[String]) -> String {
    if args.is_empty() {
        return serde_json::json!({"ok": false, "stderr": "guardian_start: missing script path"}).to_string();
    }

    let mut cmd = Command::new(&args[0]);
    if args.len() > 1 {
        cmd.args(&args[1..]);
    }
    // Отсоединяем от stdin/stdout/stderr — скрипт пишет в свой лог-файл
    cmd.stdin(Stdio::null())
       .stdout(Stdio::null())
       .stderr(Stdio::null());

    match cmd.spawn() {
        Ok(child) => {
            serde_json::json!({"ok": true, "stdout": format!("guardian pid={}", child.id())}).to_string()
        }
        Err(e) => {
            serde_json::json!({"ok": false, "stderr": format!("guardian spawn error: {}", e)}).to_string()
        }
    }
}

/// Выполнить команду с таймаутом CMD_TIMEOUT.
/// Использует spawn() + polling вместо output() чтобы не блокировать helper навсегда.
fn exec_with_timeout(args: &[String]) -> String {
    use std::io::Read;

    let mut child = match Command::new(&args[0])
        .args(&args[1..])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return serde_json::json!({"ok": false, "stderr": format!("exec error: {}", e)}).to_string();
        }
    };

    // Забираем pipe-ы до polling — читаем в отдельных потоках
    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();

    let stdout_handle = stdout_pipe.map(|mut r| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let _ = r.read_to_end(&mut buf);
            String::from_utf8_lossy(&buf).to_string()
        })
    });
    let stderr_handle = stderr_pipe.map(|mut r| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let _ = r.read_to_end(&mut buf);
            String::from_utf8_lossy(&buf).to_string()
        })
    });

    let start = Instant::now();
    let exit_status;

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                exit_status = status;
                break;
            }
            Ok(None) => {
                if start.elapsed() >= CMD_TIMEOUT {
                    let _ = child.kill();
                    let _ = child.wait();
                    return serde_json::json!({
                        "ok": false,
                        "stderr": format!("command timed out after {}s", CMD_TIMEOUT.as_secs()),
                    }).to_string();
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => {
                let _ = child.kill();
                return serde_json::json!({"ok": false, "stderr": format!("wait error: {}", e)}).to_string();
            }
        }
    }

    // Собираем output из reader-потоков
    let stdout = stdout_handle
        .and_then(|h| h.join().ok())
        .unwrap_or_default();
    let stderr = stderr_handle
        .and_then(|h| h.join().ok())
        .unwrap_or_default();

    let success = exit_status.success();

    serde_json::json!({
        "ok": success,
        "stdout": stdout,
        "stderr": stderr,
    })
    .to_string()
}
