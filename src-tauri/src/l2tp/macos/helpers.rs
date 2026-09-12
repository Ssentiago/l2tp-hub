use std::process::Command;

use crate::log;
use crate::sudo::SudoSession;

use super::paths::{CHARON_LABEL, XL2TPD_LABEL};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

pub fn log_system_state(name: &str) {
    log!("[l2tp] ===== SYSTEM STATE DUMP ({}) =====", name);

    if let Ok(output) = Command::new("route").args(["-n", "get", "default"]).output() {
        log!("[l2tp] --- default gateway ---\n{}", String::from_utf8_lossy(&output.stdout));
    }

    if let Ok(output) = Command::new("netstat").args(["-rn"]).output() {
        log!("[l2tp] --- routing table ---\n{}", String::from_utf8_lossy(&output.stdout));
    }

    if let Ok(output) = Command::new("ifconfig").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let filtered: Vec<&str> = stdout.lines()
            .scan(false, |in_section, line| {
                if line.is_empty() { *in_section = false; }
                if line.starts_with("ppp") || line.starts_with("utun") { *in_section = true; }
                Some((*in_section, line))
            })
            .filter(|(keep, _)| *keep)
            .map(|(_, line)| line)
            .collect();
        if filtered.is_empty() {
            log!("[l2tp] --- ppp/utun interfaces: NONE ---");
        } else {
            log!("[l2tp] --- ppp/utun interfaces ---\n{}", filtered.join("\n"));
        }
    }

    if let Ok(output) = Command::new("ps").args(["-ax", "-o", "pid,ppid,comm"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let vpn_procs: Vec<&str> = stdout.lines()
            .filter(|l| l.contains("charon") || l.contains("xl2tpd") || l.contains("pppd"))
            .collect();
        if vpn_procs.is_empty() {
            log!("[l2tp] --- VPN processes: NONE ---");
        } else {
            log!("[l2tp] --- VPN processes ---\n{}", vpn_procs.join("\n"));
        }
    }

    for label in &[CHARON_LABEL, XL2TPD_LABEL] {
        if let Ok(output) = Command::new("launchctl")
            .args(["print", &format!("system/{}", label)])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("state =") || line.contains("pid =") || line.contains("exit") {
                    log!("[l2tp] launchd {} → {}", label, line.trim());
                }
            }
        }
    }

    log!("[l2tp] ===== END SYSTEM STATE =====");
}

pub fn is_process_running_global(name: &str) -> bool {
    Command::new("ps")
        .args(["-ax", "-o", "comm="])
        .output()
        .map(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.lines().any(|line| {
                let comm = line.trim();
                comm.ends_with(name) || comm == name
            })
        })
        .unwrap_or(false)
}

/// Найти активный PPP интерфейс (ppp0, ppp1, ...)
pub fn find_ppp_interface() -> Option<String> {
    let output = Command::new("ifconfig").output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.starts_with("ppp") && line.contains("UP") && line.contains("RUNNING") {
            let iface = line.split(':').next()?.to_string();
            return Some(iface);
        }
    }
    None
}

/// Найти НОВЫЙ ppp интерфейс — возвращает последний (highest-numbered) pppN
pub fn find_new_ppp_interface() -> Option<String> {
    let output = Command::new("ifconfig").output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut last_ppp: Option<String> = None;
    for line in stdout.lines() {
        if line.starts_with("ppp") && line.contains("UP") && line.contains("RUNNING") {
            let iface = line.split(':').next()?.to_string();
            last_ppp = Some(iface);
        }
    }
    last_ppp
}

/// Подсчитать количество активных ppp интерфейсов (UP + RUNNING)
pub fn count_ppp_interfaces() -> usize {
    Command::new("ifconfig")
        .output()
        .map(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.lines()
                .filter(|line| line.starts_with("ppp") && line.contains("UP") && line.contains("RUNNING"))
                .count()
        })
        .unwrap_or(0)
}

/// Destroy stale ppp interfaces — macOS оставляет pppN после убийства pppd.
/// Без destroy следующий pppd с `unit N` падает: "Couldn't create new ppp unit"
pub fn destroy_stale_ppp_interfaces(sudo: &SudoSession) {
    if let Ok(output) = Command::new("ifconfig").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.starts_with("ppp") {
                if let Some(iface) = line.split(':').next() {
                    log!("[l2tp] destroying stale PPP interface: {}", iface);
                    sudo.run_sudo(&["ifconfig", iface, "destroy"]).ok();
                }
            }
        }
    }
}

/// Проверяет, жив ли IPSec SA для данного подключения.
pub fn check_ipsec_sa_alive(sudo: &crate::sudo::SudoSession, _name: &str) -> bool {
    use super::paths::{active_dir, swanctl_bin};

    if !is_process_running_global("charon") || !is_process_running_global("pppd") {
        log!("[sleep-wake] VPN processes dead (charon={}, pppd={})",
            is_process_running_global("charon"), is_process_running_global("pppd"));
        return false;
    }

    let active = active_dir();
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();

    let list_result = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--list-sas", "--raw",
    ]);

    match list_result {
        Ok(stdout) => {
            let alive = stdout.contains("ESTABLISHED");
            log!("[sleep-wake] SA check: ESTABLISHED={}, output: {}", alive, stdout.trim());
            alive
        }
        Err(stderr) => {
            log!("[sleep-wake] SA check failed: {}", stderr);
            false
        }
    }
}
