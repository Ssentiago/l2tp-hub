use crate::models::tunnel_mode::TunnelMode;
use serde::Serialize;
use std::fmt;
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
    pub tunnel_mode: TunnelMode,
    pub split_routes: Vec<String>,
}

// ---------------------------------------------------------------------------
// Классификация ошибок подключения
// ---------------------------------------------------------------------------
//
// Правила лежат в упорядоченной таблице RULES: первое совпадение выигрывает,
// порядок задан явно. Приоритет источников: структурные сигналы (код завершения
// pppd из лога xl2tpd, живность демонов), затем стабильные токены RFC 7296 в
// логе charon, затем устойчивые фразы strongSwan и pppd, затем состояние IKE SA.
// Если ни одно правило не сработало, остаётся Unknown с сырыми признаками, а не
// угадывание по произвольной прозе лога.

/// Этап подключения, на котором сорвалось соединение.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ConnectStage {
    Ike,
    Child,
    Ppp,
    Unknown,
}

/// Стабильный код ошибки подключения. Текст и подсказки для UI выбираются по
/// нему во фронтенде и не зависят от формулировок в логах демонов.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ConnectErrorCode {
    IkeAuthFailed,
    IkeNoProposal,
    IkeTsUnacceptable,
    IkeCertUntrusted,
    IkePeerUnreachable,
    PppNegotiationFailed,
    PppPeerAuthFailed,
    PppOurAuthFailed,
    PppPeerDead,
    PppKilled,
    StackFailed,
    Unknown,
}

/// Источник строки лога.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogSource {
    Charon,
    Pppd,
}

/// Состояние IKE SA подключения из `swanctl --list-sas --raw`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IkeSaState {
    Established,
    Negotiating,
    Absent,
}

/// Структурный или логовый признак неудачного подключения.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConnectSignal {
    /// pppd завершился с кодом. Код видит только xl2tpd, который его спавнит
    /// ("pppd exited for call N with code C" в его логе).
    PppdExit(i32),
    /// pppd убит сигналом ("pppd terminated for call N by signal S").
    PppdSignal(i32),
    /// pppd за отведённое время так и не появился.
    PppdMissing,
    /// Локальный демон из стека не запущен.
    DaemonDead(&'static str),
    /// Состояние IKE SA этого подключения.
    IkeSaState(IkeSaState),
    /// Строка лога charon или pppd.
    Log(LogSource, String),
}

/// Результат классификации. Код и этап уходят в UI, признаки остаются для
/// логов и истории сессий.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
pub struct ConnectError {
    pub code: ConnectErrorCode,
    pub stage: ConnectStage,
    pub evidence: Vec<String>,
}

/// Максимум признаков в результате: сырые логи могут быть большими.
const MAX_EVIDENCE: usize = 40;

impl ConnectError {
    /// Краткое описание для логов и истории сессий.
    /// UI строит текст по code, поэтому формулировки логов на него не влияют.
    pub fn user_message(&self) -> &'static str {
        match self.code {
            ConnectErrorCode::IkeAuthFailed => "Сервер отклонил аутентификацию IKE",
            ConnectErrorCode::IkeNoProposal => "Сервер не принял набор алгоритмов шифрования",
            ConnectErrorCode::IkeTsUnacceptable => "Сервер отклонил подсети туннеля",
            ConnectErrorCode::IkeCertUntrusted => "Сертификат или ключ сервера не прошёл проверку",
            ConnectErrorCode::IkePeerUnreachable => "Сервер не отвечает на запросы IKE",
            ConnectErrorCode::PppNegotiationFailed => "PPP-согласование не завершилось",
            ConnectErrorCode::PppPeerAuthFailed => "Сервер не прошёл проверку подлинности на этапе PPP",
            ConnectErrorCode::PppOurAuthFailed => "Сервер отклонил имя пользователя или пароль",
            ConnectErrorCode::PppPeerDead => "Сервер оборвал PPP-соединение",
            ConnectErrorCode::PppKilled => "pppd завершён принудительно",
            ConnectErrorCode::StackFailed => "Локальные VPN-демоны не запустились",
            ConnectErrorCode::Unknown => "Причина сбоя подключения не распознана",
        }
    }
}

impl fmt::Display for ConnectError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({})", self.user_message(), self.evidence.join("; "))
    }
}

