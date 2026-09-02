use crate::l2tp::VpnStatus;
use crate::log;
use crate::state;
use crate::sudo::SudoSession;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};

/// Heartbeat thread control — sends heartbeat to guardian every 3 seconds
static HEARTBEAT_RUNNING: AtomicBool = AtomicBool::new(false);

// ---------------------------------------------------------------------------
// ConnectError — классификация ошибок подключения для UI
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum ConnectError {
    #[serde(rename = "server_unreachable")]
    ServerUnreachable,
    #[serde(rename = "auth_failed")]
    AuthenticationFailed,
    #[serde(rename = "no_proposal")]
    NoProposalChosen,
    #[serde(rename = "ppp_auth_failed")]
    PppAuthFailed,
    #[serde(rename = "unknown")]
    Unknown(String),
}

impl ConnectError {
    pub fn user_message(&self) -> &str {
        match self {
            ConnectError::ServerUnreachable => "Сервер не отвечает. Проверьте адрес сервера и подключение к интернету.",
            ConnectError::AuthenticationFailed => "Неверный общий ключ (PSK). Проверьте настройки подключения.",
            ConnectError::NoProposalChosen => "Сервер не поддерживает используемые алгоритмы шифрования. Обратитесь к администратору сети.",
            ConnectError::PppAuthFailed => "Неверное имя пользователя или пароль.",
            ConnectError::Unknown(_) => "Не удалось подключиться. Проверьте логи для подробностей.",
        }
    }
}

/// Классифицирует ошибку подключения по логам charon и pppd
pub fn classify_connect_failure(charon_log: &str, pppd_log: &str) -> ConnectError {
    if charon_log.contains("NO_PROPOSAL_CHOSEN")
        || charon_log.contains("no proposal found")
        || charon_log.contains("no acceptable proposal found")
    {
        return ConnectError::NoProposalChosen;
    }
    if charon_log.contains("AUTHENTICATION_FAILED")
        || (charon_log.contains("authentication of") && charon_log.contains("failed"))
        || charon_log.contains("INVALID_ID_INFORMATION")
    {
        return ConnectError::AuthenticationFailed;
    }
    if pppd_log.contains("CHAP authentication failed")
        || pppd_log.contains("PAP authentication failed")
    {
        return ConnectError::PppAuthFailed;
    }
    if charon_log.contains("giving up after")
        || charon_log.contains("retransmit")
        || !charon_log.contains("received packet")
    {
        return ConnectError::ServerUnreachable;
    }
    ConnectError::Unknown(format!("charon: {}\npppd: {}", charon_log, pppd_log))
}

/// Читает лог-файл (best effort)
fn read_log_tail(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_default()
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHARON_LABEL: &str = "com.sentiago.l2tp-hub.charon";
const XL2TPD_LABEL: &str = "com.sentiago.l2tp-hub.xl2tpd";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

fn app() -> &'static AppHandle {
    &state::get_state().app
}

pub fn config_dir(name: &str) -> PathBuf {
    let base = app()
        .path()
        .app_data_dir()
        .expect("app_data_dir")
        .join("ipsec")
        .join(name);
    fs::create_dir_all(&base).ok();
    base
}

/// Фиксированная директория для активного конфига.
/// /private/var/root/ — только root имеет доступ. Конфиги содержат PSK и пароли.
fn active_dir() -> PathBuf {
    PathBuf::from("/private/var/root/l2tp-hub/active")
}

/// Создать active dir с правами 700 (только root)
fn ensure_active_dir(sudo: &SudoSession) -> Result<(), String> {
    let dir = active_dir();
    sudo.run_sudo(&["mkdir", "-p", &dir.to_string_lossy()])?;
    sudo.run_sudo(&["chmod", "700", &dir.to_string_lossy()])?;
    sudo.run_sudo(&["chown", "root:wheel", &dir.to_string_lossy()])?;
    Ok(())
}

fn find_resource(relative: &str) -> PathBuf {
    let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join(relative);
    if dev_path.exists() {
        return dev_path;
    }
    app().path()
        .resource_dir()
        .expect("resource_dir")
        .join(relative)
}

fn charon_bin() -> PathBuf {
    find_resource("ipsec/charon")
}

fn swanctl_bin() -> PathBuf {
    find_resource("ipsec/swanctl")
}

fn xl2tpd_bin() -> PathBuf {
    find_resource("xl2tpd/xl2tpd")
}

fn charon_lib_dir() -> PathBuf {
    charon_bin().parent().unwrap().to_path_buf()
}

fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' { c } else { '_' })
        .collect()
}

