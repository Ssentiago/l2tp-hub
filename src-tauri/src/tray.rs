use crate::l2tp;
use crate::models::connection::Connection;
use crate::store::Store;
use crate::sudo::SudoSession;
use crate::{keychain, log, store};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::{AppHandle, Manager};

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, Box<dyn std::error::Error>> {
    let icon = load_tray_icon();
    let menu = build_menu(app)?;

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
                    let app = app.clone();
                    std::thread::spawn(move || {
                        handle_tray_connect(&app, &conn_id);
                    });
                }
                id if id.starts_with("stop_") => {
                    let conn_id = id.strip_prefix("stop_").unwrap().to_string();
                    let store = store::load(app.config());
                    if let Some(conn) = store.connections.iter().find(|c| c.id == conn_id) {
                        match l2tp::disconnect_vpn(&conn.name) {
                            Ok(()) => log!("[tray] disconnected {}", conn.server),
                            Err(e) => log!("[tray] disconnect error: {}", e),
                        }
                        let _ = refresh_tray(app);
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(tray)
}

fn load_tray_icon() -> Result<tauri::image::Image<'static>, Box<dyn std::error::Error>> {
    let bytes = include_bytes!("../icons/icon.png");
    let img = image::load_from_memory(bytes)?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    Ok(tauri::image::Image::new_owned(rgba.into_raw(), width, height))
}

fn build_menu(app: &AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let store = store::load(app.config());

    let mut menu = MenuBuilder::new(app);

    let show_item = MenuItemBuilder::with_id("show", "Показать окно").build(app)?;
    menu = menu.item(&show_item);

    let separator = PredefinedMenuItem::separator(app)?;
    menu = menu.item(&separator);

    let connected: Vec<&Connection> = store
        .connections
        .iter()
        .filter(|c| l2tp::get_vpn_status(&c.name) == l2tp::VpnStatus::Connected)
        .collect();

    if connected.is_empty() {
        let item = MenuItemBuilder::with_id("active_none", "Активное подключение: нет")
            .build(app)?;
        menu = menu.item(&item);
    } else {
        for conn in &connected {
            let display_name = conn.labels.get("branch").map(|s| s.as_str()).unwrap_or(&conn.server);
            let label = format!("Активное подключение: {}  ●", display_name);
            let item = MenuItemBuilder::with_id(
                format!("stop_{}", conn.id),
                &label,
            )
            .build(app)?;
            menu = menu.item(&item);
        }
    }

    if !store.connections.is_empty() {
        let separator = PredefinedMenuItem::separator(app)?;
        menu = menu.item(&separator);

        let groups = group_connections(&store);

        for (group_name, connections) in &groups {
            if groups.len() > 1 {
                let mut submenu = SubmenuBuilder::new(app, group_name);

                for conn in connections {
                    let display_name = conn.labels.get("branch").map(|s| s.as_str()).unwrap_or(&conn.server);
                    let item = MenuItemBuilder::with_id(
                        format!("connect_{}", conn.id),
                        display_name,
                    )
                    .build(app)?;
                    submenu = submenu.item(&item);
                }

                let submenu = submenu.build()?;
                menu = menu.item(&submenu);
            } else {
                for conn in connections {
                    let display_name = conn.labels.get("branch").map(|s| s.as_str()).unwrap_or(&conn.server);
                    let item = MenuItemBuilder::with_id(
                        format!("connect_{}", conn.id),
                        display_name,
                    )
                    .build(app)?;
                    menu = menu.item(&item);
                }
            }
        }
    }

    let separator = PredefinedMenuItem::separator(app)?;
    menu = menu.item(&separator);

    let quit_item = MenuItemBuilder::with_id("quit", "Выход").build(app)?;
    menu = menu.item(&quit_item);

    Ok(menu.build()?)
}

