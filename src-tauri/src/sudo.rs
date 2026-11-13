use std::sync::{Arc, Mutex};

// ---------------------------------------------------------------------------
// SudoSession — управление привилегированными командами
// macOS: privileged helper (LaunchDaemon, unix socket /var/run/l2tp-hub-helper.sock)
// Windows: приложение запущено от администратора (requireAdministrator manifest) —
//          команды выполняются напрямую.
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
const HELPER_CONNECT_RETRIES: u32 = 3;
#[cfg(target_os = "macos")]
const HELPER_CONNECT_DELAY: std::time::Duration = std::time::Duration::from_secs(1);

// Имена и пути helper. Debug-сборка ставит отдельный dev-helper с отдельным
// сокетом и label, чтобы dev не пересекался с релизным и не подменял его.
#[cfg(target_os = "macos")]
mod hp {
    #[cfg(debug_assertions)]
    pub const LABEL: &str = "com.sentiago.l2tp-hub.dev";
    #[cfg(not(debug_assertions))]
    pub const LABEL: &str = "com.sentiago.l2tp-hub.helper";

    #[cfg(debug_assertions)]
    pub const BIN: &str = "/Library/PrivilegedHelperTools/l2tp-hub-helper-dev";
    #[cfg(not(debug_assertions))]
    pub const BIN: &str = "/Library/PrivilegedHelperTools/l2tp-hub-helper";

    pub fn plist() -> String {
        format!("/Library/LaunchDaemons/{}.plist", LABEL)
    }
}

/// Bundle identifier приложения: входит в требование к подписи клиента.
#[cfg(target_os = "macos")]
#[cfg(not(debug_assertions))]
const APP_IDENTIFIER: &str = "com.sentiago.l2tp-hub";

