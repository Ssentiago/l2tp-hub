use crate::l2tp;
use crate::l2tp::VpnStatus;
use crate::log;
use crate::sudo::SudoSession;
use crate::{keychain, store};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

/// Сериализация запуска VPN демонов.
/// Предотвращает параллельный запуск charon/xl2tpd при одновременных подключениях.
static DAEMON_STARTUP: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// Централизованный менеджер VPN-соединений.
/// Поддерживает несколько параллельных split-подключений (без пересечения подсетей).
/// Full-tunnel — эксклюзивно (только одно за раз).
/// ВАЖНО: connect/disconnect — async, т.к. connect_vpn использует tokio::sync::Notify.
/// Вызывающий код обязан оборачивать в spawn_blocking.
#[derive(Clone)]
pub struct L2tpManager {
    sudo: SudoSession,
    app: AppHandle,
    active: Arc<Mutex<HashSet<String>>>,
}

impl L2tpManager {
    pub fn new(sudo: SudoSession, app: AppHandle) -> Self {
        Self {
            sudo,
            app,
            active: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    /// Получить lock на active, recovering from poisoned mutex
    fn active_lock(&self) -> std::sync::MutexGuard<'_, HashSet<String>> {
        self.active.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn app_config(&self) -> &tauri::Config {
        self.app.config()
    }

    pub fn sudo(&self) -> &SudoSession {
        &self.sudo
    }

    /// Все активные подключения
    pub fn active_connections(&self) -> Vec<String> {
        self.active_lock().iter().cloned().collect()
    }

    /// Есть ли активное full-tunnel подключение (предполагает что active lock уже захвачен).
    fn has_active_full_inner(&self, store: &store::Store, active: &HashSet<String>) -> bool {
        active.iter().any(|id| {
            store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == *id)
                .map(|c| c.tunnel_mode == "full")
                .unwrap_or(false)
        })
    }

    /// Подсети активных split-подключений (кроме exclude_id, предполагает что active lock уже захвачен).
    fn active_split_routes_inner(&self, store: &store::Store, active: &HashSet<String>, exclude_id: &str) -> Vec<String> {
        let mut routes = Vec::new();
        for id in active.iter() {
            if id == exclude_id { continue; }
            if let Some(conn) = store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == *id)
            {
                if conn.tunnel_mode == "split" {
                    routes.extend(conn.split_routes.iter().cloned());
                }
            }
        }
        routes
    }

    /// Подключить VPN по id.
    /// Разрешает параллельные split если подсети не пересекаются.
    /// Full — только если нет других активных подключений.
    pub async fn connect(&self, id: &str) -> Result<(), String> {
        // Загружаем connection для проверки tunnel_mode
        let store = store::load(self.app.config()).await;
        let conn = store.workspaces.iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        {
            let active = self.active_lock();

            if active.contains(id) {
                // OK — reconnect существующего
            } else {
                if conn.tunnel_mode == "full" && !active.is_empty() {
                    return Err("Невозможно подключить полный туннель: есть активные подключения. Сначала отключите.".to_string());
                }

                if conn.tunnel_mode == "split" && self.has_active_full_inner(&store, &active) {
                    return Err("Невозможно подключить раздельный туннель: активен полный туннель.".to_string());
                }

                if conn.tunnel_mode == "split" && !conn.split_routes.is_empty() {
                    let existing = self.active_split_routes_inner(&store, &active, id);
                    if let Some(overlap) = find_overlap(&conn.split_routes, &existing) {
                        return Err(format!("Подсеть {} уже используется активным подключением", overlap));
                    }
                }
            }
        }

        // Помечаем как активное
        self.active_lock().insert(id.to_string());

        let result = self.do_connect(id, &conn).await;
        if result.is_err() {
            self.active_lock().remove(id);
        }
        result
    }

