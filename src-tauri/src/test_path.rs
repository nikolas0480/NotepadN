use tauri::Manager;
pub fn test(app: &tauri::AppHandle) {
    let path = app.path().app_config_dir();
}
