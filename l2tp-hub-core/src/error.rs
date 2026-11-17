use std::fmt;
use serde::Serialize;

/// Стабильный код ошибки команды. Локализованный текст выбирается по нему во
/// фронтенде и не зависит от английских формулировок в логах.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum AppErrorCode {
    WorkspaceNotFound,
    CannotDeleteLastWorkspace,
    ConnectionNotFound,
    ConnectionNotActive,
    SplitTunnelingUnsupported,
    SessionNotFound,
    LabelNotFound,
    CannotDeleteBuiltInLabel,
    PathUnresolved,
    CheckUnavailableDuringVpn,
    ServiceNotResponding,
    InstallCanceled,
    HelperInstallFailed,
    InvalidFileFormat,
    CorruptConfig,
    WrongPassword,
    UnsupportedFormatVersion,
    UnsupportedKdf,
    FileRead,
    FileWrite,
    SocketError,
    ConnectionError,
    SendError,
    ReceiveError,
    UpdateCheckFailed,
    UpdateParseFailed,
    UpdateHttpError,
    UpdateMissingTag,
    UpdateMissingAssets,
    UpdateNoMatchingAsset,
    UpdateMissingDownloadUrl,
    UpdateMissingAssetName,
    DownloadFailed,
    FileCreateFailed,
    DownloadError,
    WriteError,
    DmgOpenFailed,
    InstallerLaunchFailed,
    Internal,
}

/// Ошибка команды, уходящая в UI. Несёт код и опциональную техническую деталь,
/// которая подставляется в локализованный шаблон на фронте.
#[derive(Clone, Debug, Serialize, specta::Type)]
pub struct AppError {
    pub code: AppErrorCode,
    pub detail: Option<String>,
}

impl AppError {
    pub fn new(code: AppErrorCode) -> Self {
        Self { code, detail: None }
    }

    pub fn detail(code: AppErrorCode, detail: impl Into<String>) -> Self {
        Self { code, detail: Some(detail.into()) }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let d = self.detail.clone().unwrap_or_default();
        let msg = match self.code {
            AppErrorCode::WorkspaceNotFound => "Workspace not found".to_string(),
            AppErrorCode::CannotDeleteLastWorkspace => "Cannot delete the last workspace".to_string(),
            AppErrorCode::ConnectionNotFound => "Connection not found".to_string(),
            AppErrorCode::ConnectionNotActive => "Connection is not active".to_string(),
            AppErrorCode::SplitTunnelingUnsupported => "Split tunneling is not supported on Windows".to_string(),
            AppErrorCode::SessionNotFound => "Session not found".to_string(),
            AppErrorCode::LabelNotFound => "Label not found".to_string(),
            AppErrorCode::CannotDeleteBuiltInLabel => "Cannot delete a built-in label".to_string(),
            AppErrorCode::PathUnresolved => "Could not resolve the path".to_string(),
            AppErrorCode::CheckUnavailableDuringVpn => {
                "The check is unavailable during an active VPN connection".to_string()
            }
            AppErrorCode::ServiceNotResponding => {
                "The service is installed but not responding. Restart the application.".to_string()
            }
            AppErrorCode::InstallCanceled => "Installation canceled by the user".to_string(),
            AppErrorCode::HelperInstallFailed => format!("Helper installation failed: {}", d),
            AppErrorCode::InvalidFileFormat => "Invalid file format".to_string(),
            AppErrorCode::CorruptConfig => {
                "The file is corrupted or is not an l2tphub configuration".to_string()
            }
            AppErrorCode::WrongPassword => "Wrong password or corrupted file".to_string(),
            AppErrorCode::UnsupportedFormatVersion => {
                format!("Unsupported file format version: {}", d)
            }
            AppErrorCode::UnsupportedKdf => format!("Unsupported key derivation algorithm: {}", d),
            AppErrorCode::FileRead => format!("File read error: {}", d),
            AppErrorCode::FileWrite => format!("File write error: {}", d),
            AppErrorCode::SocketError => format!("Socket error: {}", d),
            AppErrorCode::ConnectionError => format!("Connection error: {}", d),
            AppErrorCode::SendError => format!("Send error: {}", d),
            AppErrorCode::ReceiveError => format!("Receive error: {}", d),
            AppErrorCode::UpdateCheckFailed => format!("Failed to check updates: {}", d),
            AppErrorCode::UpdateParseFailed => format!("Failed to parse response: {}", d),
            AppErrorCode::UpdateHttpError => format!("GitHub API returned {}", d),
            AppErrorCode::UpdateMissingTag => "Missing tag_name".to_string(),
            AppErrorCode::UpdateMissingAssets => "Missing assets".to_string(),
            AppErrorCode::UpdateNoMatchingAsset => "No matching asset found".to_string(),
            AppErrorCode::UpdateMissingDownloadUrl => "Missing download_url".to_string(),
            AppErrorCode::UpdateMissingAssetName => "Missing asset name".to_string(),
            AppErrorCode::DownloadFailed => format!("Download failed: {}", d),
            AppErrorCode::FileCreateFailed => format!("Failed to create file: {}", d),
            AppErrorCode::DownloadError => format!("Download error: {}", d),
            AppErrorCode::WriteError => format!("Write error: {}", d),
            AppErrorCode::DmgOpenFailed => format!("Failed to open DMG: {}", d),
            AppErrorCode::InstallerLaunchFailed => format!("Failed to launch installer: {}", d),
            AppErrorCode::Internal => format!("Internal error: {}", d),
        };
        write!(f, "{}", msg)
    }
}

impl From<String> for AppError {
    fn from(value: String) -> Self {
        AppError::detail(AppErrorCode::Internal, value)
    }
}

impl From<&str> for AppError {
    fn from(value: &str) -> Self {
        AppError::detail(AppErrorCode::Internal, value)
    }
}
