use serde::Serialize;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::process::Command;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt,MessageDialogKind};

const SCRIPTS_MANIFEST_URL: &str = "https://raw.githubusercontent.com/coconut-junior/personal-site/refs/heads/master/stellar/dependencies.json";

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
fn download_scripts(
    app: tauri::AppHandle,
    update_version_marker: Option<bool>,
) -> Result<String, String> {
    std::thread::spawn(move || {
        let result = download_scripts_in_background(&app, update_version_marker.unwrap_or(false));
        let event = match result {
            Ok(message) => ("scripts-download-complete", message),
            Err(error) => ("scripts-download-error", error),
        };
        let _ = app.emit(event.0, event.1);
    });

    Ok("Script download started".to_string())
}

#[tauri::command]
fn open_script_folder(){
    let info = detect_id_info().unwrap();
    println!("Opening {}", info.script_path);
    let _ = Command::new("open").args([info.script_path]).output();
}

fn download_scripts_in_background(
    app: &tauri::AppHandle,
    update_version_marker: bool,
) -> Result<String, String> {
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
            app.emit(
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

        if filename.to_ascii_lowercase().ends_with(".zip") {
            file.flush()
                .map_err(|error| format!("Could not save {filename}: {error}"))?;
            drop(file);

            let folder_name = Path::new(filename)
                .file_stem()
                .and_then(|name| name.to_str())
                .filter(|name| !name.is_empty())
                .ok_or_else(|| format!("Invalid ZIP filename: {filename}"))?;
            let extract_path = Path::new(&info.script_path).join(folder_name);
            let mut archive = zip::ZipArchive::new(
                File::open(&destination)
                    .map_err(|error| format!("Could not open {filename}: {error}"))?,
            )
            .map_err(|error| format!("Could not read {filename}: {error}"))?;
            archive
                .extract(&extract_path)
                .map_err(|error| format!("Could not extract {filename}: {error}"))?;
            fs::remove_file(&destination)
                .map_err(|error| format!("Could not remove extracted archive {filename}: {error}"))?;
        }
    }

    if update_version_marker || last_installed_indesign_version(app)?.is_none() {
        save_last_installed_indesign_version(app, info.year)?;
    }

    Ok(format!(
        "Downloaded {total} scripts"
    ))
}

fn last_installed_indesign_version(app: &tauri::AppHandle) -> Result<Option<i32>, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not find Stellar config directory: {error}"))?
        .join("last_indesign_version");

    match fs::read_to_string(path) {
        Ok(version) => version
            .trim()
            .parse::<i32>()
            .map(Some)
            .map_err(|error| format!("Could not read saved InDesign version: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Could not read saved InDesign version: {error}")),
    }
}

fn save_last_installed_indesign_version(
    app: &tauri::AppHandle,
    version: i32,
) -> Result<(), String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not find Stellar config directory: {error}"))?;
    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("Could not create Stellar config directory: {error}"))?;
    fs::write(config_dir.join("last_indesign_version"), version.to_string())
        .map_err(|error| format!("Could not save installed InDesign version: {error}"))
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
    url: Option<String>,
    args: Option<Vec<String>>,
    minimize_after_launch: Option<bool>,
) -> Result<String, String> {
    let info = detect_id_info()?;
    if let Some(previous_version) = last_installed_indesign_version(&app)? {
        if previous_version != info.year {
            app.emit(
                "indesign-version-changed",
                serde_json::json!({
                    "previous": previous_version,
                    "current": info.year,
                }),
            )
            .map_err(|error| {
                format!("Could not notify the app about the InDesign update: {error}")
            })?;
            return Ok(
                "InDesign version changed; automations need to be reinstalled".to_string(),
            );
        }
    }

    let script_path = Path::new(&info.script_path).join(&filename);

    let is_html_file = Path::new(&filename)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("html"));

    if url.is_some() || is_html_file {
        let webview_url = if let Some(url) = url {
            let url = tauri::Url::parse(&url)
                .map_err(|error| format!("Invalid webview URL: {error}"))?;
            if !matches!(url.scheme(), "http" | "https") {
                return Err("Webview URL must use HTTP or HTTPS.".to_string());
            }
            url
        } else {
            let script_directory = Path::new(&info.script_path)
                .canonicalize()
                .map_err(|error| format!("Could not find Scripts Panel directory: {error}"))?;
            let html_path = script_path
                .canonicalize()
                .map_err(|error| format!("Could not open HTML file {filename}: {error}"))?;
            if !html_path.starts_with(&script_directory) || !html_path.is_file() {
                return Err(format!("Invalid HTML file: {filename}"));
            }

            tauri::Url::from_file_path(&html_path)
                .map_err(|_| format!("Could not create a webview URL for {filename}"))?
        };
        let label = format!(
            "html-{}",
            filename
                .chars()
                .map(|character| {
                    if character.is_ascii_alphanumeric() {
                        character.to_ascii_lowercase()
                    } else {
                        '-'
                    }
                })
                .collect::<String>()
        );

        if let Some(window) = app.get_webview_window(&label) {
            window
                .set_focus()
                .map_err(|error| format!("Could not focus HTML webview: {error}"))?;
        } else {
            tauri::WebviewWindowBuilder::new(&app, label, tauri::WebviewUrl::External(webview_url))
                .title(&filename)
                .inner_size(1000.0, 700.0)
                .on_document_title_changed(|window, title| {
                    if let Err(error) = window.set_title(&title) {
                        eprintln!("Could not update HTML webview title: {error}");
                    }
                })
                .build()
                .map_err(|error| format!("Could not open HTML webview: {error}"))?;
        }

        return Ok(format!("Opened {filename}"));
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, script_path, url, args, minimize_after_launch);
        return Err("Running InDesign scripts is only supported on macOS.".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let script_path = script_path.to_string_lossy().into_owned();
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
                app.dialog().message("Automation permission required. Please give Stellar permission under System Settings > Privacy & Security > Automation in your System Settings.");
            }
            return Err(error_message);
        }

        if minimize_after_launch.unwrap_or(false) {
            app.get_webview_window("main")
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
fn get_id_info(_app: tauri::AppHandle) -> Result<InDesignResponse, String> {
    match detect_id_info() {
        Ok(info) => {
            let client = reqwest::blocking::Client::new();
            let dependencies = fetch_dependencies(&client)?;
            Ok(InDesignResponse { info, dependencies })
        }
        Err(error) => {
            Err(error)
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Err(_error) = detect_id_info() {
                app.dialog().message("InDesign not found. Please install it, then relaunch Stellar.").kind(MessageDialogKind::Error).blocking_show();
                std::process::exit(1);
            } else if let Some(window) = app.get_webview_window("main") {
                window.show()?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_script,
            get_id_info,
            download_scripts,
            edit_code,
            open_script_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
