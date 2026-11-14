use sha2::{Digest, Sha256};

use crate::models::Connection;

/// Хеш конфигурации сервиса для определения необходимости пересоздания.
///
/// Детерминированный: считается через SHA-256 по каноничному байтовому
/// представлению полей и не зависит от версии компилятора.
pub fn service_hash(conn: &Connection, password: &str, shared_secret: &str) -> String {
    let mut hasher = Sha256::new();
    for field in [
        conn.server.as_str(),
        conn.username.as_str(),
        conn.service_name.as_str(),
        password,
        shared_secret,
    ] {
        let bytes = field.as_bytes();
        hasher.update((bytes.len() as u64).to_be_bytes());
        hasher.update(bytes);
    }
    hex_encode(&hasher.finalize())
}

fn hex_encode(bytes: &[u8]) -> String {
    use std::fmt::Write;
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        let _ = write!(out, "{:02x}", b);
    }
    out
}
