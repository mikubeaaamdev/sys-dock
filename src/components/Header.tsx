import React, { useContext, useState, useRef, useEffect } from 'react';
import sysLogo from '../assets/syslogo.svg';
import './Header.css';
import { 
  HomeIcon, 
  NotificationIcon, 
  SettingsIcon 
} from '../assets/icons';
import { UtilitiesIcon } from '../assets/icons/HeaderIcons';
import { SidebarContext } from '../context/SidebarContext';
import { useAlert } from '../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';

interface HeaderProps {
  subtitle?: string;
}

type NotificationType = {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
};

const Header: React.FC<HeaderProps> = ({ 
  subtitle = "Smart Monitoring Info Tool and Widget Manager" 
}) => {
  const { isExpanded } = useContext(SidebarContext);
  const { alert, enabled } = useAlert();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUtilitiesDropdown, setShowUtilitiesDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utilitiesDropdownRef = useRef<HTMLDivElement>(null);

  // Manage notification history
  useEffect(() => {
    if (alert && enabled) {
      // Check if this alert already exists
      const exists = notifications.some(n => n.message === alert);
      if (!exists) {
        const severity = alert.toLowerCase().includes('critically') ? 'critical' : 
                        alert.toLowerCase().includes('high') ? 'warning' : 'info';
        const newNotification: NotificationType = {
          id: Date.now().toString(),
          message: alert,
          severity,
          timestamp: new Date(),
          read: false
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep last 10
      }
    }
  }, [alert, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    // Mark all as read when opening
    if (!showDropdown) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };
  const handleNotificationClick = (message: string) => {
    setShowDropdown(false);
    // Determine which tab to show based on alert message
    let tab = 'cpu';
    if (message?.toLowerCase().includes('memory')) tab = 'memory';
    else if (message?.toLowerCase().includes('disk')) tab = 'disks';
    else if (message?.toLowerCase().includes('gpu')) tab = 'gpu';
    else if (message?.toLowerCase().includes('network')) tab = 'network';
    localStorage.setItem('performanceTab', tab);
    navigate('/performance', { state: { tab } });
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const launchUtility = async (utilityName: string) => {
    try {
      await invoke('launch_system_utility', { utility: utilityName });
      setShowUtilitiesDropdown(false);
    } catch (err) {
      console.error('Failed to launch utility:', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        utilitiesDropdownRef.current &&
        !utilitiesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUtilitiesDropdown(false);
      }
    }
    if (showDropdown || showUtilitiesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showUtilitiesDropdown]);

  return (
    <header className={`header ${isExpanded ? 'sidebar-expanded' : ''}`}>
      <div className="header-content">
        <div className="header-title">
          <img src={sysLogo} alt="SysDock Logo" className="header-logo" />
          <div className="title-text">
            <span className="subtitle">{subtitle}</span>
          </div>
        </div>
        
        <div className="header-controls">
          <button
            className="control-btn home-button"
            onClick={() => navigate('/')}
          >
            <HomeIcon className="control-icon" />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="control-btn" onClick={handleBellClick} disabled={!enabled}>
              <NotificationIcon className="control-icon" />
              {enabled && unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="notifications-dropdown"
              >
                <div className="notifications-header">
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                    <button className="clear-all-btn" onClick={handleClearAll}>
                      Clear All
                    </button>
                  )}
                </div>
                <div className="notifications-list">
                  {!enabled ? (
                    <div className="notification-empty">
                      <span>Notifications are disabled</span>
                      <button 
                        className="enable-notifications-btn"
                        onClick={() => navigate('/settings')}
                      >
                        Enable in Settings
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span>No notifications</span>
                      <p>You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${notification.severity} ${!notification.read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification.message)}
                      >
                        <div className="notification-icon">
                          {getSeverityIcon(notification.severity)}
                        </div>
                        <div className="notification-content">
                          <div className="notification-message">{notification.message}</div>
                          <div className="notification-timestamp">{formatTimestamp(notification.timestamp)}</div>
                        </div>
                        <button
                          className="notification-dismiss"
                          onClick={(e) => handleDismiss(notification.id, e)}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              className="control-btn"
              onClick={() => setShowUtilitiesDropdown(!showUtilitiesDropdown)}
              title="System Utilities"
            >
              <UtilitiesIcon className="control-icon" />
            </button>
            {showUtilitiesDropdown && (
              <div
                ref={utilitiesDropdownRef}
                className="utilities-dropdown"
              >
                <div className="utilities-dropdown-header">System Utilities</div>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('taskmgr')}
                >
                  Task Manager
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('cleanmgr')}
                >
                  Disk Cleanup
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('ncpa.cpl')}
                >
                  Network Connections
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('devmgmt.msc')}
                >
                  Device Manager
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('diskmgmt.msc')}
                >
                  Disk Management
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('services.msc')}
                >
                  Services
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('perfmon')}
                >
                  Performance Monitor
                </button>
                <button 
                  className="utility-item"
                  onClick={() => launchUtility('regedit')}
                >
                  Registry Editor
                </button>
              </div>
            )}
          </div>
          <button className="control-btn">
            <SettingsIcon className="control-icon" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;