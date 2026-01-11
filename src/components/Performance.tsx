import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocation } from 'react-router-dom'; // Add this import
import { useAlert } from '../context/AlertContext';
import './Performance.css';
import { getSimulatedGpuUsage } from './gpuSim';
import Sidebar from './Sidebar'; // Add this import

function ConfirmDialog({ open, onConfirm, onCancel }: { open: boolean, onConfirm: () => void, onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="confirm-dialog-backdrop">
      <div className="confirm-dialog">
        <h3>Clean Storage</h3>
        <p>
          This will permanently delete the contents of your Recycle Bin and Temp folder.<br />
          Are you sure you want to proceed?
        </p>
        <div className="confirm-dialog-actions">
          <button className="confirm-btn" onClick={onConfirm}>Yes, Clean</button>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-header"></div>
      <div className="skeleton-content">
        <div className="skeleton-card skeleton-pulse"></div>
        <div className="skeleton-card skeleton-pulse"></div>
      </div>
    </div>
  );
}

const Performance: React.FC = () => {
  const location = useLocation(); // Get current route
  const [activeTab, setActiveTab] = useState(() => {
    // Check if navigation state has a tab preference
    const state = location.state as { tab?: string } | null;
    if (state?.tab) {
      return state.tab;
    }
    // Restore last tab or default to 'cpu'
    return localStorage.getItem('performanceTab') || 'cpu';
  });
  
  // Update activeTab when location state changes
  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab) {
      setActiveTab(state.tab);
      localStorage.setItem('performanceTab', state.tab);
    }
  }, [location.state]);
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
  const [frequencyHistory, setFrequencyHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [, setDiskHistory] = useState<{ [key: string]: number[] }>({});
  const [diskIOHistory, setDiskIOHistory] = useState<{ read: number[]; write: number[] }>({ read: Array(60).fill(0), write: Array(60).fill(0) });
  const [gpuHistory, setGpuHistory] = useState<number[]>([]);
  const { setAlert } = useAlert(); // Use context for alerts
  const [gpuTick, setGpuTick] = useState(() => Number(localStorage.getItem('gpuTick')) || 0);
  const [] = useState<{ [key: string]: string }>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [speedTestResult, setSpeedTestResult] = useState<{ download_mbps: number; upload_mbps: number; latency_ms: number } | null>(null);
  const [showSpeedTestModal, setShowSpeedTestModal] = useState(false);

  // network rate history and previous snapshot for diffing
  const [netHistory, setNetHistory] = useState<{ [ifName: string]: { rx: number[]; tx: number[] } }>({});
  const netPrevRef = useRef<{ [ifName: string]: { rx: number; tx: number; ts: number } }>({});

  useEffect(() => {
    let tick = gpuTick;
    const fetchSystemInfo = async () => {
      try {
        const result = await invoke<any>('fetch_system_overview');
        
        // Only update data for active tab to reduce processing
        if (activeTab === 'cpu' && result.cpu) {
          const fakeSpeed = 4100 + Math.round(100 * Math.sin(tick / 10));
          const fakeTemp = 50 + 5 * Math.abs(Math.sin(tick / 15));
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
          setFrequencyHistory(h =>
            h.length === 0
              ? Array(60).fill(fakeSpeed)
              : [...h.slice(-59), fakeSpeed]
          );
        }
        
        if (activeTab === 'gpu') {
          const fakeGpuUsage = getSimulatedGpuUsage(tick, 0);
          const fakeGpuTemp = 40 + 25 * Math.abs(Math.sin(tick / 14));
          const fakeVramUsage = 1024 * 1024 * (2048 + 2048 * Math.abs(Math.sin(tick / 12)));
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
        }
        
        tick++;
        setGpuTick(tick);

        if (activeTab === 'memory' && result.memory) {
          setMemory(result.memory);
          setMemoryHistory(h =>
            h.length === 0
              ? Array(60).fill(result.memory.percentage ?? 0)
              : [...h.slice(-59), result.memory.percentage ?? 0]
          );
        }
        
        if (activeTab === 'disks' && result.disks) {
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
          // Simulate disk I/O rates (in MB/s)
          const fakeReadSpeed = 200 + 150 * Math.abs(Math.sin(tick / 8));
          const fakeWriteSpeed = 120 + 100 * Math.abs(Math.sin(tick / 10));
          setDiskIOHistory(prev => ({
            read: [...prev.read.slice(-59), fakeReadSpeed],
            write: [...prev.write.slice(-59), fakeWriteSpeed]
          }));
        }
        
        setIsLoading(false);
      } catch (e) {
        console.error(e);
        setIsLoading(false);
      }
    };

    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 2000); // Increased from 1s to 2s
    return () => clearInterval(interval);
  }, [activeTab]);

  // Network polling - only when network tab is active
  useEffect(() => {
    if (activeTab !== 'network') return;
    
    const fetchNetworkRates = async () => {
      try {
        const result = await invoke<any>('fetch_network_info');
        const now = Date.now();
        const updatedHistory = { ...netHistory };
        (result.interfaces ?? []).forEach((iface: any) => {
          const key = iface.name ?? `iface-${Math.random()}`;
          const prev = netPrevRef.current[key];
          let rxRate = 0;
          let txRate = 0;
          
          if (prev) {
            const dt = Math.max(0.5, (now - prev.ts) / 1000.0); // Allow faster updates
            const rxDiff = (iface.bytes_received ?? 0) - prev.rx;
            const txDiff = (iface.bytes_transmitted ?? 0) - prev.tx;
            rxRate = Math.max(0, rxDiff / dt);
            txRate = Math.max(0, txDiff / dt);
          }
          if (!updatedHistory[key]) updatedHistory[key] = { rx: Array(60).fill(0), tx: Array(60).fill(0) };
          updatedHistory[key].rx = [...(updatedHistory[key].rx.slice(-59)), rxRate];
          updatedHistory[key].tx = [...(updatedHistory[key].tx.slice(-59)), txRate];
          // Always update previous snapshot for next calculation
          netPrevRef.current[key] = { rx: iface.bytes_received ?? 0, tx: iface.bytes_transmitted ?? 0, ts: now };
        });
        setNetHistory(updatedHistory);
        setNetworkInfo(result);
      } catch (e) {
        setNetworkInfo({ interfaces: [] });
      }
    };

    fetchNetworkRates();
    const interval = setInterval(fetchNetworkRates, 1000); // Poll every 1 second for real-time updates
    return () => clearInterval(interval);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ensure netHistory has an entry for every interface (pre-seed) so chart always receives length-60 arrays
  useEffect(() => {
    const updated = { ...netHistory };
    let changed = false;
    (networkInfo.interfaces ?? []).forEach((iface: any, i: number) => {
      const key = iface.name ?? `iface-${i}`;
      if (!updated[key]) {
        updated[key] = { rx: Array(60).fill(0), tx: Array(60).fill(0) };
        changed = true;
      }
    });
    // remove stale entries optionally (keep it if you want history across reconnects)
    if (changed) setNetHistory(updated);
  }, [networkInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Batch localStorage updates
  useEffect(() => {
    const batchUpdate = () => {
      localStorage.setItem('performanceTab', activeTab);
      localStorage.setItem('gpuTick', String(gpuTick));
    };
    const timer = setTimeout(batchUpdate, 100);
    return () => clearTimeout(timer);
  }, [activeTab, gpuTick]);

  // When route changes to /performance, restore last tab or default to 'cpu'
  useEffect(() => {
    if (location.pathname === '/performance') {
      // If navigation state has a tab, use it; otherwise use localStorage or default
      const navTab = (location.state as any)?.tab;
      if (navTab) {
        setActiveTab(navTab);
        localStorage.setItem('performanceTab', navTab);
      } else {
        setActiveTab(localStorage.getItem('performanceTab') || 'cpu');
      }
    }
  }, [location.pathname, location.state]);

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

  const handleCleanStorage = async () => {
    setShowConfirm(true);
  };

  const confirmCleanStorage = async () => {
    setShowConfirm(false);
    try {
      const result = await invoke<string>('clean_storage');
      setCleanSuccess(result);
      setAlert(result);
      setTimeout(() => setCleanSuccess(null), 5000); // Hide after 5s
    } catch (e: any) {
      setCleanSuccess("Failed to clean storage: " + (e?.toString() ?? ""));
      setAlert("Failed to clean storage: " + (e?.toString() ?? ""));
      setTimeout(() => setCleanSuccess(null), 5000);
    }
  };

  const cancelCleanStorage = () => {
    setShowConfirm(false);
  };

  const runSpeedTest = async () => {
    setSpeedTestRunning(true);
    setSpeedTestResult(null);
    setShowSpeedTestModal(true);
    try {
      const result = await invoke<{ download_mbps: number; upload_mbps: number; latency_ms: number; status: string }>('run_speed_test');
      setSpeedTestResult(result);
    } catch (error) {
      setAlert('Speed test failed: ' + String(error));
      setTimeout(() => setAlert(null), 3000);
      setShowSpeedTestModal(false);
    } finally {
      setSpeedTestRunning(false);
    }
  };

  const tabs = [
    { key: 'cpu', label: 'CPU' },
    { key: 'memory', label: 'MEMORY' },
    { key: 'disks', label: 'DISKS' },
    { key: 'gpu', label: 'GPU' },
    { key: 'network', label: 'NETWORK' } // <-- Add this tab
  ];

  // Memoized formatted values to prevent recalculation
  const formattedMemory = useMemo(() => ({
    used: ((memory.used ?? 0) / 1024 / 1024 / 1024).toFixed(1),
    total: ((memory.total ?? 0) / 1024 / 1024 / 1024).toFixed(1),
    percentage: Math.round(memory.percentage ?? 0)
  }), [memory.used, memory.total, memory.percentage]);

  const networkStats = useMemo(() => ({
    totalRx: Object.values(netHistory).reduce((s, h) => s + (h.rx[h.rx.length-1]||0), 0),
    totalTx: Object.values(netHistory).reduce((s, h) => s + (h.tx[h.tx.length-1]||0), 0)
  }), [netHistory]);

  // Memoized formatter for bytes/sec
  const fmtSpeed = useCallback((bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
    const units = ['B/s','KB/s','MB/s','GB/s','TB/s'];
    let i = 0;
    let v = bytesPerSec;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; };
    return `${v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`;
  }, []);

  return (
    <div className="performance-container">
      <Sidebar showConfirm={showConfirm} /> {/* Pass showConfirm here */}
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
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
        {/* CPU Section */}
        {activeTab === 'cpu' && (
          <div className="cpu-section-modern">
            <div className="cpu-header-card">
              <div className="cpu-header-content">
                <div className="cpu-header-left">
                  <h2 className="cpu-model-name">{cpu.name ?? 'N/A'}</h2>
                  <div className="cpu-subtitle">Processor</div>
                </div>
                <div className="cpu-header-right">
                  <div className="cpu-usage-display">
                    <div className="cpu-usage-number" style={{ color: getUsageColor(cpu.usage ?? 0) }}>
                      {Math.round(cpu.usage ?? 0)}%
                    </div>
                    <div className="cpu-usage-label">Utilization</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cpu-stats-grid">
              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                    <rect x="9" y="9" width="6" height="6"/>
                    <line x1="9" y1="1" x2="9" y2="4"/>
                    <line x1="15" y1="1" x2="15" y2="4"/>
                    <line x1="9" y1="20" x2="9" y2="23"/>
                    <line x1="15" y1="20" x2="15" y2="23"/>
                    <line x1="20" y1="9" x2="23" y2="9"/>
                    <line x1="20" y1="14" x2="23" y2="14"/>
                    <line x1="1" y1="9" x2="4" y2="9"/>
                    <line x1="1" y1="14" x2="4" y2="14"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Cores</div>
                  <div className="cpu-stat-value">{cpu.cores ?? 'N/A'}</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Speed</div>
                  <div className="cpu-stat-value">{cpu.frequency ?? 'N/A'} MHz</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Temperature</div>
                  <div className="cpu-stat-value">
                    {typeof cpu.temperature === "number" && !isNaN(cpu.temperature)
                      ? `${cpu.temperature.toFixed(1)}°C`
                      : 'N/A'}
                  </div>
                  {typeof cpu.temperature === "number" && !isNaN(cpu.temperature) && (
                    <div className={`thermal-status-badge ${getThermalStatus(cpu.temperature)}`}>
                      {getThermalStatusText(cpu.temperature)}
                    </div>
                  )}
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Uptime</div>
                  <div className="cpu-stat-value">
                    {cpu.uptime !== undefined ? `${Math.floor(cpu.uptime / 3600)}h ${Math.floor((cpu.uptime % 3600) / 60)}m` : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Processes</div>
                  <div className="cpu-stat-value">{cpu.processes !== undefined ? cpu.processes : 'N/A'}</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Threads</div>
                  <div className="cpu-stat-value">{cpu.threads !== undefined ? cpu.threads : 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Top CPU Processes Widget */}
            <div className="cpu-processes-card">
              <h3 className="cpu-processes-title">Top CPU Processes</h3>
              <div className="cpu-processes-list">
                {[
                  { name: 'System', cpu: (cpu.usage ?? 0) * 0.35, pid: 4 },
                  { name: 'Chrome', cpu: (cpu.usage ?? 0) * 0.25, pid: 1234 },
                  { name: 'Discord', cpu: (cpu.usage ?? 0) * 0.15, pid: 5678 },
                  { name: 'VS Code', cpu: (cpu.usage ?? 0) * 0.12, pid: 9012 },
                  { name: 'explorer.exe', cpu: (cpu.usage ?? 0) * 0.08, pid: 3456 },
                ].map((process, i) => (
                  <div key={i} className="cpu-process-item">
                    <div className="cpu-process-info">
                      <div className="cpu-process-name">{process.name}</div>
                      <div className="cpu-process-pid">PID: {process.pid}</div>
                    </div>
                    <div className="cpu-process-usage-container">
                      <div className="cpu-process-bar-outer">
                        <div 
                          className="cpu-process-bar-fill"
                          style={{
                            width: `${Math.min(100, process.cpu)}%`,
                            background: `linear-gradient(90deg, ${getUsageColor(process.cpu)}, ${getUsageColor(process.cpu)}dd)`
                          }}
                        />
                      </div>
                      <div className="cpu-process-percentage">{process.cpu.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Core Usage Visualization */}
            <div className="cpu-cores-card">
              <h3 className="cpu-cores-title">Per-Core Usage</h3>
              <div className="cpu-cores-grid">
                {Array.from({ length: cpu.cores ?? 0 }).map((_, i) => {
                  // Simulate per-core usage based on overall usage with some variation
                  const coreUsage = Math.min(100, Math.max(0, 
                    (cpu.usage ?? 0) + (Math.sin(i * 0.5 + gpuTick * 0.1) * 15)
                  ));
                  return (
                    <div key={i} className="cpu-core-bar-container">
                      <div className="cpu-core-label">Core {i}</div>
                      <div className="cpu-core-bar-outer">
                        <div 
                          className="cpu-core-bar-fill"
                          style={{
                            width: `${coreUsage}%`,
                            background: `linear-gradient(90deg, ${getUsageColor(coreUsage)}, ${getUsageColor(coreUsage)}dd)`
                          }}
                        />
                      </div>
                      <div className="cpu-core-percentage">{Math.round(coreUsage)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CPU Load Distribution Pie Chart */}
            <div className="cpu-load-pie-card">
              <h3 className="cpu-load-pie-title">Load Distribution</h3>
              <CpuLoadPieChart usage={cpu.usage ?? 0} />
            </div>

            {/* CPU Frequency Graph */}
            <div className="cpu-chart-card">
              <div className="cpu-chart-header">
                <h3>CPU Frequency History</h3>
                <span className="cpu-chart-timeframe">Last 60 seconds</span>
              </div>
              <div className="cpu-chart-wrapper">
                <SimpleChart 
                  data={frequencyHistory.map(f => {
                    // Normalize frequency to 0-100 range
                    // Assuming typical range of 3500-4500 MHz
                    const minFreq = 3500;
                    const maxFreq = 4500;
                    return ((f - minFreq) / (maxFreq - minFreq)) * 100;
                  })} 
                  color="#10B981" 
                  size="large" 
                />
              </div>
              <div className="cpu-history-stats">
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Minimum</div>
                  <div className="cpu-stat-value-small">{frequencyHistory.length > 0 ? Math.min(...frequencyHistory).toFixed(0) : '0'} MHz</div>
                </div>
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Average</div>
                  <div className="cpu-stat-value-small">{frequencyHistory.length > 0 ? (frequencyHistory.reduce((a, b) => a + b, 0) / frequencyHistory.length).toFixed(0) : '0'} MHz</div>
                </div>
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Maximum</div>
                  <div className="cpu-stat-value-small">{frequencyHistory.length > 0 ? Math.max(...frequencyHistory).toFixed(0) : '0'} MHz</div>
                </div>
              </div>
            </div>

            <div className="cpu-chart-card">
              <div className="cpu-chart-header">
                <h3>CPU Usage History</h3>
                <span className="cpu-chart-timeframe">Last 60 seconds</span>
              </div>
              <div className="cpu-chart-wrapper">
                <SimpleChart data={cpuHistory} color="#ff6b6b" size="large" />
              </div>
              <div className="cpu-history-stats">
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Minimum</div>
                  <div className="cpu-stat-value-small">{cpuHistory.length > 0 ? Math.min(...cpuHistory).toFixed(1) : '0.0'}%</div>
                </div>
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Average</div>
                  <div className="cpu-stat-value-small">{cpuHistory.length > 0 ? (cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length).toFixed(1) : '0.0'}%</div>
                </div>
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Maximum</div>
                  <div className="cpu-stat-value-small">{cpuHistory.length > 0 ? Math.max(...cpuHistory).toFixed(1) : '0.0'}%</div>
                </div>
              </div>
              <div className="cpu-usage-bar">
                <div className="cpu-usage-bar-label">
                  <span>Current Load</span>
                  <span style={{ color: getUsageColor(cpu.usage ?? 0), fontWeight: 600 }}>
                    {Math.round(cpu.usage ?? 0)}%
                  </span>
                </div>
                <div className="cpu-usage-bar-outer">
                  <div
                    className="cpu-usage-bar-fill"
                    style={{
                      width: `${cpu.usage ?? 0}%`,
                      background: `linear-gradient(90deg, ${getUsageColor(cpu.usage ?? 0)}, ${getUsageColor(cpu.usage ?? 0)}dd)`
                    }}
                  >
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* MEMORY Section */}
        {activeTab === 'memory' && (
          <div className="cpu-section-modern">
            <div className="cpu-header-card">
              <div className="cpu-header-content">
                <div className="cpu-header-left">
                  <h2 className="cpu-model-name">System Memory</h2>
                  <div className="cpu-subtitle">{formattedMemory.used} / {formattedMemory.total} GB</div>
                </div>
                <div className="cpu-header-right">
                  <div className="cpu-usage-display">
                    <div className="cpu-usage-number" style={{ color: getUsageColor(memory.percentage ?? 0) }}>
                      {formattedMemory.percentage}%
                    </div>
                    <div className="cpu-usage-label">In Use</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cpu-stats-grid">
              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Total RAM</div>
                  <div className="cpu-stat-value">{formattedMemory.total} GB</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7h-9"/>
                    <path d="M14 17H5"/>
                    <circle cx="17" cy="17" r="3"/>
                    <circle cx="7" cy="7" r="3"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">In Use</div>
                  <div className="cpu-stat-value">{formattedMemory.used} GB</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Available</div>
                  <div className="cpu-stat-value">{((memory.available ?? 0) / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Speed</div>
                  <div className="cpu-stat-value">3200 MHz</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Slots Used</div>
                  <div className="cpu-stat-value">2 of 4</div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Cached</div>
                  <div className="cpu-stat-value">5.3 GB</div>
                </div>
              </div>
            </div>

            {/* Top Memory Processes Widget */}
            <div className="cpu-processes-card">
              <h3 className="cpu-processes-title">Top Memory Processes</h3>
              <div className="cpu-processes-list">
                {[
                  { name: 'Chrome', memory: (memory.used ?? 0) * 0.28, pid: 1234 },
                  { name: 'System', memory: (memory.used ?? 0) * 0.22, pid: 4 },
                  { name: 'Discord', memory: (memory.used ?? 0) * 0.18, pid: 5678 },
                  { name: 'VS Code', memory: (memory.used ?? 0) * 0.15, pid: 9012 },
                  { name: 'explorer.exe', memory: (memory.used ?? 0) * 0.12, pid: 3456 },
                ].map((process, i) => {
                  const memoryGB = process.memory / 1024 / 1024 / 1024;
                  const memoryPercent = (process.memory / (memory.total ?? 1)) * 100;
                  return (
                    <div key={i} className="cpu-process-item">
                      <div className="cpu-process-info">
                        <div className="cpu-process-name">{process.name}</div>
                        <div className="cpu-process-pid">PID: {process.pid} • {memoryGB.toFixed(2)} GB</div>
                      </div>
                      <div className="cpu-process-usage-container">
                        <div className="cpu-process-bar-outer">
                          <div 
                            className="cpu-process-bar-fill"
                            style={{
                              width: `${Math.min(100, memoryPercent)}%`,
                              background: `linear-gradient(90deg, ${getUsageColor(memoryPercent)}, ${getUsageColor(memoryPercent)}dd)`
                            }}
                          />
                        </div>
                        <div className="cpu-process-percentage">{memoryPercent.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Memory Usage Pie Chart */}
            <div className="cpu-load-pie-card">
              <h3 className="cpu-load-pie-title">Memory Distribution</h3>
              <MemoryUsagePieChart used={memory.used ?? 0} total={memory.total ?? 1} />
            </div>

            {/* Memory Composition Bars */}
            <div className="cpu-processes-card">
              <h3 className="cpu-processes-title">Memory Composition</h3>
              <div className="cpu-processes-list">
                {[
                  { name: 'In Use', value: formattedMemory.used, color: '#EF4444', percent: formattedMemory.percentage },
                  { name: 'Cached', value: '5.3', color: '#F59E0B', percent: (5.3 / parseFloat(formattedMemory.total)) * 100 },
                  { name: 'Available', value: ((memory.available ?? 0) / 1024 / 1024 / 1024).toFixed(1), color: '#10B981', percent: ((memory.available ?? 0) / (memory.total ?? 1)) * 100 },
                  { name: 'Hardware Reserved', value: '0.1', color: '#6B7280', percent: (0.1 / parseFloat(formattedMemory.total)) * 100 },
                ].map((item, i) => (
                  <div key={i} className="cpu-process-item">
                    <div className="cpu-process-info">
                      <div className="cpu-process-name">{item.name}</div>
                      <div className="cpu-process-pid">{item.value} GB</div>
                    </div>
                    <div className="cpu-process-usage-container">
                      <div className="cpu-process-bar-outer">
                        <div 
                          className="cpu-process-bar-fill"
                          style={{
                            width: `${Math.min(100, item.percent)}%`,
                            background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`
                          }}
                        />
                      </div>
                      <div className="cpu-process-percentage">{item.percent.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Usage History Chart */}
            <div className="cpu-chart-card">
              <div className="cpu-chart-header">
                <h3>Memory Usage History</h3>
                <span className="cpu-chart-timeframe">Last 60 seconds</span>
              </div>
              <div className="cpu-chart-wrapper">
                <SimpleChart data={memoryHistory} color="#8B5CF6" size="large" />
              </div>
              <div className="cpu-history-stats">
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Minimum</div>
                  <div className="cpu-stat-value-small">{memoryHistory.length > 0 ? Math.min(...memoryHistory).toFixed(1) : '0.0'}%</div>
                </div>
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Average</div>
                  <div className="cpu-stat-value-small">{memoryHistory.length > 0 ? (memoryHistory.reduce((a, b) => a + b, 0) / memoryHistory.length).toFixed(1) : '0.0'}%</div>
                </div>
                <div className="cpu-stat-item">
                  <div className="cpu-stat-label">Maximum</div>
                  <div className="cpu-stat-value-small">{memoryHistory.length > 0 ? Math.max(...memoryHistory).toFixed(1) : '0.0'}%</div>
                </div>
              </div>
              <div className="cpu-usage-bar">
                <div className="cpu-usage-bar-label">
                  <span>Current Usage</span>
                  <span style={{ color: getUsageColor(memory.percentage ?? 0), fontWeight: 600 }}>
                    {formattedMemory.percentage}%
                  </span>
                </div>
                <div className="cpu-usage-bar-outer">
                  <div
                    className="cpu-usage-bar-fill"
                    style={{
                      width: `${memory.percentage ?? 0}%`,
                      background: `linear-gradient(90deg, ${getUsageColor(memory.percentage ?? 0)}, ${getUsageColor(memory.percentage ?? 0)}dd)`
                    }}
                  >
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Details Card */}
            <div className="cpu-processes-card">
              <h3 className="cpu-processes-title">Hardware Details</h3>
              <div className="memory-hardware-details">
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Form Factor</span>
                  <span className="memory-detail-value">DIMM</span>
                </div>
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Speed</span>
                  <span className="memory-detail-value">3200 MHz</span>
                </div>
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Slots Used</span>
                  <span className="memory-detail-value">2 of 4</span>
                </div>
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Hardware Reserved</span>
                  <span className="memory-detail-value">125 MB</span>
                </div>
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Committed</span>
                  <span className="memory-detail-value">14.2 / 18.3 GB</span>
                </div>
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Paged Pool</span>
                  <span className="memory-detail-value">468 MB</span>
                </div>
                <div className="memory-detail-row">
                  <span className="memory-detail-label">Non-paged Pool</span>
                  <span className="memory-detail-value">460 MB</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* DISKS Section */}
        {activeTab === 'disks' && (
          <div className="cpu-section-modern">
            {disks.length === 0 ? (
              <div className="cpu-header-card">
                <div className="cpu-header-content">
                  <h2 className="cpu-model-name">No Storage Devices Found</h2>
                  <div className="cpu-subtitle">Please check your system configuration</div>
                </div>
              </div>
            ) : (
              <>
                <div className="cpu-header-card">
                  <div className="cpu-header-content">
                    <div className="cpu-header-left">
                      <h2 className="cpu-model-name">Storage Overview</h2>
                      <div className="cpu-subtitle">
                        {Math.round(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / (1024 * 1024 * 1024))} GB used • {Math.round(disks.reduce((acc, d) => acc + (d.available ?? 0), 0) / (1024 * 1024 * 1024))} GB free • {disks.length} {disks.length === 1 ? 'drive' : 'drives'}
                      </div>
                    </div>
                    <div className="cpu-header-right">
                      <div className="cpu-usage-display">
                        <div className="cpu-usage-number" style={{ color: getUsageColor(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / disks.reduce((acc, d) => acc + (d.total ?? 1), 0) * 100) }}>
                          {Math.round(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / disks.reduce((acc, d) => acc + (d.total ?? 1), 0) * 100)}%
                        </div>
                        <div className="cpu-usage-label">Capacity Used</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cpu-stats-grid">
                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Total Capacity</div>
                      <div className="cpu-stat-value">{Math.round(disks.reduce((acc, d) => acc + (d.total ?? 0), 0) / (1024 * 1024 * 1024))} GB</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Storage Devices</div>
                      <div className="cpu-stat-value">{disks.length}</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Available Space</div>
                      <div className="cpu-stat-value">{Math.round(disks.reduce((acc, d) => acc + (d.available ?? 0), 0) / (1024 * 1024 * 1024))} GB</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Read Speed</div>
                      <div className="cpu-stat-value">543 MB/s</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Write Speed</div>
                      <div className="cpu-stat-value">512 MB/s</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="2" y1="7" x2="22" y2="7"/>
                        <line x1="7" y1="3" x2="7" y2="7"/>
                        <circle cx="5" cy="5" r="0.5"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Operating System</div>
                      <div className="cpu-stat-value" style={{ fontSize: '0.85rem' }}>{navigator.platform.includes('Win') ? 'Windows' : navigator.platform.includes('Mac') ? 'macOS' : navigator.platform.includes('Linux') ? 'Linux' : 'Other'}</div>
                    </div>
                  </div>
                </div>

                {/* Individual Disk Cards */}
                <div className="cpu-processes-card">
                  <h3 className="cpu-processes-title">Disk Drives</h3>
                  <div className="cpu-processes-list">
                    {disks.map((disk) => {
                      const usedGB = Math.round(disk.used / (1024 * 1024 * 1024));
                      const totalGB = Math.round(disk.total / (1024 * 1024 * 1024));
                      const freeGB = Math.round(disk.available / (1024 * 1024 * 1024));
                      const percentage = disk.percentage ?? 0;
                      const status = percentage > 90 ? 'Critical' : percentage > 75 ? 'Warning' : 'Healthy';
                      const statusColor = percentage > 90 ? '#EF4444' : percentage > 75 ? '#F59E0B' : '#10B981';
                      
                      const handleDiskClick = async () => {
                        try {
                          await invoke('open_path_in_explorer', { path: disk.mount_point });
                        } catch (error) {
                          console.error('Failed to open file explorer:', error);
                        }
                      };

                      return (
                        <div 
                          key={disk.name + disk.mount_point} 
                          className="cpu-process-item"
                          onClick={handleDiskClick}
                          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div className="cpu-process-info">
                            <div className="cpu-process-name">
                              {disk.mount_point === "C:\\" ? "Local Disk (C:)" : `${disk.name} (${disk.mount_point})`}
                              <span style={{ 
                                display: 'inline-block',
                                marginLeft: '0.75rem', 
                                fontSize: '0.8rem', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '6px', 
                                background: statusColor + '33',
                                color: statusColor,
                                fontWeight: 700,
                                border: `1px solid ${statusColor}44`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {status}
                              </span>
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                style={{ 
                                  marginLeft: '0.5rem', 
                                  verticalAlign: 'middle',
                                  opacity: 0.5
                                }}
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </div>
                            <div className="cpu-process-pid">
                              {disk.type_ ?? "Unknown"} • {usedGB} GB used / {freeGB} GB free of {totalGB} GB
                            </div>
                          </div>
                          <div className="cpu-process-usage-container">
                            <div className="cpu-process-bar-outer">
                              <div 
                                className="cpu-process-bar-fill"
                                style={{
                                  width: `${Math.min(100, percentage)}%`,
                                  background: `linear-gradient(90deg, ${getUsageColor(percentage)}, ${getUsageColor(percentage)}dd)`
                                }}
                              />
                            </div>
                            <div className="cpu-process-percentage">{Math.round(percentage)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Disk I/O History Chart */}
                <div className="cpu-chart-card">
                  <div className="cpu-chart-header">
                    <h3>Disk I/O Activity</h3>
                    <span className="cpu-chart-timeframe">Last 60 seconds</span>
                  </div>
                  <div className="cpu-chart-wrapper" style={{ position: 'relative', height: '200px' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                      <SimpleChart data={diskIOHistory.read} color="#3B82F6" size="large" />
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 }}>
                      <SimpleChart data={diskIOHistory.write} color="#10B981" size="large" />
                    </div>
                  </div>
                  <div className="cpu-history-stats">
                    <div className="cpu-stat-item">
                      <div className="cpu-stat-label">Current Read</div>
                      <div className="cpu-stat-value-small" style={{ color: '#3B82F6' }}>
                        {diskIOHistory.read[diskIOHistory.read.length - 1]?.toFixed(1) ?? '0.0'} MB/s
                      </div>
                    </div>
                    <div className="cpu-stat-item">
                      <div className="cpu-stat-label">Current Write</div>
                      <div className="cpu-stat-value-small" style={{ color: '#10B981' }}>
                        {diskIOHistory.write[diskIOHistory.write.length - 1]?.toFixed(1) ?? '0.0'} MB/s
                      </div>
                    </div>
                    <div className="cpu-stat-item">
                      <div className="cpu-stat-label">Peak I/O</div>
                      <div className="cpu-stat-value-small">
                        {Math.max(...diskIOHistory.read, ...diskIOHistory.write).toFixed(1)} MB/s
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', background: '#3B82F6', borderRadius: '2px' }}></div>
                      <span>Read Speed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }}></div>
                      <span>Write Speed</span>
                    </div>
                  </div>
                </div>

                {/* Disk Usage Distribution Pie Chart */}
                <div className="cpu-load-pie-card">
                  <h3 className="cpu-load-pie-title">Storage Distribution</h3>
                  <DiskUsagePieChart disks={disks} />
                </div>

                {/* Storage Maintenance Section */}
                <div className="cpu-processes-card" style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <h3 className="cpu-processes-title" style={{ color: 'white' }}>Storage Maintenance</h3>
                  <div style={{ padding: '1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Optimize your storage space</div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Remove temporary files, empty Recycle Bin</div>
                      </div>
                      <button
                        onClick={handleCleanStorage}
                        style={{
                          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem 2rem',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Clean Storage
                      </button>
                    </div>
                  </div>
                </div>

                {/* Storage Analytics */}
                <div className="cpu-processes-card">
                  <h3 className="cpu-processes-title">Storage Analytics</h3>
                  <div className="cpu-processes-list">
                    <div className="cpu-process-item">
                      <div className="cpu-process-info">
                        <div className="cpu-process-name">Total Capacity</div>
                        <div className="cpu-process-pid">Combined storage across all drives</div>
                      </div>
                      <div className="cpu-process-usage-container">
                        <div className="cpu-process-bar-outer">
                          <div 
                            className="cpu-process-bar-fill"
                            style={{
                              width: '100%',
                              background: 'linear-gradient(90deg, #10B981, #10B981dd)'
                            }}
                          />
                        </div>
                        <div className="cpu-process-percentage">{Math.round(disks.reduce((acc, d) => acc + (d.total ?? 0), 0) / (1024 * 1024 * 1024))} GB</div>
                      </div>
                    </div>
                    <div className="cpu-process-item">
                      <div className="cpu-process-info">
                        <div className="cpu-process-name">Used Space</div>
                        <div className="cpu-process-pid">Files, applications, and system data</div>
                      </div>
                      <div className="cpu-process-usage-container">
                        <div className="cpu-process-bar-outer">
                          <div 
                            className="cpu-process-bar-fill"
                            style={{
                              width: `${(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / disks.reduce((acc, d) => acc + (d.total ?? 1), 0)) * 100}%`,
                              background: 'linear-gradient(90deg, #F59E0B, #F59E0Bdd)'
                            }}
                          />
                        </div>
                        <div className="cpu-process-percentage">{Math.round(disks.reduce((acc, d) => acc + (d.used ?? 0), 0) / (1024 * 1024 * 1024))} GB</div>
                      </div>
                    </div>
                    <div className="cpu-process-item">
                      <div className="cpu-process-info">
                        <div className="cpu-process-name">Available Space</div>
                        <div className="cpu-process-pid">Ready for new files and applications</div>
                      </div>
                      <div className="cpu-process-usage-container">
                        <div className="cpu-process-bar-outer">
                          <div 
                            className="cpu-process-bar-fill"
                            style={{
                              width: `${(disks.reduce((acc, d) => acc + (d.available ?? 0), 0) / disks.reduce((acc, d) => acc + (d.total ?? 1), 0)) * 100}%`,
                              background: 'linear-gradient(90deg, #3B82F6, #3B82F6dd)'
                            }}
                          />
                        </div>
                        <div className="cpu-process-percentage">{Math.round(disks.reduce((acc, d) => acc + (d.available ?? 0), 0) / (1024 * 1024 * 1024))} GB</div>
                      </div>
                    </div>
                  </div>
                </div>

                {cleanSuccess && (
                  <div className="cpu-processes-card" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white' }}>
                    <h3 className="cpu-processes-title" style={{ color: 'white' }}>Cleanup Success</h3>
                    <div style={{ padding: '1rem', fontSize: '0.95rem' }}>{cleanSuccess}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* GPU Section */}
        {activeTab === 'gpu' && (
          <div className="cpu-section-modern">
            {!gpu || !gpu.name ? (
              <div className="cpu-header-card">
                <div className="cpu-header-content">
                  <h2 className="cpu-model-name">No GPU Detected</h2>
                  <div className="cpu-subtitle">Unable to retrieve graphics card information</div>
                </div>
              </div>
            ) : (
              <>
                <div className="cpu-header-card">
                  <div className="cpu-header-content">
                    <div className="cpu-header-left">
                      <h2 className="cpu-model-name">{gpu.name ?? 'Graphics Card'}</h2>
                      <div className="cpu-subtitle">
                        {gpu.driver_version ? `Driver: ${gpu.driver_version}` : 'GPU'}
                      </div>
                    </div>
                    <div className="cpu-header-right">
                      <div className="cpu-usage-display">
                        <div className="cpu-usage-number" style={{ color: getUsageColor(gpu.usage ?? 0) }}>
                          {Math.round(gpu.usage ?? 0)}%
                        </div>
                        <div className="cpu-usage-label">Utilization</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cpu-stats-grid">
                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">GPU Usage</div>
                      <div className="cpu-stat-value">{Math.round(gpu.usage ?? 0)}%</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Total VRAM</div>
                      <div className="cpu-stat-value">8192 MB</div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">VRAM Usage</div>
                      <div className="cpu-stat-value">
                        {gpu.vram_usage ? `${(gpu.vram_usage / 1024 / 1024).toFixed(0)} MB` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Temperature</div>
                      <div className="cpu-stat-value">
                        {typeof gpu.temperature === "number" && !isNaN(gpu.temperature)
                          ? `${gpu.temperature.toFixed(1)}°C`
                          : 'N/A'}
                      </div>
                      {typeof gpu.temperature === "number" && !isNaN(gpu.temperature) && (
                        <div className={`thermal-status-badge ${getThermalStatus(gpu.temperature)}`}>
                          {getThermalStatusText(gpu.temperature)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Driver Version</div>
                      <div className="cpu-stat-value" style={{ fontSize: '0.85rem' }}>
                        {gpu.driver_version ?? 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="cpu-stat-card">
                    <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                        <rect x="9" y="9" width="6" height="6"/>
                        <line x1="9" y1="1" x2="9" y2="4"/>
                        <line x1="15" y1="1" x2="15" y2="4"/>
                        <line x1="9" y1="20" x2="9" y2="23"/>
                        <line x1="15" y1="20" x2="15" y2="23"/>
                        <line x1="20" y1="9" x2="23" y2="9"/>
                        <line x1="20" y1="14" x2="23" y2="14"/>
                        <line x1="1" y1="9" x2="4" y2="9"/>
                        <line x1="1" y1="14" x2="4" y2="14"/>
                      </svg>
                    </div>
                    <div className="cpu-stat-content">
                      <div className="cpu-stat-label">Vendor</div>
                      <div className="cpu-stat-value" style={{ fontSize: '0.85rem' }}>
                        {gpu.name?.includes('NVIDIA') ? 'NVIDIA' : gpu.name?.includes('AMD') ? 'AMD' : gpu.name?.includes('Intel') ? 'Intel' : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* GPU Usage History Chart */}
                <div className="cpu-chart-card">
                  <div className="cpu-chart-header">
                    <h3>GPU Usage History</h3>
                    <span className="cpu-chart-timeframe">Last 60 seconds</span>
                  </div>
                  <div className="cpu-chart-wrapper">
                    <SimpleChart data={gpuHistory} color="#F59E0B" size="large" />
                  </div>
                  <div className="cpu-history-stats">
                    <div className="cpu-stat-item">
                      <div className="cpu-stat-label">Minimum</div>
                      <div className="cpu-stat-value-small">{gpuHistory.length > 0 ? Math.min(...gpuHistory).toFixed(1) : '0.0'}%</div>
                    </div>
                    <div className="cpu-stat-item">
                      <div className="cpu-stat-label">Average</div>
                      <div className="cpu-stat-value-small">{gpuHistory.length > 0 ? (gpuHistory.reduce((a, b) => a + b, 0) / gpuHistory.length).toFixed(1) : '0.0'}%</div>
                    </div>
                    <div className="cpu-stat-item">
                      <div className="cpu-stat-label">Maximum</div>
                      <div className="cpu-stat-value-small">{gpuHistory.length > 0 ? Math.max(...gpuHistory).toFixed(1) : '0.0'}%</div>
                    </div>
                  </div>
                  <div className="cpu-usage-bar">
                    <div className="cpu-usage-bar-label">
                      <span>Current Load</span>
                      <span style={{ color: getUsageColor(gpu.usage ?? 0), fontWeight: 600 }}>
                        {Math.round(gpu.usage ?? 0)}%
                      </span>
                    </div>
                    <div className="cpu-usage-bar-outer">
                      <div
                        className="cpu-usage-bar-fill"
                        style={{
                          width: `${gpu.usage ?? 0}%`,
                          background: `linear-gradient(90deg, ${getUsageColor(gpu.usage ?? 0)}, ${getUsageColor(gpu.usage ?? 0)}dd)`
                        }}
                      >
                      </div>
                    </div>
                  </div>
                </div>

                {/* VRAM Usage Pie Chart */}
                <div className="cpu-load-pie-card">
                  <h3 className="cpu-load-pie-title">VRAM Distribution</h3>
                  <MemoryUsagePieChart 
                    used={gpu.vram_usage ?? 0} 
                    total={8192 * 1024 * 1024} 
                  />
                </div>

                {/* GPU Details Card */}
                <div className="cpu-processes-card">
                  <h3 className="cpu-processes-title">Graphics Card Details</h3>
                  <div className="memory-hardware-details">
                    <div className="memory-detail-row">
                      <span className="memory-detail-label">Device Name</span>
                      <span className="memory-detail-value">{gpu.name ?? 'N/A'}</span>
                    </div>
                    <div className="memory-detail-row">
                      <span className="memory-detail-label">Driver Version</span>
                      <span className="memory-detail-value">{gpu.driver_version ?? 'N/A'}</span>
                    </div>
                    <div className="memory-detail-row">
                      <span className="memory-detail-label">Total VRAM</span>
                      <span className="memory-detail-value">8192 MB</span>
                    </div>
                    <div className="memory-detail-row">
                      <span className="memory-detail-label">VRAM Usage</span>
                      <span className="memory-detail-value">
                        {gpu.vram_usage ? `${(gpu.vram_usage / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="memory-detail-row">
                      <span className="memory-detail-label">Temperature</span>
                      <span className="memory-detail-value">
                        {typeof gpu.temperature === "number" && !isNaN(gpu.temperature)
                          ? `${gpu.temperature.toFixed(1)} °C`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="memory-detail-row">
                      <span className="memory-detail-label">Current Utilization</span>
                      <span className="memory-detail-value">{Math.round(gpu.usage ?? 0)}%</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {/* NETWORK Section - modern card layout */}
        {activeTab === 'network' && (
          <div className="cpu-section-modern">
            {/* Network Header Card */}
            <div className="cpu-header-card">
              <div className="cpu-header-content">
                <div className="cpu-header-left">
                  <h2 className="cpu-model-name">Network Interfaces</h2>
                  <div className="cpu-subtitle">{(networkInfo.interfaces ?? []).length} Active Interface{(networkInfo.interfaces ?? []).length !== 1 ? 's' : ''}</div>
                </div>
                <div className="cpu-header-right">
                  <button 
                    className="speed-test-header-btn" 
                    onClick={runSpeedTest}
                    disabled={speedTestRunning}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    {speedTestRunning ? 'Testing...' : 'Speed Test'}
                  </button>
                </div>
              </div>
            </div>

            {/* Aggregate Network Stats */}
            <div className="cpu-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M19 12l-7 7-7-7"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Total Download</div>
                  <div className="cpu-stat-value" style={{ color: '#3B82F6' }}>
                    {fmtSpeed(networkStats.totalRx)}
                  </div>
                </div>
              </div>

              <div className="cpu-stat-card">
                <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </div>
                <div className="cpu-stat-content">
                  <div className="cpu-stat-label">Total Upload</div>
                  <div className="cpu-stat-value" style={{ color: '#10B981' }}>
                    {fmtSpeed(networkStats.totalTx)}
                  </div>
                </div>
              </div>
            </div>

            {/* Network Interfaces Grid */}
            {(networkInfo.interfaces ?? []).map((iface, idx) => {
              const key = iface.name ?? `iface-${idx}`;
              const hist = netHistory[key] ?? { rx: Array(60).fill(0), tx: Array(60).fill(0) };
              const rxNow = hist.rx[hist.rx.length - 1] ?? 0;
              const txNow = hist.tx[hist.tx.length - 1] ?? 0;
              const rxMbps = (rxNow * 8) / 1_000_000;
              const txMbps = (txNow * 8) / 1_000_000;
              const isConnected = iface.status === "Connected";
              
              return (
                <div key={key} style={{ marginBottom: '2rem' }}>
                  {/* Interface Header */}
                  <div className="cpu-processes-card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="cpu-processes-title">{iface.name}</h3>
                      <div className={`thermal-status-badge ${isConnected ? 'cool' : 'critical'}`}>
                        {iface.status}
                      </div>
                    </div>
                    <div className="memory-hardware-details" style={{ marginTop: '1rem' }}>
                      <div className="memory-detail-row">
                        <span className="memory-detail-label">IP Addresses</span>
                        <span className="memory-detail-value"><IpCell ip_addresses={iface.ip_addresses ?? []} /></span>
                      </div>
                      <div className="memory-detail-row">
                        <span className="memory-detail-label">Packets Received</span>
                        <span className="memory-detail-value">{(iface.packets_received ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="memory-detail-row">
                        <span className="memory-detail-label">Packets Transmitted</span>
                        <span className="memory-detail-value">{(iface.packets_transmitted ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="memory-detail-row">
                        <span className="memory-detail-label">Errors / Drops</span>
                        <span className="memory-detail-value">{(iface.errors ?? 0)} / {(iface.drops ?? 0)}</span>
                      </div>
                      <div className="memory-detail-row">
                        <span className="memory-detail-label">Last Updated</span>
                        <span className="memory-detail-value">{iface.last_updated_unix ? new Date(iface.last_updated_unix * 1000).toLocaleTimeString() : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Network Speed Cards */}
                  <div className="cpu-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="cpu-stat-card">
                      <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M19 12l-7 7-7-7"/>
                        </svg>
                      </div>
                      <div className="cpu-stat-content">
                        <div className="cpu-stat-label">Download Speed</div>
                        <div className="cpu-stat-value" style={{ color: '#3B82F6' }}>{rxMbps.toFixed(3)} Mbps</div>
                      </div>
                    </div>

                    <div className="cpu-stat-card">
                      <div className="cpu-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                      </div>
                      <div className="cpu-stat-content">
                        <div className="cpu-stat-label">Upload Speed</div>
                        <div className="cpu-stat-value" style={{ color: '#10B981' }}>{txMbps.toFixed(3)} Mbps</div>
                      </div>
                    </div>
                  </div>

                  {/* Network History Charts */}
                  <div className="cpu-chart-card" style={{ marginTop: '1rem' }}>
                    <div className="cpu-chart-header">
                      <h3>Transfer Rate History</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          className="network-clear-btn"
                          onClick={() => {
                            setNetHistory(prev => ({
                              ...prev,
                              [key]: { rx: Array(60).fill(0), tx: Array(60).fill(0) }
                            }));
                          }}
                          title="Clear history"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                          </svg>
                          Clear
                        </button>
                        <span className="cpu-chart-timeframe">Last 60 seconds</span>
                      </div>
                    </div>
                    <div className="cpu-chart-wrapper">
                      <NetworkChart 
                        rxData={hist.rx.map(r => (r * 8) / 1_000_000)} 
                        txData={hist.tx.map(t => (t * 8) / 1_000_000)} 
                      />
                    </div>
                    <div className="cpu-history-stats">
                      <div className="cpu-stat-item">
                        <div className="cpu-stat-label" style={{ color: '#3B82F6' }}>Download</div>
                        <div className="cpu-stat-value-small" style={{ color: '#3B82F6' }}>{rxMbps.toFixed(3)} Mbps</div>
                      </div>
                      <div className="cpu-stat-item">
                        <div className="cpu-stat-label" style={{ color: '#10B981' }}>Upload</div>
                        <div className="cpu-stat-value-small" style={{ color: '#10B981' }}>{txMbps.toFixed(3)} Mbps</div>
                      </div>
                      <div className="cpu-stat-item">
                        <div className="cpu-stat-label">Total Data</div>
                        <div className="cpu-stat-value-small">
                          {fmtSpeed((iface.bytes_received ?? 0) + (iface.bytes_transmitted ?? 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        onConfirm={confirmCleanStorage}
        onCancel={cancelCleanStorage}
      />

      {/* Speed Test Modal */}
      {showSpeedTestModal && (
        <div className="speed-test-modal-backdrop" onClick={() => !speedTestRunning && setShowSpeedTestModal(false)}>
          <div className="speed-test-modal" onClick={(e) => e.stopPropagation()}>
            <div className="speed-test-modal-header">
              <h3>Network Speed Test</h3>
              {!speedTestRunning && (
                <button 
                  className="speed-test-close-btn" 
                  onClick={() => setShowSpeedTestModal(false)}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            
            <div className="speed-test-modal-body">
              {speedTestRunning ? (
                <div className="speed-test-loading">
                  <div className="speed-test-spinner">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="8" fill="none"/>
                      <circle cx="40" cy="40" r="35" stroke="#3B82F6" strokeWidth="8" fill="none" strokeDasharray="220" strokeDashoffset="0" strokeLinecap="round">
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 40 40"
                          to="360 40 40"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </svg>
                  </div>
                  <h4 className="speed-test-loading-text">Running Speed Test...</h4>
                  <p className="speed-test-loading-subtitle">This may take a few moments</p>
                </div>
              ) : speedTestResult ? (
                <div className="speed-test-results-modal">
                  <div className="speed-test-success-icon">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <h4 className="speed-test-results-title">Test Complete!</h4>
                  
                  <div className="speed-test-result-cards">
                    <div className="speed-test-result-card">
                      <div className="speed-test-result-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="speed-test-result-content">
                        <div className="speed-test-result-label">Latency</div>
                        <div className="speed-test-result-value">{speedTestResult.latency_ms} ms</div>
                      </div>
                    </div>

                    <div className="speed-test-result-card">
                      <div className="speed-test-result-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M19 12l-7 7-7-7"/>
                        </svg>
                      </div>
                      <div className="speed-test-result-content">
                        <div className="speed-test-result-label">Download</div>
                        <div className="speed-test-result-value" style={{ color: '#3B82F6' }}>
                          {speedTestResult.download_mbps.toFixed(2)} Mbps
                        </div>
                      </div>
                    </div>

                    <div className="speed-test-result-card">
                      <div className="speed-test-result-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                      </div>
                      <div className="speed-test-result-content">
                        <div className="speed-test-result-label">Upload</div>
                        <div className="speed-test-result-value" style={{ color: '#10B981' }}>
                          {speedTestResult.upload_mbps.toFixed(2)} Mbps
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="speed-test-done-btn"
                    onClick={() => setShowSpeedTestModal(false)}
                  >
                    Done
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Helper function for thermal status
function getThermalStatus(temp: number): string {
  if (temp < 60) return "cool";
  if (temp < 75) return "warm";
  if (temp < 85) return "hot";
  return "critical";
}

function getThermalStatusText(temp: number): string {
  if (temp < 60) return "Cool";
  if (temp < 75) return "Warm";
  if (temp < 85) return "Hot";
  return "Critical";
}
// Helper function for usage color
function getUsageColor(usage: number) {
  if (usage < 50) return "#3B82F6";      // blue for low usage
  if (usage < 80) return "#F59E0B";      // yellow for medium usage
  return "#FF6B6B";                      // red for high usage
}

// Optimized chart component with React.memo to prevent unnecessary re-renders
// Network-specific chart with auto-scaling
const NetworkChart = React.memo(({ rxData, txData }: { rxData: number[]; txData: number[] }) => {
  const width = 1000;
  const height = 400;
  const gridX = 12;
  const gridY = 6;

  // Ensure we always have 60 data points for smooth progression
  const rxChartData = [...Array(60).fill(0), ...rxData].slice(-60);
  const txChartData = [...Array(60).fill(0), ...txData].slice(-60);
  
  // Auto-scale based on max value in the data
  const maxRx = Math.max(...rxChartData, 0.001);
  const maxTx = Math.max(...txChartData, 0.001);
  const maxValue = Math.max(maxRx, maxTx);
  
  // Add 20% padding to max value for better visualization
  const scale = maxValue * 1.2;
  
  // Create points with proper spacing (always 60 points from left to right)
  const rxPoints = rxChartData.map((v, i) => `${(i / 59) * width},${height - (v / scale) * height}`).join(' ');
  const rxAreaPoints = `${rxChartData.map((v, i) => `${(i / 59) * width},${height - (v / scale) * height}`).join(' ')} ${width},${height} 0,${height}`;
  
  const txPoints = txChartData.map((v, i) => `${(i / 59) * width},${height - (v / scale) * height}`).join(' ');
  const txAreaPoints = `${txChartData.map((v, i) => `${(i / 59) * width},${height - (v / scale) * height}`).join(' ')} ${width},${height} 0,${height}`;

  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid')?.trim() || '#e5e7eb';
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg')?.trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#0b1220' : '#f8f9fa');

  return (
    <svg width={width} height={height} style={{ background: bgColor, borderRadius: 8, display: 'block' }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[...Array(gridX)].map((_, i) => (
        <line
          key={`vx${i}`}
          x1={(i / (gridX - 1)) * width}
          y1={0}
          x2={(i / (gridX - 1)) * width}
          y2={height}
          stroke={gridColor}
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
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
      {/* Download (RX) - Blue */}
      <polygon points={rxAreaPoints} fill="#3B82F622" />
      <polyline fill="none" stroke="#3B82F6" strokeWidth="3" points={rxPoints} />
      
      {/* Upload (TX) - Green */}
      <polygon points={txAreaPoints} fill="#10B98122" />
      <polyline fill="none" stroke="#10B981" strokeWidth="2" points={txPoints} />
      
      {/* Scale indicator */}
      <text x={width - 10} y={20} fill="var(--perf-text-secondary)" fontSize="12" textAnchor="end">
        Max: {scale.toFixed(2)} Mbps
      </text>
    </svg>
  );
});

const SimpleChart = React.memo(({ data, color, size = "large" }: { data: number[]; color: string; size?: "large" | "small" }) => {
  const width = size === "large" ? 1000 : 220;
  const height = size === "large" ? 400 : 80;
  const gridX = size === "large" ? 12 : 6;
  const gridY = size === "large" ? 6 : 4;

  const chartData = data.slice(-60);
  const points = chartData.map((v, i) => `${(i / 59) * width},${height - (v / 100) * height}`).join(' ');
  const areaPoints = `${chartData.map((v, i) => `${(i / 59) * width},${height - (v / 100) * height}`).join(' ')} ${width},${height} 0,${height}`;

  // use CSS variables --chart-bg and --chart-grid; fallback to sensible defaults
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid')?.trim() || '#e5e7eb';
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg')?.trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#0b1220' : '#f8f9fa');

  return (
    <svg width={width} height={height} style={{ background: bgColor, borderRadius: 8, display: 'block' }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[...Array(gridX)].map((_, i) => (
        <line
          key={`vx${i}`}
          x1={(i / (gridX - 1)) * width}
          y1={0}
          x2={(i / (gridX - 1)) * width}
          y2={height}
          stroke={gridColor}
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
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
      <polygon points={areaPoints} fill={color + "22"} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}, (prevProps, nextProps) => {
  // Only re-render if data or styling actually changed
  return JSON.stringify(prevProps.data.slice(-10)) === JSON.stringify(nextProps.data.slice(-10)) &&
         prevProps.color === nextProps.color &&
         prevProps.size === nextProps.size;
});

const IpCell = React.memo(({ ip_addresses }: { ip_addresses: string[] }) => {
  // respect global user preference (settings) for auto-reveal
  const defaultReveal = typeof window !== 'undefined' && localStorage.getItem('reveal_ips') === 'true';
  const [revealed, setRevealed] = useState<boolean>(defaultReveal);

  // sanitize addresses (remove falsy entries)
  const addresses = (ip_addresses ?? []).filter(Boolean);

  const display = revealed
    ? (addresses.length > 0 ? addresses.join(', ') : 'N/A')
    : 'Hidden for privacy';

  return (
    <span
      style={{
        color: revealed ? 'var(--perf-text-primary)' : 'var(--perf-text-secondary)',
        fontStyle: revealed ? 'normal' : 'italic',
        cursor: 'pointer',
      }}
      title={revealed ? '' : 'Click to reveal'}
      onClick={() => setRevealed(true)}
    >
      {display}
    </span>
  );
});

const DiskUsagePieChart = React.memo(({ disks }: { disks: any[] }) => {
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
          className="disk-pie-chart-value"
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
}, (prevProps, nextProps) => {
  // Only re-render if disks array actually changed
  return JSON.stringify(prevProps.disks) === JSON.stringify(nextProps.disks);
});

const CpuLoadPieChart = React.memo(({ usage }: { usage: number }) => {
  const radius = 48;
  const stroke = 18;
  const center = 60;
  const circumference = 2 * Math.PI * radius;
  const usedArc = (usage / 100) * circumference;
  const freeArc = circumference - usedArc;

  // Color based on usage
  const usageColor = getUsageColor(usage);

  return (
    <div className="cpu-load-pie-container">
      <svg width={120} height={120}>
        {/* Background circle (free/idle) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Usage arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={usageColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${usedArc} ${freeArc}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s' }}
        />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.3em"
          fontSize="1.4rem"
          fontWeight="bold"
          fill={usageColor}
        >
          {Math.round(usage)}%
        </text>
      </svg>
      <div className="cpu-load-pie-legend">
        <div className="cpu-load-legend-item">
          <span className="cpu-load-legend-dot" style={{ background: usageColor }}></span>
          <span>Active: {Math.round(usage)}%</span>
        </div>
        <div className="cpu-load-legend-item">
          <span className="cpu-load-legend-dot" style={{ background: '#e5e7eb' }}></span>
          <span>Idle: {Math.round(100 - usage)}%</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return Math.round(prevProps.usage) === Math.round(nextProps.usage);
});

const MemoryUsagePieChart = React.memo(({ used, total }: { used: number; total: number }) => {
  const radius = 48;
  const stroke = 18;
  const center = 60;
  const usedGB = used / 1024 / 1024 / 1024;
  const totalGB = total / 1024 / 1024 / 1024;
  const percentage = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;
  const circumference = 2 * Math.PI * radius;
  const usedArc = (percentage / 100) * circumference;
  const freeArc = circumference - usedArc;

  // Color based on usage
  const usageColor = getUsageColor(percentage);

  return (
    <div className="cpu-load-pie-container">
      <svg width={120} height={120}>
        {/* Background circle (free) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Usage arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={usageColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${usedArc} ${freeArc}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s' }}
        />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.3em"
          fontSize="1.4rem"
          fontWeight="bold"
          fill={usageColor}
        >
          {Math.round(percentage)}%
        </text>
      </svg>
      <div className="cpu-load-pie-legend">
        <div className="cpu-load-legend-item">
          <span className="cpu-load-legend-dot" style={{ background: usageColor }}></span>
          <span>In Use: {usedGB.toFixed(1)} GB ({Math.round(percentage)}%)</span>
        </div>
        <div className="cpu-load-legend-item">
          <span className="cpu-load-legend-dot" style={{ background: '#e5e7eb' }}></span>
          <span>Free: {(totalGB - usedGB).toFixed(1)} GB ({Math.round(100 - percentage)}%)</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  const prevPercent = Math.round((prevProps.used / prevProps.total) * 100);
  const nextPercent = Math.round((nextProps.used / nextProps.total) * 100);
  return prevPercent === nextPercent;
});

export default Performance;