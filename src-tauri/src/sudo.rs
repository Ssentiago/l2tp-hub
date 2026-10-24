use crate::helper;
use crate::state;
use std::sync::{Arc, Mutex};

// ---------------------------------------------------------------------------
// SudoSession — управление privileged helper через unix socket
// Хелпер — LaunchDaemon с root-правами, слушает /var/run/l2tp-hub-helper.sock
// Один раз устанавливается через osascript, дальше работает постоянно.
// ---------------------------------------------------------------------------

const HELPER_CONNECT_RETRIES: u32 = 3;
const HELPER_CONNECT_DELAY: std::time::Duration = std::time::Duration::from_secs(1);

#[derive(Clone)]
pub struct SudoSession {
    authenticated: Arc<Mutex<bool>>,
    /// Текст статуса для UI (попытки подключения к хелперу и т.д.)
    status_text: Arc<Mutex<String>>,
}

impl SudoSession {
    pub fn new() -> Self {
        Self {
            authenticated: Arc::new(Mutex::new(false)),
            status_text: Arc::new(Mutex::new(String::new())),
        }
    }

    pub fn is_authenticated(&self) -> bool {
        *self.authenticated.lock().unwrap()
    }

    /// Текст статуса для отображения в UI (попытки, ожидание и т.д.)
    pub fn status_text(&self) -> String {
        self.status_text.lock().unwrap().clone()
    }

    fn set_status(&self, text: &str) {
        crate::log!("[helper] {}", text);
        *self.status_text.lock().unwrap() = text.to_string();
    }

    /// Проверяет связь с хелпером и версию. Устанавливает/обновляет если нужно.
    pub fn authenticate(&self) -> Result<(), String> {
        const EXPECTED_VERSION: &str = env!("CARGO_PKG_VERSION");

        // Шаг 1: хелпер запущен и отвечает?
        if helper::is_helper_running() {
            return self.check_version_and_auth(EXPECTED_VERSION);
        }

        // Шаг 2: хелпер установлен но не запущен? Попробуем запустить
        if helper_installed() {
            self.set_status("Запуск сервиса...");
            start_helper()?;
            if self.wait_for_helper(EXPECTED_VERSION)? {
                return Ok(());
            }
        }

        // Шаг 3: первая установка через osascript
        self.set_status("Требуется установка сервиса...");
        install_helper()?;

        // Ждём запуска с retry
        self.wait_for_helper_after_install(EXPECTED_VERSION)
    }

    /// Проверяет версию уже запущенного хелпера
    fn check_version_and_auth(&self, expected: &str) -> Result<(), String> {
        match helper::query_helper_version() {
            Ok(v) if v == expected => {
                *self.authenticated.lock().unwrap() = true;
                Ok(())
            }
            Ok(v) => {
                crate::log!("[helper] version mismatch: installed={}, expected={}", v, expected);
                self.set_status("Обновление сервиса...");
                reinstall_helper()?;
                self.wait_for_helper_after_install(expected)
            }
            Err(_) => {
                // Старый хелпер без команды `version` — переустанавливаем
                crate::log!("[helper] version query failed (old helper without version command), reinstalling");
                self.set_status("Обновление сервиса (старая версия)...");
                reinstall_helper()?;
                self.wait_for_helper_after_install(expected)
            }
        }
    }

    /// Ждёт запуска хелпера после установки: 3 попытки по 5 секунд
    fn wait_for_helper_after_install(&self, expected_version: &str) -> Result<(), String> {
        for attempt in 1..=HELPER_CONNECT_RETRIES {
            self.set_status(&format!("Ожидание сервиса ({}/{})...", attempt, HELPER_CONNECT_RETRIES));
            std::thread::sleep(HELPER_CONNECT_DELAY);

            if helper::is_helper_running() {
                self.set_status("Сервис подключён");
                // Проверяем версию (новый хелпер должен ответить)
                match helper::query_helper_version() {
                    Ok(v) if v == expected_version => {
                        *self.authenticated.lock().unwrap() = true;
                        return Ok(());
                    }
                    Ok(v) => {
                        crate::log!("[helper] unexpected version after install: {}", v);
                        // Версия не совпадает — странно, но продолжаем
                        *self.authenticated.lock().unwrap() = true;
                        return Ok(());
                    }
                    Err(_) => {
                        // Не отвечает на version — возможно ещё не готов
                        crate::log!("[helper] connected but version query failed on attempt {}", attempt);
                        *self.authenticated.lock().unwrap() = true;
                        return Ok(());
                    }
                }
            }
        }

        self.set_status("Сервис не отвечает");
        Err("Сервис установлен, но не отвечает после 3 попыток. Перезапустите приложение.".to_string())
    }

