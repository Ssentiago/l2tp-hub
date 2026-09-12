use std::fs;
use std::path::PathBuf;
use std::os::unix::fs::PermissionsExt;

use crate::log;
use crate::sudo::SudoSession;

use super::error::ConnData;
use super::paths::{config_dir, active_dir, ensure_active_dir, sanitize_name};

// ---------------------------------------------------------------------------
// Config generation — swanctl.conf (VICI) + xl2tpd + pppd
// ---------------------------------------------------------------------------

pub fn generate_configs(
    dir: &PathBuf,
    name: &str,
    server: &str,
    username: &str,
    password: &str,
    shared_secret: &str,
    _original_gateway: &str,
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

    // ip-up/ip-down — заглушки: route management целиком из Rust
    fs::write(dir.join("ip-up"), "#!/bin/bash\n# L2TP Hub: route management handled by app — this is a no-op stub\nexit 0\n")
        .map_err(|e| format!("ip-up: {}", e))?;
    fs::write(dir.join("ip-down"), "#!/bin/bash\n# L2TP Hub: route management handled by app — this is a no-op stub\nexit 0\n")
        .map_err(|e| format!("ip-down: {}", e))?;
    fs::set_permissions(dir.join("ip-up"), fs::Permissions::from_mode(0o755))
        .map_err(|e| format!("ip-up chmod: {}", e))?;
    fs::set_permissions(dir.join("ip-down"), fs::Permissions::from_mode(0o755))
        .map_err(|e| format!("ip-down chmod: {}", e))?;

    Ok(())
}

/// Скопировать конфиги из connection dir в active dir (через sudo — dir принадлежит root)
pub fn deploy_configs_to_active(sudo: &SudoSession, name: &str) -> Result<(), String> {
    let src = config_dir(name);
    let dst = active_dir();
    ensure_active_dir(sudo)?;

    for file in &["swanctl.conf", "xl2tpd.conf", "options.xl2tpd", "strongswan.conf", "ip-up", "ip-down"] {
        let from = src.join(file);
        if from.exists() {
            let to = dst.join(file);
            sudo.run_sudo(&["cp", &from.to_string_lossy(), &to.to_string_lossy()])?;
        }
    }

    // Copy per-connection options files: options-<name>.xl2tpd
    if let Ok(entries) = fs::read_dir(&src) {
        for entry in entries.flatten() {
            let fname = entry.file_name().to_string_lossy().to_string();
            if fname.starts_with("options-") && fname.ends_with(".xl2tpd") {
                let from = entry.path();
                let to = dst.join(&fname);
                sudo.run_sudo(&["cp", &from.to_string_lossy(), &to.to_string_lossy()])?;
            }
        }
    }

    sudo.run_sudo(&["chmod", "-R", "600", &dst.to_string_lossy()]).ok();
    sudo.run_sudo(&["chown", "-R", "root:wheel", &dst.to_string_lossy()]).ok();
    log!("[l2tp] configs deployed to {} (chmod 600, root:wheel)", dst.display());
    Ok(())
}

// ---------------------------------------------------------------------------
// Multi-connection: merged config generation
// ---------------------------------------------------------------------------

/// Сгенерировать merged конфиги для ВСЕХ активных подключений.
/// Записывает swanctl.conf, xl2tpd.conf, strongswan.conf в per-connection dir.
pub fn generate_merged_configs(all_conns: &[ConnData]) -> Result<(), String> {
    let dir = config_dir(&all_conns[0].service_name);
    fs::create_dir_all(&dir).map_err(|e| format!("create config dir: {}", e))?;

    // --- swanctl.conf: connections {} + secrets {} для каждого подключения ---
    let mut conns_block = String::from("connections {\n");
    let mut secrets_block = String::from("\nsecrets {\n");
    for conn in all_conns {
        let s = sanitize_name(&conn.service_name);
        conns_block += &format!(
            r#"
    {s} {{
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
            {s} {{
                mode = transport
                local_ts = dynamic[udp/1701]
                remote_ts = dynamic[udp/1701]
                esp_proposals = aes256-sha256,aes128-sha256,aes256-sha1,aes128-sha1
                start_action = start
            }}
        }}
        proposals = aes256-sha256-modp2048,aes128-sha256-modp2048,aes256-sha1-modp2048,aes128-sha1-modp2048
    }}
"#, server = conn.server, s = s);
        secrets_block += &format!(
            r#"
    ike-{s} {{
        id = {server}
        secret = "{secret}"
    }}
"#, s = s, server = conn.server, secret = conn.shared_secret);
    }
    conns_block += "}\n";
    secrets_block += "}\n";
    fs::write(dir.join("swanctl.conf"), format!("{}{}", conns_block, secrets_block))
        .map_err(|e| format!("swanctl.conf: {}", e))?;

    // --- xl2tpd.conf: [global] + [lac ...] для каждого подключения ---
    let active = active_dir();
    let mut xl2tpd_conf = String::from("[global]\nport = 1701\n");
    for conn in all_conns {
        xl2tpd_conf += &format!(
            r#"
[lac {name}]
lns = {server}
ppp debug = yes
pppoptfile = {ppp_opts}
length bit = yes
autodial = yes
redial = yes
redial timeout = 5
max redials = 30
"#, name = conn.service_name, server = conn.server,
            ppp_opts = active.join(format!("options-{}.xl2tpd", sanitize_name(&conn.service_name))).display());
    }
    fs::write(dir.join("xl2tpd.conf"), xl2tpd_conf)
        .map_err(|e| format!("xl2tpd.conf: {}", e))?;

    // --- options-<name>.xl2tpd для каждого подключения ---
    // unit ЗАДАЁМ явно — каждый LAC получает свой pppN (0, 1, ...).
    // Без unit macOS pppd при параллельном спавне оба пытаются захватить unit 0.
    for (idx, conn) in all_conns.iter().enumerate() {
        let s = sanitize_name(&conn.service_name);
        let ppp_log = format!("/tmp/l2tp/{}-pppd.log", s);
        fs::write(
            dir.join(format!("options-{}.xl2tpd", s)),
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
unit {unit}
debug
logfile {ppp_log}
ipparam {name}
name "{username}"
password "{password}"
"#, ppp_log = ppp_log, name = conn.service_name, username = conn.username, password = conn.password, unit = idx),
        ).map_err(|e| format!("options-{}.xl2tpd: {}", s, e))?;
    }

    // --- strongswan.conf ---
    let log_path = format!("/tmp/l2tp/{}-charon", sanitize_name(&all_conns[0].service_name));
    fs::write(dir.join("strongswan.conf"),
        format!(r#"charon {{
    install_routes = no
    install_virtual_ip = no
    filelog {{
        {log_path} {{
            default = 1
            time_format = %b %e %T
        }}
    }}
}}
"#, log_path = log_path))
        .map_err(|e| format!("strongswan.conf: {}", e))?;

    // --- ip-up/ip-down stubs ---
    for name in &["ip-up", "ip-down"] {
        fs::write(dir.join(name), "#!/bin/bash\nexit 0\n")
            .map_err(|e| format!("{}: {}", name, e))?;
        fs::set_permissions(dir.join(name), fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("{} chmod: {}", name, e))?;
    }

    Ok(())
}
