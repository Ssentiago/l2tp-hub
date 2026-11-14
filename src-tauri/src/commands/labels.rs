use crate::models::label;
use crate::store;

#[tauri::command]
pub async fn get_labels(_app_handle: tauri::AppHandle) -> Vec<label::Label> {
    store::load(&crate::DB_POOL.get().expect("pool")).await.labels
}

#[tauri::command]
pub async fn save_label(
    _app_handle: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<label::Label, String> {
    let label_id = id.clone();
    let state = crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
            if let Some(l) = s.labels.iter_mut().find(|l| l.id == label_id) {
                l.name = name;
            } else {
                s.labels.push(label::Label {
                    id: label_id,
                    name,
                    built_in: false,
                });
            }
            Ok(())
        })
        .await?;
    state
        .labels
        .into_iter()
        .find(|l| l.id == id)
        .ok_or_else(|| "Метка не найдена".to_string())
}

#[tauri::command]
pub async fn delete_label(_app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    crate::STORE
        .get()
        .expect("store actor")
        .mutate(move |s| {
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
            Ok(())
        })
        .await
        .map(|_| ())
}
