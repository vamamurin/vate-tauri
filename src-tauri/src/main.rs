// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

fn get_file_path() -> PathBuf {
    let dir = if cfg!(target_os = "windows") {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("vate")
    } else if cfg!(target_os = "macos") {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join("Library/Application Support/vate")
    } else {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".local/share/vate")
    };

    let _ = fs::create_dir_all(&dir); 
    dir.join("jobs.json")
}

#[tauri::command]
fn load_jobs() -> String {
    let path = get_file_path();
    fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string()) 
}


#[tauri::command]
fn save_jobs(jobs_json: String) -> Result<(), String> {
    let path = get_file_path();
    fs::write(path, jobs_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn exit_app() {
    std::process::exit(0); 
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_jobs, save_jobs, exit_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
