use std::path::PathBuf;
use std::sync::OnceLock;

/// Глобальный AppEnv — устанавливается один раз при старте.
static APP_ENV: OnceLock<AppEnv> = OnceLock::new();

/// Установить глобальный AppEnv. Паникует если уже установлен.
pub fn init_env(env: AppEnv) {
    if APP_ENV.set(env).is_err() {
        panic!("AppEnv already initialized");
    }
}

/// Получить глобальный AppEnv.
pub fn global_env() -> &'static AppEnv {
    APP_ENV.get().expect("AppEnv not initialized. Call init_env() first.")
}

/// Окружение приложения — пути, не зависящие от Tauri.
#[derive(Debug, Clone)]
pub struct AppEnv {
    /// Базовая директория данных приложения
    pub app_data_dir: PathBuf,
    /// Путь к SQLite базе
    pub db_path: PathBuf,
    /// Директория bundled ресурсов (бинарники, plists)
    pub resource_dir: PathBuf,
}

impl AppEnv {
    /// Создать с автоматическим определением путей ОС.
    pub fn autodetect() -> Self {
        let app_data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.sentiago.l2tp-hub");
        let db_path = app_data_dir.join("l2tp-hub.db");
        let resource_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("resources")))
            .unwrap_or_else(|| PathBuf::from("resources"));
        Self {
            app_data_dir,
            db_path,
            resource_dir,
        }
    }

    /// Создать с явными путями (для GUI из Tauri).
    pub fn with_paths(app_data_dir: PathBuf, db_path: PathBuf, resource_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            db_path,
            resource_dir,
        }
    }

    /// Директория конфигов ipsec (per-connection)
    pub fn config_dir(&self, name: &str) -> PathBuf {
        let base = self.app_data_dir.join("ipsec").join(name);
        let _ = std::fs::create_dir_all(&base);
        base
    }

    /// Директория логов сессий
    pub fn session_logs_dir(&self) -> PathBuf {
        self.app_data_dir.join("session-logs")
    }
}