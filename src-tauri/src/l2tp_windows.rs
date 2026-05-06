use std::process::Command;

fn powershell(script: &str) -> Result<String, String> {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    eprintln!("ps stdout: {}", stdout);
    eprintln!("ps stderr: {}", stderr);

    if !output.status.success() {
        return Err(format!("powershell failed: {}", stderr));
    }
    Ok(stdout)
}

pub fn create_vpn_service(
    name: &str,
    server: &str,
    username: &str,
    _password: &str,
    shared_secret: &str,
    send_all_traffic: bool,
) -> Result<(), String> {
    // Удаляем если уже есть
    let _ = delete_vpn_service(name);

    let split_tunneling = if send_all_traffic { "False" } else { "True" };

    let script = format!(
        r#"
        Add-VpnConnection `
            -Name '{name}' `
            -ServerAddress '{server}' `
            -TunnelType L2tp `
            -L2tpPsk '{secret}' `
            -AuthenticationMethod MSChapv2 `
            -SplitTunneling ${split} `
            -RememberCredential $True `
            -Force
        "#,
        name = name,
        server = server,
        secret = shared_secret,
        split = split_tunneling,
    );

    powershell(&script)?;

    // Пароль и username через cmdkey
    let cred_script = format!(
        r#"cmdkey /add:"{server}" /user:"{username}" /pass:"{password}""#,
        server = server,
        username = username,
        password = _password,
    );
    powershell(&cred_script)?;

    Ok(())
}

pub fn delete_vpn_service(name: &str) -> Result<(), String> {
    let script = format!(
        "Remove-VpnConnection -Name '{}' -Force -ErrorAction SilentlyContinue",
        name
    );
    powershell(&script)?;
    Ok(())
}

pub fn connect_vpn(name: &str) -> Result<(), String> {
    let script = format!("rasdial '{}'", name);
    powershell(&script)?;
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
    let script = format!(
        "(Get-VpnConnection -Name '{}' -ErrorAction SilentlyContinue).ConnectionStatus",
        name
    );
    match powershell(&script) {
        Ok(out) => match out.trim().to_lowercase().as_str() {
            "connected" => VpnStatus::Connected,
            "connecting" => VpnStatus::Connecting,
            "disconnected" | "notconnected" => VpnStatus::Disconnected,
            _ => VpnStatus::Unknown,
        },
        Err(_) => VpnStatus::Unknown,
    }
}

pub fn list_vpn_services() -> Vec<String> {
    let script = "(Get-VpnConnection -ErrorAction SilentlyContinue).Name";
    match powershell(script) {
        Ok(out) => out.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect(),
        Err(_) => vec![],
    }
}