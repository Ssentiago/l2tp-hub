use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Label {
    pub id: String,
    pub name: String,
    pub built_in: bool,
}
