1. Install jq to test the 'Format JSON (jq)' extension.
2. Start the tauri app using playwright connecting to the running debug binary, or just start it via web server (since frontend relies on tauri IPC, we must run the Tauri binary, not just the Vite server).
3. Wait, we can't test tauri IPC easily via simple web playwright without Tauri environment. The instructions say "Before you can verify your changes, you must start the local development server". But since this is a Tauri app, we need to test the Tauri binary with playwright, which is possible but complex.
Alternatively, we can test it using the Vite dev server by mocking the Tauri `invoke` or we can just try to run the playwright script against the Tauri application.
