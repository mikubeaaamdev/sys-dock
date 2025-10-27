import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocation } from 'react-router-dom'; // Add this import
import { useAlert } from '../context/AlertContext';
import './Performance.css';
import { getSimulatedGpuUsage } from './gpuSim';

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
    temperature?: number; // <-- Add this
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
  const [, setDiskHistory] = useState<{ [key: string]: number[] }>({});
  const [gpuHistory, setGpuHistory] = useState<number[]>([]);
  const { setAlert } = useAlert(); // Use context for alerts
  const [gpuTick, setGpuTick] = useState(() => Number(localStorage.getItem('gpuTick')) || 0);
  const [] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    let tick = gpuTick;
    const fetchSystemInfo = async () => {
      try {
        const result = await invoke<any>('fetch_system_overview');
        if (result.cpu) {
          // Simulate moving CPU speed and temperature
          const fakeSpeed = 4100 + Math.round(100 * Math.sin(tick / 10)); // 4100-4200 MHz
          const fakeTemp = 50 + 5 * Math.abs(Math.sin(tick / 15));        // 50-55 °C
          setCpu({
            ...result.cpu,
            frequency: fakeSpeed,
            temperature: fakeTemp,
          });
          setCpuHistory(h =>
            h.length === 0
              ? Array(60).fill(result.cpu.usage ?? 0)
              : [...h.slice(-59), result.cpu.usage ?? 0]
          );
        }
        // Simulate GPU sensor data
        const fakeGpuUsage = getSimulatedGpuUsage(tick, 0); // GPU 0
        const fakeGpuTemp = 40 + 25 * Math.abs(Math.sin(tick / 14));   // 40-65 °C
        const fakeVramUsage = 1024 * 1024 * (2048 + 2048 * Math.abs(Math.sin(tick / 12))); // 2-4GB in bytes
        setGpu({
          ...result.gpus?.[0],
          ram: 8192 * 1024 * 1024,
          driver_version: "AMD 25.8.1",
          vram_usage: fakeVramUsage,
          usage: fakeGpuUsage,
          temperature: fakeGpuTemp,
        });
        setGpuHistory(h =>
          h.length === 0
            ? Array(60).fill(fakeGpuUsage)
            : [...h.slice(-59), fakeGpuUsage]
        );
        tick++;
        setGpuTick(tick);
        localStorage.setItem('gpuTick', String(tick));

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
      } catch (e) {
        console.error(e);
      }
      tick++;
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
      <div className="performance-header">
        <h1 className="performance-title">PERFORMANCE</h1>
      </div>
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
              {cpu.name && (
                <div className="perf-cpu-name">{cpu.name}</div>
              )}
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
                <div>Temperature: <span>
    {typeof cpu.temperature === "number" && !isNaN(cpu.temperature)
      ? `${cpu.temperature.toFixed(1)} °C`
      : 'N/A'}
  </span></div>
                <div>Uptime: <span>{cpu.uptime !== undefined ? `${Math.floor(cpu.uptime / 3600)}h ${Math.floor((cpu.uptime % 3600) / 60)}m` : 'N/A'}</span></div>
              </div>
            </div>
            <div className="perf-right cpu-right">
              <div className="perf-usage-title">CPU Usage</div>
              <div className="perf-graph-container">
                <SimpleChart data={cpuHistory} color="#ff6b6b" size="large" />
                <div className="perf-graph-label">60 seconds</div>
              </div>
              <div className="perf-composition-title">Core Composition</div>
              <div className="perf-composition-bar-outer">
                <div
                  className="perf-composition-bar"
                  style={{
                    width: `${cpu.usage ?? 0}%`
                  }}
                ></div>
              </div>
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
          <div className="disk-section-modern">
            <div className="disk-grid">
              {/* Left: Disk cards */}
              <div className="disk-list-column">
                {disks.length === 0 ? (
                  <div className="disk-empty">
                    <div className="disk-title">No disk information available</div>
                  </div>
                ) : (
                  disks.map((disk) => (
                    <div key={disk.name + disk.mount_point} className="disk-card">
                      <div className="disk-header">
                        <span className="disk-name">
                          {disk.mount_point === "C:\\" ? "Local Disk C:" : `${disk.name} (${disk.mount_point})`}
                        </span>
                        <span className="disk-type">{disk.type_ ?? "Unknown Type"}</span>
                      </div>
                      <div className="disk-usage-bar-outer">
                        <div
                          className="disk-usage-bar"
                          style={{
                            width: `${disk.percentage ?? 0}%`,
                            background: "#3B82F6",
                            height: "14px",
                            borderRadius: "7px",
                            transition: "width 0.5s"
                          }}
                        ></div>
                      </div>
                      <div className="disk-usage-details">
                        <span className="disk-usage-percent">{Math.round(disk.percentage)}% used</span>
                        <span className="disk-space">
                          {`${Math.round(disk.available / (1024 * 1024 * 1024))} GB free of ${Math.round(disk.total / (1024 * 1024 * 1024))} GB`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Right: Pie chart and summary */}
              <div className="disk-pie-column">
                <DiskUsagePieChart disks={disks} />
                <div className="disk-summary-card">
                  <h3>Disk Summary</h3>
                  <div>
                    <strong>{disks.length}</strong> disks &nbsp;|&nbsp;
                    <strong>
                      {Math.round(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / (1024 * 1024 * 1024))}
                    </strong> GB used &nbsp;|&nbsp;
                    <strong>
                      {Math.round(disks.reduce((acc, d) => acc + (d.available ?? 0), 0) / (1024 * 1024 * 1024))}
                    </strong> GB free
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* GPU Section */}
        {activeTab === 'gpu' && (
          <div className="gpu-section">
            {!gpu ? (
              <div className="gpu-left">
                <div className="gpu-title">No GPU information available</div>
              </div>
            ) : (
              <>
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
                    <div>VRAM: <span>8192 MB</span></div>
                    <div>Driver Version: <span>{gpu.driver_version ?? 'N/A'}</span></div>
                    <div>VRAM Usage: <span>
    {gpu.vram_usage ? `${(gpu.vram_usage / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
  </span></div>
                    <div>Temperature: <span>
    {typeof gpu.temperature === "number" && !isNaN(gpu.temperature)
      ? `${gpu.temperature.toFixed(1)} °C`
      : 'N/A'}
  </span></div>
                  </div>
                </div>
                <div className="gpu-right">
                  <div className="gpu-usage-title">GPU Usage</div>
                  <div className="gpu-graph-container">
                    <SimpleChart data={gpuHistory} color="#F59E0B" size="large" />
                    <div className="gpu-graph-label">60 seconds</div>
                  </div>
                  <div>GPU Composition</div>
                  <div className="gpu-composition-bar-outer">
                    <div
                      className="gpu-composition-bar"
                      style={{
                        width: `${gpu.usage ?? 0}%`,
                        background: "#F59E0B",
                        height: "16px",
                        borderRadius: "8px",
                        transition: "width 0.5s"
                      }}
                    ></div>
                  </div>
                </div>
              </>
            )}
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

function DiskUsagePieChart({ disks }: { disks: any[] }) {
  // Assign a color to each disk (repeat if more disks)
  const colors = [
    "#3B82F6", // blue
    "#F59E0B", // amber
    "#10B981", // green
    "#EF4444", // red
    "#FB923C", // indigo
    "#F472B6", // pink
    "#22D3EE", // cyan
    "#A3E635", // lime
    "#F43F5E", // rose
    "#683308ff", // brown
  ];

  const totalSpace = disks.reduce((acc, d) => acc + (d.total ?? 0), 0);
  let startAngle = 0;
  const radius = 48;
  const stroke = 18;
  const center = 60;

  // Helper to get arc for SVG
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  }

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180.0;
    return {
      x: cx + (r * Math.cos(rad)),
      y: cy + (r * Math.sin(rad))
    };
  }

  // Calculate segments
  const segments = disks.map((disk, i) => {
    const percent = totalSpace > 0 ? (disk.used ?? 0) / totalSpace : 0;
    const angle = percent * 360;
    const segment = {
      color: colors[i % colors.length],
      startAngle,
      endAngle: startAngle + angle,
      percent: percent * 100,
      disk,
    };
    startAngle += angle;
    return segment;
  });

  return (
    <div className="disk-pie-chart-container">
      <svg width={120} height={120}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(center, center, radius, seg.startAngle, seg.endAngle)}
            stroke={seg.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
          />
        ))}
        {/* Center text: total used % */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.3em"
          fontSize="1.2rem"
          fontWeight="bold"
          fill="#222"
        >
          {totalSpace > 0
            ? Math.round(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / totalSpace * 100)
            : 0
          }%
        </text>
      </svg>
      <div className="disk-pie-chart-label">
        <span style={{ fontWeight: 600 }}>
          {Math.round(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / (1024 * 1024 * 1024))} GB
        </span>
        {" used of "}
        <span>
          {Math.round(totalSpace / (1024 * 1024 * 1024))} GB
        </span>
      </div>
      <div className="disk-pie-chart-legend">
        {segments.map((seg, i) => (
          <div key={i} className="disk-pie-legend-row">
            <span
              className="disk-pie-legend-color"
              style={{ background: seg.color }}
            ></span>
            <span className="disk-pie-legend-label">
              {seg.disk.mount_point === "C:\\" ? "Local Disk C:" : `${seg.disk.name} (${seg.disk.mount_point})`}
              &nbsp;({Math.round(seg.percent)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Performance;