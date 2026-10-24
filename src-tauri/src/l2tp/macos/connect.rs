use std::fs;
use std::process::Command;
use std::sync::OnceLock;
use tokio::sync::Notify;

use crate::log;
use crate::sudo::SudoSession;
use crate::l2tp::VpnStatus;

use super::error::{ConnData, classify_connect_failure, read_log_tail};
use super::paths::{config_dir, active_dir, sanitize_name, swanctl_bin, CHARON_LABEL, XL2TPD_LABEL};
use super::routes::{capture_physical_route, load_route_state, save_route_state, restore_routes, clear_route_state};
use super::guardian::{activate_guardian, start_heartbeat_thread, stop_heartbeat_thread, deactivate_guardian};
use super::daemon::{generate_charon_plist, generate_xl2tpd_plist, install_daemon, start_daemon, stop_daemon, uninstall_daemon};
use super::config::{generate_configs, deploy_configs_to_active, generate_merged_configs};
use super::helpers::{is_process_running_global, find_ppp_interface, count_ppp_interfaces, log_system_state, destroy_stale_ppp_interfaces};

/// PPP interface readiness signal.
/// First connection signals after ppp0 is created.
/// Second connection registers a waiter BEFORE checking, then proceeds when signaled.
static PPP_READY: OnceLock<Notify> = OnceLock::new();

fn ppp_ready() -> &'static Notify {
    PPP_READY.get_or_init(Notify::new)
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
    uninstall_daemon(sudo, CHARON_LABEL);
    uninstall_daemon(sudo, XL2TPD_LABEL);
    let _ = fs::remove_dir_all(active_dir());
    Ok(())
}

