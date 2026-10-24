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
pub async fn get_helper_status_text(sudo: State<'_, SudoSession>) -> Result<String, ()> {
    Ok(sudo.status_text())
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn check_helper_status() -> bool {
    tokio::task::spawn_blocking(|| helper::is_helper_running())
        .await
        .unwrap_or(false)
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
pub async fn get_helper_status_text() -> Result<String, ()> {
    Ok(String::new())
}

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn check_helper_status() -> bool {
    true
}
