#[allow(unused_imports)]
use crate::l2tp;
use crate::l2tp::VpnStatus;
use crate::models::connection::Connection;
use crate::state;
use crate::store::Store;
use crate::{log, store};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::{AppHandle, Emitter, Manager};
use std::collections::HashMap;

fn app() -> &'static AppHandle {
    &state::get_state().app
}

pub fn create_tray() -> Result<TrayIcon, Box<dyn std::error::Error>> {
    let app = app();
    let icon = load_tray_icon();
    let menu = build_menu()?;

    let tray = TrayIconBuilder::new()
        .icon(icon?)
        .tooltip("L2TP Hub")
        .menu(&menu)
        .on_menu_event(move |app, event| {
            let id = event.id().0.as_str();
            match id {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                id if id.starts_with("connect_") => {
                    let conn_id = id.strip_prefix("connect_").unwrap().to_string();
                    std::thread::spawn(move || {
                        handle_tray_connect(&conn_id);
                    });
                }
                id if id.starts_with("stop_") => {
                    let conn_id = id.strip_prefix("stop_").unwrap().to_string();
                    let app2 = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let manager = app2.state::<crate::l2tp::manager::L2tpManager>();
                        let result = manager.disconnect(&conn_id).await;
                        match result {
                            Ok(()) => {
                                log!("[tray] disconnected {}", conn_id);
                                let _ = app2.emit(
                                    "vpn-status-changed",
                                    VpnStatusPayload {
                                        id: conn_id.clone(),
                                        status: VpnStatus::Disconnected,
                                    },
                                );
                            }
                            Err(e) => log!("[tray] disconnect error: {}", e),
                        }
                        let _ = refresh_tray();
                    });
                }
                _ => {}
            }
        })
        .build(app)?;

    start_status_poller();

    Ok(tray)
}

fn load_tray_icon() -> Result<tauri::image::Image<'static>, Box<dyn std::error::Error>> {
    let bytes = include_bytes!("../icons/icon.png");
    let img = image::load_from_memory(bytes)?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    Ok(tauri::image::Image::new_owned(rgba.into_raw(), width, height))
}

fn find_connection<'a>(store: &'a Store, id: &str) -> Option<&'a Connection> {
    store
        .workspaces
        .iter()
        .flat_map(|ws| ws.connections.iter())
        .find(|c| c.id == id)
}

/// Блокирующе выполняет future. Работает из любого контекста:
/// - Если уже внутри tokio → block_in_place + Handle::block_on
/// - Если вне tokio (plain thread, setup) → создаёт свой Runtime
fn block_on_anywhere<F: std::future::Future>(f: F) -> F::Output {
    if let Ok(handle) = tokio::runtime::Handle::try_current() {
        // Уже внутри tokio — block_in_place переводит thread в blocking mode,
        // после чего Handle::block_on не паникует
        tokio::task::block_in_place(|| handle.block_on(f))
    } else {
        // Вне tokio — создаём свой runtime
        let rt = tokio::runtime::Runtime::new()
            .expect("Failed to create tokio runtime");
        rt.block_on(f)
    }
}

