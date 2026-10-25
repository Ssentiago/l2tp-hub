use std::collections::HashMap;

#[derive(serde::Deserialize)]
pub struct ConnectionPayload {
    pub id: Option<String>,
    #[serde(default)]
    pub display_name: String,
    pub server: String,
    pub username: String,
    pub password: String,
    pub shared_secret: String,
    pub labels: HashMap<String, String>,
    /// Режим маршрутизации: "full" или "split"
    #[serde(default = "default_tunnel_mode")]
    pub tunnel_mode: String,
    /// Список подсетей для split-туннелинга (CIDR notation)
    #[serde(default)]
    pub split_routes: Vec<String>,
}

fn default_tunnel_mode() -> String {
    "full".to_string()
}
