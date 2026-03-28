pub mod ext;
use encoding_rs::Encoding;
use ext::{ensure_config_exists, execute_cli_command, get_config_file_path, load_extensions};
use std::fs;

fn get_encoding(name: &str) -> Option<&'static Encoding> {
    Encoding::for_label(name.as_bytes())
}

#[tauri::command]
fn open_file(path: String, encoding: Option<String>) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;

    let enc_name = encoding.unwrap_or_else(|| "utf-8".to_string());
    let enc = get_encoding(&enc_name).unwrap_or(encoding_rs::UTF_8);

    let (cow, _encoding_used, had_errors) = enc.decode(&bytes);

    // Fallback logic if utf-8 was requested but failed to decode cleanly
    if had_errors && enc_name == "utf-8" {
        let alt_enc = encoding_rs::WINDOWS_1251;
        let (alt_cow, _, alt_had_errors) = alt_enc.decode(&bytes);
        if !alt_had_errors {
            return Ok(alt_cow.into_owned());
        }
    }

    Ok(cow.into_owned())
}

#[tauri::command]
fn save_file(path: String, content: String, encoding: Option<String>) -> Result<(), String> {
    let enc_name = encoding.unwrap_or_else(|| "utf-8".to_string());
    let enc = get_encoding(&enc_name).unwrap_or(encoding_rs::UTF_8);

    let (cow, _encoding_used, _had_errors) = enc.encode(&content);
    fs::write(&path, cow).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let app_handle = app.handle();
            let _ = ensure_config_exists(&app_handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            load_extensions,
            execute_cli_command,
            get_config_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
