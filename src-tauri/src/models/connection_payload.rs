use std::collections::HashMap;

#[derive(serde::Deserialize)]
pub struct ConnectionPayload {
    pub id: Option<String>,
    pub server: String,
    pub username: String,
    pub password: String,
    pub shared_secret: String,
    pub labels: HashMap<String, String>,
}
