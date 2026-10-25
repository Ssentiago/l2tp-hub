use serde::Serialize;
use std::fs;

/// Данные одного подключения для генерации конфигов.
#[derive(Clone, Debug)]
pub struct ConnData {
    pub id: String,
    pub service_name: String,
    pub server: String,
    pub username: String,
    pub password: String,
    pub shared_secret: String,
    pub tunnel_mode: String,
    pub split_routes: Vec<String>,
}

// ---------------------------------------------------------------------------
// ConnectError — классификация ошибок подключения для UI
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum ConnectError {
    #[serde(rename = "server_unreachable")]
    ServerUnreachable,
    #[serde(rename = "auth_failed")]
    AuthenticationFailed,
    #[serde(rename = "no_proposal")]
    NoProposalChosen,
    #[serde(rename = "ppp_auth_failed")]
    PppAuthFailed,
    #[serde(rename = "unknown")]
    Unknown(String),
}

impl ConnectError {
    pub fn user_message(&self) -> &str {
        match self {
            ConnectError::ServerUnreachable => "Сервер не отвечает. Проверьте адрес сервера и подключение к интернету.",
            ConnectError::AuthenticationFailed => "Неверный общий ключ (PSK). Проверьте настройки подключения.",
            ConnectError::NoProposalChosen => "Сервер не поддерживает используемые алгоритмы шифрования. Обратитесь к администратору сети.",
            ConnectError::PppAuthFailed => "Неверное имя пользователя или пароль.",
            ConnectError::Unknown(_) => "Не удалось подключиться. Проверьте логи для подробностей.",
        }
    }
}

/// Классифицирует ошибку подключения по логам charon и pppd
pub fn classify_connect_failure(charon_log: &str, pppd_log: &str) -> ConnectError {
    if charon_log.contains("NO_PROPOSAL_CHOSEN")
        || charon_log.contains("no proposal found")
        || charon_log.contains("no acceptable proposal found")
    {
        return ConnectError::NoProposalChosen;
    }
    if charon_log.contains("AUTHENTICATION_FAILED")
        || (charon_log.contains("authentication of") && charon_log.contains("failed"))
        || charon_log.contains("INVALID_ID_INFORMATION")
    {
        return ConnectError::AuthenticationFailed;
    }
    if pppd_log.contains("CHAP authentication failed")
        || pppd_log.contains("PAP authentication failed")
    {
        return ConnectError::PppAuthFailed;
    }
    if charon_log.contains("giving up after")
        || charon_log.contains("retransmit")
        || !charon_log.contains("received packet")
    {
        return ConnectError::ServerUnreachable;
    }
    ConnectError::Unknown(format!("charon: {}\npppd: {}", charon_log, pppd_log))
}

/// Читает лог-файл (best effort)
pub(super) fn read_log_tail(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_default()
}
