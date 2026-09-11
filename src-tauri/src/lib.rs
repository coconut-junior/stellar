use std::fs;
use serde::{Serialize};
use tauri::api::dialog::{blocking::message as blocking_message, message};
use tauri::Manager;

#[tauri::command]
fn run_script(filename: String) -> Result<String, String> {
  println!("I was invoked from JavaScript, with this message: {}", filename);
  Ok("successful run".to_string())
}

#[derive(Serialize)]
struct InDesign {
  version: i32,
  year: i32,
  script_path: String
}

const INDESIGN_NOT_FOUND: &str =
  "Cannot find any InDesign installations. Please install InDesign, then relaunch Stellar.";

fn detect_id_info() -> Result<InDesign, String> {
    let home = std::env::var("HOME").map_err(|_| "Unable to resolve HOME directory")?;
    let id_path = format!("{home}/Library/Preferences/Adobe InDesign");
    let mut versions = Vec::new();

    let apps = fs::read_dir("/Applications")
        .map_err(|e| format!("Could not read /Applications: {e}"))?;

    for entry in apps {
        let entry = entry.map_err(|e| format!("Could not read app entry: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();

        if !name.contains("Adobe InDesign") {
            continue;
        }

        let version = name
            .split("Adobe InDesign")
            .nth(1)
            .and_then(|s| s.trim().chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse::<i32>().ok());

        let Some(version) = version else {
            continue;
        };

        let app_path = format!("/Applications/Adobe InDesign {version}/Adobe InDesign {version}.app");
        if std::path::Path::new(&app_path).exists() {
            versions.push(version);
        }
    }

    if versions.is_empty() {
      return Err(INDESIGN_NOT_FOUND.to_string());
    }

    let max = versions.iter().copied().max().unwrap();
    let version_number = max - 2005;
    let version_string = format!("Version {}.0", version_number);
    let script_path = format!("{id_path}/{version_string}/en_US/Scripts/Scripts Panel");

    Ok(
      InDesign {
        version: version_number,
        year: max,
        script_path: script_path
      }
    )
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
          blocking_message(
            window.as_ref(),
            "InDesign not found",
            &error,
          );
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
