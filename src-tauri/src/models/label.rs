use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Label {
    pub id: String,
    pub name: String,
    pub built_in: bool,
}
