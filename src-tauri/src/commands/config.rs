use l2tp_hub_core::error::{AppError, AppErrorCode};
use crate::state::get_state;
use crate::sudo::SudoSession;
use crate::{backup, keychain, l2tp, log, store};
use tauri::State;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
#[specta::specta]
pub async fn import(password: String) -> Result<bool, AppError> {
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
            let path_buf = p.as_path().ok_or(AppError::new(AppErrorCode::PathUnresolved))?.to_path_buf();
            let data = tokio::fs::read(&path_buf)
                .await
                .map_err(|e| AppError::detail(AppErrorCode::FileRead, e.to_string()))?;

            // CPU-heavy crypto in spawn_blocking
            let (connections, labels) = tokio::task::spawn_blocking(move || {
                backup::restore_backup(&data, &password)
            })
            .await
            .map_err(|e| e.to_string())??;

            crate::STORE
                .get()
                .expect("store actor")
                .mutate(move |s| {
                    let ws = s.active_workspace_mut();
                    for imported_conn in connections {
                        if let Some(idx) = ws.connections.iter().position(|c| c.id == imported_conn.id) {
                            ws.connections[idx] = imported_conn;
                        } else {
                            ws.connections.push(imported_conn);
                        }
                    }

                    for imported_label in labels {
                        if imported_label.built_in { continue; }
                        if let Some(idx) = s.labels.iter().position(|l| l.id == imported_label.id) {
                            s.labels[idx] = imported_label;
                        } else {
                            s.labels.push(imported_label);
                        }
                    }
                    Ok(())
                })
                .await?;
            log!("[import_config_dialog] done");
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn import_file(file_path: String, password: String) -> Result<bool, AppError> {
    log!("[import_file] called with path={}", file_path);

    let _app = crate::state::get_state().app.clone();
    let path_buf = std::path::PathBuf::from(&file_path);
    let data = tokio::fs::read(&path_buf)
        .await
        .map_err(|e| AppError::detail(AppErrorCode::FileRead, e.to_string()))?;

    let (connections, labels) = tokio::task::spawn_blocking(move || {
        backup::restore_backup(&data, &password)
    })
    .await
    .map_err(|e| e.to_string())??;

    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            let ws = s.active_workspace_mut();
            for imported_conn in connections {
                if let Some(idx) = ws.connections.iter().position(|c| c.id == imported_conn.id) {
                    ws.connections[idx] = imported_conn;
                } else {
                    ws.connections.push(imported_conn);
                }
            }
            for imported_label in labels {
                if imported_label.built_in { continue; }
                if let Some(idx) = s.labels.iter().position(|l| l.id == imported_label.id) {
                    s.labels[idx] = imported_label;
                } else {
                    s.labels.push(imported_label);
                }
            }
            Ok(())
        })
        .await?;
    log!("[import_file] done");
    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub async fn export(password: String) -> Result<bool, AppError> {
    log!("[export_config_dialog] called");

    let app = get_state().app.clone();
    let store = store::load(&crate::DB_POOL.get().expect("pool")).await;

    // CPU-heavy crypto in spawn_blocking
    let bytes = tokio::task::spawn_blocking(move || {
        backup::make_backup(&store, &password)
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
            let path_buf = p.as_path().ok_or(AppError::new(AppErrorCode::PathUnresolved))?.to_path_buf();
            tokio::fs::write(&path_buf, &bytes)
                .await
                .map_err(|e| AppError::detail(AppErrorCode::FileWrite, e.to_string()))?;
            log!("[export_config_dialog] Saved to {:?}", path_buf);
            Ok(true)
        }
        None => Ok(false),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn reset(
    _app_handle: tauri::AppHandle,
    sudo: State<'_, SudoSession>,
) -> Result<(), AppError> {
    log!("[reset] called");
    #[cfg(target_os = "macos")]
    let sudo = sudo.inner().clone();
    #[cfg(target_os = "windows")]
    let _ = &sudo;

    // Полная очистка VPN-состояния: остановка демонов, восстановление маршрутов,
    // удаление временных файлов. Делается до удаления сервисов.
    tokio::task::spawn_blocking(l2tp::cleanup_all_vpn_state)
        .await
        .map_err(|e| e.to_string())?;

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

    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            for ws in &s.workspaces {
                for conn in &ws.connections {
                    let _ = keychain::delete_password(&conn.keychain_key);
                    let _ = keychain::delete_password(&conn.shared_secret_key);
                }
            }
            *s = store::Store::default();
            Ok(())
        })
        .await?;

    Ok(())
}
