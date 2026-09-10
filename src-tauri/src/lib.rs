use std::fs;

#[tauri::command]
fn run_script(filename: String) -> Result<String, String> {
  println!("I was invoked from JavaScript, with this message: {}", filename);

  let path = get_script_path()?;
  println!("script path: {}", path);

  Ok(path)
}

fn get_script_path() -> Result<String, String> {
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
        return Err(
            "Cannot find any InDesign installations. Please install InDesign, then relaunch Stellar."
                .to_string(),
        );
    }

    let max = versions.iter().copied().max().unwrap();
    let version_number = max - 2005;
    let version_string = format!("Version {}.0", version_number);

    Ok(format!("{id_path}/{version_string}/en_US/Scripts/Scripts Panel"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![run_script])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
