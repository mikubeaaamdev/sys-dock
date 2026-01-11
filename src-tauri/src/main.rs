// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use sysinfo::{NetworkExt, System, SystemExt, CpuExt, DiskExt, ProcessExt};
use get_if_addrs::{get_if_addrs, IfAddr, Ifv4Addr, Ifv6Addr};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

#[tauri::command]
fn get_username() -> String {
    std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| String::from("User"))
}

#[tauri::command]
fn open_path_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
        Ok(())
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
        Ok(())
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
        Ok(())
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Opening paths is not supported on this platform".to_string())
    }
}

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
    type_: String, // <-- Add this field
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
    frequency: Option<u64>,
    threads: Option<u32>,        // <-- Add this
    temperature: Option<f32>,    // <-- Add this
    processes: Option<usize>,
    handles: Option<usize>,
    uptime: Option<u64>,
}

#[derive(Serialize)]
struct GpuInfo {
    #[serde(rename = "name")]
    name: String,
    #[serde(rename = "adapter_ram")]
    ram: Option<u32>,
    #[serde(rename = "driver_version")]
    driver_version: Option<String>,
    #[serde(rename = "vram_usage")]
    vram_usage: Option<u64>, // in bytes
}

#[derive(Serialize)]
struct SystemOverview {
    memory: MemoryInfo,
    cpu: CpuInfo,
    disks: Vec<DiskInfo>,
    gpus: Vec<GpuInfo>,
}

#[derive(Serialize)]
struct ProcessInfo {
    name: String,
    cpu: f32,
    memory: u64,
    pid: i32,
    exe: Option<String>,
    icon: Option<String>, // base64 PNG string or None
    runtime: Option<u64>, // runtime in seconds
}

#[derive(Serialize)]
struct NetworkInterface {
    name: String,
    status: String,
    bytes_received: u64,
    bytes_transmitted: u64,
    packets_received: u64,
    packets_transmitted: u64,
    errors: u64,
    drops: u64,
    ip_addresses: Vec<String>,      // NEW
    mac_address: Option<String>,    // NEW
    interface_type: Option<String>, // NEW
    link_speed_mbps: Option<u32>,   // NEW
    last_updated_unix: u64,         // NEW
}

#[derive(Serialize)]
struct NetworkInfo {
    interfaces: Vec<NetworkInterface>,
}

// If you plan to use AppState for process sampling,
// you can define and use it in your Tauri app as needed.

#[tauri::command]
fn fetch_system_overview() -> SystemOverview {
    let mut sys = System::new();
    sys.refresh_disks_list();
    sys.refresh_disks();
    sys.refresh_all();

    std::thread::sleep(std::time::Duration::from_millis(100));
    sys.refresh_cpu();

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
    let cpu_frequency;
    let cpu_threads;
    let cpu_temperature;
    
    #[cfg(target_os = "windows")]
    {
        let (wmi_freq, wmi_temp, wmi_threads) = fetch_cpu_wmi();
        cpu_frequency = wmi_freq.or(Some(sys.global_cpu_info().frequency() as u64));
        cpu_threads = wmi_threads.or(Some(num_cpus::get() as u32));
        cpu_temperature = wmi_temp;
    }
    
    #[cfg(target_os = "macos")]
    {
        cpu_frequency = Some(sys.global_cpu_info().frequency() as u64);
        cpu_threads = Some(num_cpus::get() as u32);
        cpu_temperature = fetch_cpu_temp_macos();
    }
    
    #[cfg(target_os = "linux")]
    {
        cpu_frequency = Some(sys.global_cpu_info().frequency() as u64);
        cpu_threads = Some(num_cpus::get() as u32);
        cpu_temperature = fetch_cpu_temp_linux();
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        cpu_frequency = Some(sys.global_cpu_info().frequency() as u64);
        cpu_threads = Some(num_cpus::get() as u32);
        cpu_temperature = None;
    }
    let cpu_processes = Some(sys.processes().len());
    let cpu_handles = None; // sysinfo does not provide handles
    let cpu_uptime = Some(sys.uptime());

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
            type_: format!("{:?}", disk.kind()), // <-- Use disk.kind() instead of disk.type_
        }
    }).collect();

    // GPU info - cross-platform
    let gpus = fetch_gpu_info();

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
            frequency: cpu_frequency,
            threads: cpu_threads,
            temperature: cpu_temperature,
            processes: cpu_processes,
            handles: cpu_handles,
            uptime: cpu_uptime,
        },
        disks,
        gpus, // Only main GPU included
    }
}

