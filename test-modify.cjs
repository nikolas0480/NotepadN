const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf-8');
code = code.replace(
    ".plugin(tauri_plugin_dialog::init())",
    ".plugin(tauri_plugin_shell::init())\n        .plugin(tauri_plugin_dialog::init())"
);
fs.writeFileSync('src-tauri/src/lib.rs', code);
