use crate::sudo::SudoSession;
use std::process::Command;

fn macosvpn_bin() -> &'static str {
    "/usr/local/bin/macosvpn"
}

pub fn create_vpn_service(
    sudo: &SudoSession,
    name: &str,
    server: &str,
    username: &str,
    password: &str,
    shared_secret: &str,
    send_all_traffic: bool,
) -> Result<(), String> {
    let mut args: Vec<String> = vec![
        macosvpn_bin().to_string(),
        "create".to_string(),
        "--l2tp".to_string(),
        name.to_string(),
        "--endpoint".to_string(),
        server.to_string(),
        "--username".to_string(),
        username.to_string(),
        "--password".to_string(),
        password.to_string(),
        "--sharedsecret".to_string(),
        shared_secret.to_string(),
        "--force".to_string(),
    ];

    if !send_all_traffic {
        args.push("--split".to_string());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    sudo.run_sudo(&args_refs)?;

    Ok(())
}

pub fn delete_vpn_service(sudo: &SudoSession, name: &str) -> Result<(), String> {
    sudo.run_sudo(&[macosvpn_bin(), "delete", "--name", name])?;
    Ok(())
}

pub fn connect_vpn(name: &str) -> Result<(), String> {
    let script = format!(
        r#"tell application "System Events"
    tell current location of network preferences
        set myConnection to the service "{}"
        if myConnection is not null then
            connect myConnection
        end if
    end tell
end tell"#,
        name
    );

    let output = Command::new("osascript")
        .args(["-e", &script])
        .output()
        .map_err(|e| format!("osascript: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    eprintln!("osascript status: {}", output.status);
    eprintln!("stdout: {}", stdout);
    eprintln!("stderr: {}", stderr);

    if !output.status.success() {
        return Err(format!("osascript failed: {}", stderr));
    }
    Ok(())
}
pub fn disconnect_vpn(name: &str) -> Result<(), String> {
    let _ = Command::new("scutil").args(["--nc", "stop", name]).output();
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
    let output = Command::new("scutil")
        .args(["--nc", "status", name])
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_lowercase();
            let stdout = stdout.as_str().trim();
            println!("stdout = {stdout}");
            let first_line = stdout.lines().next().unwrap_or("").trim();
            match first_line {
                "connected" => VpnStatus::Connected,
                "connecting" | "establishing" => VpnStatus::Connecting,
                "disconnected" | "not connected" => VpnStatus::Disconnected,
                _ => VpnStatus::Unknown,
            }
        }
        Err(_) => VpnStatus::Unknown,
    }
}
