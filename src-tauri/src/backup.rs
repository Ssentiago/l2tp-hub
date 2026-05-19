use crate::log;
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::keychain;
use crate::models::connection::Connection;
use crate::models::label::Label;
use crate::store::Store;

const MAGIC: &[u8] = b"L2TP-HUB";

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionExport {
    pub id: String,
    pub name: String,
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

fn derive_key(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.finalize().into()
}

pub fn make_backup(store: &Store, password: &str) -> Result<Vec<u8>, String> {
    log!("[make_backup] Starting export");

    let mut connections_export = Vec::new();
    for conn in &store.connections {
        let password_val = keychain::get_password(&conn.keychain_key).unwrap_or_default();
        let shared_secret_val = keychain::get_password(&conn.shared_secret_key).unwrap_or_default();

        connections_export.push(ConnectionExport {
            id: conn.id.clone(),
            name: conn.name.clone(),
            server: conn.server.clone(),
            username: conn.username.clone(),
            password: password_val,
            shared_secret: shared_secret_val,
            labels: conn.labels.clone(),
        });
    }

    let payload = ExportPayload {
        connections: connections_export,
        labels: store.labels.clone(),
    };

    let json = serde_json::to_vec(&payload).map_err(|e| format!("Serialization error: {}", e))?;

    log!("[make_backup] Payload JSON size: {} bytes", json.len());

    let key = derive_key(password);

    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher init error: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, json.as_slice())
        .map_err(|_| "Encryption failed".to_string())?;

    // File format: MAGIC(8) + NONCE(12) + CIPHERTEXT
    let mut result = Vec::new();
    result.extend_from_slice(MAGIC);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    log!(
        "[make_backup] Export complete, file size: {} bytes",
        result.len()
    );
    Ok(result)
}

pub fn restore_backup(
    data: &[u8],
    password: &str,
) -> Result<(Vec<Connection>, Vec<Label>), String> {
    log!("[restore_backup] Starting import");

    if data.len() < MAGIC.len() + 12 {
        return Err("Файл повреждён или не является конфигурацией l2tphub".to_string());
    }
    if &data[..MAGIC.len()] != MAGIC {
        return Err("Неверный формат файла".to_string());
    }

    let nonce_bytes = &data[MAGIC.len()..MAGIC.len() + 12];
    let ciphertext = &data[MAGIC.len() + 12..];

    let key = derive_key(password);

    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher init error: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Неверный пароль или файл повреждён".to_string())?;

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
            name: exp.name,
            server: exp.server,
            username: exp.username,
            keychain_key,
            shared_secret_key,
            service_hash: None, // service needs to recreate
            labels: exp.labels,
        });
    }

    log!(
        "[restore_backup] Import parsed: {} connections, {} labels",
        connections.len(),
        payload.labels.len(),
    );

    Ok((connections, payload.labels))
}
