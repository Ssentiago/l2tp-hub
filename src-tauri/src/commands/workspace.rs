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
pub fn get_workspaces(app_handle: tauri::AppHandle) -> Vec<WorkspaceInfo> {
    let s = store::load(app_handle.config());
    s.workspaces
        .iter()
        .map(|w| WorkspaceInfo {
            id: w.id.clone(),
            name: w.name.clone(),
            group_by: w.group_by.clone(),
        })
        .collect()
}

#[tauri::command]
pub fn get_active_workspace_id(app_handle: tauri::AppHandle) -> String {
    store::load(app_handle.config()).active_workspace_id
}

#[tauri::command]
pub fn create_workspace(app_handle: tauri::AppHandle, name: String) -> Result<WorkspaceInfo, String> {
    let mut s = store::load(app_handle.config());
    let ws = Workspace::new(&name);
    let info = WorkspaceInfo {
        id: ws.id.clone(),
        name: ws.name.clone(),
        group_by: ws.group_by.clone(),
    };
    s.workspaces.push(ws);
    store::save(&s)?;
    Ok(info)
}

#[tauri::command]
pub fn rename_workspace(app_handle: tauri::AppHandle, id: String, name: String) -> Result<(), String> {
    let mut s = store::load(app_handle.config());
    let ws = s.workspaces.iter_mut().find(|w| w.id == id).ok_or("Workspace not found")?;
    ws.name = name;
    store::save(&s)
}

#[tauri::command]
pub fn delete_workspace(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut s = store::load(app_handle.config());
    if s.workspaces.len() <= 1 {
        return Err("Нельзя удалить последнее пространство".into());
    }
    let idx = s.workspaces.iter().position(|w| w.id == id).ok_or("Workspace not found")?;
    s.workspaces.remove(idx);
    if s.active_workspace_id == id {
        s.active_workspace_id = s.workspaces[0].id.clone();
    }
    store::save(&s)
}

#[tauri::command]
pub fn switch_workspace(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut s = store::load(app_handle.config());
    if !s.workspaces.iter().any(|w| w.id == id) {
        return Err("Workspace not found".into());
    }
    s.active_workspace_id = id;
    store::save(&s)
}