fn plist_path(label: &str) -> PathBuf {
    PathBuf::from(format!("/Library/LaunchDaemons/{}.plist", label))
}

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
fn capture_physical_route() -> Result<(String, String), String> {
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
/// Формат: server\ninterface\ngateway\n
fn save_route_state(sudo: &SudoSession, server: &str, iface: &str, gateway: &str) -> Result<(), String> {
    let content = format!("{}\n{}\n{}\n", server, iface, gateway);
    let path = route_state_path();
    let tmp = "/tmp/l2tp-route.state";
    fs::write(tmp, &content).map_err(|e| format!("write route state: {}", e))?;
    sudo.run_sudo(&["mkdir", "-p", &path.parent().unwrap().to_string_lossy()])?;
    sudo.run_sudo(&["cp", tmp, &path.to_string_lossy()])?;
    sudo.run_sudo(&["chmod", "600", &path.to_string_lossy()])?;
    sudo.run_sudo(&["chown", "root:wheel", &path.to_string_lossy()])?;
    let _ = fs::remove_file(tmp);
    log!("[route] saved state: server={}, iface={}, gw={}", server, iface, gateway);
    Ok(())
}

/// Загрузить сохранённое состояние маршрутизации с диска
fn load_route_state(sudo: &SudoSession) -> Option<(String, String, String)> {
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
        // iface выглядит как IP — значит это старый формат, gateway попал на строку iface
        Some((server, String::new(), iface))
    } else {
        Some((server, iface, gateway))
    }
}

/// Удалить файл состояния маршрутизации
fn clear_route_state(sudo: &SudoSession) {
    let _ = sudo.run_sudo(&["rm", "-f", &route_state_path().to_string_lossy()]);
    log!("[route] state cleared");
}

