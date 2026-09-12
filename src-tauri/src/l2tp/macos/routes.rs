use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::log;
use crate::sudo::SudoSession;

use super::guardian::get_default_gateway;

// ---------------------------------------------------------------------------
// Route state management — умное восстановление через физический интерфейс
// ---------------------------------------------------------------------------

/// Путь к файлу с сохранённым состоянием маршрутизации
fn route_state_path() -> PathBuf {
    PathBuf::from("/private/var/root/l2tp-hub/route.state")
}

/// Захватить текущий физический маршрут ДО поднятия VPN.
/// Сохраняет (interface, gateway) — не просто gateway, т.к. при full-tunnel
/// VPN забирает default route и `route -n get default` будет врать.
pub fn capture_physical_route() -> Result<(String, String), String> {
    let output = Command::new("route")
        .args(["-n", "get", "default"])
        .output()
        .map_err(|e| format!("route -n get default: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let interface = parse_route_field(&text, "interface")?;
    let gateway = parse_route_field(&text, "gateway")?;

    log!("[route] captured physical route: iface={}, gw={}", interface, gateway);
    Ok((interface, gateway))
}

/// Парсит поле из вывода `route -n get default`
fn parse_route_field(text: &str, field: &str) -> Result<String, String> {
    for line in text.lines() {
        let line = line.trim();
        if line.starts_with(field) {
            let val = line.split_whitespace().last()
                .ok_or_else(|| format!("empty {} in route output", field))?;
            return Ok(val.to_string());
        }
    }
    Err(format!("{} not found in route output", field))
}

/// Сохранить состояние маршрутизации на диск (для crash recovery)
/// Формат: server\ninterface\ngateway\ntunnel_mode\nroute1,route2,...
pub fn save_route_state(sudo: &SudoSession, server: &str, iface: &str, gateway: &str, tunnel_mode: &str, split_routes: &[String]) -> Result<(), String> {
    let routes_str = split_routes.join(",");
    let content = format!("{}\n{}\n{}\n{}\n{}\n", server, iface, gateway, tunnel_mode, routes_str);
    let path = route_state_path();
    let tmp = "/tmp/l2tp-route.state";
    fs::write(tmp, &content).map_err(|e| format!("write route state: {}", e))?;
    sudo.run_sudo(&["mkdir", "-p", &path.parent().unwrap().to_string_lossy()])?;
    sudo.run_sudo(&["cp", tmp, &path.to_string_lossy()])?;
    sudo.run_sudo(&["chmod", "600", &path.to_string_lossy()])?;
    sudo.run_sudo(&["chown", "root:wheel", &path.to_string_lossy()])?;
    let _ = fs::remove_file(tmp);
    log!("[route] saved state: server={}, iface={}, gw={}, mode={}, routes={}", server, iface, gateway, tunnel_mode, routes_str);
    Ok(())
}

/// Загрузить сохранённое состояние маршрутизации с диска
pub fn load_route_state(sudo: &SudoSession) -> Option<(String, String, String, String, Vec<String>)> {
    let path = route_state_path();
    let output = sudo.run_sudo(&["cat", &path.to_string_lossy()]).ok()?;
    let mut lines = output.lines();
    let server = lines.next()?.trim().to_string();
    let iface = lines.next()?.trim().to_string();
    let gateway = lines.next()?.trim().to_string();
    if server.is_empty() || gateway.is_empty() {
        return None;
    }
    // Обратная совместимость: старый формат (server\ngateway\n) — iface отсутствует
    if iface.contains('.') || iface.contains(':') {
        let mode = lines.next().unwrap_or("full").trim().to_string();
        let routes_str = lines.next().unwrap_or("").trim().to_string();
        let routes = if routes_str.is_empty() { vec![] } else { routes_str.split(',').map(|s| s.to_string()).collect() };
        Some((server, String::new(), iface, mode, routes))
    } else {
        let mode = lines.next().unwrap_or("full").trim().to_string();
        let routes_str = lines.next().unwrap_or("").trim().to_string();
        let routes = if routes_str.is_empty() { vec![] } else { routes_str.split(',').map(|s| s.to_string()).collect() };
        Some((server, iface, gateway, mode, routes))
    }
}

/// Удалить файл состояния маршрутизации
pub fn clear_route_state(sudo: &SudoSession) {
    let _ = sudo.run_sudo(&["rm", "-f", &route_state_path().to_string_lossy()]);
    log!("[route] state cleared");
}

/// Умное восстановление route: проверяет жив ли исходный интерфейс,
/// берёт актуальный gateway, ищет альтернативный интерфейс если сеть сменилась.
pub fn resolve_restore_gateway(original_iface: &str, original_gw: &str) -> Option<String> {
    let iface_active = if !original_iface.is_empty() {
        Command::new("ifconfig")
            .arg(original_iface)
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("status: active"))
            .unwrap_or(false)
    } else {
        false
    };

    if iface_active {
        if let Some(gw) = get_gateway_for_interface(original_iface) {
            log!("[route] original iface {} still active, gw={}", original_iface, gw);
            return Some(gw);
        }
    }

    if !original_gw.is_empty() {
        log!("[route] original iface {} not active, trying saved gw={}", original_iface, original_gw);
        let ping_ok = Command::new("ping")
            .args(["-c", "1", "-t", "2", original_gw])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if ping_ok {
            log!("[route] saved gateway {} is reachable", original_gw);
            return Some(original_gw.to_string());
        }
        log!("[route] saved gateway {} is unreachable", original_gw);
    }

    log!("[route] searching for alternative active interface");
    find_any_active_physical_gateway()
}

/// Получить gateway для конкретного интерфейса через -ifscope
fn get_gateway_for_interface(iface: &str) -> Option<String> {
    let output = Command::new("route")
        .args(["-n", "get", "-ifscope", iface, "default"])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    parse_route_field(&text, "gateway").ok()
}

/// Найти gateway на любом активном физическом интерфейсе (не ppp, не utun, не lo)
fn find_any_active_physical_gateway() -> Option<String> {
    for iface in &["en0", "en1", "en2", "en3", "en4"] {
        let active = Command::new("ifconfig")
            .arg(iface)
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("status: active"))
            .unwrap_or(false);
        if active {
            if let Some(gw) = get_gateway_for_interface(iface) {
                log!("[route] found active physical iface {} with gw={}", iface, gw);
                return Some(gw);
            }
        }
    }

    if let Ok(output) = Command::new("scutil").args(["--nwi"]).output() {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if line.contains("IPv4 default") {
                if let Some(iface) = line.split(':').last().map(|s| s.trim()) {
                    if let Some(gw) = get_gateway_for_interface(iface) {
                        log!("[route] scutil nwi: primary iface {} gw={}", iface, gw);
                        return Some(gw);
                    }
                }
            }
        }
    }

    log!("[route] WARNING: no active physical interface found");
    None
}

