#[derive(Debug, serde::Serialize, serde::Deserialize, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum VpnStatus {
    Connected,
    Connecting,
    Disconnected,
    Unknown,
}
