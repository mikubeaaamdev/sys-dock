import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './QuickControlsWidget.css';

const QuickControlsWidget: React.FC = () => {
  const [volume, setVolume] = useState(50);
  const [brightness, setBrightness] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isWifiOn, setIsWifiOn] = useState(true);
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);

  useEffect(() => {
    // Load initial states from localStorage
    const savedVolume = localStorage.getItem('sysdock-volume');
    const savedBrightness = localStorage.getItem('sysdock-brightness');
    if (savedVolume) setVolume(parseInt(savedVolume));
    if (savedBrightness) setBrightness(parseInt(savedBrightness));
  }, []);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('sysdock-volume', String(newVolume));
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
    // In a real implementation, you'd call a system API here
    // invoke('set_system_volume', { volume: newVolume }).catch(console.error);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);
    localStorage.setItem('sysdock-brightness', String(newBrightness));
    // invoke('set_system_brightness', { brightness: newBrightness }).catch(console.error);
  };

  const toggleWifi = async () => {
    setIsWifiOn(!isWifiOn);
    // In production: invoke('toggle_wifi').catch(console.error);
    try {
      await invoke('launch_system_utility', { utility: 'ncpa.cpl' });
    } catch (error) {
      console.error('Failed to open network settings:', error);
    }
  };

  const toggleBluetooth = () => {
    setIsBluetoothOn(!isBluetoothOn);
    // invoke('toggle_bluetooth').catch(console.error);
  };

  const lockScreen = () => {
    // Lock the screen
    invoke('launch_system_utility', { utility: 'rundll32.exe user32.dll,LockWorkStation' })
      .catch(console.error);
  };

  return (
    <div className="quick-controls-widget glass">
      <div className="qc-header">
        <span className="qc-title">Quick Controls</span>
      </div>

      {/* Toggle Buttons Row */}
      <div className="qc-toggles">
        <button 
          className={`qc-toggle-btn ${isWifiOn ? 'active' : ''}`}
          onClick={toggleWifi}
          title="WiFi Settings"
        >
          <span className="qc-icon">◉</span>
          <span>WiFi</span>
        </button>

        <button 
          className={`qc-toggle-btn ${isBluetoothOn ? 'active' : ''}`}
          onClick={toggleBluetooth}
          title="Bluetooth"
        >
          <span className="qc-icon">ᛒ</span>
          <span>Bluetooth</span>
        </button>

        <button 
          className="qc-toggle-btn"
          onClick={lockScreen}
          title="Lock Screen"
        >
          <span className="qc-icon">⊠</span>
          <span>Lock</span>
        </button>
      </div>

      {/* Volume Control */}
      <div className="qc-control">
        <div className="qc-control-header">
          <div className="qc-control-label">
            <button className="qc-icon-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : volume < 50 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>
            <span>Volume</span>
          </div>
          <span className="qc-value">{isMuted ? 'Muted' : `${volume}%`}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="qc-slider"
        />
      </div>

      {/* Brightness Control */}
      <div className="qc-control">
        <div className="qc-control-header">
          <div className="qc-control-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span>Brightness</span>
          </div>
          <span className="qc-value">{brightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={brightness}
          onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
          className="qc-slider"
        />
      </div>
    </div>
  );
};

export default QuickControlsWidget;
