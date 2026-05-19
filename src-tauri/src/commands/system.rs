#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || open::that(url).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}
