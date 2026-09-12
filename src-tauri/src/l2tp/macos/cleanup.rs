use std::fs;
use std::process::Command;

use super::paths::{CHARON_LABEL, XL2TPD_LABEL, plist_path};
use super::guardian::stop_heartbeat_thread;
use super::routes::route_state_path_pub;

// ---------------------------------------------------------------------------
// Global cleanup — вызывается при старте и выходе приложения
// ---------------------------------------------------------------------------

pub fn cleanup_all_vpn_state() {
    eprintln!("[cleanup] cleaning up all VPN state (launchd)...");

    let _ = crate::guardian::clear_state();
    stop_heartbeat_thread();

    // Crash recovery: если есть route.state — восстанавливаем route ПЕРЕД cleanup
    let route_state_path = route_state_path_pub();
    if route_state_path.exists() {
        eprintln!("[cleanup] found route.state — restoring routes...");
        if let Ok(output) = Command::new("sudo")
            .args(["-n", "cat", &route_state_path.to_string_lossy()])
            .output()
        {
            let content = String::from_utf8_lossy(&output.stdout);
            let mut lines = content.lines();
            if let Some(server) = lines.next() {
                let server = server.trim();
                let iface = lines.next().map(|s| s.trim()).unwrap_or("");
                let gateway = lines.next().map(|s| s.trim()).unwrap_or("");
                let (iface, gateway) = if iface.contains('.') || iface.contains(':') {
                    ("", iface)
                } else {
                    (iface, gateway)
                };
                if !server.is_empty() && !gateway.is_empty() {
                    eprintln!("[cleanup] restoring route: server={}, iface={}, gateway={}", server, iface, gateway);
                    let _ = Command::new("sudo")
                        .args(["-n", "route", "delete", "-host", server])
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .status();
                    let _ = Command::new("sudo")
                        .args(["-n", "route", "delete", "default"])
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .status();
                    let _ = Command::new("sudo")
                        .args(["-n", "route", "add", "default", gateway])
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .status();
                    eprintln!("[cleanup] route restored");
                }
            }
        }
        let _ = Command::new("sudo")
            .args(["-n", "rm", "-f", &route_state_path.to_string_lossy()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    // Stop + uninstall daemons
    for label in &[XL2TPD_LABEL, CHARON_LABEL] {
        let _ = Command::new("sudo")
            .args(["-n", "launchctl", "kill", "SIGTERM", &format!("system/{}", label)])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
        let _ = Command::new("sudo")
            .args(["-n", "launchctl", "bootout", &format!("system/{}", label)])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
        let _ = Command::new("sudo")
            .args(["-n", "rm", "-f", &plist_path(label).to_string_lossy()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    // Kill orphans
    for proc in &["charon", "xl2tpd", "pppd"] {
        let _ = Command::new("sudo")
            .args(["-n", "pkill", "-9", "-f", proc])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    // Cleanup stale system files
    for path in &["/var/run/charon.pid", "/var/run/charon.vici", "/var/run/charon.ctl"] {
        let _ = Command::new("sudo")
            .args(["-n", "rm", "-f", path])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    // Cleanup /tmp/l2tp/
    let tmp_l2tp = std::path::Path::new("/tmp/l2tp");
    if tmp_l2tp.exists() {
        if let Ok(entries) = fs::read_dir(tmp_l2tp) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let _ = fs::remove_dir_all(&path);
                } else {
                    let _ = fs::remove_file(&path);
                }
            }
        }
        let _ = fs::remove_dir(tmp_l2tp);
    }

    // Cleanup /private/var/root/l2tp-hub/
    let _ = Command::new("sudo")
        .args(["-n", "rm", "-rf", "/private/var/root/l2tp-hub"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    eprintln!("[cleanup] VPN state cleanup done");
}
