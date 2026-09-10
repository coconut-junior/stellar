#[tauri::command]
fn run_script(filename: String) {
  println!("I was invoked from JavaScript, with this message: {}", filename);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![run_script])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}