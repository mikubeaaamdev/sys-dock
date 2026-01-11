import React, { useState, useEffect } from "react";
import "./Settings.css";
import { useTheme } from "../context/ThemeContext";
import { useAlert } from "../context/AlertContext";

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { enabled, setEnabled } = useAlert();
  const [revealIps, setRevealIps] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('reveal_ips') === 'true';
  });

  const [autoStartLogging, setAutoStartLogging] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('auto_start_logging') === 'true';
  });

  useEffect(() => {
    try { localStorage.setItem('reveal_ips', String(revealIps)); } catch { /* ignore */ }
  }, [revealIps]);

  useEffect(() => {
    try { localStorage.setItem('auto_start_logging', String(autoStartLogging)); } catch { /* ignore */ }
  }, [autoStartLogging]);

  return (
    <div className="settings-container">
      <h2>SETTINGS</h2>
      <div className="settings-section">
        <h3>General</h3>
        <div className="settings-row">
          <span>Theme:</span>
          <select value={theme} onChange={e => setTheme(e.target.value as any)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Default/System</option>
          </select>
        </div>
        <div className="settings-row">
          <span>Language:</span>
          <select disabled>
            <option>English</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="settings-section">
        <h3>Performance & Monitoring</h3>
        <div className="settings-row">
          <span>Update Interval:</span>
          <input type="number" value={5} disabled /> sec
        </div>
        <div className="settings-row">
          <span>Enable Notifications:</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
        </div>
        <div className="settings-row">
          <span>Show IP addresses in Performance:</span>
          <input
            type="checkbox"
            checked={revealIps}
            onChange={e => setRevealIps(e.target.checked)}
          />
        </div>
        <div className="settings-row">
          <span>Auto-start Performance Logging on app launch:</span>
          <input
            type="checkbox"
            checked={autoStartLogging}
            onChange={e => setAutoStartLogging(e.target.checked)}
          />
        </div>
      </div>
      <div className="settings-section">
        <h3>Widgets</h3>
        <div className="settings-row">
          <span>Widget Refresh Rate:</span>
          <input type="number" value={30} disabled /> sec
        </div>
      </div>
      <div className="settings-section">
        <h3>About</h3>
        <div className="settings-row">
          <span>Version:</span>
          <span>v1.0.0</span>
        </div>
        <div className="settings-row">
          <span>Contact:</span>
          <span>support@sysdock.app</span>
        </div>
      </div>
      
      <div className="settings-section cross-platform-section">
        <h3>Cross-Platform Support</h3>
        <div className="platform-badges">
          <div className="platform-item">
            <span className="platform-label">Windows</span>
            <span className="platform-status">Supported</span>
          </div>
          <div className="platform-item">
            <span className="platform-label">macOS</span>
            <span className="platform-status">Supported</span>
          </div>
          <div className="platform-item">
            <span className="platform-label">Linux</span>
            <span className="platform-status">Supported</span>
          </div>
        </div>
        
        <div className="platform-details">
          <h4>Technology Stack</h4>
          <ul>
            <li>Frontend: React + TypeScript + Vite</li>
            <li>Backend: Rust + Tauri Framework</li>
            <li>System APIs: Cross-platform implementation</li>
          </ul>
          
          <h4>Platform-Specific Implementation</h4>
          <ul>
            <li><strong>Windows:</strong> WMI APIs for CPU temp/frequency, DXGI for GPU, native process icons</li>
            <li><strong>macOS:</strong> powermetrics for CPU temp, system_profiler for GPU, Core Foundation APIs</li>
            <li><strong>Linux:</strong> thermal zones for CPU temp, lspci for GPU detection, standard utilities</li>
          </ul>
          
          <p className="implementation-note">
            This application uses 21+ platform-specific code blocks with conditional compilation to ensure 
            optimal performance and native features on each operating system. Platform-specific dependencies 
            (wmi, winapi for Windows; core-foundation, io-kit-sys for macOS) are only compiled for their 
            target platforms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;