/// Умное восстановление route: проверяет жив ли исходный интерфейс,
/// берёт актуальный gateway, ищет альтернативный интерфейс если сеть сменилась.
fn resolve_restore_gateway(original_iface: &str, original_gw: &str) -> Option<String> {
    // Шаг 1: жив ли физический интерфейс?
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
        // Берём ТЕКУЩИЙ gateway на этом интерфейсе (мог смениться роутер)
        if let Some(gw) = get_gateway_for_interface(original_iface) {
            log!("[route] original iface {} still active, gw={}", original_iface, gw);
            return Some(gw);
        }
    }

    // Шаг 2: интерфейс не активен — пробуем сохранённый gateway (может ещё роутер жив)
    if !original_gw.is_empty() {
        log!("[route] original iface {} not active, trying saved gw={}", original_iface, original_gw);
        // Проверяем что saved gateway пингуется
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

    // Шаг 3: ищем любой активный физический интерфейс
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
    // Перебираем типичные физические интерфейсы macOS
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

    // Fallback: scutil --nwi для определения primary interface
    if let Ok(output) = Command::new("scutil").args(["--nwi"]).output() {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if line.contains("IPv4 default") {
                // Парсим "IPv4 default interface : en0"
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
fn restore_routes(sudo: &SudoSession, server: &str, original_iface: &str, original_gw: &str) {
    log!("[route] restoring: server={}, original_iface={}, original_gw={}", server, original_iface, original_gw);

    // 1. Удаляем host route к VPN-серверу (безопасно всегда)
    let r1 = sudo.run_sudo(&["route", "delete", "-host", server]);
    log!("[route] route delete -host {}: {:?}", server, r1);

    // 2. Определяем актуальный gateway для восстановления
    match resolve_restore_gateway(original_iface, original_gw) {
        Some(ref gw) => {
            // 3. Удаляем текущий default (VPN-туннель)
            let r_del = sudo.run_sudo(&["route", "delete", "default"]);
            log!("[route] route delete default: {:?}", r_del);

            // 4. Добавляем default route через актуальный gateway
            let r_add = sudo.run_sudo(&["route", "add", "default", gw]);
            log!("[route] route add default {}: {:?}", gw, r_add);

            // 5. Верификация
            match get_default_gateway() {
                Ok(gw) => log!("[route] current default gateway after restore: {}", gw),
                Err(e) => log!("[route] WARNING: can't verify gateway after restore: {}", e),
            }
        }
        None => {
            log!("[route] WARNING: cannot resolve restore gateway — network may have changed, route NOT restored");
            // Всё равно удаляем VPN default, чтобы система могла сама выбрать маршрут
            let _ = sudo.run_sudo(&["route", "delete", "default"]);
        }
    }
}

const GUARDIAN_LABEL: &str = "com.sentiago.l2tp-hub.guardian";

fn guardian_bin() -> PathBuf {
    find_resource("guardian/l2tp-hub-guardian")
}

fn guardian_plist_resource() -> PathBuf {
    find_resource("guardian/com.sentiago.l2tp-hub.guardian.plist")
}

// ---------------------------------------------------------------------------
// Route guardian — постоянный daemon, общаемся через socket
// ---------------------------------------------------------------------------

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

    // bootout если уже зарегистрирован
    let _ = sudo.run_sudo(&["launchctl", "bootout", &format!("system/{}", GUARDIAN_LABEL)]);
    std::thread::sleep(std::time::Duration::from_millis(500));

    // bootstrap
    sudo.run_sudo(&["launchctl", "bootstrap", "system", &plist_dst.to_string_lossy()])?;
    log!("[guardian] daemon installed and bootstrapped");
    Ok(())
}

/// Активировать мониторинг guardian — шлём set_state через socket
fn activate_guardian(server: &str, iface: &str, gateway: &str) {
    match crate::guardian::set_state(server, iface, gateway) {
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
fn start_heartbeat_thread() {
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
                Err(_) => {
                    // Guardian может быть ещё не запущен — это нормально
                }
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

// ---------------------------------------------------------------------------
// LaunchDaemon plist generation
// ---------------------------------------------------------------------------

fn generate_charon_plist() -> String {
    let bin = charon_bin();
    let lib_dir = charon_lib_dir();
    let active = active_dir();
    format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{bin}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DYLD_LIBRARY_PATH</key>
        <string>{lib_dir}</string>
        <key>STRONGSWAN_CONF</key>
        <string>{strongswan_conf}</string>
    </dict>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/l2tp/charon-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/l2tp/charon-stderr.log</string>
</dict>
</plist>"#,
        label = CHARON_LABEL,
        bin = bin.display(),
        lib_dir = lib_dir.display(),
        strongswan_conf = active.join("strongswan.conf").display(),
    )
}

fn generate_xl2tpd_plist() -> String {
    let bin = xl2tpd_bin();
    let active = active_dir();
    format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{bin}</string>
        <string>-D</string>
        <string>-c</string>
        <string>{conf}</string>
        <string>-p</string>
        <string>{pid}</string>
        <string>-l</string>
    </array>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/l2tp/xl2tpd-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/l2tp/xl2tpd-stderr.log</string>
</dict>
</plist>"#,
        label = XL2TPD_LABEL,
        bin = bin.display(),
        conf = active.join("xl2tpd.conf").display(),
        pid = active.join("xl2tpd.pid").display(),
    )
}

// ---------------------------------------------------------------------------
// LaunchDaemon lifecycle
// ---------------------------------------------------------------------------

/// Установить LaunchDaemon plist в /Library/LaunchDaemons и bootstrap.
fn install_daemon(sudo: &SudoSession, label: &str, plist_content: &str) -> Result<(), String> {
    let path = plist_path(label);
    let tmp_path = format!("/tmp/{}.plist", label);

    fs::write(&tmp_path, plist_content)
        .map_err(|e| format!("write plist {}: {}", tmp_path, e))?;

    sudo.run_sudo(&["cp", &tmp_path, &path.to_string_lossy()])?;
    sudo.run_sudo(&["chmod", "644", &path.to_string_lossy()])?;
    sudo.run_sudo(&["chown", "root:wheel", &path.to_string_lossy()])?;

    // bootout если уже зарегистрирован (ignore error)
    match sudo.run_sudo(&["launchctl", "bootout", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl bootout {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => log!("[l2tp] launchctl bootout {} (expected if not registered): {}", label, e.trim()),
    }
    // Пауза — bootout может быть асинхронным
    std::thread::sleep(std::time::Duration::from_millis(500));

    // bootstrap
    match sudo.run_sudo(&["launchctl", "bootstrap", "system", &path.to_string_lossy()]) {
        Ok(out) => log!("[l2tp] launchctl bootstrap {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => {
            log!("[l2tp] ERROR launchctl bootstrap {}: {}", label, e);
            return Err(format!("launchctl bootstrap {}: {}", label, e));
        }
    }
    log!("[l2tp] daemon installed: {}", label);
    Ok(())
}

/// Запустить демон через launchctl kickstart.
fn start_daemon(sudo: &SudoSession, label: &str) -> Result<(), String> {
    match sudo.run_sudo(&["launchctl", "kickstart", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl kickstart {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => {
            log!("[l2tp] ERROR launchctl kickstart {}: {}", label, e);
            return Err(format!("launchctl kickstart {}: {}", label, e));
        }
    }
    Ok(())
}

/// Остановить демон через launchctl kill SIGTERM.
fn stop_daemon(sudo: &SudoSession, label: &str) {
    match sudo.run_sudo(&["launchctl", "kill", "SIGTERM", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl kill {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => log!("[l2tp] launchctl kill {} (may not be running): {}", label, e.trim()),
    }
}

/// Удалить LaunchDaemon (bootout + rm plist).
fn uninstall_daemon(sudo: &SudoSession, label: &str) {
    match sudo.run_sudo(&["launchctl", "bootout", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl bootout {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => log!("[l2tp] launchctl bootout {} (may not exist): {}", label, e.trim()),
    }
    let _ = sudo.run_sudo(&["rm", "-f", &plist_path(label).to_string_lossy()]);
}

// ---------------------------------------------------------------------------
// Config generation — swanctl.conf (VICI) + xl2tpd + pppd
// ---------------------------------------------------------------------------

fn generate_configs(
    dir: &PathBuf,
    name: &str,
    server: &str,
    username: &str,
    password: &str,
    shared_secret: &str,
    original_gateway: &str,
) -> Result<(), String> {
    let section = sanitize_name(name);

    // swanctl.conf — VICI configuration
    fs::write(
        dir.join("swanctl.conf"),
        format!(
            r#"connections {{

    {section} {{
        version = 1
        local_addrs = %any
        remote_addrs = {server}
        encap = yes

        local {{
            auth = psk
            id = %any
        }}
        remote {{
            auth = psk
            id = {server}
        }}
        children {{
            {section} {{
                mode = transport
                local_ts = dynamic[udp/1701]
                remote_ts = dynamic[udp/1701]
                esp_proposals = aes256-sha256,aes128-sha256,aes256-sha1,aes128-sha1
                start_action = start
            }}
        }}
        proposals = aes256-sha256-modp2048,aes128-sha256-modp2048,aes256-sha1-modp2048,aes128-sha1-modp2048
    }}
}}

secrets {{
    ike-{section} {{
        id = {server}
        secret = "{shared_secret}"
    }}
}}
"#
        ),
    )
    .map_err(|e| format!("swanctl.conf: {}", e))?;

    // xl2tpd.conf — pppoptfile через active_dir (нет пробелов в пути)
    let active = active_dir();
    fs::write(
        dir.join("xl2tpd.conf"),
        format!(
            r#"[global]
port = 1701

[lac {name}]
lns = {server}
ppp debug = yes
pppoptfile = {ppp_opts}
length bit = yes
autodial = yes
redial = yes
redial timeout = 5
max redials = 30
"#
        , ppp_opts = active.join("options.xl2tpd").display()),
    )
    .map_err(|e| format!("xl2tpd.conf: {}", e))?;

    // options.xl2tpd (PPP options)
    let ppp_log = format!("/tmp/l2tp/{}-pppd.log", sanitize_name(name));
    fs::write(
        dir.join("options.xl2tpd"),
        format!(
            r#"noauth
nodeflate
nopcomp
noaccomp
default-asyncmap
novj
novjccomp
noccp
nodetach
local
nocrtscts
noipdefault
usepeerdns
ipcp-accept-local
ipcp-accept-remote
lcp-echo-failure 10
lcp-echo-interval 30
mtu 1400
mru 1400
debug
logfile {ppp_log}
ipparam {name}
name "{username}"
password "{password}"
"#
        , ppp_log = ppp_log),
    )
    .map_err(|e| format!("options.xl2tpd: {}", e))?;

    // strongswan.conf — charon runtime config
    let log_path = format!("/tmp/l2tp/{}-charon", sanitize_name(name));
    fs::write(
        dir.join("strongswan.conf"),
        format!(
            r#"charon {{
    install_routes = no
    install_virtual_ip = no
    filelog {{
        {log_path} {{
            default = 1
            time_format = %b %e %T
        }}
    }}
}}
"#
        , log_path = log_path),
    )
    .map_err(|e| format!("strongswan.conf: {}", e))?;

    // ip-up — pppd вызывает при подключении PPP-сессии
    // ЗАГЛУШКА: route management целиком из Rust, не из pppd скриптов
    fs::write(
        dir.join("ip-up"),
        r#"#!/bin/bash
# L2TP Hub: route management handled by app — this is a no-op stub
exit 0
"#,
    )
    .map_err(|e| format!("ip-up: {}", e))?;

    // ip-down — pppd вызывает при отключении
    // ЗАГЛУШКА: route management целиком из Rust, не из pppd скриптов
    fs::write(
        dir.join("ip-down"),
        r#"#!/bin/bash
# L2TP Hub: route management handled by app — this is a no-op stub
exit 0
"#,
    )
    .map_err(|e| format!("ip-down: {}", e))?;

    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(dir.join("ip-up"), fs::Permissions::from_mode(0o755))
        .map_err(|e| format!("ip-up chmod: {}", e))?;
    fs::set_permissions(dir.join("ip-down"), fs::Permissions::from_mode(0o755))
        .map_err(|e| format!("ip-down chmod: {}", e))?;

    Ok(())
}

/// Скопировать конфиги из connection dir в active dir (через sudo — dir принадлежит root)
fn deploy_configs_to_active(sudo: &SudoSession, name: &str) -> Result<(), String> {
    let src = config_dir(name);
    let dst = active_dir();
    ensure_active_dir(sudo)?;

    for file in &["swanctl.conf", "xl2tpd.conf", "options.xl2tpd", "strongswan.conf", "ip-up", "ip-down"] {
        let from = src.join(file);
        let to = dst.join(file);
        sudo.run_sudo(&["cp", &from.to_string_lossy(), &to.to_string_lossy()])?;
    }
    // Конфиги содержат секреты — chmod 600 (только root)
    sudo.run_sudo(&["chmod", "-R", "600", &dst.to_string_lossy()]).ok();
    sudo.run_sudo(&["chown", "-R", "root:wheel", &dst.to_string_lossy()]).ok();
    log!("[l2tp] configs deployed to {} (chmod 600, root:wheel)", dst.display());
    Ok(())
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

pub fn create_vpn_service(
    _sudo: &SudoSession,
    name: &str,
    server: &str,
    username: &str,
    password: &str,
    shared_secret: &str,
    original_gateway: &str,
) -> Result<(), String> {
    log!("[l2tp] create_vpn_service: {}", name);
    let dir = config_dir(name);
    generate_configs(&dir, name, server, username, password, shared_secret, original_gateway)?;
    Ok(())
}

pub fn delete_vpn_service(sudo: &SudoSession, name: &str) -> Result<(), String> {
    log!("[l2tp] delete_vpn_service: {}", name);
    let dir = config_dir(name);
    let _ = fs::remove_dir_all(&dir);
    // Если это активное подключение — uninstall daemons
    uninstall_daemon(sudo, CHARON_LABEL);
    uninstall_daemon(sudo, XL2TPD_LABEL);
    let _ = fs::remove_dir_all(active_dir());
    Ok(())
}

pub async fn connect_vpn(
    sudo: &SudoSession,
    name: &str,
    server: &str,
    original_gateway: &str,
) -> Result<(), String> {
    log!("[l2tp] connect_vpn: {} (server={}, gw={})", name, server, original_gateway);

    // Захватываем физический маршрут ДО поднятия VPN
    let (original_iface, original_gw) = capture_physical_route()
        .unwrap_or_else(|e| {
            log!("[route] WARNING: capture_physical_route failed: {}, using fallback", e);
            (String::new(), original_gateway.to_string())
        });

    // Сохраняем route state на ДИСК — для crash recovery
    save_route_state(sudo, server, &original_iface, &original_gw)?;

    // Очищаем логи предыдущего сеанса
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-xl2tpd.log", sanitize_name(name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-pppd.log", sanitize_name(name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-charon", sanitize_name(name)));

    // -------------------------------------------------------------------------
    // 0. Cleanup: останавливаем старые демонов, убиваем сирот
    // -------------------------------------------------------------------------
    log!("[l2tp] cleanup: stopping old daemons + killing orphans...");
    stop_daemon(sudo, XL2TPD_LABEL);
    stop_daemon(sudo, CHARON_LABEL);
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    sudo.run_sudo(&["pkill", "-9", "-f", "charon"]).ok();
    sudo.run_sudo(&["pkill", "-9", "-f", "xl2tpd"]).ok();
    sudo.run_sudo(&["pkill", "-9", "-f", "pppd"]).ok();
    sudo.run_sudo(&["bash", "-c", "lsof -ti :500 | xargs kill -9 2>/dev/null; true"]).ok();
    sudo.run_sudo(&["bash", "-c", "lsof -ti :4500 | xargs kill -9 2>/dev/null; true"]).ok();
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    sudo.run_sudo(&["rm", "-f", "/var/run/charon.pid"]).ok();
    sudo.run_sudo(&["rm", "-f", "/var/run/charon.vici"]).ok();
    sudo.run_sudo(&["rm", "-f", "/var/run/charon.ctl"]).ok();
    log!("[l2tp] cleanup done");

    // -------------------------------------------------------------------------
    // 1. Deploy configs → /tmp/l2tp/active/
    // -------------------------------------------------------------------------
    deploy_configs_to_active(sudo, name)?;
    let active = active_dir();

    // xl2tpd требует FIFO и /etc/ppp/options
    sudo.run_sudo(&["mkdir", "-p", "/var/run/xl2tpd"]).ok();
    sudo.run_sudo(&["bash", "-c", "test -p /var/run/xl2tpd/l2tp-control || mkfifo /var/run/xl2tpd/l2tp-control"]).ok();
    sudo.run_sudo(&["chmod", "600", "/var/run/xl2tpd/l2tp-control"]).ok();
    sudo.run_sudo(&["mkdir", "-p", "/etc/ppp"]).ok();
    sudo.run_sudo(&["bash", "-c", "echo 'nodetach' > /etc/ppp/options"]).ok();

    // Deploy ip-up/ip-down
    sudo.run_sudo(&["cp", &active.join("ip-up").to_string_lossy(), "/etc/ppp/ip-up"]).ok();
    sudo.run_sudo(&["cp", &active.join("ip-down").to_string_lossy(), "/etc/ppp/ip-down"]).ok();
    sudo.run_sudo(&["chmod", "755", "/etc/ppp/ip-up"]).ok();
    sudo.run_sudo(&["chmod", "755", "/etc/ppp/ip-down"]).ok();
    log!("[l2tp] deployed ip-up/ip-down to /etc/ppp/");

    // -------------------------------------------------------------------------
    // 2. Install + start charon via LaunchDaemon
    // -------------------------------------------------------------------------
    log!("[l2tp] installing charon LaunchDaemon...");
    install_daemon(sudo, CHARON_LABEL, &generate_charon_plist())?;
    start_daemon(sudo, CHARON_LABEL)?;

    // Ждём VICI socket — polling вместо слепого sleep
    log!("[l2tp] waiting for charon VICI socket...");
    let vici_path = std::path::Path::new("/var/run/charon.vici");
    let vici_deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(15);
    let mut vici_ready = false;
    while tokio::time::Instant::now() < vici_deadline {
        if vici_path.exists() {
            vici_ready = true;
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }

    if vici_ready {
        log!("[l2tp] VICI socket exists ✓");
    } else {
        log!("[l2tp] WARNING: /var/run/charon.vici does not exist after 15s!");
    }

    // -------------------------------------------------------------------------
    // 3. Загружаем конфигурацию через swanctl --load-all
    // -------------------------------------------------------------------------
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();
    let swanctl_str = swanctl.to_string_lossy();
    let swanctl_conf = active.join("swanctl.conf");

    // DYLD_LIBRARY_PATH не нужен — библиотеки резолвятся через @loader_path
    // sudo стирает DYLD_* переменные (SIP), но STRONGSWAN_CONF проходит
    let load_output = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl_str,
        "--load-all",
        "--noprompt",
        "-f",
        &swanctl_conf.to_string_lossy(),
    ]);

    match &load_output {
        Ok(stdout) => log!("[l2tp] swanctl --load-all OK: {}", stdout.trim()),
        Err(stderr) => {
            log!("[l2tp] ERROR: swanctl --load-all failed: {}", stderr);
            return Err(format!("swanctl --load-all failed: {}", stderr));
        }
    }
    log!("[l2tp] IKE negotiation starting...");

    // -------------------------------------------------------------------------
    // 4. Install + start xl2tpd via LaunchDaemon
    // -------------------------------------------------------------------------
    log!("[l2tp] installing xl2tpd LaunchDaemon...");
    install_daemon(sudo, XL2TPD_LABEL, &generate_xl2tpd_plist())?;
    start_daemon(sudo, XL2TPD_LABEL)?;

    // Ждём L2TP tunnel + pppd — polling вместо fixed sleep
    log!("[l2tp] waiting for pppd to spawn (max 30s)...");
    let mut pppd_ready = false;
    for i in 0..30 {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        if is_process_running_global("pppd") {
            log!("[l2tp] pppd detected after {}s ✓", i + 1);
            pppd_ready = true;
            break;
        }
    }

    // -------------------------------------------------------------------------
    // 5. Проверки
    // -------------------------------------------------------------------------
    if !pppd_ready {
        // Классифицируем ошибку по логам charon и pppd
        let charon_log = read_log_tail(&format!("/tmp/l2tp/{}-charon", sanitize_name(name)));
        let pppd_log = read_log_tail(&format!("/tmp/l2tp/{}-pppd.log", sanitize_name(name)));
        let error = classify_connect_failure(&charon_log, &pppd_log);
        log!("[l2tp] connection failed: {:?} — {}", error, error.user_message());
        return Err(format!("{}: {}", error.user_message(), format!("{:?}", error)));
    }

    // -------------------------------------------------------------------------
    // 5b. Явное управление route — НЕ полагаемся на ip-up скрипт
    // -------------------------------------------------------------------------
    if is_process_running_global("pppd") {
        // Находим ppp интерфейс
        let ppp_iface = find_ppp_interface();
        match ppp_iface {
            Some(ref iface) => {
                log!("[l2tp] detected PPP interface: {}", iface);
                // Host route к VPN-серверу через физический gateway
                let r1 = sudo.run_sudo(&["route", "add", "-host", server, original_gateway]);
                log!("[l2tp] route add -host {} {}: {:?}", server, original_gateway, r1);
                // Default route через PPP
                let r2 = sudo.run_sudo(&["route", "change", "default", "-interface", iface]);
                log!("[l2tp] route change default -interface {}: {:?}", iface, r2);

                // Route safety: ping через новый default чтобы убедиться что инет есть
                log!("[l2tp] verifying connectivity through new default route...");
                let ping_ok = Command::new("ping")
                    .args(["-c", "1", "-t", "3", "8.8.8.8"])
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false);

                if ping_ok {
                    log!("[l2tp] connectivity verified through VPN ✓");
                } else {
                    log!("[l2tp] WARNING: ping through VPN failed — rolling back route!");
                    // Откатываем route обратно на физический gateway
                    let _ = sudo.run_sudo(&["route", "delete", "default"]);
                    let _ = sudo.run_sudo(&["route", "add", "default", original_gateway]);
                    let _ = sudo.run_sudo(&["route", "delete", "-host", server]);
                    // Не фейлим connect — VPN может работать, просто route не через default
                    // Но логируем для диагностики
                    log!("[l2tp] route rolled back to physical gateway: {}", original_gateway);
                }

                // Проверяем
                match get_default_gateway() {
                    Ok(gw) => log!("[l2tp] current default gateway: {}", gw),
                    Err(e) => log!("[l2tp] WARNING: can't get default gateway: {}", e),
                }
            }
            None => {
                log!("[l2tp] WARNING: no PPP interface found, skipping route management");
            }
        }
    }

    // Проверяем IPSec SA
    let list_result = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl_str,
        "--list-sas",
        "--raw",
    ]);
    match list_result {
        Ok(stdout) => {
            if stdout.contains("ESTABLISHED") {
                log!("[l2tp] IPSec SA ESTABLISHED ✓");
            } else {
                log!("[l2tp] WARNING: IPSec SA not yet ESTABLISHED: {}", stdout.trim());
            }
        }
        Err(stderr) => log!("[l2tp] WARNING: swanctl --list-sas failed: {}", stderr),
    }

    // -------------------------------------------------------------------------
    // 6. Активируем guardian + heartbeat — мониторит VPN и Tauri
    // -------------------------------------------------------------------------
    if is_process_running_global("pppd") {
        // Пишем PID Tauri для guardian
        let _ = fs::write("/tmp/l2tp/tauri.pid", std::process::id().to_string());
        activate_guardian(server, &original_iface, &original_gw);
        start_heartbeat_thread();
    }

    log!("[l2tp] connect_vpn done");
    log_system_state(name);
    Ok(())
}

pub async fn disconnect_vpn(sudo: &SudoSession, name: &str) -> Result<(), String> {
    log!("[l2tp] disconnect_vpn: {}", name);

    // Останавливаем heartbeat и деактивируем guardian
    stop_heartbeat_thread();
    deactivate_guardian();

    let active = active_dir();
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();

    // Загружаем route state с диска (сохранён при connect)
    let route_state = load_route_state(sudo);

    // Terminating IPSec SA
    let _ = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--terminate",
        "--ike",
        &sanitize_name(name),
    ]);
    log!("[l2tp] swanctl --terminate sent");

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // SIGTERM pppd — даём шанс ip-down (бэкап, не основной механизм)
    log!("[l2tp] sending SIGTERM to pppd...");
    sudo.run_sudo(&["pkill", "-TERM", "-f", "pppd"]).ok();
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // Stop + uninstall daemons
    stop_daemon(sudo, XL2TPD_LABEL);
    stop_daemon(sudo, CHARON_LABEL);
    uninstall_daemon(sudo, XL2TPD_LABEL);
    uninstall_daemon(sudo, CHARON_LABEL);

    // Kill orphans
    sudo.run_sudo(&["pkill", "-9", "-f", "charon"]).ok();
    sudo.run_sudo(&["pkill", "-9", "-f", "xl2tpd"]).ok();
    sudo.run_sudo(&["pkill", "-9", "-f", "pppd"]).ok();

    // -------------------------------------------------------------------------
    // ЯВНОЕ восстановление route — умная логика через физический интерфейс
    // -------------------------------------------------------------------------
    if let Some((server, iface, gateway)) = route_state {
        restore_routes(sudo, &server, &iface, &gateway);
        clear_route_state(sudo);

        // Route safety: ping через восстановленный default
        log!("[l2tp] verifying restored connectivity...");
        let ping_ok = Command::new("ping")
            .args(["-c", "1", "-t", "3", "8.8.8.8"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ping_ok {
            log!("[l2tp] restored connectivity verified ✓");
        } else {
            log!("[l2tp] WARNING: ping after route restore failed — network may be down");
        }
    } else {
        log!("[l2tp] WARNING: no route state on disk — cannot restore routes!");
    }

    // Cleanup
    sudo.run_sudo(&["rm", "-f", "/var/run/charon.vici"]).ok();
    sudo.run_sudo(&["rm", "-f", "/var/run/charon.pid"]).ok();
    sudo.run_sudo(&["rm", "-rf", &active.to_string_lossy()]).ok();

    // Cleanup logs
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-xl2tpd.log", sanitize_name(name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-pppd.log", sanitize_name(name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-charon", sanitize_name(name)));

    log!("[l2tp] disconnect_vpn done");
    log_system_state(name);
    Ok(())
}

pub fn get_vpn_status(name: &str) -> VpnStatus {
    let dir = config_dir(name);

    if !dir.join("swanctl.conf").exists() {
        return VpnStatus::Disconnected;
    }

    let xl2tpd_running = is_process_running_global("xl2tpd");
    let pppd_running = is_process_running_global("pppd");

    if xl2tpd_running && pppd_running {
        VpnStatus::Connected
    } else if xl2tpd_running || pppd_running {
        VpnStatus::Connecting
    } else {
        VpnStatus::Disconnected
    }
}

pub fn list_vpn_services() -> Vec<String> {
    vec![]
}

pub fn configs_exist(name: &str) -> bool {
    let dir = config_dir(name);
    dir.join("swanctl.conf").exists()
        && dir.join("xl2tpd.conf").exists()
        && dir.join("options.xl2tpd").exists()
        && dir.join("strongswan.conf").exists()
}

// ---------------------------------------------------------------------------
// Global cleanup — вызывается при старте и выходе приложения
// ---------------------------------------------------------------------------

pub fn cleanup_all_vpn_state() {
    eprintln!("[cleanup] cleaning up all VPN state (launchd)...");

    // Деактивируем guardian мониторинг (не убиваем — он постоянный)
    let _ = crate::guardian::clear_state();
    stop_heartbeat_thread();

    // -------------------------------------------------------------------------
    // Crash recovery: если есть route.state — восстанавливаем route ПЕРЕД cleanup
    // -------------------------------------------------------------------------
    let route_state_path = route_state_path();
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
                // Обратная совместимость: старый формат (server\ngateway) — iface=IP
                let (iface, gateway) = if iface.contains('.') || iface.contains(':') {
                    ("", iface) // старый формат, iface на самом деле gateway
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
        // Удаляем route.state
        let _ = Command::new("sudo")
            .args(["-n", "rm", "-f", &route_state_path.to_string_lossy()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    // Stop + uninstall daemons (best effort, без sudo кэша может не работать)
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

    // Kill orphans (НЕ убиваем guardian — он постоянный daemon)
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

    // Cleanup /tmp/l2tp/ (логи, старые симлинки)
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

    // Cleanup /private/var/root/l2tp-hub/ (секретные конфиги — через sudo)
    let _ = Command::new("sudo")
        .args(["-n", "rm", "-rf", "/private/var/root/l2tp-hub"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    eprintln!("[cleanup] VPN state cleanup done");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn log_system_state(name: &str) {
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

    // launchd status
    for label in &[CHARON_LABEL, XL2TPD_LABEL] {
        if let Ok(output) = Command::new("launchctl")
            .args(["print", &format!("system/{}", label)])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Ищем строку со статусом
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
fn find_ppp_interface() -> Option<String> {
    let output = Command::new("ifconfig").output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        // Строка вида "ppp0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1400"
        if line.starts_with("ppp") && line.contains("UP") && line.contains("RUNNING") {
            let iface = line.split(':').next()?.to_string();
            return Some(iface);
        }
    }
    None
}

/// Проверяет, жив ли IPSec SA для данного подключения.
/// Возвращает true если SA ESTABLISHED и pppd работает.
pub fn check_ipsec_sa_alive(sudo: &crate::sudo::SudoSession, name: &str) -> bool {
    // Проверяем что процессы живы
    if !is_process_running_global("charon") || !is_process_running_global("pppd") {
        log!("[sleep-wake] VPN processes dead (charon={}, pppd={})",
            is_process_running_global("charon"), is_process_running_global("pppd"));
        return false;
    }

    // Проверяем IPSec SA через swanctl
    let active = active_dir();
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();

    let list_result = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--list-sas",
        "--raw",
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
