use keyring::Entry;

const SERVICE: &str = "com.senti.l2tp";

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    use chrono::Local;

    // Безопасное открытие файла логирования
    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\l2tp-hub-debug.log") {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "[{}] {}", timestamp, msg);
    }
}

pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    log(&format!("[set_password] Called for key: '{}'. Password length: {}", key, password.len()));

    let entry = Entry::new(SERVICE, key)
        .map_err(|e| {
            let err_msg = format!("[set_password] Entry::new failed for key '{}': {}", key, e);
            log(&err_msg);
            e.to_string()
        })?;

    match entry.set_password(password) {
        Ok(_) => {
            log(&format!("[set_password] Successfully updated password for key: '{}'", key));
            Ok(())
        }
        Err(e) => {
            let err_msg = format!("[set_password] set_password failed for key '{}': {}", key, e);
            log(&err_msg);
            Err(e.to_string())
        }
    }
}

pub fn get_password(key: &str) -> Result<String, String> {
    log(&format!("[get_password] Attempting to retrieve key: '{}'", key));

    let entry = Entry::new(SERVICE, key)
        .map_err(|e| {
            let err_msg = format!("[get_password] Entry::new failed for key '{}': {}", key, e);
            log(&err_msg);
            e.to_string()
        })?;

    match entry.get_password() {
        Ok(pass) => {
            log(&format!("[get_password] Successfully retrieved password for key: '{}'", key));
            Ok(pass)
        }
        Err(e) => {
            let err_msg = format!("[get_password] get_password failed for key '{}': {}", key, e);
            log(&err_msg);
            Err(format!("Keychain: key '{}' not found: {}", key, e))
        }
    }
}

pub fn delete_password(key: &str) -> Result<(), String> {
    log(&format!("[delete_password] Attempting to delete key: '{}'", key));

    let entry = Entry::new_with_target("local", SERVICE, key)
        .map_err(|e| {
            let err_msg = format!("[delete_password] Entry::new_with_target failed for key '{}': {}", key, e);
            log(&err_msg);
            e.to_string()
        })?;

    match entry.delete_credential() {
        Ok(_) => {
            log(&format!("[delete_password] Successfully deleted key: '{}'", key));
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            log(&format!("[delete_password] Key '{}' not found, nothing to delete (NoEntry)", key));
            Ok(())
        }
        Err(e) => {
            let err_msg = format!("[delete_password] delete_credential failed for key '{}': {}", key, e);
            log(&err_msg);
            Err(e.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyring() {
        log("[test_keyring] Starting unit test");
        let set_result = set_password("test_key", "test_val");
        println!("set: {:?}", set_result);

        let get_result = get_password("test_key");
        println!("get: {:?}", get_result);

        set_result.expect("Test set_password failed");
        get_result.expect("Test get_password failed");
        log("[test_keyring] Unit test finished successfully");
    }
}