fn build_menu() -> Result<tauri::menu::Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let app = app();

    let store = block_on_anywhere(store::load(app.config()));

    let mut menu = MenuBuilder::new(app);

    let show_item = MenuItemBuilder::with_id("show", "Показать окно").build(app)?;
    menu = menu.item(&show_item);

    let separator = PredefinedMenuItem::separator(app)?;
    menu = menu.item(&separator);

    let all_conns: Vec<&Connection> = store
        .workspaces
        .iter()
        .flat_map(|ws| ws.connections.iter())
        .collect();

    let connected: Vec<&Connection> = all_conns
        .iter()
        .filter(|c| {
            let manager = app.state::<crate::l2tp::manager::L2tpManager>();
            block_on_anywhere(manager.status(&c.id)) == VpnStatus::Connected
        })
        .copied()
        .collect();

    if connected.is_empty() {
        let item = MenuItemBuilder::with_id("active_none", "Активное подключение: нет")
            .build(app)?;
        menu = menu.item(&item);
    } else {
        for conn in &connected {
            let company = conn.labels.get("company").map(|s| s.as_str()).unwrap_or("");
            let branch = conn.labels.get("branch").map(|s| s.as_str()).unwrap_or("");
            let label = match (company, branch) {
                (c, b) if !c.is_empty() && !b.is_empty() => format!("● {} / {}  [отключить]", c, b),
                (c, _) if !c.is_empty() => format!("● {}  [отключить]", c),
                (_, b) if !b.is_empty() => format!("● {}  [отключить]", b),
                _ => format!("● {}  [отключить]", conn.server),
            };
            let item = MenuItemBuilder::with_id(
                format!("stop_{}", conn.id),
                &label,
            )
            .build(app)?;
            menu = menu.item(&item);
        }
    }

    if !all_conns.is_empty() {
        let separator = PredefinedMenuItem::separator(app)?;
        menu = menu.item(&separator);
    }

    for ws in &store.workspaces {
        if ws.connections.is_empty() {
            continue;
        }

        let ws_label = if ws.id == store.active_workspace_id {
            format!("{} ✓", ws.name)
        } else {
            ws.name.clone()
        };

        let ws_separator = PredefinedMenuItem::separator(app)?;
        menu = menu.item(&ws_separator);

        let groups = group_connections_for_workspace(ws);

        if groups.len() == 1 && groups[0].0.is_empty() {
            for conn in &groups[0].1 {
                let item = MenuItemBuilder::with_id(
                    format!("connect_{}", conn.id),
                    display_name(conn),
                )
                .build(app)?;
                menu = menu.item(&item);
            }
        } else {
            let mut submenu = SubmenuBuilder::new(app, &ws_label);

            for (group_name, connections) in &groups {
                if group_name.is_empty() {
                    for conn in connections {
                        let item = MenuItemBuilder::with_id(
                            format!("connect_{}", conn.id),
                            display_name(conn),
                        )
                        .build(app)?;
                        submenu = submenu.item(&item);
                    }
                } else {
                    let mut sub = SubmenuBuilder::new(app, group_name);
                    for conn in connections {
                        let item = MenuItemBuilder::with_id(
                            format!("connect_{}", conn.id),
                            display_name(conn),
                        )
                        .build(app)?;
                        sub = sub.item(&item);
                    }
                    let sub = sub.build()?;
                    submenu = submenu.item(&sub);
                }
            }

            let submenu = submenu.build()?;
            menu = menu.item(&submenu);
        }
    }

    let separator = PredefinedMenuItem::separator(app)?;
    menu = menu.item(&separator);

    let quit_item = MenuItemBuilder::with_id("quit", "Выход").build(app)?;
    menu = menu.item(&quit_item);

    Ok(menu.build()?)
}

fn display_name(conn: &Connection) -> &str {
    conn.display_title()
}

fn group_connections_for_workspace(ws: &crate::models::workspace::Workspace) -> Vec<(String, Vec<&Connection>)> {
    let group_field = match ws.group_by.first() {
        Some(f) => f.as_str(),
        None => return vec![("".into(), ws.connections.iter().collect())],
    };

    let mut groups: Vec<(String, Vec<&Connection>)> = Vec::new();

    for conn in &ws.connections {
        let group = conn.labels.get(group_field).cloned().unwrap_or_default();

        if group.is_empty() {
            if let Some(flat) = groups.iter_mut().find(|(name, _)| name.is_empty()) {
                flat.1.push(conn);
            } else {
                groups.push(("".into(), vec![conn]));
            }
        } else if let Some(existing) = groups.iter_mut().find(|(name, _)| name == &group) {
            existing.1.push(conn);
        } else {
            groups.push((group, vec![conn]));
        }
    }

    groups.sort_by(|a, b| a.0.cmp(&b.0));
    groups
}

