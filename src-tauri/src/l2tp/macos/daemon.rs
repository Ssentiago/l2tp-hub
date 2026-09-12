use std::fs;

use crate::log;
use crate::sudo::SudoSession;

use super::paths::{charon_bin, charon_lib_dir, xl2tpd_bin, active_dir, plist_path, CHARON_LABEL, XL2TPD_LABEL};

// ---------------------------------------------------------------------------
// LaunchDaemon plist generation
// ---------------------------------------------------------------------------

pub fn generate_charon_plist() -> String {
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

pub fn generate_xl2tpd_plist() -> String {
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
pub fn install_daemon(sudo: &SudoSession, label: &str, plist_content: &str) -> Result<(), String> {
    let path = plist_path(label);
    let tmp_path = format!("/tmp/{}.plist", label);

    fs::write(&tmp_path, plist_content)
        .map_err(|e| format!("write plist {}: {}", tmp_path, e))?;

    sudo.run_sudo(&["cp", &tmp_path, &path.to_string_lossy()])?;
    sudo.run_sudo(&["chmod", "644", &path.to_string_lossy()])?;
    sudo.run_sudo(&["chown", "root:wheel", &path.to_string_lossy()])?;

    match sudo.run_sudo(&["launchctl", "bootout", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl bootout {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => log!("[l2tp] launchctl bootout {} (expected if not registered): {}", label, e.trim()),
    }
    std::thread::sleep(std::time::Duration::from_millis(500));

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
pub fn start_daemon(sudo: &SudoSession, label: &str) -> Result<(), String> {
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
pub fn stop_daemon(sudo: &SudoSession, label: &str) {
    match sudo.run_sudo(&["launchctl", "kill", "SIGTERM", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl kill {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => log!("[l2tp] launchctl kill {} (may not be running): {}", label, e.trim()),
    }
}

/// Удалить LaunchDaemon (bootout + rm plist).
pub fn uninstall_daemon(sudo: &SudoSession, label: &str) {
    match sudo.run_sudo(&["launchctl", "bootout", &format!("system/{}", label)]) {
        Ok(out) => log!("[l2tp] launchctl bootout {}: ok{}", label, if out.trim().is_empty() { String::new() } else { format!(" — {}", out.trim()) }),
        Err(e) => log!("[l2tp] launchctl bootout {} (may not exist): {}", label, e.trim()),
    }
    let _ = sudo.run_sudo(&["rm", "-f", &plist_path(label).to_string_lossy()]);
}
