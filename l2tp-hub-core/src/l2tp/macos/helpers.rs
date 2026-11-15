use std::collections::HashSet;
use std::fs;
use std::process::Command;

use crate::executor::PrivilegedExecutor;

use super::paths::{config_dir, active_dir, swanctl_bin, CHARON_LABEL, XL2TPD_LABEL};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

pub fn log_system_state(name: &str) {
    log::debug!("[l2tp] ===== SYSTEM STATE DUMP ({}) =====", name);

    if let Ok(output) = Command::new("route").args(["-n", "get", "default"]).output() {
        log::debug!("[l2tp] --- default gateway ---\n{}", String::from_utf8_lossy(&output.stdout));
    }

    if let Ok(output) = Command::new("netstat").args(["-rn"]).output() {
        log::debug!("[l2tp] --- routing table ---\n{}", String::from_utf8_lossy(&output.stdout));
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
            log::debug!("[l2tp] --- ppp/utun interfaces: NONE ---");
        } else {
            log::debug!("[l2tp] --- ppp/utun interfaces ---\n{}", filtered.join("\n"));
        }
    }

    if let Ok(output) = Command::new("ps").args(["-ax", "-o", "pid,ppid,comm"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let vpn_procs: Vec<&str> = stdout.lines()
            .filter(|l| l.contains("charon") || l.contains("xl2tpd") || l.contains("pppd"))
            .collect();
        if vpn_procs.is_empty() {
            log::debug!("[l2tp] --- VPN processes: NONE ---");
        } else {
            log::debug!("[l2tp] --- VPN processes ---\n{}", vpn_procs.join("\n"));
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
                    log::debug!("[l2tp] launchd {} → {}", label, line.trim());
                }
            }
        }
    }

    log::debug!("[l2tp] ===== END SYSTEM STATE =====");
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

/// Номер ppp-юнита, назначенный подключению при генерации merged-конфигов.
/// Каждый LAC получает `unit {idx}`, что соответствует интерфейсу ppp{idx}.
pub fn ppp_unit_marker(service_name: &str) -> Option<u32> {
    let text = fs::read_to_string(config_dir(service_name).join("ppp-unit")).ok()?;
    text.trim().parse().ok()
}

/// Работает ли конкретный ppp-интерфейс (ppp{unit}) в состоянии UP + RUNNING.
pub fn is_ppp_unit_running(unit: u32) -> bool {
    Command::new("ifconfig")
        .arg(format!("ppp{}", unit))
        .output()
        .map(|output| String::from_utf8_lossy(&output.stdout).contains("RUNNING"))
        .unwrap_or(false)
}

/// Имена установленных IKE SA (имена секций swanctl.conf) из `swanctl --list-sas --raw`.
/// Имя секции — sanitize_name(service_name). Команда совпадает по форме с вызовами
/// check_ipsec_sa_alive и connect_vpn, поэтому allowlist хелпера её уже пропускает.
pub fn established_ike_sas(sudo: &dyn PrivilegedExecutor) -> Result<HashSet<String>, String> {
    let strongswan_conf = active_dir().join("strongswan.conf");
    let swanctl = swanctl_bin();
    let output = sudo.run(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--list-sas", "--raw",
    ])?;

    Ok(parse_established_ike_sas(&output))
}

/// Разбор `swanctl --list-sas --raw`: vici_dump печатает каждое событие одной строкой
/// вида `list-sa event {<name> {uniqueid=.. state=ESTABLISHED .. child-sas {..}}}`.
/// Ключ state= до подсекции child-sas — состояние самого IKE SA,
/// внутри child-sas state= принадлежит CHILD SA и не учитывается.
fn parse_established_ike_sas(output: &str) -> HashSet<String> {
    let mut names = HashSet::new();
    for line in output.lines() {
        let line = line.trim();
        let Some(rest) = line.strip_prefix("list-sa event {") else { continue; };
        let Some((name, body)) = rest.split_once(" {") else { continue; };
        let ike_part = body.split("child-sas {").next().unwrap_or(body);
        if ike_part.split_whitespace().any(|token| token == "state=ESTABLISHED") {
            names.insert(name.trim().to_string());
        }
    }
    names
}

#[cfg(test)]
mod tests {
    use super::parse_established_ike_sas;

    #[test]
    fn parses_established_sa_name() {
        let out = "list-sa event {home {uniqueid=2 version=1 state=ESTABLISHED local-host=192.168.0.2 child-sas {home-4 {name=home uniqueid=4 state=INSTALLED mode=TRANSPORT}}}}\n";
        let names = parse_established_ike_sas(out);
        assert!(names.contains("home"));
    }

    #[test]
    fn ignores_non_established_sa() {
        let out = "list-sa event {home {uniqueid=2 version=1 state=CONNECTING child-sas {home-4 {name=home uniqueid=4 state=INSTALLED}}}}\n";
        let names = parse_established_ike_sas(out);
        assert!(!names.contains("home"));
    }

    #[test]
    fn child_state_is_not_ike_state() {
        // IKE SA умирает, CHILD SA ещё INSTALLED: подключение не считается установленным
        let out = "list-sa event {home {uniqueid=2 version=1 state=DESTROYING child-sas {home-4 {name=home uniqueid=4 state=INSTALLED}}}}\n";
        let names = parse_established_ike_sas(out);
        assert!(!names.contains("home"));
    }

    #[test]
    fn distinguishes_names_and_ignores_reply() {
        let out = concat!(
            "list-sa event {alpha {uniqueid=1 version=1 state=ESTABLISHED child-sas {alpha-1 {name=alpha state=INSTALLED}}}}\n",
            "list-sa event {alpha-2 {uniqueid=2 version=1 state=CONNECTING}}\n",
            "list-sas reply {\n}\n",
        );
        let names = parse_established_ike_sas(out);
        assert!(names.contains("alpha"));
        assert!(!names.contains("alpha-2"));
    }
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
pub fn destroy_stale_ppp_interfaces(sudo: &dyn PrivilegedExecutor) {
    if let Ok(output) = Command::new("ifconfig").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.starts_with("ppp") {
                if let Some(iface) = line.split(':').next() {
                    log::debug!("[l2tp] destroying stale PPP interface: {}", iface);
                    sudo.run(&["ifconfig", iface, "destroy"]).ok();
                }
            }
        }
    }
}

/// Проверяет, жив ли IPSec SA для данного подключения.
pub fn check_ipsec_sa_alive(sudo: &dyn crate::executor::PrivilegedExecutor, _name: &str) -> bool {
    if !is_process_running_global("charon") || !is_process_running_global("pppd") {
        log::debug!("[sleep-wake] VPN processes dead (charon={}, pppd={})",
            is_process_running_global("charon"), is_process_running_global("pppd"));
        return false;
    }

    let active = active_dir();
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();

    let list_result = sudo.run(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--list-sas", "--raw",
    ]);

    match list_result {
        Ok(stdout) => {
            let alive = stdout.contains("ESTABLISHED");
            log::debug!("[sleep-wake] SA check: ESTABLISHED={}, output: {}", alive, stdout.trim());
            alive
        }
        Err(stderr) => {
            log::debug!("[sleep-wake] SA check failed: {}", stderr);
            false
        }
    }
}
