use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    use chrono::Local;

    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\l2tp-hub-debug.log") {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "[{}] {}", timestamp, msg);
    }
}

fn powershell(script: &str) -> Result<String, String> {
    log(&format!("[powershell] Entering with script: {}", script));

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            let err_msg = format!("[powershell] CRITICAL execution error: {}", e);
            log(&err_msg);
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    log(&format!(
        "[powershell] Finished. Status: {}\nSTDOUT: {}\nSTDERR: {}",
        output.status, stdout.trim(), stderr.trim()
    ));

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
    send_all_traffic: bool,
) -> Result<(), String> {
    log(&format!(
        "[create_vpn_service] Start for: {}, server: {}, user: {}, split_tunnel: {}",
        name, server, username, !send_all_traffic
    ));

    log(&format!("[create_vpn_service] Attempting to clear existing service: {}", name));
    let _ = delete_vpn_service(name);

    let split_flag = if !send_all_traffic { " -SplitTunneling $True" } else { "" };

    let script = format!(
        r#"$cred = New-Object System.Management.Automation.PSCredential('{username}', (ConvertTo-SecureString '{password}' -AsPlainText -Force)); Add-VpnConnection -Name '{name}' -ServerAddress '{server}' -TunnelType L2tp -L2tpPsk '{secret}' -AuthenticationMethod MSChapv2 -RememberCredential -Credential $cred{split} -Force"#,
        name = name,
        server = server,
        username = username,
        password = password,
        secret = shared_secret,
        split = split_flag,
    );

    log("[create_vpn_service] Running Add-VpnConnection script");
    powershell(&script)?;
    log("[create_vpn_service] Successfully created service");

    Ok(())
}

pub fn delete_vpn_service(name: &str) -> Result<(), String> {
    log(&format!("[delete_vpn_service] Called for: {}", name));
    let script = format!(
        "Remove-VpnConnection -Name '{}' -Force -ErrorAction SilentlyContinue; exit 0",
        name
    );

    powershell(&script)?;
    log(&format!("[delete_vpn_service] Cleanup finished for: {}", name));
    Ok(())
}

pub fn connect_vpn(name: &str) -> Result<(), String> {
    log(&format!("[connect_vpn] Attempting to connect: {}", name));

    let output = Command::new("rasdial")
        .args([name])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            let err_msg = format!("[connect_vpn] rasdial process error: {}", e);
            log(&err_msg);
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    log(&format!(
        "[connect_vpn] rasdial finished. Status: {}\nSTDOUT: {}\nSTDERR: {}",
        output.status, stdout.trim(), stderr.trim()
    ));

    if !output.status.success() {
        log(&format!("[connect_vpn] Connection FAILED for: {}", name));
        return Err(format!("rasdial failed: {}\n{}", stdout, stderr));
    }

    log(&format!("[connect_vpn] Connection SUCCESSFUL for: {}", name));
    Ok(())
}

pub fn disconnect_vpn(name: &str) -> Result<(), String> {
    log(&format!("[disconnect_vpn] Requesting disconnect for: {}", name));
    let script = format!("rasdial '{}' /disconnect", name);

    match powershell(&script) {
        Ok(_) => log(&format!("[disconnect_vpn] Disconnect command sent for: {}", name)),
        Err(e) => log(&format!("[disconnect_vpn] Disconnect command error: {}", e)),
    }
    Ok(())
}

#[derive(Debug, serde::Serialize, serde::Deserialize, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum VpnStatus {
    Connected,
    Connecting,
    Disconnected,
    Unknown,
}

pub fn get_vpn_status(name: &str) -> VpnStatus {
    log(&format!("[get_vpn_status] Checking status for: {}", name));

    let output = Command::new("rasdial")
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_lowercase();
            let is_connected = stdout.contains(&name.to_lowercase());
            log(&format!("[get_vpn_status] Active connections found: {}. Target present: {}", stdout.trim(), is_connected));

            if is_connected {
                VpnStatus::Connected
            } else {
                VpnStatus::Disconnected
            }
        }
        Err(e) => {
            log(&format!("[get_vpn_status] ERROR: {}", e));
            VpnStatus::Unknown
        },
    }
}

pub fn list_vpn_services() -> Vec<String> {
    log("[list_vpn_services] Fetching list of VPN connections");
    let script = "(Get-VpnConnection -ErrorAction SilentlyContinue).Name";

    match powershell(script) {
        Ok(out) => {
            let services: Vec<String> = out.lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            log(&format!("[list_vpn_services] Found services: {:?}", services));
            services
        },
        Err(e) => {
            log(&format!("[list_vpn_services] ERROR: {}", e));
            vec![]
        },
    }
}