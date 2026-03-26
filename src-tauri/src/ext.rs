use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Extension {
    pub id: String,
    pub name: String,
    pub command: String,
    pub allowed_languages: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionsConfig {
    pub extensions: Vec<Extension>,
}

pub fn get_config_path(app: &AppHandle) -> PathBuf {
    let mut path = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    path.push("extensions.json");
    path
}

pub fn ensure_config_exists(app: &AppHandle) -> Result<PathBuf, String> {
    let path = get_config_path(app);
    if !path.exists() {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let default_config = ExtensionsConfig {
            extensions: vec![
                Extension {
                    id: "jq-format".to_string(),
                    name: "Format JSON (jq)".to_string(),
                    command: "jq .".to_string(),
                    allowed_languages: Some(vec!["json".to_string()]),
                },
                Extension {
                    id: "gemini-fix".to_string(),
                    name: "Gemini Fix Code".to_string(),
                    command: "gemini \"исправь ошибки в коде: \"".to_string(),
                    allowed_languages: None,
                },
            ],
        };
        fs::write(
            &path,
            serde_json::to_string_pretty(&default_config).unwrap(),
        )
        .map_err(|e| format!("Failed to write default config: {}", e))?;
    }
    Ok(path)
}

#[tauri::command]
pub fn get_config_file_path(app: AppHandle) -> Result<String, String> {
    let path = get_config_path(&app);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_extensions(app: AppHandle) -> Result<Vec<Extension>, String> {
    let path = ensure_config_exists(&app)?;
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: ExtensionsConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config.extensions)
}

#[tauri::command]
pub fn execute_cli_command(command: String, input: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let mut child = Command::new("cmd")
        .args(["/C", &command])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "windows"))]
    let mut child = Command::new("sh")
        .args(["-c", &command])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(mut stdin) = child.stdin.take() {
        if let Err(e) = stdin.write_all(input.as_bytes()) {
            return Err(format!("Failed to write to stdin: {}", e));
        }
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        Err(format!("Command failed: {}", stderr))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_execute_cli_command() {
        let command = if cfg!(target_os = "windows") {
            "echo hello"
        } else {
            "cat"
        };
        let input = "hello world";
        let result = execute_cli_command(command.to_string(), input.to_string());
        assert!(result.is_ok());
        if cfg!(target_os = "windows") {
            assert!(result.unwrap().trim().contains("hello"));
        } else {
            assert_eq!(result.unwrap(), "hello world");
        }
    }
}
