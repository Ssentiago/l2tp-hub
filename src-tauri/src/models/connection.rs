use serde::{Deserialize, Serialize};

fn default_tunnel_mode() -> String {
    "full".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Connection {
    pub id: String,
    pub name: String,
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
    /// Авто-обнаруженные сети при full tunnel (заполняются автоматически)
    #[serde(default)]
    pub auto_discovered_routes: Vec<String>,
}

impl Connection {
    pub fn display_title(&self) -> &str {
        if !self.display_name.is_empty() {
            return &self.display_name;
        }
        if let Some(branch) = self.labels.get("branch") {
            if !branch.is_empty() {
                return branch;
            }
        }
        if let Some(company) = self.labels.get("company") {
            if !company.is_empty() {
                return company;
            }
        }
        &self.server
    }
}