impl From<String> for ConnectError {
    fn from(message: String) -> Self {
        ConnectError {
            code: ConnectErrorCode::Unknown,
            stage: ConnectStage::Unknown,
            evidence: vec![message],
        }
    }
}

impl From<&str> for ConnectError {
    fn from(message: &str) -> Self {
        ConnectError::from(message.to_string())
    }
}

// ---------------------------------------------------------------------------
// Правила классификации
// ---------------------------------------------------------------------------

type Matcher = fn(&[ConnectSignal]) -> Option<String>;

struct Rule {
    code: ConnectErrorCode,
    stage: ConnectStage,
    matches: Matcher,
}

/// Упорядоченная таблица правил: первое совпадение выигрывает.
static RULES: &[Rule] = &[
    // Структурные сигналы: коды выхода pppd (man pppd, EXIT STATUS).
    Rule { code: ConnectErrorCode::PppOurAuthFailed, stage: ConnectStage::Ppp, matches: m_exit_19 },
    Rule { code: ConnectErrorCode::PppPeerAuthFailed, stage: ConnectStage::Ppp, matches: m_exit_11 },
    Rule { code: ConnectErrorCode::PppNegotiationFailed, stage: ConnectStage::Ppp, matches: m_exit_10_17 },
    Rule { code: ConnectErrorCode::PppPeerDead, stage: ConnectStage::Ppp, matches: m_exit_15_16 },
    Rule { code: ConnectErrorCode::PppKilled, stage: ConnectStage::Ppp, matches: m_exit_5 },
    Rule { code: ConnectErrorCode::PppKilled, stage: ConnectStage::Ppp, matches: m_pppd_signal },
    Rule { code: ConnectErrorCode::StackFailed, stage: ConnectStage::Unknown, matches: m_daemon_dead },

    // Стабильные токены RFC 7296 в логе charon.
    Rule { code: ConnectErrorCode::IkeAuthFailed, stage: ConnectStage::Ike, matches: m_charon_auth_token },
    Rule { code: ConnectErrorCode::IkeAuthFailed, stage: ConnectStage::Ike, matches: m_charon_invalid_id_token },
    Rule { code: ConnectErrorCode::IkeNoProposal, stage: ConnectStage::Ike, matches: m_charon_no_proposal_token },
    Rule { code: ConnectErrorCode::IkeTsUnacceptable, stage: ConnectStage::Child, matches: m_charon_ts_token },

    // Устойчивые фразы charon: токен RFC не всегда попадает в лог,
    // strongSwan может писать человекочитаемый текст.
    Rule { code: ConnectErrorCode::IkeCertUntrusted, stage: ConnectStage::Ike, matches: m_charon_no_trusted_key },
    Rule { code: ConnectErrorCode::IkePeerUnreachable, stage: ConnectStage::Ike, matches: m_charon_giving_up },
    Rule { code: ConnectErrorCode::IkeAuthFailed, stage: ConnectStage::Ike, matches: m_charon_auth_phrase },
    Rule { code: ConnectErrorCode::IkeNoProposal, stage: ConnectStage::Ike, matches: m_charon_no_proposal_phrase },
    Rule { code: ConnectErrorCode::IkeNoProposal, stage: ConnectStage::Ike, matches: m_charon_no_proposal_short_phrase },

    // Устойчивые фразы pppd.
    Rule { code: ConnectErrorCode::PppOurAuthFailed, stage: ConnectStage::Ppp, matches: m_pppd_chap_failed },
    Rule { code: ConnectErrorCode::PppOurAuthFailed, stage: ConnectStage::Ppp, matches: m_pppd_pap_failed },
    Rule { code: ConnectErrorCode::PppPeerAuthFailed, stage: ConnectStage::Ppp, matches: m_pppd_peer_refused },
    Rule { code: ConnectErrorCode::PppNegotiationFailed, stage: ConnectStage::Ppp, matches: m_pppd_lcp_timeout },

    // Структурный вывод: IKE установлен, а pppd не появился.
    Rule { code: ConnectErrorCode::PppNegotiationFailed, stage: ConnectStage::Ppp, matches: m_pppd_missing_ike_established },
];

/// Чистая функция: признаки на входе, классификация на выходе.
/// Если правило не сработало, возвращается Unknown со всеми признаками.
pub fn classify_connect_failure(signals: &[ConnectSignal]) -> ConnectError {
    for rule in RULES {
        if let Some(evidence) = (rule.matches)(signals) {
            return ConnectError {
                code: rule.code,
                stage: rule.stage,
                evidence: vec![evidence],
            };
        }
    }
    ConnectError {
        code: ConnectErrorCode::Unknown,
        stage: ConnectStage::Unknown,
        evidence: collect_evidence(signals),
    }
}

