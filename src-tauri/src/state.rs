use std::sync::OnceLock;
use tauri::{AppHandle, WebviewWindow};

pub struct AppState {
    pub app: AppHandle,
    pub window: WebviewWindow,
}

static APP_STATE: OnceLock<AppState> = OnceLock::new();

pub fn init_state(app: AppHandle, window: WebviewWindow) {
    let state = AppState { app, window };
    if APP_STATE.set(state).is_err() {
        eprintln!("Warning: AppState was already initialized");
    }
}

pub fn get_state() -> &'static AppState {
    APP_STATE
        .get()
        .expect("AppState not initialized. Did you call init_state?")
}
