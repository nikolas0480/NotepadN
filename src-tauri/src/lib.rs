pub mod highlighter;

use std::fs;
use highlighter::{get_highlights, HighlightToken};

#[tauri::command]
fn open_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn parse_highlights(text: String, language: String) -> Vec<HighlightToken> {
    get_highlights(&text, &language)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            parse_highlights
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
