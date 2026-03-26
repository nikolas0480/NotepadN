#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod ext;
fn main() {
    tauri_app_lib::run()
}
