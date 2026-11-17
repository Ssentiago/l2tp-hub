use crate::log;
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{Algorithm, Argon2, Params, Version};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::keychain;
use l2tp_hub_core::error::{AppError, AppErrorCode};
use crate::models::connection::Connection;
use crate::models::label::Label;
use crate::store::Store;

// Legacy format signature (version 1), kept for reading old backups.
const MAGIC_V1: &[u8] = b"L2TP-HUB";
// Current format signature. Differs from the legacy one at byte 4, so format
// detection is unambiguous.
const MAGIC_V2: &[u8] = b"L2TPHUB";
const FORMAT_VERSION: u8 = 2;

const KDF_ARGON2ID: u8 = 1;
const KDF_M_COST_KIB: u32 = 19456;
const KDF_T_COST: u32 = 2;
const KDF_P_COST: u32 = 1;

const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const GCM_TAG_LEN: usize = 16;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionExport {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub display_name: String,
    pub server: String,
    pub username: String,
    pub password: String,
    pub shared_secret: String,
    pub labels: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportPayload {
    connections: Vec<ConnectionExport>,
    labels: Vec<Label>,
}

fn derive_key(password: &str, salt: &[u8], m_cost: u32, t_cost: u32, p_cost: u32) -> Result<[u8; KEY_LEN], AppError> {
    let params = Params::new(m_cost, t_cost, p_cost, Some(KEY_LEN))
        .map_err(|e| format!("KDF params error: {}", e))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; KEY_LEN];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation error: {}", e))?;
    Ok(key)
}

// Version 1 key derivation: a single SHA-256 of the password. Only used to read
// legacy backups.
fn derive_key_legacy(password: &str) -> [u8; KEY_LEN] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.finalize().into()
}

fn encrypt_payload(plaintext: &[u8], password: &str) -> Result<Vec<u8>, AppError> {
    let mut salt = [0u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);

    let key = derive_key(password, &salt, KDF_M_COST_KIB, KDF_T_COST, KDF_P_COST)?;
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher init error: {}", e))?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| "Encryption failed".to_string())?;

    let mut result = Vec::with_capacity(
        MAGIC_V2.len() + 2 + 12 + SALT_LEN + NONCE_LEN + ciphertext.len(),
    );
    result.extend_from_slice(MAGIC_V2);
    result.push(FORMAT_VERSION);
    result.push(KDF_ARGON2ID);
    result.extend_from_slice(&KDF_M_COST_KIB.to_be_bytes());
    result.extend_from_slice(&KDF_T_COST.to_be_bytes());
    result.extend_from_slice(&KDF_P_COST.to_be_bytes());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

fn decrypt_payload(data: &[u8], password: &str) -> Result<Vec<u8>, AppError> {
    if data.starts_with(MAGIC_V2) {
        return decrypt_v2(data, password);
    }
    if data.starts_with(MAGIC_V1) {
        return decrypt_v1(data, password);
    }
    Err(AppError::new(AppErrorCode::InvalidFileFormat))
}

fn read_u32_be(data: &[u8], offset: &mut usize) -> u32 {
    let value = u32::from_be_bytes(data[*offset..*offset + 4].try_into().expect("u32 slice"));
    *offset += 4;
    value
}

fn decrypt_v2(data: &[u8], password: &str) -> Result<Vec<u8>, AppError> {
    let header_len = MAGIC_V2.len() + 2 + 12 + SALT_LEN + NONCE_LEN;
    if data.len() < header_len + GCM_TAG_LEN {
        return Err(AppError::new(AppErrorCode::CorruptConfig));
    }

    let version = data[MAGIC_V2.len()];
    if version != FORMAT_VERSION {
        return Err(AppError::detail(AppErrorCode::UnsupportedFormatVersion, version.to_string()));
    }
    let kdf_id = data[MAGIC_V2.len() + 1];
    if kdf_id != KDF_ARGON2ID {
        return Err(AppError::detail(AppErrorCode::UnsupportedKdf, kdf_id.to_string()));
    }

    let mut offset = MAGIC_V2.len() + 2;
    let m_cost = read_u32_be(data, &mut offset);
    let t_cost = read_u32_be(data, &mut offset);
    let p_cost = read_u32_be(data, &mut offset);
    let salt = &data[offset..offset + SALT_LEN];
    offset += SALT_LEN;
    let nonce_bytes = &data[offset..offset + NONCE_LEN];
    offset += NONCE_LEN;
    let ciphertext = &data[offset..];

    let key = derive_key(password, salt, m_cost, t_cost, p_cost)?;
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher init error: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| AppError::new(AppErrorCode::WrongPassword))
}

