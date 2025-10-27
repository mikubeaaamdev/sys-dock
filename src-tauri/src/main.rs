// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use sysinfo::{NetworkExt, System, SystemExt, CpuExt, DiskExt, ProcessExt};
use get_if_addrs::{get_if_addrs, IfAddr, Ifv4Addr, Ifv6Addr}; // Add this
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
}

#[derive(Serialize)]
struct NetworkInterface {
    name: String,
    status: String,
    bytes_received: u64,
    bytes_transmitted: u64,
    ip_addresses: Vec<String>,      // NEW
    mac_address: Option<String>,    // NEW
    interface_type: Option<String>, // NEW
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

    // Wait a short time and refresh CPU again for accurate usage
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

    // GPU info via DXGI (Windows only)
    let gpus = if cfg!(target_os = "windows") {
        let all_gpus = fetch_gpus_dxgi();
        // Only keep the first GPU (main GPU)
        if let Some(main_gpu) = all_gpus.into_iter().next() {
            vec![main_gpu]
        } else {
            vec![]
        }
    } else {
        vec![]
    };

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
            ProcessInfo {
                name: proc.name().to_string(),
                cpu: proc.cpu_usage(),
                memory: proc.memory() / 1024, // <-- Divide by 1024 to convert KB to MB
                pid: proc.pid().to_string().parse::<i32>().unwrap_or(0),
                exe: exe_path,
                icon,
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
fn extract_icon_base64(_exe_path: &str) -> Result<String, ()> {
    Err(())
}

#[tauri::command]
fn fetch_network_info() -> NetworkInfo {
    let mut sys = System::new_all();
    sys.refresh_networks_list();
    sys.refresh_networks();

    let mut interfaces = Vec::new();

    // Collect IPs, MAC, and type using get_if_addrs
    let if_addrs = get_if_addrs().unwrap_or_default();

    for (name, data) in sys.networks() {
        let status = if data.received() > 0 || data.transmitted() > 0 {
            "Connected".to_string()
        } else {
            "Disconnected".to_string()
        };

        // Find matching interface info
        let mut ip_addresses = Vec::new();
        let mac_address: Option<String> = None;
        let interface_type: Option<String> = None;

        for iface in &if_addrs {
            if iface.name == *name {
                match &iface.addr {
                    IfAddr::V4(Ifv4Addr { ip, .. }) => ip_addresses.push(ip.to_string()),
                    IfAddr::V6(Ifv6Addr { ip, .. }) => ip_addresses.push(ip.to_string()),
                }
                // MAC and interface_type not available from get_if_addrs
            }
        }

        interfaces.push(NetworkInterface {
            name: name.to_string(),
            status,
            bytes_received: data.received(),
            bytes_transmitted: data.transmitted(),
            ip_addresses,
            mac_address,         // Not available
            interface_type,      // Not available
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_system_overview,
            fetch_processes,
            fetch_network_info,
            end_process // <-- Add this line
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
