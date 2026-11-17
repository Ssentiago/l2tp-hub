#[cfg(target_os = "macos")]
use crate::helper;
#[cfg(target_os = "macos")]
use crate::log;
#[cfg(target_os = "macos")]
use crate::sudo::SudoSession;
use l2tp_hub_core::error::AppError;
use crate::sudo::HelperStatus;
#[cfg(target_os = "macos")]
use tauri::State;

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "macos")]
pub async fn authenticate_sudo(
    sudo: State<'_, SudoSession>,
) -> Result<(), AppError> {
    log!("[authenticate_sudo] called");
    let sudo = sudo.inner().clone();
    tokio::task::spawn_blocking(move || sudo.authenticate())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "macos")]
pub fn check_sudo_session(sudo: State<'_, SudoSession>) -> bool {
    sudo.is_authenticated()
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "macos")]
pub async fn get_helper_status(sudo: State<'_, SudoSession>) -> Result<HelperStatus, ()> {
    Ok(sudo.status())
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "macos")]
pub async fn check_helper_status() -> bool {
    tokio::task::spawn_blocking(|| helper::is_helper_running())
        .await
        .unwrap_or(false)
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "windows")]
pub async fn authenticate_sudo() -> Result<(), AppError> {
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "windows")]
pub fn check_sudo_session() -> bool {
    true
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "windows")]
pub async fn get_helper_status() -> Result<HelperStatus, ()> {
    Ok(HelperStatus::Idle)
}

#[tauri::command]
#[specta::specta]
#[cfg(target_os = "windows")]
pub fn check_helper_status() -> bool {
    true
}
