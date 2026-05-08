use crate::{log, logger};
use keyring::Entry;

const SERVICE: &str = "com.senti.l2tp";

pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    log!(
        "[set_password] Called for key: '{}'. Password length: {}",
        key,
        password.len()
    );

    let entry = Entry::new(SERVICE, key).map_err(|e| {
        let err_msg = format!("[set_password] Entry::new failed for key '{}': {}", key, e);
        log!("{}", &err_msg);
        e.to_string()
    })?;

    match entry.set_password(password) {
        Ok(_) => {
            log!(
                "[set_password] Successfully updated password for key: '{}'",
                key
            );
            Ok(())
        }
        Err(e) => {
            log!(
                "[set_password] set_password failed for key '{}': {}",
                key,
                e
            );
            Err(e.to_string())
        }
    }
}

pub fn get_password(key: &str) -> Result<String, String> {
    log!("[get_password] Attempting to retrieve key: '{}'", key);

    let entry = Entry::new(SERVICE, key).map_err(|e| {
        log!("[get_password] Entry::new failed for key '{}': {}", key, e);
        e.to_string()
    })?;

    match entry.get_password() {
        Ok(pass) => {
            log!(
                "[get_password] Successfully retrieved password for key: '{}'",
                key,
            );
            Ok(pass)
        }
        Err(e) => {
            log!(
                "[get_password] get_password failed for key '{}': {}",
                key,
                e
            );
            Err(format!("Keychain: key '{}' not found: {}", key, e))
        }
    }
}

pub fn delete_password(key: &str) -> Result<(), String> {
    log!("[delete_password] Attempting to delete key: '{}'", key);

    let entry = Entry::new_with_target("local", SERVICE, key).map_err(|e| {
        log!(
            "[delete_password] Entry::new_with_target failed for key '{}': {}",
            key,
            e
        );
        e.to_string()
    })?;

    match entry.delete_credential() {
        Ok(_) => {
            log!("[delete_password] Successfully deleted key: '{}'", key);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            log!(
                "[delete_password] Key '{}' not found, nothing to delete (NoEntry)",
                key
            );
            Ok(())
        }
        Err(e) => {
            log!(
                "[delete_password] delete_credential failed for key '{}': {}",
                key,
                e
            );
            Err(e.to_string())
        }
    }
}
