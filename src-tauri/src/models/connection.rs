use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
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
