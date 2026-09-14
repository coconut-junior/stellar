use serde::Serialize;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::process::Command;
use tauri::api::dialog::{blocking::message as blocking_message, message};
use tauri::Manager;

const SCRIPTS_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/coconut-junior/personal-site/refs/heads/master/stellar/dependencies.json";

#[derive(serde::Deserialize)]
struct ScriptDependency {
    name: String,
    filename: String,
    url: String,
    hidden: bool,
    version: f64,
    description: String,
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    name: String,
    filename: String,
    url: String,
    hidden: bool,
    version: f64,
    description: String,
    current: usize,
    total: usize,
    downloaded: u64,
    size: Option<u64>,
}

#[tauri::command]
fn download_scripts(app: tauri::AppHandle) -> Result<String, String> {
    std::thread::spawn(move || {
        let result = download_scripts_in_background(&app);
        let event = match result {
            Ok(message) => ("scripts-download-complete", message),
            Err(error) => ("scripts-download-error", error),
        };
        let _ = app.emit_all(event.0, event.1);
    });

    Ok("Script download started".to_string())
}

fn download_scripts_in_background(app: &tauri::AppHandle) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();
    let dependencies = fetch_dependencies(&client)?;
    let dependencies: Vec<ScriptDependency> = serde_json::from_value(
        dependencies
            .get("scripts")
            .cloned()
            .ok_or_else(|| "Script manifest does not contain a scripts array".to_string())?,
    )
    .map_err(|error| format!("Invalid script manifest: {error}"))?;
    let info = detect_id_info()?;
    fs::create_dir_all(&info.script_path)
        .map_err(|error| format!("Could not create Scripts Panel directory: {error}"))?;

    let dependencies: Vec<_> = dependencies
        .into_iter()
        .filter(|script| !script.filename.to_ascii_lowercase().ends_with(".zip"))
        .collect();
    let total = dependencies.len();

    for (index, script) in dependencies.iter().enumerate() {
        let filename = Path::new(&script.filename)
            .file_name()
            .and_then(|name| name.to_str())
            .filter(|name| !name.is_empty())
            .ok_or_else(|| format!("Invalid script filename: {}", script.filename))?;
        let destination = Path::new(&info.script_path).join(filename);
        let mut response = client
            .get(&script.url)
            .send()
            .map_err(|error| format!("Could not download {filename}: {error}"))?
            .error_for_status()
            .map_err(|error| format!("Could not download {filename}: {error}"))?;
        let size = response.content_length();
        let mut file = File::create(&destination)
            .map_err(|error| format!("Could not create {filename}: {error}"))?;
        let mut downloaded = 0;
        let mut buffer = [0; 16 * 1024];
        loop {
            let bytes_read = response
                .read(&mut buffer)
                .map_err(|error| format!("Could not download {filename}: {error}"))?;
            if bytes_read == 0 {
                break;
            }
            file.write_all(&buffer[..bytes_read])
                .map_err(|error| format!("Could not save {filename}: {error}"))?;
            downloaded += bytes_read as u64;
            app.emit_all(
                "scripts-download-progress",
                DownloadProgress {
                    name: script.name.clone(),
                    filename: filename.to_string(),
                    url: script.url.clone(),
                    hidden: script.hidden,
                    version: script.version,
                    description: script.description.clone(),
                    current: index + 1,
                    total,
                    downloaded,
                    size,
                },
            )
            .map_err(|error| format!("Could not report download progress: {error}"))?;
        }
    }

    Ok(format!(
        "Downloaded {total} scripts to {}",
        info.script_path
    ))
}

#[tauri::command]
fn edit_code(filename: String) {
    let info = detect_id_info().unwrap();
    let path = format!("{}/{}", info.script_path, filename);
    println!("editing {}", path);
    let _ = Command::new("open").args([path]).output();
}

#[tauri::command]
fn run_script(
    app: tauri::AppHandle,
    filename: String,
    args: Option<Vec<String>>,
    minimize_after_launch: Option<bool>,
) -> Result<String, String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, filename, args, minimize_after_launch);
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

        if minimize_after_launch.unwrap_or(false) {
            app.get_window("main")
                .ok_or_else(|| "Could not find the main window.".to_string())?
                .minimize()
                .map_err(|error| format!("Could not minimize the window: {error}"))?;
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

#[derive(Serialize)]
struct InDesignResponse {
    info: InDesign,
    dependencies: serde_json::Value,
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

fn fetch_dependencies(client: &reqwest::blocking::Client) -> Result<serde_json::Value, String> {
    client
        .get(SCRIPTS_MANIFEST_URL)
        .send()
        .map_err(|error| format!("Could not download script manifest: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Could not download script manifest: {error}"))?
        .json()
        .map_err(|error| format!("Could not parse script manifest: {error}"))
}

#[tauri::command]
fn get_id_info(app: tauri::AppHandle) -> Result<InDesignResponse, String> {
    match detect_id_info() {
        Ok(info) => {
            let client = reqwest::blocking::Client::new();
            let dependencies = fetch_dependencies(&client)?;
            Ok(InDesignResponse { info, dependencies })
        }
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
        .invoke_handler(tauri::generate_handler![
            run_script,
            get_id_info,
            download_scripts,
            edit_code
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
