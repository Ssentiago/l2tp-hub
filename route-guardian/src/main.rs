use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixListener;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const SOCKET_PATH: &str = "/tmp/l2tp-hub-guardian.sock";
const ROUTE_STATE: &str = "/private/var/root/l2tp-hub/route.state";
const TAURI_PID_FILE: &str = "/tmp/l2tp/tauri.pid";
const GUARDIAN_PID_FILE: &str = "/tmp/l2tp/route-guardian.pid";
const NETWORK_MAP_FILE: &str = "/tmp/l2tp/network-map.json";

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------
const HEARTBEAT_TIMEOUT_SECS: u64 = 12;
const POLL_INTERVAL: Duration = Duration::from_secs(3);
const MAP_INTERVAL: Duration = Duration::from_secs(5);

// ---------------------------------------------------------------------------
// Guardian state machine
// ---------------------------------------------------------------------------

/// Guardian modes:
/// - Idle: no VPN active, just cartography + accepting commands
/// - Active: VPN is up, monitoring heartbeat + VPN processes + anomaly detection
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Mode {
    Idle,
    Active,
}

/// VPN context — set via "set_state" command, cleared via "clear_state"
#[derive(Debug, Clone)]
struct VpnContext {
    server: String,
    iface: String,
    gateway: String,
    tunnel_mode: String,
    split_routes: Vec<String>,
}