fn group_connections(store: &Store) -> Vec<(String, Vec<&Connection>)> {
    let mut groups: Vec<(String, Vec<&Connection>)> = Vec::new();

    for conn in &store.connections {
        let group = conn
            .labels
            .get("company")
            .cloned()
            .unwrap_or_else(|| "Без компании".into());

        if let Some(existing) = groups.iter_mut().find(|(name, _)| name == &group) {
            existing.1.push(conn);
        } else {
            groups.push((group, vec![conn]));
        }
    }

    groups.sort_by(|a, b| a.0.cmp(&b.0));
    groups
}

fn handle_tray_connect(app: &AppHandle, id: &str) {
    let store = store::load(app.config());
    let conn = match store.connections.iter().find(|c| c.id == id) {
        Some(c) => c.clone(),
        None => return,
    };

    let status = l2tp::get_vpn_status(&conn.name);

    if status == l2tp::VpnStatus::Connected || status == l2tp::VpnStatus::Connecting {
        match l2tp::disconnect_vpn(&conn.name) {
            Ok(()) => log!("[tray] disconnected {}", conn.server),
            Err(e) => log!("[tray] disconnect error: {}", e),
        }
    } else {
        #[cfg(target_os = "macos")]
        {
            let sudo = app.state::<SudoSession>();
            if let Err(e) = connect_vpn_macos(app, id, &sudo) {
                log!("[tray] connect failed: {}", e);
            }
        }

        #[cfg(target_os = "windows")]
        {
            if let Err(e) = connect_vpn_windows(app, id) {
                log!("[tray] connect failed: {}", e);
            }
        }
    }

    let _ = refresh_tray(app);
}

#[cfg(target_os = "macos")]
fn connect_vpn_macos(
    app: &AppHandle,
    id: &str,
    sudo: &SudoSession,
) -> Result<(), String> {
    let store = store::load(app.config());
    let conn = store
        .connections
        .iter()
        .find(|c| c.id == id)
        .ok_or("Подключение не найдено")?
        .clone();

    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    let hash = crate::commands::utils::service_hash(&conn, &password, &shared_secret);
    let status = l2tp::get_vpn_status(&conn.name);
    let needs_recreate =
        conn.service_hash.as_deref() != Some(hash.as_str()) || status == l2tp::VpnStatus::Unknown;

    if needs_recreate {
        l2tp::create_vpn_service(
            sudo,
            &conn.name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
        )?;

        let mut store = store::load(app.config());
        if let Some(c) = store.connections.iter_mut().find(|c| c.id == id) {
            c.service_hash = Some(hash);
        }
        let _ = store::save(&store);

        std::thread::sleep(std::time::Duration::from_millis(1500));
    }

    l2tp::connect_vpn(&conn.name)
}

#[cfg(target_os = "windows")]
fn connect_vpn_windows(app: &AppHandle, id: &str) -> Result<(), String> {
    let store = store::load(app.config());
    let conn = store
        .connections
        .iter()
        .find(|c| c.id == id)
        .ok_or("Подключение не найдено")?
        .clone();

    let password = keychain::get_password(&conn.keychain_key)?;
    let shared_secret = keychain::get_password(&conn.shared_secret_key)?;

    let hash = crate::commands::utils::service_hash(&conn, &password, &shared_secret);
    let status = l2tp::get_vpn_status(&conn.name);
    let needs_recreate =
        conn.service_hash.as_deref() != Some(hash.as_str()) || status == l2tp::VpnStatus::Unknown;

    if needs_recreate {
        l2tp::create_vpn_service(
            &conn.name,
            &conn.server,
            &conn.username,
            &password,
            &shared_secret,
        )?;

        let mut store = store::load(app.config());
        if let Some(c) = store.connections.iter_mut().find(|c| c.id == id) {
            c.service_hash = Some(hash);
        }
        let _ = store::save(&store);

        std::thread::sleep(std::time::Duration::from_millis(1500));
    }

    l2tp::connect_vpn(&conn.name, &conn.username, &password)
}

pub fn refresh_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let tray_state = app.state::<crate::state::TrayState>();
    let mut tray_lock = tray_state.tray.lock().unwrap();

    if let Some(tray) = tray_lock.as_mut() {
        let menu = build_menu(app)?;
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}
