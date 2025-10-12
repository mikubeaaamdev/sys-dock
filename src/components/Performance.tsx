import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocation } from 'react-router-dom'; // Add this import
import { useAlert } from '../context/AlertContext';
import './Performance.css';

const Performance: React.FC = () => {
  const location = useLocation(); // Get current route
  const [activeTab, setActiveTab] = useState(() => {
    // Restore last tab or default to 'cpu'
    return localStorage.getItem('performanceTab') || 'cpu';
  });
  const [cpu, setCpu] = useState<{
    name?: string;
    usage?: number;
    frequency?: number;
    cores?: number;
    processes?: number;
    threads?: number;
    handles?: number;
    uptime?: number;
    l1_cache?: number;
    l2_cache?: number;
    l3_cache?: number;
  }>({});
  const [memory, setMemory] = useState<{ total?: number; used?: number; available?: number; percentage?: number }>({});
  const [disks, setDisks] = useState<any[]>([]);
  const [gpu, setGpu] = useState<any>({});
  const [networkInfo, setNetworkInfo] = useState<{ interfaces?: any[] }>({});

  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [diskHistory, setDiskHistory] = useState<{ [key: string]: number[] }>({});
  const [gpuHistory, setGpuHistory] = useState<number[]>([]);
  const { setAlert } = useAlert(); // Use context for alerts

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const result = await invoke<any>('fetch_system_overview');
        if (result.cpu) {
          setCpu(result.cpu);
          setCpuHistory(h =>
            h.length === 0
              ? Array(60).fill(result.cpu.usage ?? 0) // fill with first value
              : [...h.slice(-59), result.cpu.usage ?? 0]
          );
        }
        if (result.memory) {
          setMemory(result.memory);
          setMemoryHistory(h =>
            h.length === 0
              ? Array(60).fill(result.memory.percentage ?? 0)
              : [...h.slice(-59), result.memory.percentage ?? 0]
          );
        }
        if (result.disks) {
          setDisks(result.disks);
          setDiskHistory(prev => {
            const updated: { [key: string]: number[] } = { ...prev };
            result.disks.forEach((disk: any) => {
              const key = disk.name + disk.mount_point;
              updated[key] =
                (updated[key]?.length ?? 0) === 0
                  ? Array(60).fill(disk.percentage ?? 0)
                  : [...(updated[key] || []).slice(-59), disk.percentage ?? 0];
            });
            return updated;
          });
        }
        if (result.gpu) {
          setGpu(result.gpu);
          setGpuHistory(h =>
            h.length === 0
              ? Array(60).fill(result.gpu.usage ?? 0)
              : [...h.slice(-59), result.gpu.usage ?? 0]
          );
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const result = await invoke<any>('fetch_network_info');
        setNetworkInfo(result);
      } catch (e) {
        setNetworkInfo({ interfaces: [] });
      }
    };
    fetchNetwork();
    const interval = setInterval(fetchNetwork, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save tab on change
  useEffect(() => {
    localStorage.setItem('performanceTab', activeTab);
  }, [activeTab]);

  // When route changes to /performance, restore last tab or default to 'cpu'
  useEffect(() => {
    if (location.pathname === '/performance') {
      setActiveTab(localStorage.getItem('performanceTab') || 'cpu');
    }
  }, [location.pathname]);

  // Only set alert in context, do NOT render any alert bar here!
  useEffect(() => {
    if ((cpu.usage ?? 0) > 90) {
      setAlert("High CPU usage!");
    } else if ((memory.percentage ?? 0) > 90) {
      setAlert("Memory critically low!");
    } else if (disks.some(disk => (disk.percentage ?? 0) > 95)) {
      setAlert("Disk space critically low!");
    } else {
      setAlert(null);
    }
  }, [cpu, memory, disks, setAlert]);

  const tabs = [
    { key: 'cpu', label: 'CPU' },
    { key: 'memory', label: 'MEMORY' },
    { key: 'disks', label: 'DISKS' },
    { key: 'gpu', label: 'GPU' },
    { key: 'network', label: 'NETWORK' } // <-- Add this tab
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
                <div>Utilization: <span>{Math.round(cpu.usage ?? 0)}%</span></div>
                <div>Speed: <span>{cpu.frequency ?? 'N/A'} MHz</span></div>
                <div>Cores: <span>{cpu.cores ?? 'N/A'}</span></div>
                <div>Processes: <span>{cpu.processes !== undefined ? cpu.processes : 'N/A'}</span></div>
                <div>Threads: <span>{cpu.threads !== undefined ? cpu.threads : 'N/A'}</span></div>
                <div>Handles: <span>{cpu.handles && cpu.handles > 0 ? cpu.handles : 'N/A'}</span></div>
                <div>Uptime: <span>{cpu.uptime !== undefined ? `${Math.floor(cpu.uptime / 3600)}h ${Math.floor((cpu.uptime % 3600) / 60)}m` : 'N/A'}</span></div>
                <div>L1 Cache: <span>{cpu.l1_cache && cpu.l1_cache > 0 ? cpu.l1_cache : 'N/A'} KB</span></div>
                <div>L2 Cache: <span>{cpu.l2_cache && cpu.l2_cache > 0 ? cpu.l2_cache : 'N/A'} KB</span></div>
                <div>L3 Cache: <span>{cpu.l3_cache && cpu.l3_cache > 0 ? cpu.l3_cache : 'N/A'} KB</span></div>
              </div>
            </div>
            <div className="perf-right cpu-right">
              <div className="perf-usage-title">CPU Usage</div>
              <div className="perf-graph-container">
                <SimpleChart data={cpuHistory} color="#ff6b6b" size="large" />
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
                <SimpleChart data={memoryHistory} color="#EF4444" size="large" />
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
                    <div className="disk-title">
                      {disk.mount_point === "C:\\" ? "Local Disk C:" : `${disk.name} (${disk.mount_point})`}
                    </div>
                    <div className="disk-brand-type">
                      {disk.brand ? (
                        <span>{disk.brand}</span>
                      ) : (
                        <span style={{ color: "#bbb", fontWeight: "normal" }}>Unknown Brand</span>
                      )}
                      {" "}
                      {disk.type_ ? (
                        <span>{disk.type_}</span>
                      ) : (
                        <span style={{ color: "#bbb", fontWeight: "normal" }}>Unknown Type</span>
                      )}
                    </div>
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
                      <span className="disk-label">
                        {`${Math.round(disk.available / (1024 * 1024 * 1024))} GB free of ${Math.round(disk.total / (1024 * 1024 * 1024))} GB`}
                      </span>
                    </div>
                  </div>
                  <div className="disk-right">
                    <div className="disk-usage-title">Disk Usage</div>
                    <div className="disk-graph-container">
                      <SimpleChart
                        data={diskHistory[disk.name + disk.mount_point] || []}
                        color="#3B82F6"
                        size="small"
                      />
                    </div>
                    <div className="disk-graph-label">60 seconds</div>
                    {/* <div>Disk Composition</div>
                    <div className="disk-composition-bar"></div> */}
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
                <SimpleChart data={gpuHistory} color="#F59E0B" size="large" />
                <div className="gpu-graph-label">60 seconds</div>
              </div>
              <div>GPU Composition</div>
              <div className="gpu-composition-bar"></div>
              {/* Add more GPU hardware details if available */}
            </div>
          </div>
        )}
        {/* NETWORK Section */}
        {activeTab === 'network' && (
          <div className="network-section">
            <h2>Network Interfaces</h2>
            <table className="network-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Bytes Received</th>
                  <th>Bytes Sent</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {(networkInfo.interfaces ?? []).map((iface, idx) => (
                  <tr key={idx}>
                    <td>{iface.name}</td>
                    <td>
                      <span className={iface.status === "Connected" ? "status-connected" : "status-disconnected"}>
                        {iface.status}
                      </span>
                    </td>
                    <td>{iface.bytes_received}</td>
                    <td>{iface.bytes_transmitted}</td>
                    <td>
                      <IpCell ip_addresses={iface.ip_addresses ?? []} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function SimpleChart({ data, color, size = "large" }: { data: number[]; color: string; size?: "large" | "small" }) {
  const width = size === "large" ? 1000 : 220;
  const height = size === "large" ? 500 : 80;
  const gridX = size === "large" ? 12 : 6;
  const gridY = size === "large" ? 6 : 4;

  const chartData = data.slice(-60);
  const points = chartData.map((v, i) => `${(i / 59) * width},${height - (v / 100) * height}`).join(' ');
  const areaPoints = `${chartData.map((v, i) => `${(i / 59) * width},${height - (v / 100) * height}`).join(' ')} ${width},${height} 0,${height}`;

  return (
    <svg width={width} height={height} style={{ background: "#f8f9fa", borderRadius: 8 }}>
      {/* Grid */}
      {[...Array(gridX)].map((_, i) => (
        <line
          key={`vx${i}`}
          x1={(i / (gridX - 1)) * width}
          y1={0}
          x2={(i / (gridX - 1)) * width}
          y2={height}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}
      {[...Array(gridY)].map((_, i) => (
        <line
          key={`hz${i}`}
          x1={0}
          y1={(i / (gridY - 1)) * height}
          x2={width}
          y2={(i / (gridY - 1)) * height}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={color + "22"}
      />
      {/* Line */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

function IpCell({ ip_addresses }: { ip_addresses: string[] }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      style={{ color: revealed ? "#222" : "#bbb", fontStyle: revealed ? "normal" : "italic", cursor: "pointer" }}
      title={revealed ? "" : "Click to reveal"}
      onClick={() => setRevealed(true)}
    >
      {revealed
        ? (ip_addresses && ip_addresses.length > 0 ? ip_addresses.join(', ') : "N/A")
        : "Hidden for privacy"}
    </span>
  );
}

export default Performance;