#[cfg(target_os = "macos")]
pub fn check_os_version() -> Result<(), String> {
    let output = std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .map_err(|e| e.to_string())?;

    let version = String::from_utf8_lossy(&output.stdout);
    let version = version.trim();

    let major: u32 = version
        .split('.')
        .next()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    if major >= 26 {
        return Err(format!(
            "macOS {} не поддерживается.\nL2TP/IPSec удалён из macOS 26 и новее.\nПоследняя поддерживаемая версия — macOS 15.",
            version
        ));
    }

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn check_macosvpn() -> Result<(), String> {
    let output = std::process::Command::new("which")
        .arg("macosvpn")
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(
            "macosvpn не найден в системе.\nУстановите его перед использованием приложения.\nhttps://github.com/halo/macosvpn".to_string()
        );
    }

    Ok(())
}

pub fn show_alert(message: &str) {
    let _ = std::process::Command::new("osascript")
        .args([
            "-e",
            &format!(
                "display alert \"L2TP Hub\" message \"{}\" as critical",
                message
            ),
        ])
        .status();
}
