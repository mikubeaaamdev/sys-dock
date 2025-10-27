import React from "react";
import "./Settings.css";
import { useTheme } from "../context/ThemeContext";

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();

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
          <input type="checkbox" checked disabled />
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
    </div>
  );
};

export default Settings;