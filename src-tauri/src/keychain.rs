use keyring::Entry;

const SERVICE: &str = "com.senti.l2tp";

pub fn set_password(key: &str, password: &str) -> Result<(), String> {
    // target modifier "local" — Local persistence, видна из любого контекста
    let entry = Entry::new_with_target("local", SERVICE, key)
        .map_err(|e| e.to_string())?;
    entry.set_password(password)
        .map_err(|e| e.to_string())
}

pub fn get_password(key: &str) -> Result<String, String> {
    let entry = Entry::new_with_target("local", SERVICE, key)
        .map_err(|e| e.to_string())?;
    entry.get_password()
        .map_err(|_| format!("Keychain: key '{}' not found", key))
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