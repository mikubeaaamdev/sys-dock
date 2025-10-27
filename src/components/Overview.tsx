import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WeatherWidget from './widgets/WeatherWidget';
import CircularProgress from './widgets/CircularProgress';
import PerformanceChart from './widgets/PerformanceChart';
import ReminderWidget from './widgets/ReminderWidget';
import './Overview.css';
import { useAlert } from '../context/AlertContext';
import { getSimulatedGpuUsage } from './gpuSim';

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
  };
  disks: DiskInfo[];
}

const Overview: React.FC = () => {
  const [systemData, setSystemData] = useState<SystemOverview | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(16).fill(0));
  const [error, setError] = useState<string | null>(null);
  const { setAlert } = useAlert();
  const [gpuTick, setGpuTick] = useState(() => Number(localStorage.getItem('gpuTick')) || 0);
  const [gpu0Data, setGpu0Data] = useState<number[]>(Array(16).fill(0));

  // Sample data for charts that don't have real-time data yet
  const wifiData = [70, 80, 85, 90, 85, 88, 92, 89, 85, 88, 90, 95, 92, 88, 85, 89];

  const formatGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);


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

  return (
    <div className="overview">
      <div className="overview-title">OVERVIEW</div>
      <div className="overview-grid">
        <div className="left-column">
          <WeatherWidget />
          <ReminderWidget />
        </div>
        <div className="center-column">
          <CircularProgress
            title="Memory"
            percentage={systemData?.memory.percentage || 0}
            color={systemData ? getMemoryColor(systemData.memory.percentage) : '#3b82f6'}
            centerText={systemData ? `${formatGB(systemData.memory.used)}/${formatGB(systemData.memory.total)} GB` : "Loading..."}
            subtitle={systemData ? `(${Math.round(systemData.memory.percentage)}%)` : ""}
            className="memory"
            hidePercentage={true}
          />
          <div className="disk-list-container">
            <h3>Storage Drives</h3>
            <div className="disk-list-header">
              <span>Drive</span>
              <span>Usage</span>
            </div>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {systemData?.disks && systemData.disks.length > 0 ? (
              sortDisks(systemData.disks).map((disk, index) => (
                <div key={index} className="disk-item">
                  <div className="disk-name">{disk.name} ({disk.mount_point})</div>
                  <div className="disk-usage-bar">
                    <div
                      className="disk-usage-fill"
                      style={{
                        width: `${disk.percentage > 2 ? disk.percentage : 2}%`
                      }}
                    ></div>
                  </div>
                  <div className="disk-details">
                    {formatGB(disk.used)}/{formatGB(disk.total)} GB ({Math.round(disk.percentage)}%)
                  </div>
                </div>
              ))
            ) : (
              <div>No disk information available</div>
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