    async fn do_connect(&self, id: &str, conn: &crate::models::connection::Connection) -> Result<(), String> {
        log!("[manager] connect: id={}, mode={}", id, conn.tunnel_mode);

        let password = keychain::get_password(&conn.keychain_key)?;
        let shared_secret = keychain::get_password(&conn.shared_secret_key)?;
        let original_gateway = l2tp::get_default_gateway()?;
        log!("[manager] original_gateway={}", original_gateway);

        l2tp::create_vpn_service(
            &self.sudo,
            &conn.service_name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
            &original_gateway,
        )?;

        let mut store = store::load(self.app.config()).await;

        let hash = crate::commands::utils::service_hash(conn, &password, &shared_secret);
        if conn.service_hash.as_deref() != Some(hash.as_str()) {
            for ws in &mut store.workspaces {
                if let Some(c) = ws.connections.iter_mut().find(|c| c.id == id) {
                    c.service_hash = Some(hash.clone());
                }
            }
            store::save(&store).await?;
        }

        // Собираем ConnData для ВСЕХ активных подключений (включая новое)
        let all_conns = self.collect_active_conn_data(&store, id, conn)?;

        // Сериализуем запуск: кто первый захватил lock — стартует демонов.
        // Второй ждёт завершения запуска, затем dial'ит свой LAC.
        let _daemon_guard = DAEMON_STARTUP.lock().await;
        let is_first = !crate::l2tp::is_process_running_global("xl2tpd");

        let connect_result = tokio::time::timeout(
                std::time::Duration::from_secs(60),
                l2tp::connect_vpn(
                    &self.sudo,
                    &all_conns,
                    is_first,
                    &original_gateway,
                ),
            ).await;

        match connect_result {
            Ok(inner) => inner?,
            Err(_) => {
                log!("[manager] connect timed out after 60s");
                crate::l2tp::macos::stop_heartbeat_thread();
                crate::l2tp::macos::deactivate_guardian();
                return Err("Превышен таймаут подключения (60 сек)".to_string());
            }
        }

        update_connect_stats(&mut store, id);
        store::save(&store).await?;
        let _ = crate::tray::refresh_tray();

        log!("[manager] connect done: {}", conn.service_name);
        Ok(())
    }

    /// Собрать ConnData для всех активных подключений.
    fn collect_active_conn_data(&self, store: &store::Store, new_id: &str, new_conn: &crate::models::connection::Connection) -> Result<Vec<l2tp::macos::ConnData>, String> {
        let active = self.active_lock();
        let mut result = Vec::new();

        for id in active.iter() {
            if id == new_id {
                // Новое подключение — используем переданные данные
                result.push(l2tp::macos::ConnData {
                    id: new_conn.id.clone(),
                    service_name: new_conn.service_name.clone(),
                    server: new_conn.server.clone(),
                    username: new_conn.username.clone(),
                    password: keychain::get_password(&new_conn.keychain_key)?,
                    shared_secret: keychain::get_password(&new_conn.shared_secret_key)?,
                    tunnel_mode: new_conn.tunnel_mode.clone(),
                    split_routes: new_conn.split_routes.clone(),
                });
            } else {
                // Существующее активное подключение
                if let Some(c) = store.workspaces.iter()
                    .flat_map(|ws| ws.connections.iter())
                    .find(|c| c.id == *id)
                {
                    result.push(l2tp::macos::ConnData {
                        id: c.id.clone(),
                        service_name: c.service_name.clone(),
                        server: c.server.clone(),
                        username: c.username.clone(),
                        password: keychain::get_password(&c.keychain_key)?,
                        shared_secret: keychain::get_password(&c.shared_secret_key)?,
                        tunnel_mode: c.tunnel_mode.clone(),
                        split_routes: c.split_routes.clone(),
                    });
                }
            }
        }
        Ok(result)
    }

    /// Собрать ConnData для активных подключений КРОМЕ указанного (для disconnect).
    fn collect_remaining_conn_data(&self, store: &store::Store, exclude_id: &str) -> Result<Vec<l2tp::macos::ConnData>, String> {
        let active = self.active_lock();
        let mut result = Vec::new();

        for id in active.iter() {
            if id == exclude_id { continue; }
            if let Some(c) = store.workspaces.iter()
                .flat_map(|ws| ws.connections.iter())
                .find(|c| c.id == *id)
            {
                result.push(l2tp::macos::ConnData {
                    id: c.id.clone(),
                    service_name: c.service_name.clone(),
                    server: c.server.clone(),
                    username: c.username.clone(),
                    password: keychain::get_password(&c.keychain_key)?,
                    shared_secret: keychain::get_password(&c.shared_secret_key)?,
                    tunnel_mode: c.tunnel_mode.clone(),
                    split_routes: c.split_routes.clone(),
                });
            }
        }
        Ok(result)
    }