// ---------------------------------------------------------------------------
// Network map — continuous cartography
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct NetworkMap {
    updated_at: u64,
    physical_default_iface: String,
    physical_default_gateway: String,
    interfaces: Vec<IfaceInfo>,
    vpn_server: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct IfaceInfo {
    name: String,
    active: bool,
    gateway: Option<String>,
    ip: Option<String>,
    is_physical: bool,
}

impl NetworkMap {
    fn empty() -> Self {
        Self {
            updated_at: 0,
            physical_default_iface: String::new(),
            physical_default_gateway: String::new(),
            interfaces: vec![],
            vpn_server: String::new(),
        }
    }

    fn best_restore_gateway(&self) -> Option<&str> {
        // 1. Original physical interface — still active?
        if !self.physical_default_iface.is_empty() {
            if let Some(iface) = self
                .interfaces
                .iter()
                .find(|i| i.name == self.physical_default_iface && i.active)
            {
                if let Some(ref gw) = iface.gateway {
                    return Some(gw.as_str());
                }
            }
        }
        // 2. Saved gateway — find on any active interface or ping
        if !self.physical_default_gateway.is_empty() {
            for iface in &self.interfaces {
                if iface.active {
                    if let Some(ref gw) = iface.gateway {
                        if gw == &self.physical_default_gateway {
                            return Some(gw.as_str());
                        }
                    }
                }
            }
            if ping_once(&self.physical_default_gateway) {
                return Some(&self.physical_default_gateway);
            }
        }
        // 3. Any active physical interface with a gateway
        for iface in &self.interfaces {
            if iface.active && iface.is_physical {
                if let Some(ref gw) = iface.gateway {
                    return Some(gw.as_str());
                }
            }
        }
        None
    }
}

// ---------------------------------------------------------------------------
// IPC protocol
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
struct Request {
    cmd: String,
    #[serde(default)]
    server: String,
    #[serde(default)]
    iface: String,
    #[serde(default)]
    gateway: String,
    #[serde(default = "default_tunnel_mode")]
    tunnel_mode: String,
    #[serde(default)]
    split_routes: Vec<String>,
}

fn default_tunnel_mode() -> String {
    "full".to_string()
}

#[derive(Debug, serde::Serialize)]
struct Response {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    vpn_alive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pppd: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    charon: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    xl2tpd: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    network_map: Option<NetworkMap>,
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
static GLOBAL_MAP: OnceLock<Mutex<NetworkMap>> = OnceLock::new();
static GLOBAL_VPN: OnceLock<Mutex<Option<VpnContext>>> = OnceLock::new();
static GLOBAL_MODE: OnceLock<Mutex<Mode>> = OnceLock::new();
static GLOBAL_RUNNING: OnceLock<Arc<AtomicBool>> = OnceLock::new();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
fn main() {
    let _ = std::fs::write(GUARDIAN_PID_FILE, std::process::id().to_string());
    let _ = std::fs::remove_file(SOCKET_PATH);

    eprintln!("[guardian] started pid={}", std::process::id());

    // Init globals
    GLOBAL_MAP.set(Mutex::new(NetworkMap::empty())).ok();
    GLOBAL_VPN.set(Mutex::new(None)).ok();
    GLOBAL_MODE.set(Mutex::new(Mode::Idle)).ok();

    // Socket
    let listener = match UnixListener::bind(SOCKET_PATH) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[guardian] Failed to bind {}: {}", SOCKET_PATH, e);
            std::process::exit(1);
        }
    };
    let _ = std::fs::set_permissions(
        SOCKET_PATH,
        std::os::unix::fs::PermissionsExt::from_mode(0o777),
    );
    listener.set_nonblocking(true).expect("set_nonblocking");

    // Signals
    let running = Arc::new(AtomicBool::new(true));
    GLOBAL_RUNNING.set(Arc::clone(&running)).ok();
    unsafe {
        libc::signal(libc::SIGTERM, handle_signal as *const () as libc::sighandler_t);
        libc::signal(libc::SIGINT, handle_signal as *const () as libc::sighandler_t);
    }

    let mut last_heartbeat = Instant::now();
    let mut last_map_scan = Instant::now();

    // --- Main loop ---
    while running.load(Ordering::Relaxed) {
        // 1. Accept commands
        match listener.accept() {
            Ok((stream, _)) => {
                stream.set_read_timeout(Some(Duration::from_secs(2))).ok();
                let resp = handle_connection(&stream);
                let mut writer = stream;
                let _ = writer.write_all(resp.as_bytes());
                let _ = writer.write_all(b"\n");
                let _ = writer.flush();
                // Any command resets heartbeat
                last_heartbeat = Instant::now();
            }
            Err(ref e)
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut => {}
            Err(_) => {}
        }

        // 2. Continuous network cartography (always, even in idle)
        if last_map_scan.elapsed() >= MAP_INTERVAL {
            update_network_map();
            last_map_scan = Instant::now();
        }

        // 3. Active mode checks
        let mode = *GLOBAL_MODE.get().unwrap().lock().unwrap();
        if mode == Mode::Active {
            // Anomaly detection
            if detect_anomalies() {
                eprintln!("[guardian] anomaly detected — cleanup");
                full_cleanup();
                // Go back to idle, don't exit
                set_mode(Mode::Idle);
                continue;
            }

            // Heartbeat timeout
            if last_heartbeat.elapsed() > Duration::from_secs(HEARTBEAT_TIMEOUT_SECS) {
                if is_tauri_dead() {
                    eprintln!(
                        "[guardian] tauri dead (no heartbeat {}s) — cleanup",
                        last_heartbeat.elapsed().as_secs()
                    );
                    full_cleanup();
                    set_mode(Mode::Idle);
                    continue;
                }
                if last_heartbeat.elapsed() > Duration::from_secs(HEARTBEAT_TIMEOUT_SECS * 3) {
                    eprintln!(
                        "[guardian] ghost heartbeat ({}s) — cleanup",
                        last_heartbeat.elapsed().as_secs()
                    );
                    full_cleanup();
                    set_mode(Mode::Idle);
                    continue;
                }
            }
        }

        std::thread::sleep(POLL_INTERVAL);
    }

    let _ = std::fs::remove_file(SOCKET_PATH);
    let _ = std::fs::remove_file(GUARDIAN_PID_FILE);
    let _ = std::fs::remove_file(NETWORK_MAP_FILE);
    eprintln!("[guardian] exiting");
}

fn set_mode(m: Mode) {
    if let Some(mode_mtx) = GLOBAL_MODE.get() {
        if let Ok(mut mode) = mode_mtx.lock() {
            eprintln!("[guardian] mode: {:?} → {:?}", *mode, m);
            *mode = m;
        }
    }
}

// ---------------------------------------------------------------------------
// Command handling
// ---------------------------------------------------------------------------

