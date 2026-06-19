use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::connection::Connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub connections: Vec<Connection>,
    #[serde(default = "default_group_by")]
    pub group_by: Vec<String>,
}

fn default_group_by() -> Vec<String> {
    vec!["company".into(), "branch".into()]
}

impl Workspace {
    pub fn new(name: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            connections: vec![],
            group_by: default_group_by(),
        }
    }
}