fn decrypt_v1(data: &[u8], password: &str) -> Result<Vec<u8>, AppError> {
    if data.len() < MAGIC_V1.len() + NONCE_LEN + GCM_TAG_LEN {
        return Err(AppError::new(AppErrorCode::CorruptConfig));
    }

    let nonce_bytes = &data[MAGIC_V1.len()..MAGIC_V1.len() + NONCE_LEN];
    let ciphertext = &data[MAGIC_V1.len() + NONCE_LEN..];

    let key = derive_key_legacy(password);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher init error: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| AppError::new(AppErrorCode::WrongPassword))
}

pub fn make_backup(store: &Store, password: &str) -> Result<Vec<u8>, AppError> {
    log!("[make_backup] Starting export");

    let mut connections_export = Vec::new();
    for ws in &store.workspaces {
        for conn in &ws.connections {
            let password_val = keychain::get_password(&conn.keychain_key).unwrap_or_default();
            let shared_secret_val =
                keychain::get_password(&conn.shared_secret_key).unwrap_or_default();

            connections_export.push(ConnectionExport {
                id: conn.id.clone(),
                name: conn.service_name.clone(),
                display_name: conn.display_name.clone(),
                server: conn.server.clone(),
                username: conn.username.clone(),
                password: password_val,
                shared_secret: shared_secret_val,
                labels: conn.labels.clone(),
            });
        }
    }

    let payload = ExportPayload {
        connections: connections_export,
        labels: store.labels.clone(),
    };

    let json = serde_json::to_vec(&payload).map_err(|e| format!("Serialization error: {}", e))?;

    log!("[make_backup] Payload JSON size: {} bytes", json.len());

    let result = encrypt_payload(&json, password)?;

    log!(
        "[make_backup] Export complete, file size: {} bytes",
        result.len()
    );
    Ok(result)
}

