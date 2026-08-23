use crate::keychain;

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || open::that(url).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

/// Проверяет доступ к связке ключей — пробует прочитать/создать тестовую запись.
/// macOS покажет системный диалог "разрешить доступ" при первом обращении.
#[tauri::command]
pub async fn check_keychain_access() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| {
        let test_key = "_l2tp_hub_access_test";
        // set_password создаст запись если нет — macOS запросит разрешение
        match keychain::set_password(test_key, "ok") {
            Ok(()) => {
                // Чистим за собой
                let _ = keychain::delete_password(test_key);
                Ok(true)
            }
            Err(_e) => {
                // Если пользователь отклонил — keyring вернёт ошибку
                Ok(false)
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