#[tauri::command]
fn fetch_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    sys.processes()
        .values()
        .map(|proc| {
            let exe_path = proc.exe().to_str().map(|s| s.to_string());
            let icon = exe_path
                .as_ref()
                .and_then(|path| extract_icon_base64(path).ok());
            let runtime = proc.run_time(); // Get runtime in seconds
            ProcessInfo {
                name: proc.name().to_string(),
                cpu: proc.cpu_usage(),
                memory: proc.memory() / 1024, // <-- Divide by 1024 to convert KB to MB
                pid: proc.pid().to_string().parse::<i32>().unwrap_or(0),
                exe: exe_path,
                icon,
                runtime: Some(runtime),
            }
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn extract_icon_base64(exe_path: &str) -> Result<String, ()> {
    use std::ptr;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::shellapi::ExtractIconW;
    use winapi::um::winuser::{GetIconInfo, DestroyIcon};
    use winapi::um::wingdi::{GetObjectW, BITMAP, BITMAPINFOHEADER, BITMAPINFO, DIB_RGB_COLORS, CreateCompatibleDC, SelectObject, DeleteDC, DeleteObject, GetDIBits};
    
    use winapi::um::winnt::HANDLE;
    use image::{ImageBuffer, Rgba};
    use base64::engine::general_purpose;
    use base64::Engine;
    use image::codecs::png::PngEncoder;
    use image::ImageEncoder;
    use std::ffi::c_void;

    // Convert exe_path to wide string
    let wide: Vec<u16> = OsStr::new(exe_path).encode_wide().chain(Some(0)).collect();

    unsafe {
        // Extract the first icon from the executable
        let hicon = ExtractIconW(ptr::null_mut(), wide.as_ptr(), 0);
        if hicon.is_null() || hicon as usize <= 1 {
            return Err(());
        }

        let mut icon_info = std::mem::zeroed();
        if GetIconInfo(hicon, &mut icon_info) == 0 {
            DestroyIcon(hicon);
            return Err(());
        }

        let mut bmp: BITMAP = std::mem::zeroed();
        if GetObjectW(icon_info.hbmColor as HANDLE, std::mem::size_of::<BITMAP>() as i32, &mut bmp as *mut _ as *mut _) == 0 {
            DestroyIcon(hicon);
            DeleteObject(icon_info.hbmColor as *mut c_void);
            DeleteObject(icon_info.hbmMask as *mut c_void);
            return Err(());
        }

        let width = bmp.bmWidth as u32;
        let height = bmp.bmHeight as u32;

        let bi = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width as i32,
            biHeight: height as i32,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: 0, // BI_RGB
            biSizeImage: 0,
            biXPelsPerMeter: 0,
            biYPelsPerMeter: 0,
            biClrUsed: 0,
            biClrImportant: 0,
        };

        let mut pixels = vec![0u8; (width * height * 4) as usize];

        let hdc = CreateCompatibleDC(ptr::null_mut());
        SelectObject(hdc, icon_info.hbmColor as *mut c_void);

        let res = GetDIBits(
            hdc,
            icon_info.hbmColor,
            0,
            height as u32,
            pixels.as_mut_ptr() as *mut _,
            &mut BITMAPINFO { bmiHeader: bi, bmiColors: [std::mem::zeroed()] },
            DIB_RGB_COLORS,
        );
        DeleteDC(hdc);
        DeleteObject(icon_info.hbmColor as *mut c_void);
        DeleteObject(icon_info.hbmMask as *mut c_void);
        DestroyIcon(hicon);

        if res == 0 {
            return Err(());
        }

        // BGRA to RGBA and flip vertically
        let mut img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);
        for y in 0..height {
            for x in 0..width {
                let idx = ((height - 1 - y) * width + x) as usize * 4;
                let b = pixels[idx];
                let g = pixels[idx + 1];
                let r = pixels[idx + 2];
                let a = pixels[idx + 3];
                img.put_pixel(x, y, Rgba([r, g, b, a]));
            }
        }

        let mut buf = Vec::new();
        let encoder = PngEncoder::new(&mut buf);
        if encoder.write_image(
            &img,
            width,
            height,
            image::ColorType::Rgba8,
        ).is_ok() {
            Ok(general_purpose::STANDARD.encode(&buf))
        } else {
            Err(())
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn extract_icon_base64(exe_path: &str) -> Result<String, ()> {
    // macOS and Linux: Create a simple colored square as placeholder
    // In a production app, you'd integrate with platform-specific APIs
    use image::{ImageBuffer, Rgba};
    use base64::engine::general_purpose;
    use base64::Engine;
    use image::codecs::png::PngEncoder;
    use image::ImageEncoder;
    
    let width = 32u32;
    let height = 32u32;
    
    // Create a simple colored icon based on process name hash
    let color_hash = exe_path.bytes().fold(0u8, |acc, b| acc.wrapping_add(b));
    let r = color_hash;
    let g = color_hash.wrapping_mul(2);
    let b = color_hash.wrapping_mul(3);
    
    let mut img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);
    for y in 0..height {
        for x in 0..width {
            // Create a simple gradient effect
            let alpha = if x < 2 || y < 2 || x >= width - 2 || y >= height - 2 {
                180u8
            } else {
                255u8
            };
            img.put_pixel(x, y, Rgba([r, g, b, alpha]));
        }
    }
    
    let mut buf = Vec::new();
    let encoder = PngEncoder::new(&mut buf);
    if encoder.write_image(
        &img,
        width,
        height,
        image::ColorType::Rgba8,
    ).is_ok() {
        Ok(general_purpose::STANDARD.encode(&buf))
    } else {
        Err(())
    }
}

#[tauri::command]
fn fetch_network_info() -> NetworkInfo {
    let mut sys = System::new();
    sys.refresh_networks_list();
    
    // Refresh twice to get accurate deltas
    sys.refresh_networks();
    std::thread::sleep(std::time::Duration::from_millis(100));
    sys.refresh_networks();

    // collect addresses per interface name (flattened)
    let mut addrs: Vec<(String, String)> = Vec::new();
    if let Ok(if_addrs) = get_if_addrs() {
        for iface in if_addrs {
            match iface.addr {
                IfAddr::V4(Ifv4Addr { ip, .. }) => {
                    addrs.push((iface.name.clone(), ip.to_string()))
                }
                IfAddr::V6(Ifv6Addr { ip, .. }) => {
                    addrs.push((iface.name.clone(), ip.to_string()))
                }
            }
        }
    }

    // normalizer: remove non-alphanumeric and lowercase for fuzzy matching
    fn norm(s: &str) -> String {
        s.chars().filter(|c| c.is_alphanumeric()).collect::<String>().to_lowercase()
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let mut interfaces = Vec::new();

    for (name, data) in sys.networks() {
        // Get total cumulative bytes (these are totals since interface was up)
        let bytes_received = data.total_received();
        let bytes_transmitted = data.total_transmitted();
        
        let packets_received = data.total_packets_received();
        let packets_transmitted = data.total_packets_transmitted();
        let errors = data.total_errors_on_received() + data.total_errors_on_transmitted();
        let drops = 0u64;

        // fuzzy-match addresses collected from get_if_addrs
        let n_norm = norm(name);
        let mut ip_addresses: Vec<String> = addrs
            .iter()
            .filter_map(|(iface_name, ip)| {
                let i_norm = norm(iface_name);
                if i_norm == n_norm || i_norm.contains(&n_norm) || n_norm.contains(&i_norm) {
                    Some(ip.clone())
                } else {
                    None
                }
            })
            .collect();

        // looser match if nothing
        if ip_addresses.is_empty() {
            ip_addresses = addrs
                .iter()
                .filter_map(|(iface_name, ip)| {
                    let i_norm = norm(iface_name);
                    if i_norm.starts_with(&n_norm) || i_norm.ends_with(&n_norm) || n_norm.starts_with(&i_norm) || n_norm.ends_with(&i_norm) {
                        Some(ip.clone())
                    } else {
                        None
                    }
                })
                .collect();
        }

        // final fallback: include all non-loopback addresses (so UI sees something)
        if ip_addresses.is_empty() {
            ip_addresses = addrs
                .iter()
                .filter_map(|(_, ip)| {
                    if !ip.starts_with("127.") && !ip.starts_with("::1") { Some(ip.clone()) } else { None }
                })
                .collect();
        }

        ip_addresses.sort();
        ip_addresses.dedup();

        let status = if !ip_addresses.is_empty() { "Connected".to_string() } else { "Disconnected".to_string() };

        interfaces.push(NetworkInterface {
            name: name.to_string(),
            status,
            bytes_received,
            bytes_transmitted,
            packets_received,
            packets_transmitted,
            errors,
            drops,
            ip_addresses,
            mac_address: None,
            interface_type: None,
            link_speed_mbps: None,
            last_updated_unix: now,
        });
    }

    NetworkInfo { interfaces }
}

#[tauri::command]
fn end_process(pid: i32) -> Result<(), String> {
    let mut sys = System::new_all();
    sys.refresh_processes();
    let sys_pid = sysinfo::Pid::from(pid as usize);
    if let Some(process) = sys.process(sys_pid) {
        process.kill();
        Ok(())
    } else {
        // Treat "not found" as success (already ended)
        Ok(())
    }
}

#[tauri::command]
fn get_disk_health(disk_path: String) -> Option<String> {
    use std::process::Command;
    let output = Command::new("smartctl")
        .args(&["-H", &disk_path])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.contains("SMART overall-health self-assessment test result") {
            return Some(line.trim().to_string());
        }
    }
    None
}
#[allow(dead_code)]
#[tauri::command]
fn check_alerts(cpu_threshold: f32, ram_threshold: f64, disk_threshold: f64) -> Vec<String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut alerts = Vec::new();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    if cpu_usage > cpu_threshold {
        alerts.push(format!("High CPU usage: {:.1}%", cpu_usage));
    }

    let total_memory = sys.total_memory() as f64;
    let used_memory = sys.used_memory() as f64;
    let ram_usage = if total_memory > 0.0 { (used_memory / total_memory) * 100.0 } else { 0.0 };
    if ram_usage > ram_threshold {
        alerts.push(format!("Memory critically low: {:.1}%", ram_usage));
    }

    for disk in sys.disks() {
        let total = disk.total_space() as f64;
        let used = (total - disk.available_space() as f64) / total * 100.0;
        if used > disk_threshold {
            alerts.push(format!(
                "Disk {} space critically low: {:.1}%",
                disk.name().to_string_lossy(),
                used
            ));
        }
    }

    alerts
}

#[derive(Serialize, Clone, Debug)]
struct PerformanceLog {
    timestamp: String,
    cpu_usage: f32,
    memory_usage: u64,
    memory_total: u64,
    disk_usage: u64,
    disk_total: u64,
}

struct PerformanceLoggerState {
    logs: Vec<PerformanceLog>,
    is_logging: bool,
    handle: Option<thread::JoinHandle<()>>,
}

type LoggerState = Arc<Mutex<PerformanceLoggerState>>;

#[tauri::command]
fn start_performance_logging(
    state: tauri::State<LoggerState>,
    interval_secs: u64,
) -> Result<(), String> {
    let mut logger = state.lock().unwrap();
    
    if logger.is_logging {
        return Err("Logging is already active".to_string());
    }
    
    logger.is_logging = true;
    let state_clone = Arc::clone(&state.inner());
    
    let handle = thread::spawn(move || {
        loop {
            {
                let logger = state_clone.lock().unwrap();
                if !logger.is_logging {
                    break;
                }
            }
            
            // Collect performance data
            let mut sys = System::new_all();
            sys.refresh_all();
            thread::sleep(Duration::from_millis(100));
            sys.refresh_cpu();
            
            let cpu_usage = sys.global_cpu_info().cpu_usage();
            let memory_usage = sys.used_memory();
            let memory_total = sys.total_memory();
            
            let (disk_usage, disk_total) = sys.disks().iter().fold((0u64, 0u64), |(used, total), disk| {
                (used + (disk.total_space() - disk.available_space()), total + disk.total_space())
            });
            
            let log = PerformanceLog {
                timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                cpu_usage,
                memory_usage,
                memory_total,
                disk_usage,
                disk_total,
            };
            
            {
                let mut logger = state_clone.lock().unwrap();
                logger.logs.push(log);
            }
            
            thread::sleep(Duration::from_secs(interval_secs));
        }
    });
    
    logger.handle = Some(handle);
    Ok(())
}

#[tauri::command]
fn stop_performance_logging(state: tauri::State<LoggerState>) -> Result<(), String> {
    let mut logger = state.lock().unwrap();
    logger.is_logging = false;
    Ok(())
}

#[tauri::command]
fn get_performance_logs(state: tauri::State<LoggerState>) -> Vec<PerformanceLog> {
    let logger = state.lock().unwrap();
    logger.logs.clone()
}

#[tauri::command]
fn clear_performance_logs(state: tauri::State<LoggerState>) -> Result<(), String> {
    let mut logger = state.lock().unwrap();
    if logger.is_logging {
        return Err("Cannot clear logs while logging is active".to_string());
    }
    logger.logs.clear();
    Ok(())
}

#[tauri::command]
fn is_performance_logging_active(state: tauri::State<LoggerState>) -> bool {
    let logger = state.lock().unwrap();
    logger.is_logging
}

#[derive(Serialize)]
struct LogEntry {
    timestamp: String,
    level: String,
    source: String,
    message: String,
}

#[tauri::command]
fn fetch_system_logs() -> Vec<LogEntry> {
    let mut logs = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // Get recent system and application logs from Windows Event Viewer
        let output = Command::new("powershell")
            .args(&[
                "-Command",
                "Get-EventLog -LogName System -Newest 50 | Select-Object TimeGenerated, EntryType, Source, Message | ConvertTo-Json"
            ])
            .output();
        
        if let Ok(output) = output {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(events) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(array) = events.as_array() {
                        for event in array {
                            let timestamp = event["TimeGenerated"]
                                .as_str()
                                .unwrap_or("Unknown")
                                .to_string();
                            let level = event["EntryType"]
                                .as_str()
                                .unwrap_or("Info")
                                .to_string();
                            let source = event["Source"]
                                .as_str()
                                .unwrap_or("System")
                                .to_string();
                            let message = event["Message"]
                                .as_str()
                                .unwrap_or("")
                                .to_string();
                            
                            logs.push(LogEntry {
                                timestamp,
                                level: match level.as_str() {
                                    "Error" => "Error".to_string(),
                                    "Warning" => "Warning".to_string(),
                                    _ => "Info".to_string(),
                                },
                                source,
                                message: message.chars().take(200).collect(),
                            });
                        }
                    }
                }
            }
        }
        
        // Get application logs as well
        let app_output = Command::new("powershell")
            .args(&[
                "-Command",
                "Get-EventLog -LogName Application -Newest 50 | Select-Object TimeGenerated, EntryType, Source, Message | ConvertTo-Json"
            ])
            .output();
        
        if let Ok(output) = app_output {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(events) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(array) = events.as_array() {
                        for event in array {
                            let timestamp = event["TimeGenerated"]
                                .as_str()
                                .unwrap_or("Unknown")
                                .to_string();
                            let level = event["EntryType"]
                                .as_str()
                                .unwrap_or("Info")
                                .to_string();
                            let source = event["Source"]
                                .as_str()
                                .unwrap_or("Application")
                                .to_string();
                            let message = event["Message"]
                                .as_str()
                                .unwrap_or("")
                                .to_string();
                            
                            logs.push(LogEntry {
                                timestamp,
                                level: match level.as_str() {
                                    "Error" => "Error".to_string(),
                                    "Warning" => "Warning".to_string(),
                                    _ => "Info".to_string(),
                                },
                                source,
                                message: message.chars().take(200).collect(),
                            });
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        use std::fs::File;
        use std::io::{BufRead, BufReader};
        
        // Try to read from common log locations on Unix-like systems
        let log_paths = vec![
            "/var/log/syslog",
            "/var/log/system.log",
            "/var/log/messages",
        ];
        
        for path in log_paths {
            if let Ok(file) = File::open(path) {
                let reader = BufReader::new(file);
                let lines: Vec<String> = reader.lines()
                    .filter_map(|l| l.ok())
                    .rev()
                    .take(50)
                    .collect();
                
                for line in lines {
                    // Parse typical syslog format
                    let parts: Vec<&str> = line.splitn(4, ' ').collect();
                    if parts.len() >= 4 {
                        logs.push(LogEntry {
                            timestamp: format!("{} {} {}", parts[0], parts[1], parts[2]),
                            level: "Info".to_string(),
                            source: path.to_string(),
                            message: parts[3].chars().take(200).collect(),
                        });
                    }
                }
                break;
            }
        }
    }
    
    // Sort logs by timestamp (most recent first)
    logs.reverse();
    logs
}

#[tauri::command]
fn launch_system_utility(utility: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        let result = Command::new("cmd")
            .args(&["/C", &utility])
            .spawn();
            
        match result {
            Ok(_) => Ok(format!("Launched {}", utility)),
            Err(e) => Err(format!("Failed to launch {}: {}", utility, e))
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("System utilities are only available on Windows".to_string())
    }
}

// Cross-platform GPU detection
fn fetch_gpu_info() -> Vec<GpuInfo> {
    #[cfg(target_os = "windows")]
    {
        let all_gpus = fetch_gpus_dxgi();
        if let Some(main_gpu) = all_gpus.into_iter().next() {
            vec![main_gpu]
        } else {
            vec![]
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        fetch_gpus_macos()
    }
    
    #[cfg(target_os = "linux")]
    {
        fetch_gpus_linux()
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        vec![]
    }
}

// macOS GPU detection
#[cfg(target_os = "macos")]
fn fetch_gpus_macos() -> Vec<GpuInfo> {
    use std::process::Command;
    
    let mut gpus = Vec::new();
    
    // Use system_profiler to get GPU info
    if let Ok(output) = Command::new("system_profiler")
        .args(&["SPDisplaysDataType", "-json"])
        .output()
    {
        if let Ok(json_str) = String::from_utf8(output.stdout) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if let Some(displays) = data["SPDisplaysDataType"].as_array() {
                    for display in displays {
                        if let Some(name) = display["sppci_model"].as_str() {
                            let vram = display["sppci_vram"].as_str()
                                .and_then(|v| v.split_whitespace().next())
                                .and_then(|v| v.parse::<u32>().ok());
                            
                            gpus.push(GpuInfo {
                                name: name.to_string(),
                                ram: vram,
                                driver_version: None,
                                vram_usage: None,
                            });
                        }
                    }
                }
            }
        }
    }
    
    if gpus.is_empty() {
        // Fallback: at least provide a generic GPU entry
        gpus.push(GpuInfo {
            name: "GPU".to_string(),
            ram: None,
            driver_version: None,
            vram_usage: None,
        });
    }
    
    gpus
}

