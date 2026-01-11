import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from './widgets/WeatherWidget';
import PerformanceChart from './widgets/PerformanceChart';
import ReminderWidget from './widgets/ReminderWidget';
import './Overview.css';
import { useAlert } from '../context/AlertContext';
import { getSimulatedGpuUsage } from './gpuSim';
import { CpuIcon, MemoryIcon, ProcessesIcon, UptimeIcon, StorageIcon, HealthIcon } from '../assets/icons/OverviewIcons';

interface DiskInfo {
  name: string;
  mount_point: string;
  total: number;
  used: number;
  available: number;
  percentage: number;
}

interface SystemOverview {
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    name: string;
    cores: number;
    uptime?: number;
  };
  disks: DiskInfo[];
}

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [systemData, setSystemData] = useState<SystemOverview | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(16).fill(0));
  const [error, setError] = useState<string | null>(null);
  const { setAlert } = useAlert();
  const [gpuTick, setGpuTick] = useState(() => Number(localStorage.getItem('gpuTick')) || 0);
  const [gpu0Data, setGpu0Data] = useState<number[]>(Array(16).fill(0));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [username, setUsername] = useState<string>('');

  const wifiData = [70, 80, 85, 90, 85, 88, 92, 89, 85, 88, 90, 95, 92, 88, 85, 89];

  const formatGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getSystemHealth = () => {
    if (!systemData) return { status: 'Unknown', color: '#6b7280', iconType: 'excellent' as const };
    const cpuHigh = systemData.cpu.usage > 80;
    const memoryHigh = systemData.memory.percentage > 80;
    const diskHigh = systemData.disks.some(d => d.percentage > 90);
    
    if (cpuHigh || memoryHigh || diskHigh) {
      return { status: 'Attention Required', color: '#ef4444', iconType: 'warning' as const };
    }
    if (systemData.cpu.usage > 60 || systemData.memory.percentage > 60) {
      return { status: 'Running Well', color: '#f59e0b', iconType: 'good' as const };
    }
    return { status: 'Excellent', color: '#22c55e', iconType: 'excellent' as const };
  };

  const getActiveProcesses = () => {
    // This would ideally come from backend
    return Math.floor(Math.random() * 50) + 150;
  };

  const formatUptime = () => {
    if (!systemData?.cpu?.uptime) return '--';
    const uptimeSeconds = systemData.cpu.uptime;
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getDiskStatus = (percentage: number) => {
    if (percentage >= 95) return { label: 'Critical', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    if (percentage >= 80) return { label: 'High', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
    if (percentage >= 60) return { label: 'Moderate', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' };
    return { label: 'Healthy', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' };
  };

  const getDiskDisplayName = (name: string, mountPoint: string) => {
    if (mountPoint.toLowerCase() === 'c:\\') {
      return 'Local Disk C';
    }
    return name;
  };


  const sortDisks = (disks: DiskInfo[]): DiskInfo[] => {
    return [...disks].sort((a, b) => {
      const isASystemDisk = a.mount_point.toLowerCase() === 'c:\\' || a.mount_point === '/' || a.name.toLowerCase().includes('system');
      const isBSystemDisk = b.mount_point.toLowerCase() === 'c:\\' || b.mount_point === '/' || b.name.toLowerCase().includes('system');
      if (isASystemDisk && !isBSystemDisk) return -1;
      if (!isASystemDisk && isBSystemDisk) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const getMemoryColor = (percentage: number): string => {
    if (percentage < 50) return '#22c55e';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const data = await invoke<SystemOverview>('fetch_system_overview');
        setCpuHistory(prev => [...prev.slice(1), data.cpu.usage]);
        setSystemData(data);
        setError(null);
      } catch (err: any) {
        setError('Error fetching system data');
        console.error('Error fetching system data:', err);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Add alert logic after fetching data
    if (systemData) {
      if ((systemData.cpu.usage ?? 0) > 90) {
        setAlert("High CPU usage!");
      } else if ((systemData.memory.percentage ?? 0) > 90) {
        setAlert("Memory critically low!");
      } else if (systemData.disks.some(disk => (disk.percentage ?? 0) > 95)) {
        setAlert("Disk space critically low!");
      } else {
        setAlert(null);
      }
    }
  }, [systemData, setAlert]);

  const getCpuInfo = (): string => {
    if (!systemData) return '';
    return systemData.cpu.name;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setGpuTick(t => {
        const nextTick = t + 1;
        localStorage.setItem('gpuTick', String(nextTick));
        return nextTick;
      });
      setGpu0Data(prev => [...prev.slice(1), getSimulatedGpuUsage(gpuTick, 0)]);
    }, 2000);
    return () => clearInterval(interval);
  }, [gpuTick]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const name = await invoke<string>('get_username');
        setUsername(name);
      } catch (err) {
        console.error('Failed to fetch username:', err);
        setUsername('User');
      }
    };
    fetchUsername();
  }, []);

  const health = getSystemHealth();

  return (
    <div className="overview">
      <div className="overview-page-title">OVERVIEW</div>
      <div className="overview-header">
        <div className="overview-header-top">
          <div className="greeting-section">
            <h1 className="greeting">{getGreeting()}{username && `, ${username}`}</h1>
            <div className="date-time">
              <span className="date">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="time">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="system-health">
            <div className="health-indicator">
              <HealthIcon className="health-icon" status={health.iconType} style={{ color: health.color }} />
              <div className="health-details">
                <span className="health-label">System Health</span>
                <span className="health-status" style={{ color: health.color }}>{health.status}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="quick-stats">
          <div className="stat-card clickable" onClick={() => navigate('/performance', { state: { tab: 'cpu' } })}>
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <CpuIcon className="stat-icon-svg" />
            </div>
            <div className="stat-content">
              <span className="stat-label">CPU Load</span>
              <span className="stat-value">{systemData ? `${Math.round(systemData.cpu.usage)}%` : '--'}</span>
            </div>
          </div>
          <div className="stat-card clickable" onClick={() => navigate('/performance', { state: { tab: 'memory' } })}>
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <MemoryIcon className="stat-icon-svg" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Memory</span>
              <span className="stat-value">{systemData ? `${Math.round(systemData.memory.percentage)}%` : '--'}</span>
            </div>
          </div>
          <div className="stat-card clickable" onClick={() => navigate('/processes')}>
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <ProcessesIcon className="stat-icon-svg" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Processes</span>
              <span className="stat-value">{getActiveProcesses()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <UptimeIcon className="stat-icon-svg" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Uptime</span>
              <span className="stat-value">{formatUptime()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overview-grid">
        <div className="left-column">
          <WeatherWidget />
          <ReminderWidget />
        </div>
        <div className="center-column">
          <div className="memory-card">
            <div className="memory-card-header">
              <div className="memory-title-section">
                <MemoryIcon className="memory-icon" />
                <h3>Memory</h3>
              </div>
              <div className="memory-percentage" style={{ color: systemData ? getMemoryColor(systemData.memory.percentage) : '#3b82f6' }}>
                {systemData ? `${Math.round(systemData.memory.percentage)}%` : '--'}
              </div>
            </div>
            
            <div className="memory-card-body">
              <div className="memory-stats">
                <div className="memory-stat-item">
                  <span className="stat-label">Used</span>
                  <span className="stat-value" style={{ color: systemData ? getMemoryColor(systemData.memory.percentage) : '#3b82f6' }}>
                    {systemData ? `${formatGB(systemData.memory.used)} GB` : '--'}
                  </span>
                </div>
                <div className="memory-stat-divider"></div>
                <div className="memory-stat-item">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{systemData ? `${formatGB(systemData.memory.total)} GB` : '--'}</span>
                </div>
              </div>
              
              <div className="memory-progress-container">
                <div className="memory-progress-bar">
                  <div 
                    className="memory-progress-fill"
                    style={{
                      width: `${systemData?.memory.percentage || 0}%`,
                      background: systemData ? getMemoryColor(systemData.memory.percentage) : '#3b82f6'
                    }}
                  >
                    <div className="memory-progress-glow"></div>
                  </div>
                </div>
                <div className="memory-capacity-info">
                  <span className="capacity-free">
                    {systemData ? `${formatGB(systemData.memory.available)} GB available` : 'Loading...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="storage-section">
            <div className="storage-header">
              <div className="storage-header-left">
                <StorageIcon className="storage-title-icon" />
                <h3>Storage Drives</h3>
              </div>
              <button className="see-more-btn" onClick={() => navigate('/performance', { state: { tab: 'disks' } })}>
                See more →
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            {systemData?.disks && systemData.disks.length > 0 ? (
              <div className="storage-grid">
                {sortDisks(systemData.disks).map((disk, index) => {
                  const status = getDiskStatus(disk.percentage);
                  return (
                    <div 
                      key={index} 
                      className="storage-card"
                      onClick={async () => {
                        try {
                          await invoke('open_path_in_explorer', { path: disk.mount_point });
                        } catch (err) {
                          console.error('Failed to open drive:', err);
                          setAlert(`Failed to open ${disk.mount_point} in File Explorer`);
                        }
                      }}
                    >
                      <div className="storage-card-header">
                        <div className="storage-card-title">
                          <div className="disk-info">
                            <div className="disk-label-row">
                              <span className="disk-label">{getDiskDisplayName(disk.name, disk.mount_point)}</span>
                              <span className="disk-mount">{disk.mount_point}</span>
                            </div>
                          </div>
                        </div>
                        <div className="disk-status-badge" style={{ backgroundColor: status.bgColor, color: status.color }}>
                          {status.label}
                        </div>
                      </div>
                      
                      <div className="storage-card-body">
                        <div className="storage-usage-info">
                          <span className="usage-text">{formatGB(disk.used)} GB used</span>
                          <span className="usage-percent">{Math.round(disk.percentage)}%</span>
                        </div>
                        <div className="storage-progress-bar">
                          <div 
                            className="storage-progress-fill"
                            style={{
                              width: `${disk.percentage > 1 ? disk.percentage : 1}%`,
                              background: disk.percentage >= 95 
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : disk.percentage >= 80
                                ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                                : disk.percentage >= 60
                                ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                                : 'linear-gradient(90deg, #22c55e, #16a34a)'
                            }}
                          />
                        </div>
                        <div className="storage-capacity">
                          <span className="capacity-available">{formatGB(disk.available)} GB free</span>
                          <span className="capacity-total">of {formatGB(disk.total)} GB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data-message">No storage information available</div>
            )}
          </div>
        </div>
        <div className="right-column">
          <PerformanceChart
            title="CPU"
            percentage={systemData?.cpu.usage || 0}
            color="#EF4444"
            data={cpuHistory}
            className="cpu"
            info={getCpuInfo()}
          />
          <PerformanceChart
            title="WIFI"
            percentage={89}
            color="#3B82F6"
            data={wifiData}
            className="wifi"
          />
          <div className="gpu-card">
            <PerformanceChart
              title="GPU"
              percentage={gpu0Data[gpu0Data.length - 1]}
              color="#F59E0B"
              data={gpu0Data}
              className="gpu"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;