pub async fn connect_vpn(
    sudo: &SudoSession,
    all_conns: &[ConnData],
    is_first: bool,
    original_gateway: &str,
) -> Result<(), String> {
    // Сортируем для детерминированного unit assignment:
    // существующие подключения по ID (стабильный порядок), новое — в конце.
    let sorted: Vec<ConnData> = if is_first {
        all_conns.to_vec()
    } else {
        let new_conn = all_conns.last().cloned()
            .ok_or("connect_vpn: all_conns is empty")?;
        let mut existing: Vec<ConnData> = all_conns[..all_conns.len().saturating_sub(1)].to_vec();
        existing.sort_by(|a, b| a.id.cmp(&b.id));
        existing.push(new_conn);
        existing
    };

    let this = &sorted[sorted.len() - 1];
    log!("[l2tp] connect_vpn: {} (server={}, gw={}, mode={}, is_first={})",
        this.service_name, this.server, original_gateway, this.tunnel_mode, is_first);

    // Захватываем физический маршрут (только при первом подключении)
    let (original_iface, original_gw) = if is_first {
        capture_physical_route().unwrap_or_else(|e| {
            log!("[route] WARNING: capture_physical_route failed: {}, using fallback", e);
            (String::new(), original_gateway.to_string())
        })
    } else {
        load_route_state(sudo)
            .map(|(_, iface, gw, _, _)| (iface, gw))
            .unwrap_or_else(|| (String::new(), original_gateway.to_string()))
    };

    // Сохраняем route state
    save_route_state(sudo, &this.server, &original_iface, &original_gw, &this.tunnel_mode, &this.split_routes)?;

    // Очищаем логи
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-xl2tpd.log", sanitize_name(&this.service_name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-pppd.log", sanitize_name(&this.service_name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-charon", sanitize_name(&this.service_name)));

    // Генерируем merged конфиги для ВСЕХ активных подключений
    generate_merged_configs(&sorted)?;

    if is_first {
        // =====================================================================
        // ПЕРВОЕ ПОДКЛЮЧЕНИЕ — полный запуск демонов
        // =====================================================================
        log!("[l2tp] first connection — full daemon startup");

        // Cleanup старых демонов
        log!("[l2tp] cleanup: stopping old daemons...");
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

        destroy_stale_ppp_interfaces(sudo);
        log!("[l2tp] cleanup done");

        // Deploy configs
        deploy_configs_to_active(sudo, &sorted[0].service_name)?;
        let active = active_dir();

        // xl2tpd infrastructure
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

        // Start charon
        log!("[l2tp] installing charon LaunchDaemon...");
        install_daemon(sudo, CHARON_LABEL, &generate_charon_plist())?;
        start_daemon(sudo, CHARON_LABEL)?;

        // Wait for VICI
        log!("[l2tp] waiting for charon VICI socket...");
        let vici_path = std::path::Path::new("/var/run/charon.vici");
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(15);
        let mut vici_ready = false;
        while tokio::time::Instant::now() < deadline {
            if vici_path.exists() { vici_ready = true; break; }
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
        log!("[l2tp] VICI socket: {}", if vici_ready { "ready ✓" } else { "MISSING after 15s!" });

        // swanctl --load-all
        let strongswan_conf = active.join("strongswan.conf");
        let swanctl = swanctl_bin();
        let swanctl_conf = active.join("swanctl.conf");
        let load_out = sudo.run_sudo(&[
            "env",
            &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
            &swanctl.to_string_lossy(),
            "--load-all", "--noprompt", "-f",
            &swanctl_conf.to_string_lossy(),
        ]);
        match &load_out {
            Ok(out) => log!("[l2tp] swanctl --load-all OK: {}", out.trim()),
            Err(e) => return Err(format!("swanctl --load-all failed: {}", e)),
        }

        // Start xl2tpd
        log!("[l2tp] installing xl2tpd LaunchDaemon...");
        install_daemon(sudo, XL2TPD_LABEL, &generate_xl2tpd_plist())?;
        start_daemon(sudo, XL2TPD_LABEL)?;

    } else {
        // =====================================================================
        // ПОСЛЕДУЮЩЕЕ ПОДКЛЮЧЕНИЕ — restart xl2tpd с merged конфигом
        // SIGHUP в xl2tpd НЕ перечитывает конфиг и не добавляет новые LAC.
        // Единственный надёжный путь — полный restart xl2tpd.
        // =====================================================================
        log!("[l2tp] subsequent connection — full xl2tpd restart with merged config");

        deploy_configs_to_active(sudo, &sorted[0].service_name)?;

        // swanctl --load-all
        let strongswan_conf = active_dir().join("strongswan.conf");
        let swanctl = swanctl_bin();
        let swanctl_conf = active_dir().join("swanctl.conf");
        let load_out = sudo.run_sudo(&[
            "env",
            &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
            &swanctl.to_string_lossy(),
            "--load-all", "--noprompt", "-f",
            &swanctl_conf.to_string_lossy(),
        ]);
        match &load_out {
            Ok(out) => log!("[l2tp] swanctl --load-all OK: {}", out.trim()),
            Err(e) => return Err(format!("swanctl --load-all failed: {}", e)),
        }

        // Restart xl2tpd
        log!("[l2tp] restarting xl2tpd to pick up new LAC...");
        stop_daemon(sudo, XL2TPD_LABEL);
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        sudo.run_sudo(&["pkill", "-9", "-f", "xl2tpd"]).ok();
        sudo.run_sudo(&["pkill", "-9", "-f", "pppd"]).ok();
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        destroy_stale_ppp_interfaces(sudo);

        start_daemon(sudo, XL2TPD_LABEL)?;
        log!("[l2tp] xl2tpd restarted, waiting for all ppp interfaces...");

        // Ждём что все ppp интерфейсы поднимутся
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(30);
        loop {
            let ppp_count = count_ppp_interfaces();
            if ppp_count >= all_conns.len() {
                log!("[l2tp] {} ppp interfaces found (expected {}) ✓", ppp_count, all_conns.len());
                break;
            }
            if tokio::time::Instant::now() >= deadline {
                log!("[l2tp] WARNING: only {} ppp interfaces after 30s (expected {})", ppp_count, all_conns.len());
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }

    // Ждём pppd (для is_first)
    if is_first {
        log!("[l2tp] waiting for pppd to spawn...");
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(30);
        let mut pppd_ready = false;
        while tokio::time::Instant::now() < deadline {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            if is_process_running_global("pppd") {
                log!("[l2tp] pppd detected ✓");
                pppd_ready = true;
                break;
            }
        }

        if !pppd_ready {
            let charon_log = read_log_tail(&format!("/tmp/l2tp/{}-charon", sanitize_name(&this.service_name)));
            let pppd_log = read_log_tail(&format!("/tmp/l2tp/{}-pppd.log", sanitize_name(&this.service_name)));
            let error = classify_connect_failure(&charon_log, &pppd_log);
            log!("[l2tp] connection failed: {:?} — {}", error, error.user_message());
            return Err(format!("{}: {}", error.user_message(), format!("{:?}", error)));
        }
        // Ждём пока pppd создаст ppp интерфейс, затем сигналим другим connection'ам
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(30);
        loop {
            if find_ppp_interface().is_some() {
                log!("[l2tp] PPP interface ready ✓");
                ppp_ready().notify_waiters();
                break;
            }
            if tokio::time::Instant::now() >= deadline {
                log!("[l2tp] WARNING: PPP interface not found within 30s");
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }

    // Route management для ВСЕХ активных подключений.
    // После xl2tpd restart маршруты теряются — пере-добавляем для каждого connection
    // на СВОЙ ppp интерфейс (sorted[i] → ppp{i}).
    for (i, conn) in sorted.iter().enumerate() {
        let ppp_iface = format!("ppp{}", i);
        let iface_ok = Command::new("ifconfig")
            .arg(&ppp_iface)
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("RUNNING"))
            .unwrap_or(false);
        if !iface_ok {
            log!("[l2tp] WARNING: {} not running, skipping routes for {}", ppp_iface, conn.service_name);
            continue;
        }

        log!("[l2tp] adding routes for {} on {}", conn.service_name, ppp_iface);
        let r1 = sudo.run_sudo(&["route", "add", "-host", &conn.server, &original_gateway]);
        log!("[l2tp] route add -host {} {}: {:?}", conn.server, original_gateway, r1);

        if conn.tunnel_mode == "split" && !conn.split_routes.is_empty() {
            log!("[l2tp] split tunnel — adding {} routes for {}", conn.split_routes.len(), conn.service_name);
            for route in &conn.split_routes {
                let r = sudo.run_sudo(&["route", "add", "-net", route, "-interface", &ppp_iface]);
                log!("[l2tp] route add -net {} -interface {}: {:?}", route, ppp_iface, r);
            }
        } else if conn.tunnel_mode == "full" {
            log!("[l2tp] full tunnel — changing default route for {}", conn.service_name);
            let r2 = sudo.run_sudo(&["route", "change", "default", "-interface", &ppp_iface]);
            log!("[l2tp] route change default -interface {}: {:?}", ppp_iface, r2);

            let ping_ok = Command::new("ping")
                .args(["-c", "1", "-t", "3", "8.8.8.8"])
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status().map(|s| s.success()).unwrap_or(false);
            if !ping_ok {
                log!("[l2tp] WARNING: ping through VPN failed — rolling back route!");
                let _ = sudo.run_sudo(&["route", "delete", "default"]);
                let _ = sudo.run_sudo(&["route", "add", "default", &original_gateway]);
                let _ = sudo.run_sudo(&["route", "delete", "-host", &conn.server]);
            }
        }
    }

    // Проверяем IPSec SA
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
            if stdout.contains("ESTABLISHED") { log!("[l2tp] IPSec SA ESTABLISHED ✓"); }
            else { log!("[l2tp] WARNING: SA not ESTABLISHED: {}", stdout.trim()); }
        }
        Err(stderr) => log!("[l2tp] WARNING: swanctl --list-sas failed: {}", stderr),
    }

    // Guardian + heartbeat (только при первом подключении)
    if is_first && is_process_running_global("pppd") {
        let _ = fs::write("/tmp/l2tp/tauri.pid", std::process::id().to_string());
        activate_guardian(&this.server, &original_iface, &original_gw, &this.tunnel_mode, &this.split_routes);
        start_heartbeat_thread();
    }

    log!("[l2tp] connect_vpn done: {}", this.service_name);
    log_system_state(&this.service_name);
    Ok(())
}

pub async fn disconnect_vpn(sudo: &SudoSession, name: &str) -> Result<(), String> {
    log!("[l2tp] disconnect_vpn: {}", name);

    stop_heartbeat_thread();
    deactivate_guardian();

    let active = active_dir();
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();

    let route_state = load_route_state(sudo);

    // Terminating IPSec SA
    let _ = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--terminate", "--ike",
        &sanitize_name(name),
    ]);
    log!("[l2tp] swanctl --terminate sent");

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    log!("[l2tp] sending SIGTERM to pppd...");
    sudo.run_sudo(&["pkill", "-TERM", "-f", "pppd"]).ok();
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    stop_daemon(sudo, XL2TPD_LABEL);
    stop_daemon(sudo, CHARON_LABEL);
    uninstall_daemon(sudo, XL2TPD_LABEL);
    uninstall_daemon(sudo, CHARON_LABEL);

    sudo.run_sudo(&["pkill", "-9", "-f", "charon"]).ok();
    sudo.run_sudo(&["pkill", "-9", "-f", "xl2tpd"]).ok();
    sudo.run_sudo(&["pkill", "-9", "-f", "pppd"]).ok();

    // ЯВНОЕ восстановление route
    if let Some((server, iface, gateway, tunnel_mode, split_routes)) = route_state {
        restore_routes(sudo, &server, &iface, &gateway, &tunnel_mode, &split_routes);
        clear_route_state(sudo);

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

    sudo.run_sudo(&["rm", "-f", "/var/run/charon.vici"]).ok();
    sudo.run_sudo(&["rm", "-f", "/var/run/charon.pid"]).ok();
    sudo.run_sudo(&["rm", "-rf", &active.to_string_lossy()]).ok();

    let _ = fs::remove_file(format!("/tmp/l2tp/{}-xl2tpd.log", sanitize_name(name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-pppd.log", sanitize_name(name)));
    let _ = fs::remove_file(format!("/tmp/l2tp/{}-charon", sanitize_name(name)));

    log!("[l2tp] disconnect_vpn done");
    log_system_state(name);
    Ok(())
}

/// Отключить одно конкретное подключение когда есть другие активные.
/// Полный restart xl2tpd с merged конфигом для оставшихся LAC.
pub async fn disconnect_single(
    sudo: &SudoSession,
    service_name: &str,
    server: &str,
    split_routes: &[String],
    all_remaining: &[ConnData],
    original_gateway: &str,
) -> Result<(), String> {
    log!("[l2tp] disconnect_single: {} (remaining={})", service_name, all_remaining.len());

    let active = active_dir();
    let strongswan_conf = active.join("strongswan.conf");
    let swanctl = swanctl_bin();

    // 1. Terminate IPSec SA
    let _ = sudo.run_sudo(&[
        "env",
        &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
        &swanctl.to_string_lossy(),
        "--terminate", "--ike",
        &sanitize_name(service_name),
    ]);
    log!("[l2tp] swanctl --terminate sent for {}", service_name);

    // 2. Remove routes
    let _ = sudo.run_sudo(&["route", "delete", "-host", server]);
    log!("[l2tp] removed host route for {}", server);
    if !split_routes.is_empty() {
        for route in split_routes {
            let _ = sudo.run_sudo(&["route", "delete", "-net", route]);
        }
        log!("[l2tp] removed {} split routes", split_routes.len());
    }

    // 3. Удаляем per-connection configs
    let dir = config_dir(service_name);
    let _ = fs::remove_dir_all(&dir);

    // 4. Restart xl2tpd с оставшимися LAC
    if !all_remaining.is_empty() {
        generate_merged_configs(all_remaining)?;
        deploy_configs_to_active(sudo, &all_remaining[0].service_name)?;

        let swanctl_conf = active.join("swanctl.conf");
        let load_out = sudo.run_sudo(&[
            "env",
            &format!("STRONGSWAN_CONF={}", strongswan_conf.to_string_lossy()),
            &swanctl.to_string_lossy(),
            "--load-all", "--noprompt", "-f",
            &swanctl_conf.to_string_lossy(),
        ]);
        match &load_out {
            Ok(out) => log!("[l2tp] swanctl --load-all OK: {}", out.trim()),
            Err(e) => log!("[l2tp] WARNING: swanctl --load-all failed: {}", e),
        }

        log!("[l2tp] restarting xl2tpd with {} remaining LACs...", all_remaining.len());
        stop_daemon(sudo, XL2TPD_LABEL);
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        sudo.run_sudo(&["pkill", "-9", "-f", "xl2tpd"]).ok();
        sudo.run_sudo(&["pkill", "-9", "-f", "pppd"]).ok();
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        destroy_stale_ppp_interfaces(sudo);

        start_daemon(sudo, XL2TPD_LABEL)?;

        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(20);
        loop {
            let ppp_count = count_ppp_interfaces();
            if ppp_count >= all_remaining.len() {
                log!("[l2tp] {} ppp interfaces for {} remaining connections ✓", ppp_count, all_remaining.len());
                break;
            }
            if tokio::time::Instant::now() >= deadline {
                log!("[l2tp] WARNING: only {} ppp interfaces after 20s (expected {})", ppp_count, all_remaining.len());
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }

        // Re-add routes для оставшихся подключений
        for (i, conn) in all_remaining.iter().enumerate() {
            let ppp_iface = format!("ppp{}", i);
            let iface_ok = Command::new("ifconfig")
                .arg(&ppp_iface)
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).contains("RUNNING"))
                .unwrap_or(false);
            if !iface_ok {
                log!("[l2tp] WARNING: {} not running, skipping routes for {}", ppp_iface, conn.service_name);
                continue;
            }

            log!("[l2tp] re-adding routes for {} on {}", conn.service_name, ppp_iface);
            let _ = sudo.run_sudo(&["route", "add", "-host", &conn.server, original_gateway]);

            if conn.tunnel_mode == "split" && !conn.split_routes.is_empty() {
                for route in &conn.split_routes {
                    let _ = sudo.run_sudo(&["route", "add", "-net", route, "-interface", &ppp_iface]);
                }
            } else if conn.tunnel_mode == "full" {
                let _ = sudo.run_sudo(&["route", "change", "default", "-interface", &ppp_iface]);
            }
        }
    }

    log!("[l2tp] disconnect_single done: {}", service_name);
    Ok(())
}

/// Переключить режим маршрутизации на лету (без reconnect).
pub fn switch_tunnel_mode(
    sudo: &SudoSession,
    server: &str,
    original_iface: &str,
    original_gw: &str,
    current_mode: &str,
    new_mode: &str,
    split_routes: &[String],
) -> Result<(), String> {
    log!("[l2tp] switch_tunnel_mode: {} → {}", current_mode, new_mode);

    let ppp_iface = find_ppp_interface()
        .ok_or("PPP interface not found — VPN not connected?")?;

    if current_mode == new_mode {
        return Ok(());
    }

    if new_mode == "split" {
        log!("[l2tp] switching to split: removing VPN default, adding subnet routes");
        let _ = sudo.run_sudo(&["route", "delete", "default"]);
        let _ = sudo.run_sudo(&["route", "add", "default", original_gw]);
        for route in split_routes {
            let r = sudo.run_sudo(&["route", "add", "-net", route, "-interface", &ppp_iface]);
            log!("[l2tp] route add -net {} -interface {}: {:?}", route, ppp_iface, r);
        }
    } else {
        log!("[l2tp] switching to full: removing subnet routes, adding VPN default");
        for route in split_routes {
            let _ = sudo.run_sudo(&["route", "delete", "-net", route]);
        }
        let r = sudo.run_sudo(&["route", "change", "default", "-interface", &ppp_iface]);
        log!("[l2tp] route change default -interface {}: {:?}", ppp_iface, r);
    }

    save_route_state(sudo, server, original_iface, original_gw, new_mode, split_routes)?;

    log!("[l2tp] switch_tunnel_mode done");
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