// Linux GPU detection
#[cfg(target_os = "linux")]
fn fetch_gpus_linux() -> Vec<GpuInfo> {
    use std::process::Command;
    use std::fs;
    
    let mut gpus = Vec::new();
    
    // Try lspci first
    if let Ok(output) = Command::new("lspci").output() {
        if let Ok(output_str) = String::from_utf8(output.stdout) {
            for line in output_str.lines() {
                if line.contains("VGA") || line.contains("3D") || line.contains("Display") {
                    let name = line.split(':').skip(2).collect::<Vec<_>>().join(":").trim().to_string();
                    if !name.is_empty() {
                        gpus.push(GpuInfo {
                            name,
                            ram: None,
                            driver_version: None,
                            vram_usage: None,
                        });
                    }
                }
            }
        }
    }
    
    // Try to get VRAM info from /sys for NVIDIA/AMD
    if let Ok(entries) = fs::read_dir("/sys/class/drm") {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if name_str.starts_with("card") && !name_str.contains('-') {
                    // Try to read memory info
                    let mem_path = path.join("device/mem_info_vram_total");
                    if let Ok(mem_str) = fs::read_to_string(mem_path) {
                        if let Ok(mem_bytes) = mem_str.trim().parse::<u64>() {
                            if let Some(gpu) = gpus.first_mut() {
                                gpu.ram = Some((mem_bytes / 1024 / 1024) as u32);
                            }
                        }
                    }
                }
            }
        }
    }
    
    if gpus.is_empty() {
        gpus.push(GpuInfo {
            name: "GPU".to_string(),
            ram: None,
            driver_version: None,
            vram_usage: None,
        });
    }
    
    gpus
}

