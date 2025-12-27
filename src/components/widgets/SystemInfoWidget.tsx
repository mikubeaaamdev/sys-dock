import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './SystemInfoWidget.css';

interface SystemInfo {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  disk: {
    used: number;
    total: number;
    percent: number;
  };
}

const SystemInfoWidget: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    cpu: 0,
    memory: { used: 0, total: 0, percent: 0 },
    disk: { used: 0, total: 0, percent: 0 }
  });

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        // Use the same command as Performance component
        const result = await invoke<any>('fetch_system_overview');
        
        // Extract CPU data
        const cpuUsage = result?.cpu?.usage || 0;
        
        // Extract Memory data
        const memoryData = result?.memory || {};
        const memUsed = memoryData.used || 0;
        const memTotal = memoryData.total || 0;
        const memPercent = memoryData.percentage || 0;
        
        // Extract Disk data - calculate total across all disks
        const disks = result?.disks || [];
        let totalDiskUsed = 0;
        let totalDiskSpace = 0;
        
        if (disks.length > 0) {
          disks.forEach((disk: any) => {
            // Use 'used' and 'total' properties (not 'used_space' and 'total_space')
            const used = disk.used || 0;
            const total = disk.total || 0;
            totalDiskUsed += used;
            totalDiskSpace += total;
          });
        }
        
        const diskPercent = totalDiskSpace > 0 ? (totalDiskUsed / totalDiskSpace) * 100 : 0;

        setSystemInfo({
          cpu: Math.round(cpuUsage),
          memory: {
            used: memUsed,
            total: memTotal,
            percent: Math.round(memPercent)
          },
          disk: {
            used: totalDiskUsed,
            total: totalDiskSpace,
            percent: Math.round(diskPercent)
          }
        });
      } catch (error) {
        console.error('Error fetching system info:', error);
      }
    };

    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 ** 3)).toFixed(1) + ' GB';
  };

  const getStatusColor = (percent: number) => {
    if (percent < 50) return '#4caf50';
    if (percent < 80) return '#ff9800';
    return '#f44336';
  };

  return (
    <div className="system-info-widget glass">
      <div className="system-info-header">
        <span className="system-info-title">System Quick View</span>
      </div>

      <div className="system-metrics">
        <div className="metric">
          <div className="metric-label">CPU Usage</div>
          <div className="metric-value" style={{ color: getStatusColor(systemInfo.cpu) }}>
            {systemInfo.cpu}%
          </div>
          <div className="metric-bar">
            <div 
              className="metric-bar-fill" 
              style={{ 
                width: `${systemInfo.cpu}%`,
                background: getStatusColor(systemInfo.cpu)
              }}
            />
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Memory</div>
          <div className="metric-value" style={{ color: getStatusColor(systemInfo.memory.percent) }}>
            {Math.round(systemInfo.memory.percent)}%
          </div>
          <div className="metric-detail">
            {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
          </div>
          <div className="metric-bar">
            <div 
              className="metric-bar-fill" 
              style={{ 
                width: `${systemInfo.memory.percent}%`,
                background: getStatusColor(systemInfo.memory.percent)
              }}
            />
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Disk Usage</div>
          <div className="metric-value" style={{ color: getStatusColor(systemInfo.disk.percent) }}>
            {Math.round(systemInfo.disk.percent)}%
          </div>
          <div className="metric-detail">
            {formatBytes(systemInfo.disk.used)} / {formatBytes(systemInfo.disk.total)}
          </div>
          <div className="metric-bar">
            <div 
              className="metric-bar-fill" 
              style={{ 
                width: `${systemInfo.disk.percent}%`,
                background: getStatusColor(systemInfo.disk.percent)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemInfoWidget;
