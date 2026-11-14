use std::collections::HashMap;

use crate::models::tunnel_mode::TunnelMode;

#[derive(serde::Deserialize, specta::Type)]
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
    #[serde(default)]
    pub tunnel_mode: TunnelMode,
    /// Список подсетей для split-туннелинга (CIDR notation)
    #[serde(default)]
    pub split_routes: Vec<String>,
}