    /// Ждёт запуска уже установленного хелпера (после start_helper)
    fn wait_for_helper(&self, expected_version: &str) -> Result<bool, String> {
        for attempt in 1..=HELPER_CONNECT_RETRIES {
            self.set_status(&format!("Ожидание сервиса ({}/{})...", attempt, HELPER_CONNECT_RETRIES));
            std::thread::sleep(HELPER_CONNECT_DELAY);

            if helper::is_helper_running() {
                // Проверяем версию
                match helper::query_helper_version() {
                    Ok(v) if v == expected_version => {
                        self.set_status("Сервис подключён");
                        *self.authenticated.lock().unwrap() = true;
                        return Ok(true);
                    }
                    _ => {
                        // Старая версия — переустанавливаем
                        crate::log!("[helper] outdated after start, reinstalling");
                        self.set_status("Обновление сервиса...");
                        reinstall_helper()?;
                        return self.wait_for_helper_after_install(expected_version).map(|_| true);
                    }
                }
            }
        }

        // Не запустился — пробуем переустановить
        crate::log!("[helper] failed to start after {} attempts, reinstalling", HELPER_CONNECT_RETRIES);
        self.set_status("Переустановка сервиса...");
        reinstall_helper()?;
        self.wait_for_helper_after_install(expected_version).map(|_| true)
    }

    /// Выполнить команду от root через helper socket
    pub fn run_sudo(&self, args: &[&str]) -> Result<String, String> {
        let resp = helper::send_command(args)?;
        if resp.ok {
            Ok(resp.stdout)
        } else {
            Err(resp.stderr)
        }
    }
}

/// Проверяет, установлен ли хелпер в системе
fn helper_installed() -> bool {
    std::path::Path::new("/Library/PrivilegedHelperTools/l2tp-hub-helper").exists()
        && std::path::Path::new("/Library/LaunchDaemons/com.sentiago.l2tp-hub.helper.plist").exists()
}

/// Запустить уже установленный хелпер через launchctl
fn start_helper() -> Result<(), String> {
    // Сначала пробуем bootstrap
    let output = std::process::Command::new("launchctl")
        .args(["bootstrap", "system", "/Library/LaunchDaemons/com.sentiago.l2tp-hub.helper.plist"])
        .output()
        .map_err(|e| e.to_string())?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success()
        || stderr.contains("already loaded")
        || stderr.contains("in domain")
        || stderr.contains("System domain already bootstrapped")
    {
        // Demон уже загружен — kickstart для перезапуска
        let _ = std::process::Command::new("launchctl")
            .args(["kickstart", "-k", "system/com.sentiago.l2tp-hub.helper"])
            .output();
        Ok(())
    } else {
        // bootstrap не удался — пробуем bootout + bootstrap заново
        let _ = std::process::Command::new("launchctl")
            .args(["bootout", "system/com.sentiago.l2tp-hub.helper"])
            .output();
        std::thread::sleep(std::time::Duration::from_millis(500));
        let output = std::process::Command::new("launchctl")
            .args(["bootstrap", "system", "/Library/LaunchDaemons/com.sentiago.l2tp-hub.helper.plist"])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            let _ = std::process::Command::new("launchctl")
                .args(["kickstart", "-k", "system/com.sentiago.l2tp-hub.helper"])
                .output();
            Ok(())
        }
    }
}

/// Переустановить хелпер: остановить старый, установить новый через osascript
fn reinstall_helper() -> Result<(), String> {
    crate::log!("[helper] reinstalling: stopping old daemon...");
    let _ = std::process::Command::new("launchctl")
        .args(["bootout", "system/com.sentiago.l2tp-hub.helper"])
        .output();
    std::thread::sleep(std::time::Duration::from_millis(500));
    install_helper()
}

/// Установить хелпер: скопировать бинарник + plist, bootstrap через osascript
fn install_helper() -> Result<(), String> {
    use tauri::Manager;

    let app = &state::get_state().app;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir: {}", e))?;

    let helper_bin = resource_dir.join("helper").join("l2tp-hub-helper");
    let helper_plist = resource_dir.join("helper").join("com.sentiago.l2tp-hub.helper.plist");

    if !helper_bin.exists() {
        return Err(format!("Helper binary not found: {:?}", helper_bin));
    }
    if !helper_plist.exists() {
        return Err(format!("Helper plist not found: {:?}", helper_plist));
    }

    let bin_str = helper_bin.to_string_lossy();
    let plist_str = helper_plist.to_string_lossy();

    let script = format!(
        r#"do shell script "mkdir -p /Library/PrivilegedHelperTools && cp '{}' /Library/PrivilegedHelperTools/l2tp-hub-helper && chmod 544 /Library/PrivilegedHelperTools/l2tp-hub-helper && cp '{}' /Library/LaunchDaemons/com.sentiago.l2tp-hub.helper.plist && chmod 644 /Library/LaunchDaemons/com.sentiago.l2tp-hub.helper.plist && launchctl bootout system/com.sentiago.l2tp-hub.helper 2>/dev/null; launchctl bootstrap system /Library/LaunchDaemons/com.sentiago.l2tp-hub.helper.plist && launchctl kickstart system/com.sentiago.l2tp-hub.helper" with administrator privileges"#,
        bin_str, plist_str
    );

    let output = std::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("(-128)") {
            Err("Установка отменена пользователем".to_string())
        } else {
            Err(format!("Установка хелпера не удалась: {}", stderr))
        }
    }
}