/// Разбирает лог xl2tpd: статус завершения pppd — структурный сигнал,
/// надёжнее любых формулировок в логе самого pppd.
pub fn pppd_outcome_signals(xl2tpd_log: &str) -> Vec<ConnectSignal> {
    let mut out = Vec::new();
    for line in xl2tpd_log.lines() {
        if let Some(code) = trailing_number(line, "with code") {
            out.push(ConnectSignal::PppdExit(code));
        } else if let Some(signal) = trailing_number(line, "by signal") {
            out.push(ConnectSignal::PppdSignal(signal));
        }
    }
    out
}

/// Превращает непустые строки лога в признаки.
pub fn log_signals(source: LogSource, text: &str) -> Vec<ConnectSignal> {
    text.lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| ConnectSignal::Log(source, line.to_string()))
        .collect()
}

fn trailing_number(line: &str, marker: &str) -> Option<i32> {
    let idx = line.find(marker)? + marker.len();
    line[idx..]
        .split_whitespace()
        .next()?
        .trim_end_matches(|c: char| !c.is_ascii_digit() && c != '-')
        .parse()
        .ok()
}

fn describe(signal: &ConnectSignal) -> String {
    match signal {
        ConnectSignal::PppdExit(code) => format!("pppd exit {}", code),
        ConnectSignal::PppdSignal(signal) => format!("pppd signal {}", signal),
        ConnectSignal::PppdMissing => "pppd missing".to_string(),
        ConnectSignal::DaemonDead(name) => format!("{} not running", name),
        ConnectSignal::IkeSaState(state) => format!("ike sa {}", match state {
            IkeSaState::Established => "established",
            IkeSaState::Negotiating => "negotiating",
            IkeSaState::Absent => "absent",
        }),
        ConnectSignal::Log(_, line) => line.clone(),
    }
}

fn collect_evidence(signals: &[ConnectSignal]) -> Vec<String> {
    let mut evidence: Vec<String> = signals.iter().map(describe).collect();
    if evidence.len() > MAX_EVIDENCE {
        evidence = evidence.split_off(evidence.len() - MAX_EVIDENCE);
    }
    evidence
}

// ---------------------------------------------------------------------------
// Матчеры
// ---------------------------------------------------------------------------

fn find_exit(signals: &[ConnectSignal], codes: &[i32]) -> Option<String> {
    signals.iter().find_map(|signal| match signal {
        ConnectSignal::PppdExit(code) if codes.contains(code) => Some(describe(signal)),
        _ => None,
    })
}

fn find_log(signals: &[ConnectSignal], source: LogSource, phrases: &[&str]) -> Option<String> {
    for signal in signals {
        if let ConnectSignal::Log(line_source, line) = signal {
            if *line_source != source {
                continue;
            }
            let lower = line.to_ascii_lowercase();
            if phrases.iter().all(|phrase| lower.contains(phrase)) {
                return Some(line.clone());
            }
        }
    }
    None
}

macro_rules! exit_matcher {
    ($name:ident, $codes:expr) => {
        fn $name(signals: &[ConnectSignal]) -> Option<String> {
            find_exit(signals, $codes)
        }
    };
}

macro_rules! log_matcher {
    ($name:ident, $source:expr, $phrases:expr) => {
        fn $name(signals: &[ConnectSignal]) -> Option<String> {
            find_log(signals, $source, $phrases)
        }
    };
}

exit_matcher!(m_exit_19, &[19]);
exit_matcher!(m_exit_11, &[11]);
exit_matcher!(m_exit_10_17, &[10, 17]);
exit_matcher!(m_exit_15_16, &[15, 16]);
exit_matcher!(m_exit_5, &[5]);

