const SERVICE: &str = "com.senti.l2tp";

pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    keyring::Entry::new(SERVICE, key)
        .map_err(|e| e.to_string())?
        .set_password(password)
        .map_err(|e| e.to_string())
}

pub fn get_password(key: &str) -> Result<String, String> {
    keyring::Entry::new(SERVICE, key)
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| format!("Keychain: key '{}' not found", key))
}

pub fn delete_password(key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE, key)
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // not found — тоже ок
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