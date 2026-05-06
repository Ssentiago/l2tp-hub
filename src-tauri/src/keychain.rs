use keyring::Entry;

const SERVICE: &str = "com.senti.l2tp";

fn log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\l2tp-hub-debug.log")
        .unwrap();
    writeln!(f, "{}", msg).unwrap();
}

pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    log(&format!("keychain::set_password key={}", key));
    let entry = Entry::new(SERVICE, key)
        .map_err(|e| {
            log(&format!("Entry::new failed: {}", e));
            e.to_string()
        })?;
    entry.set_password(password)
        .map_err(|e| {
            log(&format!("set_password failed: {}", e));
            e.to_string()
        })
}

pub fn get_password(key: &str) -> Result<String, String> {
    log(&format!("keychain::get_password key={}", key));
    let entry = Entry::new(SERVICE, key)
        .map_err(|e| {
            log(&format!("Entry::new failed: {}", e));
            e.to_string()
        })?;
    entry.get_password()
        .map_err(|e| {
            log(&format!("get_password failed key={} err={}", key, e));
            format!("Keychain: key '{}' not found: {}", key, e)
        })
}

pub fn delete_password(key: &str) -> Result<(), String> {
    let entry = Entry::new_with_target("local", SERVICE, key)
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyring() {
        let set_result = set_password("test_key", "test_val");
        println!("set: {:?}", set_result);

        let get_result = get_password("test_key");
        println!("get: {:?}", get_result);

        set_result.unwrap();
        get_result.unwrap();
    }
}