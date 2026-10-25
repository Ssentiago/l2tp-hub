use serde::{Deserialize, Serialize};

fn default_tunnel_mode() -> String {
    "full".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
    #[serde(default = "default_tunnel_mode")]
    pub tunnel_mode: String,
    /// Список подсетей для split-туннелинга (CIDR notation)
    #[serde(default)]
    pub split_routes: Vec<String>,
}
