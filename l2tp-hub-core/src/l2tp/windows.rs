use super::definitions::VpnStatus;
use std::os::windows::process::CommandExt;
use std::process::Command;

pub mod manager;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn powershell(script: &str) -> Result<String, String> {
    log::debug!("[powershell] running: {}", script);
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            log::debug!("[powershell] command error: {}", e);
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    log::debug!(
        "[powershell] stdout: {}\nstderr: {}\nstatus: {}",
        stdout,
        stderr,
        output.status,
    );

    if !output.status.success() {
        return Err(format!("powershell failed: {}", stderr));
    }
    Ok(stdout)
}

pub fn create_vpn_service(
    name: &str,
    server: &str,
    username: &str,
    password: &str,
    shared_secret: &str,
) -> Result<(), String> {
    log::debug!("[create_vpn_service] name: {}, server: {}", name, server);
    let _ = delete_vpn_service(name);

    let script = format!(
        r#"Add-VpnConnection -Name '{name}' -ServerAddress '{server}' -TunnelType L2tp -L2tpPsk '{secret}' -AuthenticationMethod MSChapv2 -RememberCredential -Force"#,
        name = name,
        server = server,
        secret = shared_secret,
    );
    log::debug!("[create_vpn_service] create script: {}", script);
    powershell(&script)?;

    let cred_script = format!(
        r#"cmdkey /add:"{name}" /user:"{username}" /pass:"{password}""#,
        name = name,
        username = username,
        password = password,
    );

    log::debug!("[create_vpn_service] cred script: {}", cred_script);
    powershell(&cred_script)?;

    log::debug!("[create_vpn_service] success");
    Ok(())
}

pub fn delete_vpn_service(name: &str) -> Result<(), String> {
    log::debug!("[delete_vpn_service] name: {}", name);
    let script = format!(
        "Remove-VpnConnection -Name '{}' -Force -ErrorAction SilentlyContinue; exit 0",
        name
    );
    powershell(&script)?;
    log::debug!("[delete_vpn_service] finished");
    Ok(())
}

pub fn connect_vpn(name: &str, username: &str, password: &str) -> Result<(), String> {
    log::debug!("[connect_vpn] name: {}", name);

    let output = Command::new("rasdial")
        .args([name, username, password])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            log::debug!("[connect_vpn] rasdial error: {}", e);
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    log::debug!(
        "[connect_vpn] stdout: {}\nstderr: {}\nstatus: {}",
        stdout,
        stderr,
        output.status,
    );

    if !output.status.success() {
        return Err(format!("rasdial failed: {}\n{}", stdout, stderr));
    }
    log::debug!("[connect_vpn] success");
    Ok(())
}

pub fn disconnect_vpn(name: &str) -> Result<(), String> {
    log::debug!("[disconnect_vpn] name: {}", name);
    let script = format!("rasdial '{}' /disconnect", name);
    let _ = powershell(&script);
    log::debug!("[disconnect_vpn] finished");
    Ok(())
}

pub fn get_vpn_status(name: &str) -> VpnStatus {
    log::debug!("[get_vpn_status] name: {}", name);
    let script = format!(
        "(Get-VpnConnection -Name '{}' -ErrorAction SilentlyContinue).ConnectionStatus",
        name
    );
    match powershell(&script) {
        Ok(out) => {
            let status = out.trim().to_lowercase();
            log::debug!("[get_vpn_status] raw status: '{}'", status);
            match status.as_str() {
                "connected" => VpnStatus::Connected,
                "connecting" => VpnStatus::Connecting,
                "disconnected" | "" => VpnStatus::Disconnected,
                _ => VpnStatus::Unknown,
            }
        }
        Err(e) => {
            log::debug!("[get_vpn_status] error: {}", e);
            VpnStatus::Unknown
        }
    }
}

pub fn list_vpn_services() -> Vec<String> {
    log::debug!("[list_vpn_services] calling PowerShell...");
    let script = "(Get-VpnConnection -ErrorAction SilentlyContinue).Name";
    match powershell(script) {
        Ok(out) => {
            let list: Vec<String> = out
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            log::debug!("[list_vpn_services] found: {:?}", list);
            list
        }
        Err(e) => {
            log::debug!("[list_vpn_services] error: {}", e);
            vec![]
        }
    }
}

/// Проверяет, жив ли VPN-туннель (Windows: статус нативного VPN-подключения).
pub fn check_ipsec_sa_alive(_sudo: &dyn crate::executor::PrivilegedExecutor, name: &str) -> bool {
    matches!(get_vpn_status(name), VpnStatus::Connected)
}

/// Очистка VPN-состояния. Windows: нативные VPN-подключениями управляются ОС,
/// ничего не трогаем — в отличие от macOS-стека (charon/xl2tpd/pppd).
pub fn cleanup_all_vpn_state() {}