fn handle_tray_connect(id: &str) {
    let app = app();
    let store = block_on_anywhere(store::load(app.config()));
    let _conn = match find_connection(&store, id) {
        Some(c) => c.clone(),
        None => return,
    };

    let manager = app.state::<crate::l2tp::manager::L2tpManager>();
    let status = block_on_anywhere(manager.status(id));

    if status == VpnStatus::Connected || status == VpnStatus::Connecting {
        #[cfg(target_os = "macos")]
        {
            let manager2 = manager.inner().clone();
            let app2 = app.clone();
            let id2 = id.to_string();
            tauri::async_runtime::spawn(async move {
                let result = manager2.disconnect(&id2).await;
                match result {
                    Ok(()) => {
                        log!("[tray] disconnected {}", id2);
                        let _ = app2.emit("vpn-status-changed", VpnStatusPayload {
                            id: id2, status: VpnStatus::Disconnected,
                        });
                    }
                    Err(e) => log!("[tray] disconnect error: {}", e),
                }
                let _ = refresh_tray();
            });
        }
    } else {
        #[cfg(target_os = "macos")]
        {
            let manager2 = manager.inner().clone();
            let app2 = app.clone();
            let id2 = id.to_string();
            tauri::async_runtime::spawn(async move {
                let result = manager2.connect(&id2).await;
                match result {
                    Ok(()) => {
                        log!("[tray] connect success");
                        let _ = app2.emit("vpn-status-changed", VpnStatusPayload {
                            id: id2, status: VpnStatus::Connected,
                        });
                    }
                    Err(e) => {
                        log!("[tray] connect failed: {}", e);
                        let _ = app2.emit("vpn-status-changed", VpnStatusPayload {
                            id: id2, status: VpnStatus::Disconnected,
                        });
                    }
                }
                let _ = refresh_tray();
            });
        }

        #[cfg(target_os = "windows")]
        {
            if let Err(e) = connect_vpn_windows(id) {
                log!("[tray] connect failed: {}", e);
                let _ = app.emit("vpn-status-changed", VpnStatusPayload {
                    id: id.to_string(), status: VpnStatus::Disconnected,
                });
            } else {
                let _ = app.emit("vpn-status-changed", VpnStatusPayload {
                    id: id.to_string(), status: VpnStatus::Connected,
                });
            }
        }
    }

    let _ = refresh_tray();
}

#[cfg(target_os = "windows")]
fn connect_vpn_windows(id: &str) -> Result<(), String> {
    let app = app();
    let store = tokio::runtime::Handle::current().block_on(store::load(app.config()));
    let conn = find_connection(&store, id)
        .ok_or("Подключение не найдено")?
        .clone();

    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    let hash = crate::commands::utils::service_hash(&conn, &password, &shared_secret);
    let status = l2tp::get_vpn_status(&conn.service_name);
    let needs_recreate =
        conn.service_hash.as_deref() != Some(hash.as_str()) || status == VpnStatus::Unknown;

    if needs_recreate {
        l2tp::create_vpn_service(
            &conn.service_name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
        )?;

        let mut store = tokio::runtime::Handle::current().block_on(store::load(app.config()));
        for ws in &mut store.workspaces {
            if let Some(c) = ws.connections.iter_mut().find(|c| c.id == id) {
                c.service_hash = Some(hash.clone());
            }
        }
        let _ = tokio::runtime::Handle::current().block_on(store::save(&store));

        std::thread::sleep(std::time::Duration::from_millis(1500));
    }

    l2tp::connect_vpn(&conn.service_name, &conn.username, &password)
}

pub fn refresh_tray() -> Result<(), Box<dyn std::error::Error>> {
    let app = app();
    let tray_state = app.state::<crate::state::TrayState>();
    let mut tray_lock = match tray_state.tray.lock() {
        Ok(lock) => lock,
        Err(poisoned) => poisoned.into_inner(), // Recover from poisoned mutex
    };

    if let Some(tray) = tray_lock.as_mut() {
        let menu = build_menu()?;
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}

#[derive(Clone, serde::Serialize)]
struct VpnStatusPayload {
    id: String,
    status: VpnStatus,
}

fn start_status_poller() {
    let app = app();
    let tray_state = app.state::<crate::state::TrayState>();
    let mut running = match tray_state.poller_running.lock() {
        Ok(lock) => lock,
        Err(poisoned) => poisoned.into_inner(),
    };
    if *running {
        return;
    }
    *running = true;
    drop(running);

    let app = app.clone();
    std::thread::spawn(move || {
        // Создаём свой runtime для async операций (poller thread не в tokio контексте)
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                crate::log!("[poller] failed to create tokio runtime: {}", e);
                return;
            }
        };
        let handle = rt.handle().clone();

        let mut prev_statuses: HashMap<String, VpnStatus> = HashMap::new();

        loop {
            std::thread::sleep(std::time::Duration::from_secs(3));

            let store = handle.block_on(store::load(app.config()));
            let mut changed = false;

            let manager = app.state::<crate::l2tp::manager::L2tpManager>();

            for ws in &store.workspaces {
                for conn in &ws.connections {
                    let status = handle.block_on(manager.status(&conn.id));
                    let prev = prev_statuses.get(&conn.id).copied();
                    if prev != Some(status) {
                        changed = true;
                        let _ = app.emit(
                            "vpn-status-changed",
                            VpnStatusPayload {
                                id: conn.id.clone(),
                                status,
                            },
                        );
                    }
                    prev_statuses.insert(conn.id.clone(), status);
                }
            }

            if changed {
                let _ = refresh_tray();
            }
        }
    });
}
