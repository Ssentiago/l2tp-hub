use crate::models::workspace::Workspace;
use crate::store;
use serde::Serialize;

#[derive(Serialize)]
pub struct WorkspaceInfo {
    pub id: String,
    pub name: String,
    pub group_by: Vec<String>,
}

#[tauri::command]
pub async fn get_workspaces(__app_handle: tauri::AppHandle) -> Vec<WorkspaceInfo> {
    let pool = crate::DB_POOL.get().expect("DB pool not initialized");
    crate::db::workspace_infos(pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|w| WorkspaceInfo {
            id: w.id,
            name: w.name,
            group_by: serde_json::from_str(&w.group_by).unwrap_or_default(),
        })
        .collect()
}

#[tauri::command]
pub async fn get_active_workspace_id(_app_handle: tauri::AppHandle) -> String {
    store::load(&crate::DB_POOL.get().expect("pool")).await.active_workspace_id
}

#[tauri::command]
pub async fn create_workspace(_app_handle: tauri::AppHandle, name: String) -> Result<WorkspaceInfo, String> {
    let ws = Workspace::new(&name);
    let info = WorkspaceInfo {
        id: ws.id.clone(),
        name: ws.name.clone(),
        group_by: ws.group_by.clone(),
    };
    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            s.workspaces.push(ws);
            Ok(())
        })
        .await?;
    Ok(info)
}

#[tauri::command]
pub async fn rename_workspace(_app_handle: tauri::AppHandle, id: String, name: String) -> Result<(), String> {
    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            let ws = s
                .workspaces
                .iter_mut()
                .find(|w| w.id == id)
                .ok_or("Workspace not found")?;
            ws.name = name;
            Ok(())
        })
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn delete_workspace(_app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            if s.workspaces.len() <= 1 {
                return Err("Нельзя удалить последнее пространство".into());
            }
            let idx = s
                .workspaces
                .iter()
                .position(|w| w.id == id)
                .ok_or("Workspace not found")?;
            s.workspaces.remove(idx);
            if s.active_workspace_id == id {
                s.active_workspace_id = s.workspaces[0].id.clone();
            }
            Ok(())
        })
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn switch_workspace(_app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            if !s.workspaces.iter().any(|w| w.id == id) {
                return Err("Workspace not found".into());
            }
            s.active_workspace_id = id;
            Ok(())
        })
        .await
        .map(|_| ())
}
