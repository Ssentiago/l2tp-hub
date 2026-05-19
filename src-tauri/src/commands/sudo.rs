use crate::log;
use crate::sudo::SudoSession;
use tauri::State;

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn authenticate_sudo(
    password: String,
    sudo: State<'_, SudoSession>,
) -> Result<(), String> {
    log!("[authenticate_sudo] called");
    let sudo = sudo.inner().clone();
    tokio::task::spawn_blocking(move || sudo.authenticate(&password))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn check_sudo_session(sudo: State<'_, SudoSession>) -> bool {
    sudo.is_authenticated()
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn authenticate_sudo(_password: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_sudo_session() -> bool {
    true
}
