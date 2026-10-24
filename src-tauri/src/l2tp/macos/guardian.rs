use std::sync::atomic::{AtomicBool, Ordering};
use std::process::Command;

use crate::log;
use crate::sudo::SudoSession;

use super::paths::{guardian_bin, guardian_plist_resource, plist_path, GUARDIAN_LABEL};

/// Heartbeat thread control — sends heartbeat to guardian every 3 seconds
static HEARTBEAT_RUNNING: AtomicBool = AtomicBool::new(false);

/// Установить guardian LaunchDaemon (один раз, как helper).
/// Вызывается при первом запуске или обновлении.
pub fn install_guardian_daemon(sudo: &SudoSession) -> Result<(), String> {
    let bin = guardian_bin();
    if !bin.exists() {
        return Err(format!("guardian binary not found at {}", bin.display()));
    }

    let dest_bin = "/Library/PrivilegedHelperTools/l2tp-hub-guardian";
    sudo.run_sudo(&["cp", &bin.to_string_lossy(), dest_bin])?;
    sudo.run_sudo(&["chmod", "555", dest_bin])?;
    sudo.run_sudo(&["chown", "root:wheel", dest_bin])?;

    let plist_src = guardian_plist_resource();
    let plist_dst = plist_path(GUARDIAN_LABEL);
    sudo.run_sudo(&["cp", &plist_src.to_string_lossy(), &plist_dst.to_string_lossy()])?;
    sudo.run_sudo(&["chmod", "644", &plist_dst.to_string_lossy()])?;
    sudo.run_sudo(&["chown", "root:wheel", &plist_dst.to_string_lossy()])?;

    let _ = sudo.run_sudo(&["launchctl", "bootout", &format!("system/{}", GUARDIAN_LABEL)]);
    std::thread::sleep(std::time::Duration::from_millis(500));

    sudo.run_sudo(&["launchctl", "bootstrap", "system", &plist_dst.to_string_lossy()])?;
    log!("[guardian] daemon installed and bootstrapped");
    Ok(())
}

/// Активировать мониторинг guardian — шлём set_state через socket
pub fn activate_guardian(server: &str, iface: &str, gateway: &str, tunnel_mode: &str, split_routes: &[String]) {
    match crate::guardian::set_state(server, iface, gateway, tunnel_mode, split_routes) {
        Ok(resp) => log!("[guardian] set_state: ok, mode={:?}", resp.mode),
        Err(e) => log!("[guardian] WARNING: set_state failed: {}", e),
    }
}

/// Деактивировать мониторинг guardian — шлём clear_state через socket
pub fn deactivate_guardian() {
    match crate::guardian::clear_state() {
        Ok(_) => log!("[guardian] clear_state: ok"),
        Err(e) => log!("[guardian] WARNING: clear_state failed: {}", e),
    }
}

/// Запустить heartbeat-поток — шлёт heartbeat guardian каждые 3 сек
pub fn start_heartbeat_thread() {
    HEARTBEAT_RUNNING.store(true, Ordering::SeqCst);
    std::thread::spawn(|| {
        log!("[heartbeat] thread started");
        while HEARTBEAT_RUNNING.load(Ordering::SeqCst) {
            match crate::guardian::heartbeat() {
                Ok(resp) => {
                    if let Some(false) = resp.vpn_alive {
                        log!("[heartbeat] guardian reports VPN dead!");
                    }
                }
                Err(_) => {}
            }
            std::thread::sleep(std::time::Duration::from_secs(3));
        }
        log!("[heartbeat] thread stopped");
    });
}

/// Остановить heartbeat-поток
pub fn stop_heartbeat_thread() {
    HEARTBEAT_RUNNING.store(false, Ordering::SeqCst);
}

/// Получить текущий default gateway физического интерфейса
pub fn get_default_gateway() -> Result<String, String> {
    let output = Command::new("route")
        .args(["-n", "get", "default"])
        .output()
        .map_err(|e| format!("route -n get default: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("gateway:") {
            return Ok(line.trim_start_matches("gateway:").trim().to_string());
        }
    }
    Err(format!("gateway not found in route output:\n{}", stdout))
}
