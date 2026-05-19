use crate::keychain::SERVICE;
use crate::log;
use keyring::Entry;

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