pub fn restore_backup(
    data: &[u8],
    password: &str,
) -> Result<(Vec<Connection>, Vec<Label>), AppError> {
    log!("[restore_backup] Starting import");

    if data.starts_with(MAGIC_V1) {
        log!("[restore_backup] Legacy format detected, reading as version 1");
    }

    let plaintext = decrypt_payload(data, password)?;

    log!("[restore_backup] Decrypted {} bytes", plaintext.len());

    let payload: ExportPayload =
        serde_json::from_slice(&plaintext).map_err(|e| format!("Parse error: {}", e))?;

    let mut connections = Vec::new();
    for exp in payload.connections {
        let keychain_key = format!("password_{}", exp.id);
        let shared_secret_key = format!("shared_{}", exp.id);

        keychain::set_password(&keychain_key, &exp.password)
            .map_err(|e| format!("Keychain write error (password): {}", e))?;
        keychain::set_password(&shared_secret_key, &exp.shared_secret)
            .map_err(|e| format!("Keychain write error (shared_secret): {}", e))?;

        connections.push(Connection {
            id: exp.id,
            service_name: exp.name,
            display_name: exp.display_name,
            server: exp.server,
            username: exp.username,
            keychain_key,
            shared_secret_key,
            labels: exp.labels,
            ..Default::default()
        });
    }

    log!(
        "[restore_backup] Import parsed: {} connections, {} labels",
        connections.len(),
        payload.labels.len(),
    );

    Ok((connections, payload.labels))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_payload() -> ExportPayload {
        ExportPayload {
            connections: vec![ConnectionExport {
                id: "conn-1".to_string(),
                name: "office".to_string(),
                display_name: "Office".to_string(),
                server: "vpn.example.com".to_string(),
                username: "user".to_string(),
                password: "secret".to_string(),
                shared_secret: "ike-secret".to_string(),
                labels: std::collections::HashMap::new(),
            }],
            labels: Vec::new(),
        }
    }

    fn build_legacy_blob(plaintext: &[u8], password: &str) -> Vec<u8> {
        let key = derive_key_legacy(password);
        let cipher = Aes256Gcm::new_from_slice(&key).expect("cipher");
        let mut nonce_bytes = [0u8; NONCE_LEN];
        OsRng.fill_bytes(&mut nonce_bytes);
        let ciphertext = cipher
            .encrypt(Nonce::from_slice(&nonce_bytes), plaintext)
            .expect("encrypt");
        let mut blob = Vec::new();
        blob.extend_from_slice(MAGIC_V1);
        blob.extend_from_slice(&nonce_bytes);
        blob.extend_from_slice(&ciphertext);
        blob
    }

    #[test]
    fn roundtrip_v2() {
        let payload = serde_json::to_vec(&sample_payload()).expect("serialize");
        let blob = encrypt_payload(&payload, "hunter2").expect("encrypt");
        assert!(blob.starts_with(MAGIC_V2));
        assert_eq!(blob[MAGIC_V2.len()], FORMAT_VERSION);
        assert_eq!(blob[MAGIC_V2.len() + 1], KDF_ARGON2ID);
        let plaintext = decrypt_payload(&blob, "hunter2").expect("decrypt");
        assert_eq!(plaintext, payload);
    }

    #[test]
    fn v2_wrong_password_fails() {
        let blob = encrypt_payload(b"payload", "right").expect("encrypt");
        assert!(decrypt_payload(&blob, "wrong").is_err());
    }

    #[test]
    fn v2_every_export_uses_fresh_salt() {
        let a = encrypt_payload(b"same payload", "pw").expect("encrypt");
        let b = encrypt_payload(b"same payload", "pw").expect("encrypt");
        assert_ne!(a, b);
    }

    #[test]
    fn legacy_v1_still_restores() {
        let payload = serde_json::to_vec(&sample_payload()).expect("serialize");
        let blob = build_legacy_blob(&payload, "old-pass");
        assert!(blob.starts_with(MAGIC_V1));
        let plaintext = decrypt_payload(&blob, "old-pass").expect("decrypt");
        assert_eq!(plaintext, payload);
        assert!(decrypt_payload(&blob, "nope").is_err());
    }

    #[test]
    fn truncated_v2_rejected() {
        let blob = encrypt_payload(b"payload", "pw").expect("encrypt");
        assert!(decrypt_payload(&blob[..MAGIC_V2.len() + 2], "pw").is_err());
    }

    #[test]
    fn unknown_format_rejected() {
        assert!(decrypt_payload(b"not a backup file", "pw").is_err());
    }

    #[test]
    fn unsupported_version_rejected() {
        let mut blob = encrypt_payload(b"payload", "pw").expect("encrypt");
        blob[MAGIC_V2.len()] = FORMAT_VERSION + 1;
        assert!(decrypt_payload(&blob, "pw").is_err());
    }

    #[test]
    fn unsupported_kdf_rejected() {
        let mut blob = encrypt_payload(b"payload", "pw").expect("encrypt");
        blob[MAGIC_V2.len() + 1] = KDF_ARGON2ID + 1;
        assert!(decrypt_payload(&blob, "pw").is_err());
    }
}
