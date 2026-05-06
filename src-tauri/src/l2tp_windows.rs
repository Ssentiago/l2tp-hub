use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn powershell(script: &str) -> Result<String, String> {
    log(&format!("running: {}", script));
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    log(&format!("stdout: {}\nstderr: {}\nstatus: {}", stdout, stderr, output.status));

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
    let _ = delete_vpn_service(name);

    let split_flag = if !send_all_traffic { " -SplitTunneling $True" } else { "" };

    let script = format!(
        r#"Add-VpnConnection -Name '{name}' -ServerAddress '{server}' -TunnelType L2tp -L2tpPsk '{secret}' -AuthenticationMethod MSChapv2{split} -Force"#,
        name = name,
        server = server,
        secret = shared_secret,
        split = split_flag,
    );
    log(&format!("create script: {}", script));
    powershell(&script)?;

    let cred_script = format!(
        r#"cmdkey /add:"{server}" /user:"{username}" /pass:"{password}""#,
        server = server,
        username = username,
        password = password,
    );
    powershell(&cred_script)?;

    Ok(())
}

pub fn delete_vpn_service(name: &str) -> Result<(), String> {
    let script = format!(
        "Remove-VpnConnection -Name '{}' -Force -ErrorAction SilentlyContinue; exit 0",
        name
    );
    powershell(&script)?;
    Ok(())
}

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\l2tp-hub-debug.log")
        .unwrap();
    writeln!(f, "{}", msg).unwrap();
}

pub fn connect_vpn(name: &str) -> Result<(), String> {
    log(&format!("connect_vpn: {}", name));

    let output = Command::new("rasdial")
        .args([name])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| {
            log(&format!("rasdial error: {}", e));
            e.to_string()
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    log(&format!("stdout: {}\nstderr: {}\nstatus: {}", stdout, stderr, output.status));

    if !output.status.success() {
        return Err(format!("rasdial failed: {}\n{}", stdout, stderr));
    }
    Ok(())
}
pub fn disconnect_vpn(name: &str) -> Result<(), String> {
    let script = format!("rasdial '{}' /disconnect", name);
    let _ = powershell(&script);
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
    // rasdial без аргументов — список активных соединений, без PowerShell
    let output = Command::new("rasdial")
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_lowercase();
            if stdout.contains(&name.to_lowercase()) {
                VpnStatus::Connected
            } else {
                VpnStatus::Disconnected
            }
        }
        Err(_) => VpnStatus::Unknown,
    }
}

pub fn list_vpn_services() -> Vec<String> {
    let script = "(Get-VpnConnection -ErrorAction SilentlyContinue).Name";
    match powershell(script) {
        Ok(out) => out.lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect(),
        Err(_) => vec![],
    }
}