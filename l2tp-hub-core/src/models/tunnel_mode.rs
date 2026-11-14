use serde::{Deserialize, Serialize};

/// Режим маршрутизации туннеля.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum TunnelMode {
    Split,
    #[default]
    Full,
}

impl TunnelMode {
    pub fn as_str(self) -> &'static str {
        match self {
            TunnelMode::Split => "split",
            TunnelMode::Full => "full",
        }
    }
}

impl std::fmt::Display for TunnelMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for TunnelMode {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "split" => Ok(TunnelMode::Split),
            "full" => Ok(TunnelMode::Full),
            other => Err(format!("unknown tunnel_mode: {}", other)),
        }
    }
}
