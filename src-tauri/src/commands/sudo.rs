use crate::helper;
use crate::log;
use crate::sudo::SudoSession;
use tauri::State;

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn authenticate_sudo(
    sudo: State<'_, SudoSession>,
) -> Result<(), String> {
    log!("[authenticate_sudo] called");
    let sudo = sudo.inner().clone();
    tokio::task::spawn_blocking(move || sudo.authenticate())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn check_sudo_session(sudo: State<'_, SudoSession>) -> bool {
    sudo.is_authenticated()
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn get_helper_status_text(sudo: State<'_, SudoSession>) -> String {
    sudo.status_text()
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn check_helper_status() -> bool {
    helper::is_helper_running()
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn authenticate_sudo() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_sudo_session() -> bool {
    true
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn get_helper_status_text() -> String {
    String::new()
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_helper_status() -> bool {
    true
}
