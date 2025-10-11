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
        if (result.gpu) setGpu(result.gpu);
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
        {/* CPU Section */}
        {activeTab === 'cpu' && (
          <div className="perf-section">
            <div className="perf-left cpu-left">
              <div className="perf-title">CPU</div>
              <div className="perf-circle">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="54" stroke="#fff" strokeWidth="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="#ff6b6b"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - (cpu.usage ?? 0) / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s' }}
                  />
                </svg>
                <div className="perf-circle-text">
                  {Math.round(cpu.usage ?? 0)}%<br />
                  Usage
                </div>
              </div>
              <div className="perf-details">
                <div>Name: <span>{cpu.name ?? 'N/A'}</span></div>
                <div>Cores: <span>{cpu.cores ?? 'N/A'}</span></div>
                <div>Frequency: <span>{cpu.frequency ?? 'N/A'} MHz</span></div>
              </div>
            </div>
            <div className="perf-right cpu-right">
              <div className="perf-usage-title">CPU Usage</div>
              <div className="perf-graph-container">
                <SimpleChart data={[cpu.usage ?? 0]} color="#ff6b6b" />
                <div className="perf-graph-label">60 seconds</div>
              </div>
              <div className="perf-composition-title">Core Composition</div>
              <div className="perf-composition-bar"></div>
              {/* Add more CPU hardware details if available */}
            </div>
          </div>
        )}
        {/* MEMORY Section */}
        {activeTab === 'memory' && (
          <div className="memory-section">
            <div className="memory-left">
              <div className="memory-title">Memory</div>
              <div className="memory-circle">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="54" stroke="#fff" strokeWidth="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="#22c55e"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - (memory.percentage ?? 0) / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s' }}
                  />
                </svg>
                <div className="memory-circle-text">
                  {((memory.used ?? 0) / 1024 / 1024 / 1024).toFixed(1)} / {((memory.total ?? 0) / 1024 / 1024 / 1024).toFixed(1)} GB<br />
                  ({Math.round(memory.percentage ?? 0)}%)
                </div>
              </div>
              {/* Stats in two columns */}
              <div className="memory-stats-grid">
                <div className="memory-stats-left">
                  <div>
                    In Use (Compressed): <strong>10.4 GB (535 MB)</strong>
                  </div>
                  <div>
                    Committed: <strong>14.2 / 18.3 GB</strong>
                  </div>
                  <div>
                    Cached: <strong>5.3 GB</strong>
                  </div>
                  <div>
                    Paged Pool <strong>468 MB</strong>
                  </div>
                  <div>
                    Non-paged Pool <strong>460 MB</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="memory-right">
              <div className="memory-usage-title">Memory Usage</div>
              <div className="memory-graph-container">
                <SimpleChart data={[memory.percentage ?? 0]} color="#EF4444" />
                <div className="memory-graph-label">60 seconds</div>
              </div>
              <div>Memory Composition</div>
              <div className="memory-composition-bar-outer">
                <div
                  className="memory-composition-bar"
                  style={{
                    width: `${memory.percentage ?? 0}%`
                  }}
                ></div>
              </div>
              <div className="memory-hardware-details">
                <div>Speed: <span>2400 MHz</span></div>
                <div>Slots Used: <span>2 of 4</span></div>
                <div>Form Factor: <span>DIMM</span></div>
                <div>Hardware Reserved: <span>125 MB</span></div>
              </div>
            </div>
          </div>
        )}
        {/* DISKS Section */}
        {activeTab === 'disks' && (
          <div className="disk-section">
            {disks.length === 0 ? (
              <div className="disk-left">
                <div className="disk-title">No disk information available</div>
              </div>
            ) : (
              disks.map((disk) => (
                <div key={disk.name + disk.mount_point} className="disk-row">
                  <div className="disk-left">
                    <div className="disk-title">{disk.name} ({disk.mount_point})</div>
                    <div className="disk-circle">
                      <svg width="120" height="120">
                        <circle cx="60" cy="60" r="54" stroke="#fff" strokeWidth="8" fill="none" />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="#3B82F6"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 54}
                          strokeDashoffset={2 * Math.PI * 54 * (1 - (disk.percentage ?? 0) / 100)}
                          style={{ transition: 'stroke-dashoffset 0.5s' }}
                        />
                      </svg>
                      <div className="disk-circle-text">
                        {Math.round(disk.percentage)}%<br />
                        Used
                      </div>
                    </div>
                    <div className="disk-details">
                      <div>Total: <span>{Math.round(disk.total / 1024 / 1024)} MB</span></div>
                      <div>Used: <span>{Math.round(disk.used / 1024 / 1024)} MB</span></div>
                      <div>Available: <span>{Math.round(disk.available / 1024 / 1024)} MB</span></div>
                    </div>
                  </div>
                  <div className="disk-right">
                    <div className="disk-usage-title">Disk Usage</div>
                    <div className="disk-graph-container">
                      <SimpleChart data={[disk.percentage]} color="#3B82F6" />
                      <div className="disk-graph-label">60 seconds</div>
                    </div>
                    <div>Disk Composition</div>
                    <div className="disk-composition-bar"></div>
                    {/* Add more disk hardware details if available */}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {/* GPU Section */}
        {activeTab === 'gpu' && (
          <div className="gpu-section">
            <div className="gpu-left">
              <div className="gpu-title">GPU</div>
              <div className="gpu-circle">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="54" stroke="#fff" strokeWidth="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - (gpu.usage ?? 0) / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s' }}
                  />
                </svg>
                <div className="gpu-circle-text">
                  {Math.round(gpu.usage ?? 0)}%<br />
                  Usage
                </div>
              </div>
              <div className="gpu-details">
                <div>Name: <span>{gpu.name ?? 'N/A'}</span></div>
                {/* Add more GPU info if available */}
              </div>
            </div>
            <div className="gpu-right">
              <div className="gpu-usage-title">GPU Usage</div>
              <div className="gpu-graph-container">
                <SimpleChart data={[gpu.usage ?? 0]} color="#F59E0B" />
                <div className="gpu-graph-label">60 seconds</div>
              </div>
              <div>GPU Composition</div>
              <div className="gpu-composition-bar"></div>
              {/* Add more GPU hardware details if available */}
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