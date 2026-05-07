use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn powershell(script: &str) -> Result<String, String> {
    log(&format!("[powershell] running: {}", script));
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            log(&format!("[powershell] command error: {}", e));
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    log(&format!("[powershell] stdout: {}\nstderr: {}\nstatus: {}", stdout, stderr, output.status));

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
    log(&format!("[create_vpn_service] name: {}, server: {}", name, server));
    let _ = delete_vpn_service(name);

    let split_flag = if !send_all_traffic { " -SplitTunneling $True" } else { "" };

    let script = format!(
        r#"Add-VpnConnection -Name '{name}' -ServerAddress '{server}' -TunnelType L2tp -L2tpPsk '{secret}' -AuthenticationMethod MSChapv2 -RememberCredential -Force"#,
        name = name,
        server = server,
        secret = shared_secret,
    );
    log(&format!("[create_vpn_service] create script: {}", script));
    powershell(&script)?;

    let cred_script = format!(
        r#"cmdkey /add:"{name}" /user:"{username}" /pass:"{password}""#,
        name = name,
        username = username,
        password = password,
    );

    log(&format!("[create_vpn_service] cred script: {}", cred_script));
    powershell(&cred_script)?;



    log("[create_vpn_service] success");
    Ok(())
}

pub fn delete_vpn_service(name: &str) -> Result<(), String> {
    log(&format!("[delete_vpn_service] name: {}", name));
    let script = format!(
        "Remove-VpnConnection -Name '{}' -Force -ErrorAction SilentlyContinue; exit 0",
        name
    );
    powershell(&script)?;
    log("[delete_vpn_service] finished");
    Ok(())
}

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;

    #[cfg(target_os = "windows")]
    let path = "C:\\l2tp-hub-debug.log";

    #[cfg(not(target_os = "windows"))]
    let path = "/tmp/l2tp-hub-debug.log";  // на Mac при dev-запуске

    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .unwrap();
    writeln!(f, "{}", msg).unwrap();
}

pub fn connect_vpn(name: &str, username: &str, password: &str) -> Result<(), String> {
    log(&format!("[connect_vpn] name: {}", name));

    let output = Command::new("rasdial")
        .args([name, username, password])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            log(&format!("[connect_vpn] rasdial error: {}", e));
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    log(&format!("[connect_vpn] stdout: {}\nstderr: {}\nstatus: {}", stdout, stderr, output.status));

    if !output.status.success() {
        return Err(format!("rasdial failed: {}\n{}", stdout, stderr));
    }
    log("[connect_vpn] success");
    Ok(())
}

pub fn disconnect_vpn(name: &str) -> Result<(), String> {
    log(&format!("[disconnect_vpn] name: {}", name));
    let script = format!("rasdial '{}' /disconnect", name);
    let _ = powershell(&script);
    log("[disconnect_vpn] finished");
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
    log(&format!("[get_vpn_status] name: {}", name));
    let script = format!(
        "(Get-VpnConnection -Name '{}' -ErrorAction SilentlyContinue).ConnectionStatus",
        name
    );
    match powershell(&script) {
        Ok(out) => {
            let status = out.trim().to_lowercase();
            log(&format!("[get_vpn_status] raw status: '{}'", status));
            match status.as_str() {
                "connected" => VpnStatus::Connected,
                "connecting" => VpnStatus::Connecting,
                "disconnected" | "" => VpnStatus::Disconnected,
                _ => VpnStatus::Unknown,
            }
        }
        Err(e) => {
            log(&format!("[get_vpn_status] error: {}", e));
            VpnStatus::Unknown
        }
    }
}

pub fn list_vpn_services() -> Vec<String> {
    log("[list_vpn_services] calling PowerShell...");
    let script = "(Get-VpnConnection -ErrorAction SilentlyContinue).Name";
    match powershell(script) {
        Ok(out) => {
            let list: Vec<String> = out.lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            log(&format!("[list_vpn_services] found: {:?}", list));
            list
        },
        Err(e) => {
            log(&format!("[list_vpn_services] error: {}", e));
            vec![]
        },
    }
}