// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use sysinfo::{System, SystemExt, CpuExt, DiskExt};

// Tauri commands
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct DiskInfo {
    name: String,
    mount_point: String,
    total: u64,
    used: u64,
    available: u64,
    percentage: f64,
}

#[derive(Serialize)]
struct MemoryInfo {
    total: u64,
    used: u64,
    available: u64,
    percentage: f64,
}

#[derive(Serialize)]
struct CpuInfo {
    usage: f32,
    name: String,
    cores: usize,
}

#[derive(Serialize)]
struct SystemOverview {
    memory: MemoryInfo,
    cpu: CpuInfo,
    disks: Vec<DiskInfo>,
}

#[tauri::command]
fn fetch_system_overview() -> SystemOverview {
    let mut sys = System::new();
    sys.refresh_disks_list();
    sys.refresh_disks();
    sys.refresh_all();

    println!("Disks found: {:?}", sys.disks()); // <--- Add this line

    // Memory
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let available_memory = sys.available_memory();
    let memory_percentage = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

    // CPU
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let cpu_name = sys.global_cpu_info().brand().to_string();
    let cpu_cores = sys.cpus().len();

    // Disks
    let disks: Vec<DiskInfo> = sys.disks().iter().map(|disk| {
        let total = disk.total_space();
        let available = disk.available_space();
        let used = total - available;
        let percentage = if total > 0 {
            (used as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        DiskInfo {
            name: disk.name().to_string_lossy().into_owned(),
            mount_point: disk.mount_point().to_string_lossy().into_owned(),
            total,
            used,
            available,
            percentage,
        }
    }).collect();

    SystemOverview {
        memory: MemoryInfo {
            total: total_memory,
            used: used_memory,
            available: available_memory,
            percentage: memory_percentage,
        },
        cpu: CpuInfo {
            usage: cpu_usage,
            name: cpu_name,
            cores: cpu_cores,
        },
        disks,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, fetch_system_overview])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
