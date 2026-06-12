use crate::state::get_state;
use crate::sudo::SudoSession;
use crate::tray;
use crate::{backup, keychain, l2tp, log, store};
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn import(password: String) -> Result<bool, String> {
    log!("[import_config_dialog] called");

    let app = get_state().app.clone();

    let path = tokio::task::spawn_blocking({
        let app_handle = app.clone();
        move || {
            app_handle
                .dialog()
                .file()
                .add_filter("L2TP Hub Config", &["conf"])
                .blocking_pick_file()
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_buf = p.as_path().ok_or("Не удалось получить путь")?.to_path_buf();
            let data = tokio::fs::read(&path_buf)
                .await
                .map_err(|e| format!("Ошибка чтения файла: {}", e))?;

            tokio::task::spawn_blocking(move || {
                let (connections, labels) = backup::restore_backup(&data, &password)?;
                let mut store = store::load(app.config());

                for imported_conn in connections {
                    if let Some(idx) = store
                        .connections
                        .iter()
                        .position(|c| c.id == imported_conn.id)
                    {
                        store.connections[idx] = imported_conn;
                    } else {
                        store.connections.push(imported_conn);
                    }
                }

                for imported_label in labels {
                    if imported_label.built_in {
                        continue;
                    }
                    if let Some(idx) = store.labels.iter().position(|l| l.id == imported_label.id) {
                        store.labels[idx] = imported_label;
                    } else {
                        store.labels.push(imported_label);
                    }
                }

                store::save(&store)
            })
            .await
            .map_err(|e| e.to_string())??;

            let app_clone = get_state().app.clone();

            let _ = tray::refresh_tray(&app_clone);
            log!("[import_config_dialog] done");
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
pub async fn export(password: String) -> Result<bool, String> {
    log!("[export_config_dialog] called");

    let app = get_state().app.clone();

    let bytes = tokio::task::spawn_blocking({
        let app_handle = app.clone();
        move || {
            let store = store::load(app_handle.config());
            backup::make_backup(&store, &password)
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    let path = tokio::task::spawn_blocking({
        let app_handle = app.clone();
        move || {
            app_handle
                .dialog()
                .file()
                .set_file_name("l2tp-hub.conf")
                .add_filter("L2TP Hub Config", &["conf"])
                .blocking_save_file()
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            let path_buf = p.as_path().ok_or("Не удалось получить путь")?.to_path_buf();
            tokio::fs::write(&path_buf, &bytes)
                .await
                .map_err(|e| format!("Ошибка записи файла: {}", e))?;
            log!("[export_config_dialog] Saved to {:?}", path_buf);
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
pub async fn reset(
    app_handle: tauri::AppHandle,
    sudo: State<'_, SudoSession>,
) -> Result<(), String> {
    log!("[reset] called");
    let sudo = sudo.inner().clone();

    let app_clone = app_handle.clone();
    tokio::task::spawn_blocking(move || {
        let vpn_services = l2tp::list_vpn_services();

        for service in vpn_services {
            #[cfg(target_os = "macos")]
            {
                if let Err(e) = l2tp::delete_vpn_service(&sudo, &service) {
                    log!("Error when deleting service {}: {}", service, e)
                }
            }

            #[cfg(target_os = "windows")]
            {
                if let Err(e) = l2tp::delete_vpn_service(&service) {
                    log!("Error when deleting service {}: {}", service, e)
                }
            }
        }

        let store = store::load(app_clone.config());
        for conn in &store.connections {
            let _ = keychain::delete_password(&conn.keychain_key);
            let _ = keychain::delete_password(&conn.shared_secret_key);
        }
        store::save(&store::Store::default())?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?;

    let _ = tray::refresh_tray(&app_handle);
    Ok(())
}
