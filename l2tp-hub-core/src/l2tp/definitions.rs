#[derive(Debug, serde::Serialize, serde::Deserialize, PartialEq, Clone, Copy, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum VpnStatus {
    Connected,
    Connecting,
    Reconnecting,
    Disconnected,
    Unknown,
}