/// Восстановить route — умная версия
pub fn restore_routes(sudo: &SudoSession, server: &str, original_iface: &str, original_gw: &str, tunnel_mode: &str, split_routes: &[String]) {
    log!("[route] restoring: server={}, iface={}, gw={}, mode={}", server, original_iface, original_gw, tunnel_mode);

    let r1 = sudo.run_sudo(&["route", "delete", "-host", server]);
    log!("[route] route delete -host {}: {:?}", server, r1);

    if tunnel_mode == "split" {
        log!("[route] split mode — removing {} subnet routes", split_routes.len());
        for route in split_routes {
            let r = sudo.run_sudo(&["route", "delete", "-net", route]);
            log!("[route] route delete -net {}: {:?}", route, r);
        }
    } else {
        match resolve_restore_gateway(original_iface, original_gw) {
            Some(ref gw) => {
                let r_del = sudo.run_sudo(&["route", "delete", "default"]);
                log!("[route] route delete default: {:?}", r_del);
                let r_add = sudo.run_sudo(&["route", "add", "default", gw]);
                log!("[route] route add default {}: {:?}", gw, r_add);
                match get_default_gateway() {
                    Ok(gw) => log!("[route] current default gateway after restore: {}", gw),
                    Err(e) => log!("[route] WARNING: can't verify gateway after restore: {}", e),
                }
            }
            None => {
                log!("[route] WARNING: cannot resolve restore gateway — route NOT restored");
                let _ = sudo.run_sudo(&["route", "delete", "default"]);
            }
        }
    }
}

/// Путь к файлу route.state (для cleanup)
pub fn route_state_path_pub() -> PathBuf {
    route_state_path()
}