/// Файл доверия helper: требование к кодовой подписи клиента. Пишется root
/// при установке helper, читается helper при каждом подключении.
#[cfg(target_os = "macos")]
#[cfg(not(debug_assertions))]
const TRUST_FILE: &str = "/Library/PrivilegedHelperTools/l2tp-hub-helper.trust";

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
    #[cfg(target_os = "macos")]
    pub fn authenticate(&self) -> Result<(), String> {
        use crate::helper;

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

    /// Windows: процесс уже elevated (requireAdministrator manifest).
    #[cfg(target_os = "windows")]
    pub fn authenticate(&self) -> Result<(), String> {
        *self.authenticated.lock().unwrap() = true;
        self.set_status("Запущено от имени администратора");
        Ok(())
    }

    /// Проверяет версию уже запущенного хелпера
    #[cfg(target_os = "macos")]
    fn check_version_and_auth(&self, expected: &str) -> Result<(), String> {
        use crate::helper;

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
    #[cfg(target_os = "macos")]
    fn wait_for_helper_after_install(&self, expected_version: &str) -> Result<(), String> {
        use crate::helper;

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
    #[cfg(target_os = "macos")]
    fn wait_for_helper(&self, expected_version: &str) -> Result<bool, String> {
        use crate::helper;

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
    #[cfg(target_os = "macos")]
    pub fn run_sudo(&self, args: &[&str]) -> Result<String, String> {
        let resp = crate::helper::send_command(args)?;
        if resp.ok {
            Ok(resp.stdout)
        } else {
            Err(resp.stderr)
        }
    }

    /// Выполнить команду напрямую — процесс уже от администратора.
    #[cfg(target_os = "windows")]
    pub fn run_sudo(&self, args: &[&str]) -> Result<String, String> {
        let (cmd, rest) = args.split_first().ok_or("run_sudo: empty command")?;
        let output = std::process::Command::new(cmd)
            .args(rest)
            .output()
            .map_err(|e| format!("run_sudo: {}", e))?;
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

/// Проверяет, установлен ли хелпер в системе
#[cfg(target_os = "macos")]
fn helper_installed() -> bool {
    std::path::Path::new(hp::BIN).exists() && std::path::Path::new(&hp::plist()).exists()
}

/// Запустить уже установленный хелпер через launchctl
#[cfg(target_os = "macos")]
fn start_helper() -> Result<(), String> {
    let plist = hp::plist();
    let label_ref = format!("system/{}", hp::LABEL);

    // Сначала пробуем bootstrap
    let output = std::process::Command::new("launchctl")
        .args(["bootstrap", "system", &plist])
        .output()
        .map_err(|e| e.to_string())?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success()
        || stderr.contains("already loaded")
        || stderr.contains("in domain")
        || stderr.contains("System domain already bootstrapped")
    {
        // Демон уже загружен — kickstart для перезапуска
        let _ = std::process::Command::new("launchctl")
            .args(["kickstart", "-k", &label_ref])
            .output();
        Ok(())
    } else {
        // bootstrap не удался — пробуем bootout + bootstrap заново
        let _ = std::process::Command::new("launchctl")
            .args(["bootout", &label_ref])
            .output();
        std::thread::sleep(std::time::Duration::from_millis(500));
        let output = std::process::Command::new("launchctl")
            .args(["bootstrap", "system", &plist])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            let _ = std::process::Command::new("launchctl")
                .args(["kickstart", "-k", &label_ref])
                .output();
            Ok(())
        }
    }
}

/// Переустановить хелпер: остановить старый, установить новый через osascript
#[cfg(target_os = "macos")]
fn reinstall_helper() -> Result<(), String> {
    crate::log!("[helper] reinstalling: stopping old daemon...");
    let _ = std::process::Command::new("launchctl")
        .args(["bootout", &format!("system/{}", hp::LABEL)])
        .output();
    std::thread::sleep(std::time::Duration::from_millis(500));
    install_helper()
}

/// Установить хелпер: скопировать бинарник + plist, записать файл доверия,
/// bootstrap через osascript.
#[cfg(target_os = "macos")]
fn install_helper() -> Result<(), String> {
    let (helper_bin, helper_plist) = helper_source_files()?;

    if !helper_bin.exists() {
        return Err(format!("Helper binary not found: {:?}", helper_bin));
    }
    if !helper_plist.exists() {
        return Err(format!("Helper plist not found: {:?}", helper_plist));
    }

    let bin_str = helper_bin.to_string_lossy();
    let plist_str = helper_plist.to_string_lossy();
    let plist_target = hp::plist();
    let trust_step = trust_file_step()?;

    let script = format!(
        r#"do shell script "mkdir -p /Library/PrivilegedHelperTools && cp '{bin}' {target} && chmod 544 {target} && cp '{plist}' {plist_target} && chmod 644 {plist_target} && {trust_step}launchctl bootout system/{label} 2>/dev/null; launchctl bootstrap system {plist_target} && launchctl kickstart system/{label}" with administrator privileges"#,
        bin = bin_str,
        target = hp::BIN,
        plist = plist_str,
        plist_target = plist_target,
        trust_step = trust_step,
        label = hp::LABEL,
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

/// Исходники helper для установки: релиз берёт бинарник и plist из ресурсов
/// бандла, debug — из каталога сборки helper. Dev-helper в ресурсы не
/// складывается, чтобы не попадать в релизный бандл.
#[cfg(target_os = "macos")]
#[cfg(not(debug_assertions))]
fn helper_source_files() -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    use crate::state;
    use tauri::Manager;

    let app = &state::get_state().app;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir: {}", e))?;

    Ok((
        resource_dir.join("helper").join("l2tp-hub-helper"),
        resource_dir
            .join("helper")
            .join("com.sentiago.l2tp-hub.helper.plist"),
    ))
}

#[cfg(target_os = "macos")]
#[cfg(debug_assertions)]
fn helper_source_files() -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    // Dev-helper собирается командой npm run build:helper:dev.
    Ok((
        std::path::PathBuf::from(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../helper/target/debug/l2tp-hub-helper"
        )),
        std::path::PathBuf::from(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../helper/com.sentiago.l2tp-hub.dev.plist"
        )),
    ))
}

/// Шаг записи файла доверия для install-скрипта: helper пускает только
/// клиентов, чья кодовая подпись соответствует требованию из этого файла.
#[cfg(target_os = "macos")]
#[cfg(not(debug_assertions))]
fn trust_file_step() -> Result<String, String> {
    let requirement = client_requirement()?.replace('"', "\\\"");
    Ok(format!(
        "printf '%s' '{req}' > {path} && chown root:wheel {path} && chmod 600 {path} && ",
        req = requirement,
        path = TRUST_FILE,
    ))
}

/// Dev-helper проверку подписи не выполняет, файл доверия не нужен.
#[cfg(target_os = "macos")]
#[cfg(debug_assertions)]
fn trust_file_step() -> Result<String, String> {
    Ok(String::new())
}

/// Требование к подписи клиента для файла доверия: identifier приложения и
/// cdhash текущего бинаря. Берётся подпись этого процесса: к сокету helper
/// подключается само приложение.
#[cfg(target_os = "macos")]
#[cfg(not(debug_assertions))]
fn client_requirement() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| format!("current_exe: {}", e))?;
    let output = std::process::Command::new("codesign")
        .arg("-d")
        .arg("--verbose=4")
        .arg(&exe)
        .output()
        .map_err(|e| format!("codesign: {}", e))?;
    let info = String::from_utf8_lossy(&output.stderr);
    let cdhash = info
        .lines()
        .find_map(|line| line.strip_prefix("CDHash="))
        .map(|h| h.trim().to_string())
        .filter(|h| !h.is_empty())
        .ok_or_else(|| {
            format!(
                "codesign: CDHash не найден для {:?}, приложение не подписано",
                exe
            )
        })?;
    Ok(format!(
        "identifier \"{}\" and cdhash H\"{}\"",
        APP_IDENTIFIER, cdhash
    ))
}

impl l2tp_hub_core::PrivilegedExecutor for SudoSession {
    fn run(&self, args: &[&str]) -> Result<String, String> {
        self.run_sudo(args)
    }
}
