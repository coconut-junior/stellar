use serde::Serialize;
use std::fs;
use std::process::Command;
use tauri::api::dialog::{blocking::message as blocking_message, message};
use tauri::Manager;

#[tauri::command]
fn run_script(
    app: tauri::AppHandle,
    filename: String,
    args: Option<Vec<String>>,
) -> Result<String, String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, filename, args);
        return Err("Running InDesign scripts is only supported on macOS.".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let info = detect_id_info()?;
        let script_path = format!("{}/{}", info.script_path, filename);
        let arguments = args.unwrap_or_default();
        let argument_list = arguments
            .iter()
            .map(|argument| format!("\"{}\"", escape_applescript(argument)))
            .collect::<Vec<_>>()
            .join(", ");
        let script = format!(
            "tell application id \"com.adobe.indesign\"\nactivate\nset args to {{{argument_list}}}\ndo script \"{}\" language javascript with arguments args\nend tell",
            escape_applescript(&script_path)
        );

        let output = Command::new("osascript")
            .args(["-e", &script])
            .output()
            .map_err(|error| format!("Could not start osascript: {error}"))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let error_message = if error.contains("not authorized") || error.contains("authorize") {
                format!(
                    "Automation permission is required for Stellar to control InDesign. {error}"
                )
            } else {
                error
            };

            if error_message.contains("Automation permission") {
                let window = app.get_window("main");
                message(
                    window.as_ref(),
                    "Automation permission required. Please give Stellar permission under System Settings > Privacy & Security > Automation in your System Settings.",
                    &error_message,
                );
            }
            return Err(error_message);
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
}

#[cfg(target_os = "macos")]
fn escape_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

#[derive(Serialize)]
struct InDesign {
    version: i32,
    year: i32,
    script_path: String,
}

const INDESIGN_NOT_FOUND: &str =
    "Cannot find any InDesign installations. Please install InDesign, then relaunch Stellar.";

fn installed_versions() -> Result<Vec<i32>, String> {
    fs::read_dir("/Applications")
        .map_err(|error| format!("Could not read /Applications: {error}"))?
        .map(|entry| {
            let name = entry
                .map_err(|error| format!("Could not read app entry: {error}"))?
                .file_name()
                .to_string_lossy()
                .into_owned();

            let version = name
                .strip_prefix("Adobe InDesign")
                .and_then(|suffix| suffix.trim().parse::<i32>().ok());

            Ok(version.filter(|version| {
                let path =
                    format!("/Applications/Adobe InDesign {version}/Adobe InDesign {version}.app");
                std::path::Path::new(&path).exists()
            }))
        })
        .collect::<Result<Vec<_>, _>>()
        .map(|versions| versions.into_iter().flatten().collect())
}

fn detect_id_info() -> Result<InDesign, String> {
    let home = std::env::var("HOME").map_err(|_| "Unable to resolve HOME directory")?;
    let id_path = format!("{home}/Library/Preferences/Adobe InDesign");
    let year = installed_versions()?
        .into_iter()
        .max()
        .ok_or_else(|| INDESIGN_NOT_FOUND.to_string())?;
    let version = year - 2005;

    Ok(InDesign {
        version,
        year,
        script_path: format!("{id_path}/Version {version}.0/en_US/Scripts/Scripts Panel"),
    })
}

#[tauri::command]
fn get_id_info(app: tauri::AppHandle) -> Result<InDesign, String> {
    match detect_id_info() {
        Ok(info) => Ok(info),
        Err(error) => {
            let window = app.get_window("main");
            message(window.as_ref(), "InDesign not found", &error);
            Err(error)
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Err(error) = detect_id_info() {
                let window = app.get_window("main");
                std::thread::spawn(move || {
                    blocking_message(window.as_ref(), "InDesign not found", &error);
                    std::process::exit(1);
                });
            } else if let Some(window) = app.get_window("main") {
                window.show()?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![run_script, get_id_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
