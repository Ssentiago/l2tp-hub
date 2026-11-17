use serde::{Deserialize, Serialize};

use crate::models::tunnel_mode::TunnelMode;

#[derive(Debug, Clone, Serialize, Deserialize, Default, specta::Type)]
pub struct Connection {
    pub id: String,
    #[serde(alias = "name")]
    pub service_name: String,
    #[serde(default)]
    pub display_name: String,
    pub server: String,
    pub username: String,
    pub keychain_key: String,
    pub shared_secret_key: String,
    pub service_hash: Option<String>,
    pub labels: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub connect_count: u32,
    #[serde(default)]
    pub connected_since: Option<i64>,
    #[serde(default)]
    pub last_connected_at: Option<i64>,
    #[serde(default)]
    pub last_disconnected_at: Option<i64>,
    /// Режим маршрутизации: "full" (весь трафик через VPN) или "split" (только корпоративные сети)
    #[serde(default)]
    pub tunnel_mode: TunnelMode,
    /// Список подсетей для split-туннелинга (CIDR notation)
    #[serde(default)]
    pub split_routes: Vec<String>,
    /// Суммарное время всех завершённых сессий, сек
    #[serde(default)]
    pub total_uptime_secs: u64,
    /// Суммарный входящий трафик всех завершённых сессий, байты
    #[serde(default)]
    pub total_bytes_in: u64,
    /// Суммарный исходящий трафик всех завершённых сессий, байты
    #[serde(default)]
    pub total_bytes_out: u64,
}