log_matcher!(m_charon_auth_token, LogSource::Charon, &["authentication_failed"]);
log_matcher!(m_charon_invalid_id_token, LogSource::Charon, &["invalid_id_information"]);
log_matcher!(m_charon_no_proposal_token, LogSource::Charon, &["no_proposal_chosen"]);
log_matcher!(m_charon_ts_token, LogSource::Charon, &["ts_unacceptable"]);
log_matcher!(m_charon_no_trusted_key, LogSource::Charon, &["no trusted", "public key found"]);
log_matcher!(m_charon_giving_up, LogSource::Charon, &["giving up after", "retransmits"]);
log_matcher!(m_charon_auth_phrase, LogSource::Charon, &["authentication of", "failed"]);
log_matcher!(m_charon_no_proposal_phrase, LogSource::Charon, &["no acceptable proposal found"]);
log_matcher!(m_charon_no_proposal_short_phrase, LogSource::Charon, &["no proposal found"]);
log_matcher!(m_pppd_chap_failed, LogSource::Pppd, &["chap authentication failed"]);
log_matcher!(m_pppd_pap_failed, LogSource::Pppd, &["pap authentication failed"]);
log_matcher!(m_pppd_peer_refused, LogSource::Pppd, &["peer refused to authenticate"]);
log_matcher!(m_pppd_lcp_timeout, LogSource::Pppd, &["lcp: timeout sending config-requests"]);

fn m_pppd_signal(signals: &[ConnectSignal]) -> Option<String> {
    signals.iter().find_map(|signal| match signal {
        ConnectSignal::PppdSignal(_) => Some(describe(signal)),
        _ => None,
    })
}

fn m_daemon_dead(signals: &[ConnectSignal]) -> Option<String> {
    signals.iter().find_map(|signal| match signal {
        ConnectSignal::DaemonDead(_) => Some(describe(signal)),
        _ => None,
    })
}

fn m_pppd_missing_ike_established(signals: &[ConnectSignal]) -> Option<String> {
    let pppd_missing = signals.iter().any(|s| matches!(s, ConnectSignal::PppdMissing));
    let ike_established = signals
        .iter()
        .any(|s| matches!(s, ConnectSignal::IkeSaState(IkeSaState::Established)));
    if pppd_missing && ike_established {
        Some("pppd missing while IKE SA established".to_string())
    } else {
        None
    }
}

