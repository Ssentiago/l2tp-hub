use crate::l2tp;
use crate::l2tp::VpnStatus;
use crate::log;
use crate::sudo::SudoSession;
use crate::{keychain, store};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

/// Централизованный менеджер VPN-соединений.
/// ВАЖНО: методы СИНХРОННЫЕ, т.к. store::load/save используют block_on внутри.
/// Вызывающий код обязан оборачивать в spawn_blocking.
#[derive(Clone)]
pub struct L2tpManager {
    sudo: SudoSession,
    app: AppHandle,
    /// id текущего активного/подключающегося соединения (только одно за раз)
    active: Arc<Mutex<Option<String>>>,
}

impl L2tpManager {
    pub fn new(sudo: SudoSession, app: AppHandle) -> Self {
        Self {
            sudo,
            app,
            active: Arc::new(Mutex::new(None)),
        }
    }

    pub fn app_config(&self) -> &tauri::Config {
        self.app.config()
    }

    pub fn sudo(&self) -> &SudoSession {
        &self.sudo
    }

    /// Есть ли активное подключение
    pub fn active_connection(&self) -> Option<String> {
        self.active.lock().unwrap().clone()
    }

    /// Подключить VPN по id. Только одно соединение за раз.
    pub fn connect(&self, id: &str) -> Result<(), String> {
        // Guard: только одно соединение
        {
            let mut active = self.active.lock().unwrap();
            if let Some(ref current) = *active {
                if current != id {
                    return Err(format!(
                        "Уже подключено к {}. Сначала отключите.", current
                    ));
                }
            }
            *active = Some(id.to_string());
        }

        // Если connect упадёт — очистим active
        let result = self.do_connect(id);
        if result.is_err() {
            *self.active.lock().unwrap() = None;
        }
        result
    }

    fn do_connect(&self, id: &str) -> Result<(), String> {
        log!("[manager] connect: id={}", id);

        let store = store::load(self.app.config());
        let conn = store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        let password = keychain::get_password(&conn.keychain_key)?;
        let shared_secret = keychain::get_password(&conn.shared_secret_key)?;
        let original_gateway = l2tp::get_default_gateway()?;
        log!("[manager] original_gateway={}", original_gateway);

        l2tp::create_vpn_service(
            &self.sudo,
            &conn.name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
            &original_gateway,
        )?;

        let hash = crate::commands::utils::service_hash(&conn, &password, &shared_secret);
        if conn.service_hash.as_deref() != Some(hash.as_str()) {
            let mut store = store::load(self.app.config());
            for ws in &mut store.workspaces {
                if let Some(c) = ws.connections.iter_mut().find(|c| c.id == id) {
                    c.service_hash = Some(hash.clone());
                }
            }
            store::save(&store)?;
        }

        let connect_result = tauri::async_runtime::block_on(
            tokio::time::timeout(
                std::time::Duration::from_secs(60),
                l2tp::connect_vpn(&self.sudo, &conn.name, &conn.server, &original_gateway, &conn.tunnel_mode, &conn.split_routes),
            )
        );

        match connect_result {
            Ok(inner) => inner?,
            Err(_) => {
                log!("[manager] connect timed out after 60s");
                // Cleanup guardian + heartbeat on timeout
                crate::l2tp::macos::stop_heartbeat_thread();
                crate::l2tp::macos::deactivate_guardian();
                return Err("Превышен таймаут подключения (60 сек)".to_string());
            }
        }

        let mut store = store::load(self.app.config());
        update_connect_stats(&mut store, id);
        store::save(&store)?;
        let _ = crate::tray::refresh_tray();

        log!("[manager] connect done: {}", conn.name);
        Ok(())
    }

    /// Отключить VPN по id.
    pub fn disconnect(&self, id: &str) -> Result<(), String> {
        log!("[manager] disconnect: id={}", id);

        let store = store::load(self.app.config());
        let conn = store
            .workspaces
            .iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        tauri::async_runtime::block_on(
            l2tp::disconnect_vpn(&self.sudo, &conn.name)
        )?;

        // Очищаем active
        *self.active.lock().unwrap() = None;

        let mut store = store::load(self.app.config());
        update_disconnect_stats(&mut store, id);
        store::save(&store)?;
        let _ = crate::tray::refresh_tray();

        log!("[manager] disconnect done: {}", conn.name);
        Ok(())
    }

    /// Статус VPN по id соединения. Per-connection, не глобальный.
    pub fn status(&self, id: &str) -> VpnStatus {
        let active = self.active.lock().unwrap();

        // Если это активное соединение — проверяем процессы
        if active.as_deref() == Some(id) {
            let store = store::load(self.app.config());
            if let Some(conn) = store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == id)
            {
                let dir = l2tp::config_dir(&conn.name);
                if !dir.join("swanctl.conf").exists() {
                    return VpnStatus::Disconnected;
                }
                let xl2tpd = l2tp::is_process_running_global("xl2tpd");
                let pppd = l2tp::is_process_running_global("pppd");
                if xl2tpd && pppd { return VpnStatus::Connected; }
                if xl2tpd || pppd { return VpnStatus::Connecting; }
                return VpnStatus::Disconnected;
            }
        }

        // Не активное → Disconnected
        VpnStatus::Disconnected
    }

    /// Bulk-статус. Активное соединение проверяется по процессам, остальные → Disconnected.
    pub fn all_statuses(&self) -> std::collections::HashMap<String, VpnStatus> {
        let store = store::load(self.app.config());
        let active = self.active.lock().unwrap();
        let mut map = std::collections::HashMap::new();

        for ws in &store.workspaces {
            for conn in &ws.connections {
                let status = if active.as_deref() == Some(conn.id.as_str()) {
                    let dir = l2tp::config_dir(&conn.name);
                    if !dir.join("swanctl.conf").exists() {
                        VpnStatus::Disconnected
                    } else {
                        let xl2tpd = l2tp::is_process_running_global("xl2tpd");
                        let pppd = l2tp::is_process_running_global("pppd");
                        if xl2tpd && pppd { VpnStatus::Connected }
                        else if xl2tpd || pppd { VpnStatus::Connecting }
                        else { VpnStatus::Disconnected }
                    }
                } else {
                    VpnStatus::Disconnected
                };
                map.insert(conn.id.clone(), status);
            }
        }
        map
    }
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn update_connect_stats(store: &mut store::Store, id: &str) {
    let now = now_secs();
    for ws in &mut store.workspaces {
        if let Some(c) = ws.connections.iter_mut().find(|c| c.id == id) {
            c.connect_count += 1;
            c.connected_since = Some(now);
            c.last_connected_at = Some(now);
            log!("[stats] connected_since={}, connect_count={}", now, c.connect_count);
            return;
        }
    }
}

fn update_disconnect_stats(store: &mut store::Store, id: &str) {
    let now = now_secs();
    for ws in &mut store.workspaces {
        if let Some(c) = ws.connections.iter_mut().find(|c| c.id == id) {
            log!("[stats] disconnect: clearing connected_since, was={:?}", c.connected_since);
            c.connected_since = None;
            c.last_disconnected_at = Some(now);
            return;
        }
    }
}
