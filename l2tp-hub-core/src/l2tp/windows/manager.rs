use crate::env::AppEnv;
use crate::executor::PrivilegedExecutor;
use crate::keychain;
use crate::l2tp::VpnStatus;
use crate::store;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};

/// Windows VPN-менеджер — нативные L2TP-подключения ОС (rasdial / Add-VpnConnection).
/// В отличие от macOS, статус читается из ОС (Get-VpnConnection), а не из процессов.
#[derive(Clone)]
pub struct L2tpManager {
    #[allow(dead_code)]
    executor: Arc<dyn PrivilegedExecutor>,
    #[allow(dead_code)]
    env: AppEnv,
    pool: sqlx::SqlitePool,
    active: Arc<Mutex<HashSet<String>>>,
}

impl L2tpManager {
    pub fn new(executor: Arc<dyn PrivilegedExecutor>, env: AppEnv, pool: sqlx::SqlitePool) -> Self {
        Self {
            executor,
            env,
            pool,
            active: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    /// Получить lock на active, recovering from poisoned mutex
    fn active_lock(&self) -> std::sync::MutexGuard<'_, HashSet<String>> {
        self.active
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn env(&self) -> &AppEnv {
        &self.env
    }

    pub fn executor(&self) -> &dyn PrivilegedExecutor {
        self.executor.as_ref()
    }

    /// Все активные подключения
    pub fn active_connections(&self) -> Vec<String> {
        self.active_lock().iter().cloned().collect()
    }

    /// Подключить VPN по id.
    pub async fn connect(&self, id: &str) -> Result<(), String> {
        let store = store::load(&self.pool).await;
        let conn = store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        let password = keychain::get_password(&conn.keychain_key)?;
        let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

        self.active_lock().insert(id.to_string());

        let name = conn.service_name.clone();
        let server = conn.server.clone();
        let username = conn.username.clone();
        let result = tokio::task::spawn_blocking(move || {
            super::create_vpn_service(&name, &server, &username, &password, &shared_secret)?;
            super::connect_vpn(&name, &username, &password)
        })
        .await
        .map_err(|e| e.to_string())?;

        if result.is_err() {
            self.active_lock().remove(id);
        }
        result
    }

    /// Отключить VPN по id.
    pub async fn disconnect(&self, id: &str) -> Result<(), String> {
        let store = store::load(&self.pool).await;
        let conn = store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        self.active_lock().remove(id);

        let name = conn.service_name.clone();
        tokio::task::spawn_blocking(move || super::disconnect_vpn(&name))
            .await
            .map_err(|e| e.to_string())?
    }

    /// Статус подключения — из ОС (Get-VpnConnection).
    pub async fn status(&self, id: &str) -> VpnStatus {
        let store = store::load(&self.pool).await;
        store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .map(|c| super::get_vpn_status(&c.service_name))
            .unwrap_or(VpnStatus::Unknown)
    }

    /// Статусы всех подключений — из ОС.
    pub async fn all_statuses(&self) -> HashMap<String, VpnStatus> {
        let store = store::load(&self.pool).await;
        let mut map = HashMap::new();
        for ws in &store.workspaces {
            for conn in &ws.connections {
                map.insert(conn.id.clone(), super::get_vpn_status(&conn.service_name));
            }
        }
        map
    }
}
