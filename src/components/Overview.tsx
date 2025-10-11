import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import WeatherWidget from './widgets/WeatherWidget';
import CircularProgress from './widgets/CircularProgress';
import PerformanceChart from './widgets/PerformanceChart';
import ReminderWidget from './widgets/ReminderWidget';
import './Overview.css';

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
  
  // Sample data for charts that don't have real-time data yet
  const wifiData = [70, 80, 85, 90, 85, 88, 92, 89, 85, 88, 90, 95, 92, 88, 85, 89];
  const gpu0Data = [10, 15, 20, 18, 25, 22, 18, 20, 15, 12, 18, 22, 25, 20, 15, 12];
  const gpu1Data = [5, 8, 12, 10, 15, 12, 8, 10, 7, 5, 8, 12, 15, 10, 7, 7];

  // Format bytes to GB with 1 decimal place
  const formatGB = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  };

  // Get color class based on disk usage percentage
  const getDiskUsageClass = (percentage: number): string => {
    if (percentage < 50) return 'disk-usage-low';
    if (percentage < 80) return 'disk-usage-medium';
    return 'disk-usage-high';
  };

  // Function to generate dynamic gradient based on percentage
  const getUsageGradient = (percentage: number): string => {
    if (percentage <= 50) {
      // Green to yellow (0-50%)
      return `linear-gradient(90deg, 
        rgb(34, 197, 94) 0%, 
        rgb(34, 197, 94) ${(50-percentage)*2}%, 
        rgb(245, 158, 11) 100%)`;
    } else {
      // Green, yellow to red (51-100%)
      return `linear-gradient(90deg, 
        rgb(34, 197, 94) 0%,
        rgb(245, 158, 11) 30%, 
        rgb(245, 158, 11) ${Math.max(30, (100-percentage)*1.5)}%, 
        rgb(220, 38, 38) 100%)`;
    }
  };

  // Function to sort disks with OS disk first
  const sortDisks = (disks: DiskInfo[]): DiskInfo[] => {
    return [...disks].sort((a, b) => {
      // Common system disk patterns
      const isASystemDisk = 
        a.mount_point.toLowerCase() === 'c:\\' || 
        a.mount_point === '/' || 
        a.name.toLowerCase().includes('system');
        
      const isBSystemDisk = 
        b.mount_point.toLowerCase() === 'c:\\' || 
        b.mount_point === '/' || 
        b.name.toLowerCase().includes('system');
      
      // Sort system disks first
      if (isASystemDisk && !isBSystemDisk) return -1;
      if (!isASystemDisk && isBSystemDisk) return 1;
      
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
  };

  // For memory color
  const getMemoryColor = (percentage: number): string => {
    if (percentage < 50) {
      return '#22c55e'; // green for low usage (instead of blue)
    } else if (percentage < 80) {
      return '#f59e0b'; // yellow/amber for medium usage
    } else {
      return '#ef4444'; // red for high usage
    }
  };

  useEffect(() => {
    // Function to fetch system data
    const fetchSystemData = async () => {
      try {
        const data = await invoke<SystemOverview>('get_system_overview');
        
        // Update CPU history with latest value
        setCpuHistory(prev => [...prev.slice(1), data.cpu.usage]);
        
        setSystemData(data);
      } catch (error) {
        console.error('Error fetching system data:', error);
      }
    };

    // Fetch initially
    fetchSystemData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchSystemData, 2000); // Update every 2 seconds

    // Clean up interval
    return () => clearInterval(interval);
  }, []);

  // Create CPU info string
  const getCpuInfo = (): string => {
    if (!systemData) return '';
    
    // Return just the CPU model name
    return systemData.cpu.name;
  };

  return (
    <div className="overview">
      <div className="overview-grid">
        {/* Left Column - Weather and Reminder */}
        <div className="left-column">
          <WeatherWidget />
          <ReminderWidget />
        </div>
        
        {/* Center Column - Circular Progress & Disk List */}
        <div className="center-column">
          {/* Memory with real-time data */}
          <CircularProgress
            title="Memory"
            percentage={systemData?.memory.percentage || 0}
            color={systemData ? getMemoryColor(systemData.memory.percentage) : '#3b82f6'}
            centerText={systemData ? 
              `${formatGB(systemData.memory.used)}/${formatGB(systemData.memory.total)} GB` : 
              "Loading..."}
            subtitle={systemData ? `(${Math.round(systemData.memory.percentage)}%)` : ""}
            className="memory"
            hidePercentage={true}  // Add this prop to hide the percentage
          />
          
          {/* Disk list chart */}
          <div className="disk-list-container">
            <h3>Storage Drives</h3>
            <div className="disk-list-header">
              <span>Drive</span>
              <span>Usage</span>
            </div>
            {systemData?.disks && sortDisks(systemData.disks).map((disk, index) => (
              <div key={index} className="disk-item">
                <div className="disk-name" title={`${disk.name} (${disk.mount_point})`}>
                  {disk.name} ({disk.mount_point})
                </div>
                <div className="disk-usage-bar">
                  <div 
                    className="disk-usage-fill"
                    style={{ 
                      width: `${disk.percentage}%`,
                      background: getUsageGradient(disk.percentage)
                    }}
                  ></div>
                </div>
                <div className="disk-details">
                  {formatGB(disk.used)}/{formatGB(disk.total)} GB ({Math.round(disk.percentage)}%)
                </div>
              </div>
            ))}
            {!systemData?.disks.length && <div>No disk information available</div>}
          </div>
        </div>
        
        {/* Right Column - Performance Charts */}
        <div className="right-column">
          <PerformanceChart
            title="CPU"
            percentage={systemData?.cpu.usage || 0}
            color="#EF4444"
            data={cpuHistory} 
            className="cpu"
            info={getCpuInfo()} // Will show cores and threads at the bottom
          />
          
          <PerformanceChart
            title="WIFI"
            percentage={89}
            color="#3B82F6"
            data={wifiData}
            className="wifi"
          />
          
          <PerformanceChart
            title="GPU 0"
            percentage={12}
            color="#3B82F6"
            data={gpu0Data}
            className="gpu-0"
          />
          
          <PerformanceChart
            title="GPU 1"
            percentage={7}
            color="#EF4444"
            data={gpu1Data}
            className="gpu-1"
          />
        </div>
      </div>
    </div>
  );
};

export default Overview;