fn handle_connection(stream: &std::os::unix::net::UnixStream) -> String {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    if reader.read_line(&mut line).is_err() {
        return json_err("read error");
    }

    let req: Request = match serde_json::from_str(line.trim()) {
        Ok(r) => r,
        Err(e) => return json_err(&format!("bad json: {}", e)),
    };

    match req.cmd.as_str() {
        // --- lifecycle commands ---
        "set_state" => {
            if req.server.is_empty() || req.gateway.is_empty() {
                return json_err("set_state requires server and gateway");
            }
            // Write route.state for crash recovery (расширенный формат)
            let routes_str = req.split_routes.join(",");
            let content = format!("{}\n{}\n{}\n{}\n{}\n", req.server, req.iface, req.gateway, req.tunnel_mode, routes_str);
            let _ = std::fs::write(ROUTE_STATE, &content);

            let ctx = VpnContext {
                server: req.server.clone(),
                iface: req.iface.clone(),
                gateway: req.gateway.clone(),
                tunnel_mode: req.tunnel_mode.clone(),
                split_routes: req.split_routes.clone(),
            };
            // Update VPN context
            if let Some(vpn_mtx) = GLOBAL_VPN.get() {
                if let Ok(mut vpn) = vpn_mtx.lock() {
                    *vpn = Some(ctx);
                }
            }
            // Update network map's vpn_server
            if let Some(map_mtx) = GLOBAL_MAP.get() {
                if let Ok(mut map) = map_mtx.lock() {
                    map.vpn_server = req.server;
                }
            }

            set_mode(Mode::Active);
            json_ok("monitoring active")
        }

        "clear_state" => {
            if let Some(vpn_mtx) = GLOBAL_VPN.get() {
                if let Ok(mut vpn) = vpn_mtx.lock() {
                    *vpn = None;
                }
            }
            let _ = std::fs::remove_file(ROUTE_STATE);
            set_mode(Mode::Idle);
            json_ok("monitoring idle")
        }

        "heartbeat" => {
            let pppd = is_process_running("pppd");
            let charon = is_process_running("charon");
            let xl2tpd = is_process_running("xl2tpd");
            let alive = pppd && (charon || xl2tpd);
            let mode = GLOBAL_MODE.get().map(|m| format!("{:?}", *m.lock().unwrap()));
            serde_json::to_string(&Response {
                ok: true,
                error: None,
                mode,
                vpn_alive: Some(alive),
                pppd: Some(pppd),
                charon: Some(charon),
                xl2tpd: Some(xl2tpd),
                network_map: None,
            })
            .unwrap_or_default()
        }

        "cleanup" => {
            full_cleanup();
            set_mode(Mode::Idle);
            json_ok("cleaned up")
        }

        "status" => {
            let pppd = is_process_running("pppd");
            let charon = is_process_running("charon");
            let xl2tpd = is_process_running("xl2tpd");
            let alive = pppd && (charon || xl2tpd);
            let mode = GLOBAL_MODE.get().map(|m| format!("{:?}", *m.lock().unwrap()));
            let map = GLOBAL_MAP.get().and_then(|m| m.lock().ok()).map(|m| m.clone());
            serde_json::to_string(&Response {
                ok: true,
                error: None,
                mode,
                vpn_alive: Some(alive),
                pppd: Some(pppd),
                charon: Some(charon),
                xl2tpd: Some(xl2tpd),
                network_map: map,
            })
            .unwrap_or_default()
        }

        "map" => {
            let map = GLOBAL_MAP.get().and_then(|m| m.lock().ok()).map(|m| m.clone());
            serde_json::to_string(&Response {
                ok: true,
                error: None,
                mode: None,
                vpn_alive: None,
                pppd: None,
                charon: None,
                xl2tpd: None,
                network_map: map,
            })
            .unwrap_or_default()
        }

        _ => json_err(&format!("unknown command: {}", req.cmd)),
    }
}

// ---------------------------------------------------------------------------
// Network cartography
// ---------------------------------------------------------------------------

