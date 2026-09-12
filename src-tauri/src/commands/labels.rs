use crate::models::label;
use crate::store;

#[tauri::command]
pub async fn get_labels(app_handle: tauri::AppHandle) -> Vec<label::Label> {
    store::load(app_handle.config()).await.labels
}

#[tauri::command]
pub async fn save_label(
    app_handle: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<label::Label, String> {
    let mut s = store::load(app_handle.config()).await;
    let label = if let Some(l) = s.labels.iter_mut().find(|l| l.id == id) {
        l.name = name;
        l.clone()
    } else {
        let l = label::Label {
            id: id.clone(),
            name,
            built_in: false,
        };
        s.labels.push(l.clone());
        l
    };
    store::save(&s).await?;
    Ok(label)
}

#[tauri::command]
pub async fn delete_label(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut s = store::load(app_handle.config()).await;
    let label = s
        .labels
        .iter()
        .find(|l| l.id == id)
        .ok_or("Метка не найдена")?;
    if label.built_in {
        return Err("Нельзя удалить встроенную метку".into());
    }
    s.labels.retain(|l| l.id != id);
    for ws in &mut s.workspaces {
        for conn in &mut ws.connections {
            conn.labels.remove(&id);
        }
    }
    store::save(&s).await
}
