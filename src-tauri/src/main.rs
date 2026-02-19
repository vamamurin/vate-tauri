// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

// Hàm tìm đường dẫn ~/.local/share/vate/jobs.json
fn get_file_path() -> PathBuf {
    let dir = if cfg!(target_os = "windows") {
        // Chuẩn Windows: C:\Users\Ten_May\AppData\Roaming\vate
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("vate")
    } else if cfg!(target_os = "macos") {
        // Chuẩn macOS: ~/Library/Application Support/vate
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join("Library/Application Support/vate")
    } else {
        // Chuẩn Linux (Arch của mày): ~/.local/share/vate
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".local/share/vate")
    };

    let _ = fs::create_dir_all(&dir); // Tự động tạo cây thư mục nếu chưa có
    dir.join("jobs.json")
}

// Lệnh gửi từ JS -> Gọi Rust tải file
#[tauri::command]
fn load_jobs() -> String {
    let path = get_file_path();
    fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string()) // Nếu ko có file thì trả về chuỗi JSON rỗng
}

// Lệnh gửi từ JS -> Gọi Rust lưu file
#[tauri::command]
fn save_jobs(jobs_json: String) -> Result<(), String> {
    let path = get_file_path();
    fs::write(path, jobs_json).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        // ĐĂNG KÝ 2 CÁI HÀM NÀY VÀO TAURI
        .invoke_handler(tauri::generate_handler![load_jobs, save_jobs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