fn update_network_map() {
    let map_mtx = match GLOBAL_MAP.get() {
        Some(m) => m,
        None => return,
    };
    let mut map = match map_mtx.lock() {
        Ok(m) => m,
        Err(_) => return,
    };

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    map.updated_at = now;

    map.interfaces.clear();
    for i in 0..10 {
        map.interfaces.push(scan_interface(&format!("en{}", i)));
    }
    for extra in &["bridge0", "awdl0", "llw0"] {
        let info = scan_interface(extra);
        if info.active || info.gateway.is_some() {
            map.interfaces.push(info);
        }
    }

    let (cur_iface, cur_gw) = get_current_default_route();
    let is_vpn = cur_iface.starts_with("ppp")
        || cur_iface.starts_with("utun")
        || (cur_iface.is_empty() && cur_gw.is_empty());

    if !is_vpn && !cur_iface.is_empty() {
        map.physical_default_iface = cur_iface;
        map.physical_default_gateway = cur_gw;
    }

    if let Ok(json) = serde_json::to_string_pretty(&*map) {
        let _ = std::fs::write(NETWORK_MAP_FILE, &json);
    }
}

fn scan_interface(name: &str) -> IfaceInfo {
    let output = Command::new("ifconfig").arg(name).output();
    let text = match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).to_string(),
        Err(_) => {
            return IfaceInfo {
                name: name.to_string(),
                active: false,
                gateway: None,
                ip: None,
                is_physical: is_physical_name(name),
            };
        }
    };

    let active = text.contains("status: active");
    let ip = parse_ifconfig_ip(&text);
    let is_physical = is_physical_name(name) && !text.contains("POINTOPOINT");
    let gateway = if active {
        get_gateway_for_iface(name)
    } else {
        None
    };

    IfaceInfo {
        name: name.to_string(),
        active,
        gateway,
        ip,
        is_physical,
    }
}

fn detect_anomalies() -> bool {
    let mode = *GLOBAL_MODE.get().unwrap().lock().unwrap();
    if mode != Mode::Active {
        return false;
    }
    let (_, cur_iface) = get_current_default_route();
    let default_is_vpn = cur_iface.starts_with("ppp")
        || cur_iface.starts_with("utun")
        || cur_iface.starts_with("ipsec");

    if default_is_vpn && !is_process_running("pppd") {
        eprintln!(
            "[guardian] ANOMALY: default route on {} but pppd dead!",
            cur_iface
        );
        return true;
    }
    false
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn is_process_running(name: &str) -> bool {
    Command::new("pgrep")
        .arg("-x")
        .arg(name)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn is_tauri_dead() -> bool {
    let pid_str = match std::fs::read_to_string(TAURI_PID_FILE) {
        Ok(s) => s,
        Err(_) => return true,
    };
    let pid: i32 = match pid_str.trim().parse() {
        Ok(p) => p,
        Err(_) => return true,
    };
    unsafe { libc::kill(pid, 0) != 0 }
}

fn get_current_default_route() -> (String, String) {
    let output = match Command::new("route")
        .args(["-n", "get", "default"])
        .output()
    {
        Ok(o) => String::from_utf8_lossy(&o.stdout).to_string(),
        Err(_) => return (String::new(), String::new()),
    };
    let iface = parse_route_field(&output, "interface").unwrap_or_default();
    let gw = parse_route_field(&output, "gateway").unwrap_or_default();
    (iface, gw)
}

fn get_gateway_for_iface(iface: &str) -> Option<String> {
    let output = Command::new("route")
        .args(["-n", "get", "-ifscope", iface, "default"])
        .output()
        .ok()?;
    parse_route_field(&String::from_utf8_lossy(&output.stdout), "gateway")
}

fn parse_route_field(text: &str, field: &str) -> Option<String> {
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(field) {
            return trimmed.split_whitespace().nth(1).map(|s| s.to_string());
        }
    }
    None
}

fn is_physical_name(name: &str) -> bool {
    name.starts_with("en") || name.starts_with("bridge")
}

fn parse_ifconfig_ip(text: &str) -> Option<String> {
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("inet ") {
            return trimmed.split_whitespace().nth(1).map(|s| s.to_string());
        }
    }
    None
}

