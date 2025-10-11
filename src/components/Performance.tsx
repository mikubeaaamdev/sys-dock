import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Performance.css';

const Performance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('memory');
  const [cpu, setCpu] = useState<{ name?: string; usage?: number; frequency?: number; cores?: number }>({});
  const [memory, setMemory] = useState<{ total?: number; used?: number; available?: number; percentage?: number }>({});
  const [disks, setDisks] = useState<any[]>([]);
  const [gpu, setGpu] = useState<any>({});

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const result = await invoke<any>('fetch_system_overview');
        if (result.cpu) setCpu(result.cpu);
        if (result.memory) setMemory(result.memory);
        if (result.disks) setDisks(result.disks);
        // If you add GPU info to Rust, setGpu(result.gpu);
      } catch (e) {
        console.error(e);
      }
    };

    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { key: 'cpu', label: 'CPU' },
    { key: 'memory', label: 'MEMORY' },
    { key: 'disks', label: 'DISKS' },
    { key: 'gpu', label: 'GPU' }
  ];

  return (
    <div className="performance-container">
      <h1 className="performance-title">PERFORMANCE</h1>
      <div className="performance-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`performance-tab-btn${activeTab === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="performance-content">
        {activeTab === 'cpu' && (
          <div className="perf-section">
            <div className="perf-chart">
              <SimpleChart data={[cpu.usage ?? 0]} color="#EF4444" />
            </div>
            <div className="perf-info">
              <div><strong>Name:</strong> {cpu.name}</div>
              <div><strong>Cores:</strong> {cpu.cores}</div>
              <div><strong>Usage:</strong> {Math.round(cpu.usage ?? 0)}%</div>
            </div>
          </div>
        )}
        {activeTab === 'memory' && (
          <div className="perf-section">
            <div className="perf-chart">
              <SimpleChart data={[memory.percentage ?? 0]} color="#22c55e" />
            </div>
            <div className="perf-info">
              <div><strong>Total:</strong> {Math.round((memory.total ?? 0) / 1024 / 1024)} MB</div>
              <div><strong>Used:</strong> {Math.round((memory.used ?? 0) / 1024 / 1024)} MB</div>
              <div><strong>Available:</strong> {Math.round((memory.available ?? 0) / 1024 / 1024)} MB</div>
              <div><strong>Usage:</strong> {Math.round(memory.percentage ?? 0)}%</div>
            </div>
          </div>
        )}
        {activeTab === 'disks' && (
          <div className="perf-section">
            {disks.length === 0 ? (
              <div>No disk information available</div>
            ) : (
              disks.map((disk, idx) => (
                <div key={disk.name + disk.mount_point} className="disk-info-block">
                  <div className="disk-title">{disk.name} ({disk.mount_point})</div>
                  <SimpleChart data={[disk.percentage]} color="#3B82F6" />
                  <div className="perf-info">
                    <div><strong>Total:</strong> {Math.round(disk.total / 1024 / 1024)} MB</div>
                    <div><strong>Used:</strong> {Math.round(disk.used / 1024 / 1024)} MB</div>
                    <div><strong>Available:</strong> {Math.round(disk.available / 1024 / 1024)} MB</div>
                    <div><strong>Usage:</strong> {Math.round(disk.percentage)}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {activeTab === 'gpu' && (
          <div className="perf-section">
            <div className="perf-chart">
              {/* Replace with real GPU data if available */}
              <SimpleChart data={[gpu.usage ?? 0]} color="#F59E0B" />
            </div>
            <div className="perf-info">
              <div><strong>Name:</strong> {gpu.name ?? 'N/A'}</div>
              <div><strong>Usage:</strong> {Math.round(gpu.usage ?? 0)}%</div>
              {/* Add more GPU info as available */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function SimpleChart({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => `${i * 10},${100 - v}`).join(' ');
  return (
    <svg width="160" height="100">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
      />
      <line x1="0" y1="100" x2="160" y2="100" stroke="#ccc" />
    </svg>
  );
}

export default Performance;