/// Читает лог-файл (best effort)
pub(super) fn read_log_tail(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn charon(line: &str) -> ConnectSignal {
        ConnectSignal::Log(LogSource::Charon, line.to_string())
    }

    fn pppd(line: &str) -> ConnectSignal {
        ConnectSignal::Log(LogSource::Pppd, line.to_string())
    }

    fn exit(code: i32) -> ConnectSignal {
        ConnectSignal::PppdExit(code)
    }

    #[test]
    fn pppd_exit_19_is_our_auth_failed() {
        let err = classify_connect_failure(&[exit(19)]);
        assert_eq!(err.code, ConnectErrorCode::PppOurAuthFailed);
        assert_eq!(err.stage, ConnectStage::Ppp);
    }

    #[test]
    fn pppd_exit_11_is_peer_auth_failed() {
        let err = classify_connect_failure(&[exit(11)]);
        assert_eq!(err.code, ConnectErrorCode::PppPeerAuthFailed);
    }

    #[test]
    fn pppd_exit_10_is_negotiation_failed() {
        let err = classify_connect_failure(&[exit(10)]);
        assert_eq!(err.code, ConnectErrorCode::PppNegotiationFailed);
    }

    #[test]
    fn pppd_exit_15_is_peer_dead() {
        let err = classify_connect_failure(&[exit(15)]);
        assert_eq!(err.code, ConnectErrorCode::PppPeerDead);
    }

    #[test]
    fn charon_rfc_token_auth_failed() {
        let err = classify_connect_failure(&[charon(
            "09[IKE] received AUTHENTICATION_FAILED notify error",
        )]);
        assert_eq!(err.code, ConnectErrorCode::IkeAuthFailed);
        assert_eq!(err.stage, ConnectStage::Ike);
    }

    #[test]
    fn charon_rfc_token_no_proposal() {
        let err = classify_connect_failure(&[charon(
            "08[IKE] <home|1> received NO_PROPOSAL_CHOSEN notify error",
        )]);
        assert_eq!(err.code, ConnectErrorCode::IkeNoProposal);
    }

    #[test]
    fn charon_rfc_token_ts_unacceptable_is_child_stage() {
        let err = classify_connect_failure(&[charon(
            "12[CHD] <home|1> received TS_UNACCEPTABLE notify error",
        )]);
        assert_eq!(err.code, ConnectErrorCode::IkeTsUnacceptable);
        assert_eq!(err.stage, ConnectStage::Child);
    }

    #[test]
    fn charon_retransmit_timeout_is_peer_unreachable() {
        let err = classify_connect_failure(&[charon("11[IKE] giving up after 5 retransmits")]);
        assert_eq!(err.code, ConnectErrorCode::IkePeerUnreachable);
    }

    #[test]
    fn charon_psk_prose_is_auth_failed() {
        // strongSwan 6.0.7 пишет человекочитаемый текст вместо токена RFC
        let err = classify_connect_failure(&[charon(
            "09[IKE] authentication of '203.0.113.5' with PSK failed",
        )]);
        assert_eq!(err.code, ConnectErrorCode::IkeAuthFailed);
    }

    #[test]
    fn charon_proposal_prose_is_no_proposal() {
        let err = classify_connect_failure(&[charon(
            "08[IKE] <home|1> no acceptable proposal found",
        )]);
        assert_eq!(err.code, ConnectErrorCode::IkeNoProposal);
    }

    #[test]
    fn charon_no_trusted_key_is_cert_untrusted() {
        let err = classify_connect_failure(&[charon(
            "09[IKE] no trusted RSA public key found for '203.0.113.5'",
        )]);
        assert_eq!(err.code, ConnectErrorCode::IkeCertUntrusted);
    }

    #[test]
    fn pppd_chap_prose_is_our_auth_failed() {
        let err = classify_connect_failure(&[pppd("CHAP authentication failed")]);
        assert_eq!(err.code, ConnectErrorCode::PppOurAuthFailed);
    }

    #[test]
    fn structural_signal_beats_log_text() {
        let err = classify_connect_failure(&[
            charon("11[IKE] giving up after 5 retransmits"),
            exit(19),
        ]);
        assert_eq!(err.code, ConnectErrorCode::PppOurAuthFailed);
    }

    #[test]
    fn exit_rules_have_priority_over_prose() {
        let err = classify_connect_failure(&[pppd("CHAP authentication failed"), exit(11)]);
        assert_eq!(err.code, ConnectErrorCode::PppPeerAuthFailed);
    }

    #[test]
    fn daemon_dead_is_stack_failed() {
        let err = classify_connect_failure(&[ConnectSignal::DaemonDead("charon")]);
        assert_eq!(err.code, ConnectErrorCode::StackFailed);
    }

    #[test]
    fn pppd_missing_with_established_ike_is_negotiation_failed() {
        let err = classify_connect_failure(&[
            ConnectSignal::PppdMissing,
            ConnectSignal::IkeSaState(IkeSaState::Established),
        ]);
        assert_eq!(err.code, ConnectErrorCode::PppNegotiationFailed);
        assert_eq!(err.stage, ConnectStage::Ppp);
    }

    #[test]
    fn unrecognized_stays_unknown_with_evidence() {
        let err = classify_connect_failure(&[charon("some new message")]);
        assert_eq!(err.code, ConnectErrorCode::Unknown);
        assert_eq!(err.stage, ConnectStage::Unknown);
        assert_eq!(err.evidence, vec!["some new message".to_string()]);
    }

    #[test]
    fn unknown_evidence_is_capped() {
        let signals: Vec<ConnectSignal> = (0..100)
            .map(|i| charon(&format!("line {}", i)))
            .collect();
        let err = classify_connect_failure(&signals);
        assert_eq!(err.evidence.len(), MAX_EVIDENCE);
        assert_eq!(err.evidence.last().unwrap(), "line 99");
    }

    #[test]
    fn parses_pppd_exit_code_from_xl2tpd_log() {
        let log = "control_finish : pppd exited for call 3 with code 19\n";
        let signals = pppd_outcome_signals(log);
        assert_eq!(signals, vec![exit(19)]);
    }

    #[test]
    fn parses_pppd_signal_from_xl2tpd_log() {
        let log = "control_finish : pppd terminated for call 3 by signal 15\n";
        let signals = pppd_outcome_signals(log);
        assert_eq!(signals, vec![ConnectSignal::PppdSignal(15)]);
    }

    #[test]
    fn ignores_unrelated_xl2tpd_lines() {
        let log = "xl2tpd[4711]: Listening on IP address 0.0.0.0, port 1701\n";
        assert!(pppd_outcome_signals(log).is_empty());
    }

    #[test]
    fn trailing_number_tolerates_punctuation() {
        assert_eq!(trailing_number("with code 19.", "with code"), Some(19));
        assert_eq!(trailing_number("with code 19", "with code"), Some(19));
    }
}