fn ping_once(addr: &str) -> bool {
    Command::new("ping")
        .args(["-c", "1", "-t", "2", addr])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn json_ok(msg: &str) -> String {
    serde_json::to_string(&Response {
        ok: true,
        error: None,
        mode: None,
        vpn_alive: None,
        pppd: None,
        charon: None,
        xl2tpd: None,
        network_map: None,
    })
    .unwrap_or_else(|_| format!("{{\"ok\":true,\"msg\":\"{}\"}}", msg))
}

fn json_err(msg: &str) -> String {
    serde_json::to_string(&Response {
        ok: false,
        error: Some(msg.to_string()),
        mode: None,
        vpn_alive: None,
        pppd: None,
        charon: None,
        xl2tpd: None,
        network_map: None,
    })
    .unwrap_or_else(|_| format!("{{\"ok\":false,\"error\":\"{}\"}}", msg))
}

// ---------------------------------------------------------------------------
// Full cleanup
// ---------------------------------------------------------------------------

fn full_cleanup() {
    eprintln!("[guardian] === FULL CLEANUP START ===");

    let vpn_ctx = GLOBAL_VPN
        .get()
        .and_then(|m| m.lock().ok())
        .and_then(|v| v.clone());

    let server = vpn_ctx.as_ref().map(|c| c.server.clone()).unwrap_or_default();
    let tunnel_mode = vpn_ctx.as_ref().map(|c| c.tunnel_mode.clone()).unwrap_or_else(|| "full".to_string());
    let split_routes = vpn_ctx.as_ref().map(|c| c.split_routes.clone()).unwrap_or_default();

    // Удаляем host route к VPN-серверу (всегда)
    if !server.is_empty() {
        let _ = Command::new("route").args(["delete", "-host", &server]).status();
    }

    if tunnel_mode == "split" {
        // SPLIT: удаляем только subnet routes, default не трогали
        eprintln!("[guardian] split mode — removing {} subnet routes", split_routes.len());
        for route in &split_routes {
            let _ = Command::new("route").args(["delete", "-net", route]).status();
        }
    } else {
        // FULL: восстанавливаем default route через физический gateway
        let restore_gw = GLOBAL_MAP
            .get()
            .and_then(|m| m.lock().ok())
            .and_then(|m| m.best_restore_gateway().map(|s| s.to_string()));

        if let Some(ref gw) = restore_gw {
            eprintln!("[guardian] restoring default route to {}", gw);
            let _ = Command::new("route").args(["delete", "default"]).status();
            let _ = Command::new("route").args(["add", "default", gw]).status();
            let (_, actual_gw) = get_current_default_route();
            if actual_gw == *gw {
                eprintln!("[guardian] route verified ✓");
            } else {
                eprintln!("[guardian] WARNING: expected gw={} got={}", gw, actual_gw);
            }
        } else {
            eprintln!("[guardian] WARNING: no gateway — deleting VPN default only");
            let _ = Command::new("route").args(["delete", "default"]).status();
        }
    }

    for proc in &["pppd", "xl2tpd", "charon"] {
        let _ = Command::new("pkill").args(["-TERM", "-f", proc]).status();
    }
    std::thread::sleep(Duration::from_secs(2));
    for proc in &["pppd", "xl2tpd", "charon"] {
        let _ = Command::new("pkill").args(["-9", "-f", proc]).status();
    }

    for label in &["com.sentiago.l2tp-hub.charon", "com.sentiago.l2tp-hub.xl2tpd"] {
        let _ = Command::new("launchctl")
            .args(["bootout", &format!("system/{}", label)])
            .status();
        let _ = std::fs::remove_file(format!("/Library/LaunchDaemons/{}.plist", label));
    }

    for path in &["/var/run/charon.pid", "/var/run/charon.vici", "/var/run/charon.ctl", "/var/run/xl2tpd/l2tp-control"] {
        let _ = std::fs::remove_file(path);
    }

    let _ = std::fs::remove_file(ROUTE_STATE);
    let _ = std::fs::remove_dir_all("/private/var/root/l2tp-hub/active");
    let _ = std::fs::remove_file(TAURI_PID_FILE);

    eprintln!("[guardian] === FULL CLEANUP DONE ===");
}

// ---------------------------------------------------------------------------
// Signal handling
// ---------------------------------------------------------------------------

extern "C" fn handle_signal(_sig: libc::c_int) {
    if let Some(running) = GLOBAL_RUNNING.get() {
        running.store(false, Ordering::Relaxed);
    }
    // Don't cleanup on signal — we're being told to stop, not crashed
    // The next startup's cleanup_all_vpn_state will handle stale state
    std::process::exit(0);
}