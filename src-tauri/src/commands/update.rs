use l2tp_hub_core::error::{AppError, AppErrorCode};
use crate::log;
use serde::Serialize;
use std::io::Write;

const REPO: &str = "Ssentiago/l2tp-hub";

#[derive(Serialize, specta::Type)]
pub struct UpdateInfo {
    pub latest_version: String,
    pub download_url: String,
    pub asset_name: String,
}

fn cache_dir() -> std::path::PathBuf {
    std::env::temp_dir().join("l2tp-hub-update")
}

#[tauri::command]
#[specta::specta]
pub async fn check_update(current_version: String) -> Result<Option<UpdateInfo>, AppError> {
    log!("[check_update] current={}", current_version);

    let url = format!("https://api.github.com/repos/{}/releases/latest", REPO);
    let resp = reqwest::Client::new()
        .get(&url)
        .header("User-Agent", "l2tp-hub")
        .send()
        .await
        .map_err(|e| AppError::detail(AppErrorCode::UpdateCheckFailed, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(AppError::detail(AppErrorCode::UpdateHttpError, resp.status().to_string()));
    }

    let release: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::detail(AppErrorCode::UpdateParseFailed, e.to_string()))?;

    let tag = release["tag_name"]
        .as_str()
        .ok_or(AppError::new(AppErrorCode::UpdateMissingTag))?;
    let latest_version = tag.trim_start_matches('v').to_string();

    if latest_version == current_version {
        log!("[check_update] up to date");
        return Ok(None);
    }

    log!("[check_update] new version: {}", latest_version);

    let assets = release["assets"]
        .as_array()
        .ok_or(AppError::new(AppErrorCode::UpdateMissingAssets))?;

    #[cfg(target_os = "macos")]
    let pattern = ".dmg";
    #[cfg(target_os = "windows")]
    let pattern = "-setup.exe";

    let asset = assets
        .iter()
        .find(|a| a["name"].as_str().map_or(false, |n: &str| n.contains(pattern)))
        .ok_or(AppError::new(AppErrorCode::UpdateNoMatchingAsset))?;

    Ok(Some(UpdateInfo {
        latest_version,
        download_url: asset["browser_download_url"]
            .as_str()
            .ok_or(AppError::new(AppErrorCode::UpdateMissingDownloadUrl))?
            .to_string(),
        asset_name: asset["name"]
            .as_str()
            .ok_or(AppError::new(AppErrorCode::UpdateMissingAssetName))?
            .to_string(),
    }))
}

#[tauri::command]
#[specta::specta]
pub async fn apply_update(download_url: String, asset_name: String) -> Result<(), AppError> {
    let file_path = cache_dir().join(&asset_name);

    if !file_path.exists() {
        log!("[apply_update] downloading {}", asset_name);

        let resp = reqwest::Client::new()
            .get(&download_url)
            .header("User-Agent", "l2tp-hub")
            .send()
            .await
            .map_err(|e| AppError::detail(AppErrorCode::DownloadFailed, e.to_string()))?;

        if !resp.status().is_success() {
            return Err(AppError::detail(AppErrorCode::DownloadFailed, resp.status().to_string()));
        }

        let _ = std::fs::create_dir_all(cache_dir());
        let mut file = std::fs::File::create(&file_path)
            .map_err(|e| AppError::detail(AppErrorCode::FileCreateFailed, e.to_string()))?;

        let mut stream = resp.bytes_stream();
        use futures_util::StreamExt;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| AppError::detail(AppErrorCode::DownloadError, e.to_string()))?;
            file.write_all(&chunk)
                .map_err(|e| AppError::detail(AppErrorCode::WriteError, e.to_string()))?;
        }

        log!("[apply_update] saved to {:?}", file_path);
    } else {
        log!("[apply_update] using cached {:?}", file_path);
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| AppError::detail(AppErrorCode::DmgOpenFailed, e.to_string()))?;
        log!("[apply_update] opened DMG for user to install");
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&file_path)
            .spawn()
            .map_err(|e| AppError::detail(AppErrorCode::InstallerLaunchFailed, e.to_string()))?;
        log!("[apply_update] launched installer");
    }

    Ok(())
}
