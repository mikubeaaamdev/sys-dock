# Cross-Platform Support

## Overview
SysDock now supports **Windows, macOS, and Linux** with full or partial functionality for all major features.

## Feature Compatibility Matrix

| Feature | Windows | macOS | Linux | Notes |
|---------|---------|-------|-------|-------|
| **CPU Monitoring** | ✅ Full | ✅ Full | ✅ Full | Usage, cores, threads, frequency |
| **CPU Temperature** | ✅ WMI | ✅ powermetrics | ✅ thermal zones | Requires permissions on macOS |
| **CPU Frequency** | ✅ WMI | ✅ sysinfo | ✅ sysinfo | Real-time frequency |
| **Memory Monitoring** | ✅ Full | ✅ Full | ✅ Full | Total, used, available |
| **Disk Monitoring** | ✅ Full | ✅ Full | ✅ Full | Usage, capacity, type |
| **GPU Information** | ✅ DXGI | ✅ system_profiler | ✅ lspci | Name, VRAM where available |
| **Network Monitoring** | ✅ Full | ✅ Full | ✅ Full | Interfaces, rates, stats |
| **Process List** | ✅ Full | ✅ Full | ✅ Full | Name, CPU, memory, PID |
| **Process Icons** | ✅ Native | ⚠️ Generated | ⚠️ Generated | Windows uses real icons, others use colored placeholders |
| **Storage Cleanup** | ✅ Temp + Recycle Bin | ✅ Temp + Trash | ✅ Temp + Trash | Platform-specific trash handling |
| **Network Speed Test** | ✅ Full | ✅ Full | ✅ Full | Cross-platform HTTP-based |
| **File Explorer** | ✅ explorer | ✅ open | ✅ xdg-open | Opens system file manager |

## Platform-Specific Implementation Details

### Windows
- **CPU Temperature**: Uses WMI (`MsacpiThermalZoneTemperature`)
- **CPU Frequency**: Uses WMI (`Win32_Processor`)
- **GPU**: DirectX DXGI API for detailed GPU information
- **Process Icons**: Extracts real icons from executables using WinAPI
- **Storage Cleanup**: PowerShell `Clear-RecycleBin` + temp folder
- **Dependencies**: `wmi`, `winapi`, `windows` crates

### macOS
- **CPU Temperature**: Uses `powermetrics` (may require sudo)
- **CPU Frequency**: Uses sysinfo library
- **GPU**: `system_profiler SPDisplaysDataType` JSON parsing
- **Process Icons**: Generated colored placeholders based on process name
- **Storage Cleanup**: `rm -rf ~/.Trash/*` + temp folder
- **File Explorer**: `open` command
- **Dependencies**: `core-foundation`, `io-kit-sys` crates

### Linux
- **CPU Temperature**: Reads from `/sys/class/thermal/thermal_zone*/temp` or `/sys/class/hwmon/hwmon*/temp1_input`
- **CPU Frequency**: Uses sysinfo library
- **GPU**: `lspci` parsing + `/sys/class/drm` for VRAM info
- **Process Icons**: Generated colored placeholders based on process name
- **Storage Cleanup**: `rm -rf ~/.local/share/Trash/files/*` + temp folder
- **File Explorer**: `xdg-open` command
- **Dependencies**: Standard system utilities

## Building for Each Platform

### Windows
```bash
npm run tauri build
```

### macOS
```bash
# Apple Silicon
npm run tauri build -- --target aarch64-apple-darwin

# Intel
npm run tauri build -- --target x86_64-apple-darwin
```

### Linux
```bash
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## Known Limitations

### macOS
- CPU temperature requires `powermetrics` which may need elevated permissions
- GPU VRAM usage not available through `system_profiler`
- Process icons are generated placeholders, not real app icons

### Linux
- CPU temperature location varies by system (multiple fallback paths implemented)
- GPU detection depends on `lspci` being installed
- Process icons are generated placeholders, not real app icons
- VRAM info only available for AMD/NVIDIA cards with proper drivers

## Dependencies

The application uses platform-specific dependencies managed through Cargo's target-specific configuration:

```toml
[target.'cfg(target_os = "windows")'.dependencies]
wmi = "0.10"
winapi = { version = "0.3", features = ["winuser", "wingdi", "shellapi"] }
windows = { version = "0.54", features = ["Win32_Graphics_Dxgi", ...] }

[target.'cfg(target_os = "macos")'.dependencies]
core-foundation = "0.9"
io-kit-sys = "0.4"
```

This ensures platform-specific code only compiles on the target platform.

## Testing

To test cross-platform functionality:

1. **Windows**: All features should work out of the box
2. **macOS**: Run with `sudo` if CPU temperature is critical, or accept N/A values
3. **Linux**: Ensure `lspci` is installed for GPU detection

## Future Enhancements

- [ ] Real app icons on macOS using `.app` bundle info
- [ ] Real app icons on Linux using `.desktop` files
- [ ] GPU usage monitoring on macOS/Linux
- [ ] More reliable CPU temperature on macOS (without sudo requirement)
- [ ] GPU temperature on all platforms