// macOS CPU temperature
#[cfg(target_os = "macos")]
fn fetch_cpu_temp_macos() -> Option<f32> {
    use std::process::Command;
    
    // Try using powermetrics (requires sudo, may not work)
    if let Ok(output) = Command::new("sudo")
        .args(&["powermetrics", "--samplers", "smc", "-i1", "-n1"])
        .output()
    {
        if let Ok(output_str) = String::from_utf8(output.stdout) {
            for line in output_str.lines() {
                if line.contains("CPU die temperature") {
                    if let Some(temp_str) = line.split(':').nth(1) {
                        if let Ok(temp) = temp_str.trim().trim_end_matches('C').trim().parse::<f32>() {
                            return Some(temp);
                        }
                    }
                }
            }
        }
    }
    
    None
}

// Linux CPU temperature
#[cfg(target_os = "linux")]
fn fetch_cpu_temp_linux() -> Option<f32> {
    use std::fs;
    
    // Try common thermal zones
    let thermal_paths = vec![
        "/sys/class/thermal/thermal_zone0/temp",
        "/sys/class/thermal/thermal_zone1/temp",
        "/sys/class/hwmon/hwmon0/temp1_input",
        "/sys/class/hwmon/hwmon1/temp1_input",
    ];
    
    for path in thermal_paths {
        if let Ok(temp_str) = fs::read_to_string(path) {
            if let Ok(temp_millidegrees) = temp_str.trim().parse::<i32>() {
                return Some(temp_millidegrees as f32 / 1000.0);
            }
        }
    }
    
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    let logger_state = Arc::new(Mutex::new(PerformanceLoggerState {
        logs: Vec::new(),
        is_logging: false,
        handle: None,
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(logger_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_username,
            fetch_system_overview,
            fetch_processes,
            fetch_network_info,
            end_process,
            get_disk_health,
            clean_storage,
            fetch_system_logs,
            start_performance_logging,
            stop_performance_logging,
            get_performance_logs,
            clear_performance_logs,
            is_performance_logging_active,
            launch_system_utility,
            run_speed_test,
            open_path_in_explorer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn fetch_gpus_dxgi() -> Vec<GpuInfo> {
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, IDXGIFactory1, IDXGIAdapter1, IDXGIAdapter3, DXGI_ADAPTER_DESC1,
        DXGI_QUERY_VIDEO_MEMORY_INFO, DXGI_MEMORY_SEGMENT_GROUP_LOCAL,
    };
    use windows::core::{Result, Interface};

    let mut gpus = Vec::new();
    unsafe {
        let factory: IDXGIFactory1 = CreateDXGIFactory1::<IDXGIFactory1>().unwrap();
        let mut i = 0;
        loop {
            let adapter: Result<IDXGIAdapter1> = factory.EnumAdapters1(i);
            if let Ok(adapter) = adapter {
                let mut desc: DXGI_ADAPTER_DESC1 = std::mem::zeroed();
                if adapter.GetDesc1(&mut desc).is_ok() {
                    let name = String::from_utf16_lossy(
                        &desc.Description
                            .iter()
                            .take_while(|&&c| c != 0)
                            .cloned()
                            .collect::<Vec<u16>>(),
                    );
                    let ram = Some(desc.DedicatedVideoMemory as u32);

                    let mut vram_usage: Option<u64> = None;
                    if let Ok(adapter3) = adapter.cast::<IDXGIAdapter3>() {
                        let mut info: DXGI_QUERY_VIDEO_MEMORY_INFO = std::mem::zeroed();
                        if adapter3.QueryVideoMemoryInfo(
                            0,
                            DXGI_MEMORY_SEGMENT_GROUP_LOCAL,
                            &mut info,
                        ).is_ok() {
                            vram_usage = Some(info.CurrentUsage);
                        }
                    }

                    gpus.push(GpuInfo {
                        name,
                        ram,
                        driver_version: None,
                        vram_usage,
                    });
                }
                i += 1;
            } else {
                break;
            }
        }
    }
    gpus
}

#[cfg(target_os = "windows")]
fn fetch_cpu_wmi() -> (Option<u64>, Option<f32>, Option<u32>) {
    use wmi::{COMLibrary, WMIConnection};
    use serde::Deserialize;

    #[derive(Deserialize, Debug)]
    struct Win32Processor {
        #[serde(rename = "CurrentClockSpeed")]
        current_clock_speed: Option<u64>,
        #[serde(rename = "NumberOfLogicalProcessors")]
        number_of_logical_processors: Option<u32>,
    }

    #[derive(Deserialize, Debug)]
    struct MsacpiThermalZoneTemperature {
        #[serde(rename = "CurrentTemperature")]
        current_temperature: Option<u32>,
    }

    let mut speed = None;
    let mut threads = None;
    let mut temp = None;

    if let Ok(com_con) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_con.into()) {
            // CPU speed and threads
            if let Ok(results) = wmi_con.query::<Win32Processor>() {
                if let Some(cpu) = results.first() {
                    speed = cpu.current_clock_speed;
                    threads = cpu.number_of_logical_processors;
                }
            }
            // CPU temperature (in tenths of Kelvin)
            if let Ok(results) = wmi_con.query::<MsacpiThermalZoneTemperature>() {
                if let Some(zone) = results.first() {
                    if let Some(raw_temp) = zone.current_temperature {
                        // Convert tenths of Kelvin to Celsius
                        temp = Some((raw_temp as f32 / 10.0) - 273.15);
                    }
                }
            }
        }
    }
    (speed, temp, threads)
}

#[tauri::command]
fn clean_storage() -> Result<String, String> {
    use std::fs;
    use std::env;
    use std::process::Command;

    // Clean Temp folder (cross-platform)
    let temp_dir = env::temp_dir();
    let mut temp_deleted = 0;
    if let Ok(entries) = fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let _ = if path.is_dir() {
                fs::remove_dir_all(&path)
            } else {
                fs::remove_file(&path)
            };
            temp_deleted += 1;
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Clean Recycle Bin using PowerShell
        let output = Command::new("powershell")
            .args(&["-Command", "Clear-RecycleBin -Force"])
            .output();

        let recycle_result = match output {
            Ok(_) => "Recycle Bin emptied.",
            Err(_) => "Failed to empty Recycle Bin.",
        };

        Ok(format!(
            "Cleaned {} items from Temp folder. {}",
            temp_deleted, recycle_result
        ))
    }
    
    #[cfg(target_os = "macos")]
    {
        // Empty Trash on macOS
        let output = Command::new("rm")
            .args(&["-rf", "~/.Trash/*"])
            .output();

        let trash_result = match output {
            Ok(_) => "Trash emptied.",
            Err(_) => "Failed to empty Trash.",
        };

        Ok(format!(
            "Cleaned {} items from Temp folder. {}",
            temp_deleted, trash_result
        ))
    }
    
    #[cfg(target_os = "linux")]
    {
        // Empty Trash on Linux
        let home_dir = env::var("HOME").unwrap_or_default();
        let trash_path = format!("{}/.local/share/Trash", home_dir);
        let output = Command::new("rm")
            .args(&["-rf", &format!("{}/files/*", trash_path)])
            .output();

        let trash_result = match output {
            Ok(_) => "Trash emptied.",
            Err(_) => "Failed to empty Trash.",
        };

        Ok(format!(
            "Cleaned {} items from Temp folder. {}",
            temp_deleted, trash_result
        ))
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(format!("Cleaned {} items from Temp folder.", temp_deleted))
    }
}

#[derive(Serialize)]
struct SpeedTestResult {
    download_mbps: f64,
    upload_mbps: f64,
    latency_ms: u64,
    status: String,
}

#[tauri::command]
fn run_speed_test() -> Result<SpeedTestResult, String> {
    use std::time::Instant;
    
    // Use larger test files for better accuracy on fast connections
    let download_url = "http://ipv4.download.thinkbroadband.com/50MB.zip";
    
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Measure latency with multiple pings and average
    let mut latency_sum = 0u64;
    let ping_count = 3;
    for _ in 0..ping_count {
        let start_latency = Instant::now();
        if client.head("http://www.google.com").send().is_ok() {
            latency_sum += start_latency.elapsed().as_millis() as u64;
        }
    }
    let latency = latency_sum / ping_count;
    
    // Download test (50MB for more accurate measurement)
    let start_download = Instant::now();
    let response = client
        .get(download_url)
        .send()
        .map_err(|e| format!("Download test failed: {}", e))?;
    
    let bytes = response
        .bytes()
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    let download_duration = start_download.elapsed().as_secs_f64();
    let download_mbps = if download_duration > 0.0 {
        (bytes.len() as f64 * 8.0) / (download_duration * 1_000_000.0)
    } else {
        0.0
    };
    
    // Upload test (2MB for better accuracy)
    let upload_data = vec![0u8; 2 * 1024 * 1024];
    let start_upload = Instant::now();
    
    let upload_mbps = match client
        .post("https://httpbin.org/post")
        .body(upload_data.clone())
        .send()
    {
        Ok(_) => {
            let upload_duration = start_upload.elapsed().as_secs_f64();
            if upload_duration > 0.0 {
                (upload_data.len() as f64 * 8.0) / (upload_duration * 1_000_000.0)
            } else {
                0.0
            }
        }
        Err(_) => 0.0,
    };
    
    Ok(SpeedTestResult {
        download_mbps,
        upload_mbps,
        latency_ms: latency,
        status: "completed".to_string(),
    })
}

