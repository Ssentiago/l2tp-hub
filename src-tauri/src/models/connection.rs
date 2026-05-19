use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub server: String,
    pub username: String,
    pub keychain_key: String,
    pub shared_secret_key: String,
    pub service_hash: Option<String>,
    pub labels: std::collections::HashMap<String, String>, // label_id → value
}