    /// Отключить VPN по id. Если это последнее активное — останавливает демонов.
    pub async fn disconnect(&self, id: &str) -> Result<(), String> {
        log!("[manager] disconnect: id={}", id);

        let mut store = store::load(self.app.config()).await;
        let conn = store.workspaces.iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
            .ok_or("Подключение не найдено")?
            .clone();

        l2tp::logs::save_session_logs(
            id,
            &conn.service_name,
            &conn.server,
            conn.connected_since,
            None,
        );

        let is_last = self.active_lock().len() <= 1;

        if is_last {
            // Последнее подключение — полная остановка
            l2tp::disconnect_vpn(&self.sudo, &conn.service_name).await?;
        } else {
            let original_gw = l2tp::get_default_gateway().unwrap_or_default();
            // Собираем ConnData для оставшихся активных (без текущего)
            let remaining = self.collect_remaining_conn_data(&store, id)?;
            // Не последнее — restart xl2tpd с оставшимися LAC
            crate::l2tp::macos::disconnect_single(
                &self.sudo,
                &conn.service_name,
                &conn.server,
                &conn.split_routes,
                &remaining,
                &original_gw,
            ).await?;
        }

        self.active_lock().remove(id);

        update_disconnect_stats(&mut store, id);
        store::save(&store).await?;
        let _ = crate::tray::refresh_tray();

        log!("[manager] disconnect done: {}", conn.service_name);
        Ok(())
    }

    pub async fn status(&self, id: &str) -> VpnStatus {
        {
            let active = self.active_lock();
            if !active.contains(id) {
                return VpnStatus::Disconnected;
            }
        }

        let store = store::load(self.app.config()).await;
        if let Some(conn) = store.workspaces.iter()
            .flat_map(|ws| ws.connections.iter())
            .find(|c| c.id == id)
        {
            let dir = l2tp::config_dir(&conn.service_name);
            if !dir.join("swanctl.conf").exists() {
                return VpnStatus::Disconnected;
            }
            let xl2tpd = l2tp::is_process_running_global("xl2tpd");
            let pppd = l2tp::is_process_running_global("pppd");
            if xl2tpd && pppd { return VpnStatus::Connected; }
            if xl2tpd || pppd { return VpnStatus::Connecting; }
            return VpnStatus::Disconnected;
        }

        VpnStatus::Disconnected
    }

    pub async fn all_statuses(&self) -> HashMap<String, VpnStatus> {
        let store = store::load(self.app.config()).await;
        let active = self.active_lock();
        let mut map = HashMap::new();

        for ws in &store.workspaces {
            for conn in &ws.connections {
                let status = if active.contains(conn.id.as_str()) {
                    let dir = l2tp::config_dir(&conn.service_name);
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

/// Проверяет пересечение двух списков CIDR-подсетей.
/// Возвращает первую пересекающуюся подсеть или None.
fn find_overlap(a: &[String], b: &[String]) -> Option<String> {
    for route_a in a {
        for route_b in b {
            if routes_overlap(route_a, route_b) {
                return Some(route_a.clone());
            }
        }
    }
    None
}

/// Проверяет, пересекаются ли две CIDR-подсети.
/// Простая проверка: одна содержит другую.
fn routes_overlap(a: &str, b: &str) -> bool {
    match (parse_cidr(a), parse_cidr(b)) {
        (Some((ip_a, prefix_a)), Some((ip_b, prefix_b))) => {
            let min_prefix = prefix_a.min(prefix_b);
            let mask = if min_prefix == 0 { 0u32 } else { !0u32 << (32 - min_prefix) };
            (ip_a & mask) == (ip_b & mask)
        }
        _ => a == b, // если парсинг не удался — сравниваем как строки
    }
}

/// Парсит CIDR (например "192.168.1.0/24") в (ip_as_u32, prefix_len).
fn parse_cidr(cidr: &str) -> Option<(u32, u8)> {
    let parts: Vec<&str> = cidr.split('/').collect();
    if parts.len() != 2 { return None; }
    let prefix: u8 = parts[1].parse().ok()?;
    let octets: Vec<u8> = parts[0].split('.').filter_map(|o| o.parse().ok()).collect();
    if octets.len() != 4 { return None; }
    let ip = ((octets[0] as u32) << 24)
        | ((octets[1] as u32) << 16)
        | ((octets[2] as u32) << 8)
        | (octets[3] as u32);
    Some((ip, prefix))
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
