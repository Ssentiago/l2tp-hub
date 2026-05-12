use crate::{log, logger};
use keyring::Entry;
use std::collections::HashMap;

const SERVICE: &str = "com.senti.l2tp";

// ─── macOS: один блоб ────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
const BLOB_KEY: &str = "all_passwords";

#[cfg(target_os = "macos")]
fn get_all_passwords() -> HashMap<String, String> {
    let entry = match Entry::new(SERVICE, BLOB_KEY) {
        Ok(e) => e,
        Err(_) => return HashMap::new(),
    };
    match entry.get_password() {
        Ok(json) => serde_json::from_str(&json).unwrap_or_default(),
        Err(_) => HashMap::new(),
    }
}

#[cfg(target_os = "macos")]
fn save_all_passwords(map: &HashMap<String, String>) -> Result<(), String> {
    let json = serde_json::to_string(map).map_err(|e| e.to_string())?;
    let entry = Entry::new(SERVICE, BLOB_KEY).map_err(|e| e.to_string())?;
    entry.set_password(&json).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    log!("[set_password] key='{}'", key);
    let mut map = get_all_passwords();
    map.insert(key.to_string(), password.to_string());
    save_all_passwords(&map)
}

#[cfg(target_os = "macos")]
pub fn get_password(key: &str) -> Result<String, String> {
    log!("[get_password] key='{}'", key);
    let map = get_all_passwords();
    map.get(key)
        .cloned()
        .ok_or_else(|| format!("Keychain: key '{}' not found", key))
}

#[cfg(target_os = "macos")]
pub fn delete_password(key: &str) -> Result<(), String> {
    log!("[delete_password] key='{}'", key);
    let mut map = get_all_passwords();
    map.remove(key);
    save_all_passwords(&map)
}

// ─── Windows: по ключу ───────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    log!("[set_password] key='{}'", key);
    let entry = Entry::new(SERVICE, key).map_err(|e| e.to_string())?;
    entry.set_password(password).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
pub fn get_password(key: &str) -> Result<String, String> {
    log!("[get_password] key='{}'", key);
    let entry = Entry::new(SERVICE, key).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
pub fn delete_password(key: &str) -> Result<(), String> {
    log!("[delete_password] key='{}'", key);
    let entry = Entry::new_with_target("local", SERVICE, key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(target_os = "macos")]
pub fn migrate_to_blob(keys: &[String]) {
    let mut map = get_all_passwords();
    let mut migrated = 0;

    for key in keys {
        if map.contains_key(key) {
            continue; // уже в блобе
        }
        let entry = match Entry::new(SERVICE, key) {
            Ok(e) => e,
            Err(_) => continue,
        };
        match entry.get_password() {
            Ok(val) => {
                map.insert(key.clone(), val);
                let _ = entry.delete_credential();
                migrated += 1;
            }
            Err(_) => continue,
        }
    }

    if migrated > 0 {
        log!("[migrate_to_blob] Migrated {} keys", migrated);
        let _ = save_all_passwords(&map);
    } else {
        log!("[migrate_to_blob] Nothing to migrate");
    }
}
