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
