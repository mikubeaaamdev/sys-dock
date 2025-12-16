import React, { useEffect, useState, useMemo } from "react";
import { invoke } from '@tauri-apps/api/core';
import "./Processes.css";

type ProcessInfo = {
  name: string;
  cpu: number;      // %
  memory: number;   // KB
  pid: number;
  exe?: string;
  icon?: string | null;
  runtime?: number; // seconds
};

type SortColumn = "name" | "cpu" | "memory";
type SortDirection = "asc" | "desc";

// Helper function to format runtime
const formatRuntime = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Inline SVG gear icon
const GearIcon = () => (
  <svg className="process-icon" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="7" stroke="#888" strokeWidth="2" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#888" strokeWidth="2"/>
  </svg>
);

type GroupedProcesses = {
  name: string;
  exe?: string;
  icon?: string | null;
  processes: ProcessInfo[];
  totalMemory: number;
  totalCpu: number;
};

function groupProcesses(processes: ProcessInfo[]): GroupedProcesses[] {
  const groups: { [key: string]: GroupedProcesses } = {};
  for (const proc of processes) {
    const key = proc.name + (proc.exe || "");
    if (!groups[key]) {
      groups[key] = {
        name: proc.name,
        exe: proc.exe,
        icon: proc.icon,
        processes: [],
        totalMemory: 0,
        totalCpu: 0,
      };
    }
    groups[key].processes.push(proc);
    groups[key].totalMemory += proc.memory;
    groups[key].totalCpu += proc.cpu;
  }
  // Sort groups by total RAM usage descending
  return Object.values(groups).sort((a, b) => b.totalMemory - a.totalMemory);
}

const Processes: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'top'>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>("cpu");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [totalMemory, setTotalMemory] = useState<number>(1); // KB
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pid: number } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<{ pid: number; name: string } | null>(null);
  const [highlightedPid, setHighlightedPid] = useState<number | null>(null);
  const [lastEnded, setLastEnded] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupContextMenu, setGroupContextMenu] = useState<{ x: number; y: number; groupKey: string } | null>(null);
  const [confirmEndGroup, setConfirmEndGroup] = useState<{ groupKey: string; name: string } | null>(null);

  useEffect(() => {
    const fetchProcesses = async () => {
      // Don't refresh if context menu is open or confirm dialog is showing
      if (contextMenu || confirmEnd || groupContextMenu || confirmEndGroup) {
        return;
      }
      
      try {
        const result = await invoke<ProcessInfo[]>("fetch_processes");
        setProcesses(result);
        // Fetch total memory for RAM % calculation
        const sys = await invoke<{ memory: any; total: number }>("fetch_system_overview");
        setTotalMemory(sys.memory?.total || 1);
      } catch (err) {
        console.error('Failed to fetch processes:', err);
      }
    };
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 2000);
    return () => clearInterval(interval);
  }, [contextMenu, confirmEnd, groupContextMenu, confirmEndGroup]);

  // RAM % calculation


  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  const getArrow = (col: SortColumn) => {
    if (sortColumn !== col) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const handleContextMenu = (e: React.MouseEvent, pid: number) => {
    e.preventDefault();
    const proc = processes.find(p => p.pid === pid);
    setContextMenu({ x: e.clientX, y: e.clientY, pid });
    setHighlightedPid(pid); // Highlight the row
    if (proc) setConfirmEnd(null);
  };

  const handleEndTaskClick = (pid: number) => {
    const proc = processes.find(p => p.pid === pid);
    if (proc) setConfirmEnd({ pid, name: proc.name });
    setContextMenu(null);
  };

  const handleConfirmEnd = async () => {
    if (confirmEnd) {
      try {
        await invoke("end_process", { pid: confirmEnd.pid });
        setLastEnded(confirmEnd.name);
      } catch (err) {
        if (typeof err === "string" && err.includes("not found")) {
          setLastEnded(confirmEnd.name); // treat as success
        } else {
          alert("Failed to end process: " + err);
        }
      }
      setConfirmEnd(null);
    }
  };

  const handleCancelEnd = () => setConfirmEnd(null);
  const handleCloseMenu = () => {
    setContextMenu(null);
    setHighlightedPid(null); // Remove highlight when menu closes
  };

  const handleGroupContextMenu = (e: React.MouseEvent, groupKey: string) => {
    e.preventDefault();
    setGroupContextMenu({ x: e.clientX, y: e.clientY, groupKey });
    setConfirmEndGroup(null);
    setExpandedGroup(groupKey);
  };

  const handleEndGroupClick = (groupKey: string) => {
    const group = grouped.find(g => (g.name + (g.exe || "")) === groupKey);
    if (group) setConfirmEndGroup({ groupKey, name: group.name });
    setGroupContextMenu(null);
  };

  const handleConfirmEndGroup = async () => {
    if (confirmEndGroup) {
      const group = grouped.find(g => (g.name + (g.exe || "")) === confirmEndGroup.groupKey);
      if (group) {
        try {
          for (const proc of group.processes) {
            await invoke("end_process", { pid: proc.pid });
          }
          setLastEnded(group.name + " (all processes)");
        } catch (err) {
          alert("Failed to end all processes: " + err);
        }
      }
      setConfirmEndGroup(null);
    }
  };

  const handleCancelEndGroup = () => setConfirmEndGroup(null);

  const handleCloseGroupMenu = () => {
    setGroupContextMenu(null);
    setExpandedGroup(null);
  };

  useEffect(() => {
    // Remove highlight if process disappears (e.g., ended)
    if (highlightedPid !== null && !processes.some(p => p.pid === highlightedPid)) {
      setHighlightedPid(null);
    }
  }, [processes, highlightedPid]);

  useEffect(() => {
    // Remove highlight/context menu if clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.querySelector('.context-menu');
      if (menu && !menu.contains(e.target as Node)) {
        setContextMenu(null);
        setHighlightedPid(null);
        setConfirmEnd(null);
        setGroupContextMenu(null);
        setConfirmEndGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoize grouped processes for better performance
  const grouped = useMemo(() => groupProcesses(processes), [processes]);

  // Memoize sorted groups
  const sortedGroups = useMemo(() => {
    return [...grouped].sort((a, b) => {
      if (sortColumn === "memory") {
        return sortDirection === "asc"
          ? a.totalMemory - b.totalMemory
          : b.totalMemory - a.totalMemory;
      }
      if (sortColumn === "cpu") {
        return sortDirection === "asc"
          ? a.totalCpu - b.totalCpu
          : b.totalCpu - a.totalCpu;
      }
      // Default: sort by name
      return sortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });
  }, [grouped, sortColumn, sortDirection]);

  // Memoize top CPU and RAM users
  const topCpu = useMemo(() => 
    [...grouped].sort((a, b) => b.totalCpu - a.totalCpu).slice(0, 5),
    [grouped]
  );
  
  const topRam = useMemo(() => 
    [...grouped].sort((a, b) => b.totalMemory - a.totalMemory).slice(0, 5),
    [grouped]
  );

  // Memoize resource summary statistics
  const resourceStats = useMemo(() => {
    const totalCpuUsage = processes.reduce((sum, p) => sum + p.cpu, 0);
    const totalRamUsage = processes.reduce((sum, p) => sum + p.memory, 0); // in KB
    const processCount = processes.length;
    const ramPercentage = (totalRamUsage / totalMemory) * 100;
    
    // Calculate warning levels
    const cpuWarning = totalCpuUsage > 90 ? 'critical' : totalCpuUsage > 70 ? 'warning' : 'normal';
    const ramWarning = ramPercentage > 80 ? 'critical' : ramPercentage > 60 ? 'warning' : 'normal';
    
    return {
      totalCpu: totalCpuUsage.toFixed(1),
      totalCpuRaw: totalCpuUsage,
      totalRam: (totalRamUsage / 1024).toFixed(1), // Convert to MB
      totalRamGB: (totalRamUsage / 1024 / 1024).toFixed(2), // Convert to GB
      ramPercentage: ramPercentage.toFixed(1),
      ramPercentageRaw: ramPercentage,
      processCount,
      groupCount: grouped.length,
      cpuWarning,
      ramWarning
    };
  }, [processes, grouped, totalMemory]);

  // Quick action handlers
  const handleEndHighestCpu = async () => {
    if (topCpu.length > 0 && topCpu[0].processes.length > 0) {
      const process = topCpu[0].processes[0];
      setConfirmEnd({ pid: process.pid, name: process.name });
    }
  };

  const handleEndHighestRam = async () => {
    if (topRam.length > 0 && topRam[0].processes.length > 0) {
      const process = topRam[0].processes[0];
      setConfirmEnd({ pid: process.pid, name: process.name });
    }
  };

  return (
    <div className="processes-container">
      <h2 className="processes-title">PROCESSES</h2>
      
      {/* Tabs */}
      <div className="processes-tabs">
        <button
          className={`process-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Processes
        </button>
        <button
          className={`process-tab ${activeTab === 'top' ? 'active' : ''}`}
          onClick={() => setActiveTab('top')}
        >
          Top Usage
        </button>
      </div>

      {/* Top Apps Section - Only show when Top Usage tab is active */}
      {activeTab === 'top' && (
        <>
          {/* Resource Summary Cards */}
          <div className="resource-summary">
            <div className={`summary-card ${resourceStats.cpuWarning === 'critical' ? 'warning-critical' : resourceStats.cpuWarning === 'warning' ? 'warning-alert' : ''}`}>
              <div className="summary-icon cpu-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <div className="summary-info">
                <div className="summary-label">Total CPU Usage</div>
                <div className="summary-value">
                  {resourceStats.totalCpu}%
                  {resourceStats.cpuWarning === 'critical' && <span className="warning-badge">⚠ HIGH</span>}
                  {resourceStats.cpuWarning === 'warning' && <span className="warning-badge alert">⚠</span>}
                </div>
              </div>
            </div>

            <div className={`summary-card ${resourceStats.ramWarning === 'critical' ? 'warning-critical' : resourceStats.ramWarning === 'warning' ? 'warning-alert' : ''}`}>
              <div className="summary-icon ram-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M6 11v4M10 11v4M14 11v4M18 11v4"/>
                </svg>
              </div>
              <div className="summary-info">
                <div className="summary-label">RAM Usage</div>
                <div className="summary-value">
                  {resourceStats.totalRamGB} GB
                  <span className="summary-percentage">({resourceStats.ramPercentage}%)</span>
                  {resourceStats.ramWarning === 'critical' && <span className="warning-badge">⚠ HIGH</span>}
                  {resourceStats.ramWarning === 'warning' && <span className="warning-badge alert">⚠</span>}
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon process-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div className="summary-info">
                <div className="summary-label">Active Processes</div>
                <div className="summary-value">
                  {resourceStats.processCount}
                  <span className="summary-percentage">({resourceStats.groupCount} apps)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="quick-actions">
            <button 
              className="quick-action-btn end-cpu"
              onClick={handleEndHighestCpu}
              disabled={topCpu.length === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              End Highest CPU Process
            </button>
            <button 
              className="quick-action-btn end-ram"
              onClick={handleEndHighestRam}
              disabled={topRam.length === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              End Highest RAM Process
            </button>
          </div>

          <div className="top-apps-section">
          <div className="top-apps-card">
            <h3 className="top-apps-header">Top CPU Usage</h3>
            <div className="top-apps-list">
              {topCpu.map((group, idx) => (
                <div key={idx} className="top-app-item">
                  <div className="top-app-info">
                    <span className="top-app-rank">#{idx + 1}</span>
                    {group.icon ? (
                      <img src={`data:image/png;base64,${group.icon}`} alt="icon" className="top-app-icon" />
                    ) : (
                      <GearIcon />
                    )}
                    <div className="top-app-details">
                      <span className="top-app-name">{group.name}</span>
                      <span className="top-app-runtime">{formatRuntime(group.processes[0]?.runtime)}</span>
                    </div>
                  </div>
                  <span className="top-app-value">{group.totalCpu.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="top-apps-card">
            <h3 className="top-apps-header">Top RAM Usage</h3>
            <div className="top-apps-list">
              {topRam.map((group, idx) => (
                <div key={idx} className="top-app-item">
                  <div className="top-app-info">
                    <span className="top-app-rank">#{idx + 1}</span>
                    {group.icon ? (
                      <img src={`data:image/png;base64,${group.icon}`} alt="icon" className="top-app-icon" />
                    ) : (
                      <GearIcon />
                    )}
                    <div className="top-app-details">
                      <span className="top-app-name">{group.name}</span>
                      <span className="top-app-runtime">{formatRuntime(group.processes[0]?.runtime)}</span>
                    </div>
                  </div>
                  <span className="top-app-value">{(group.totalMemory / 1024).toFixed(1)} MB</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}

      {/* All Processes Table - Only show when All Processes tab is active */}
      {activeTab === 'all' && (
        <div className="processes-table-scroll">
        <table className="processes-table">
          <thead>
            <tr>
              <th></th>
              <th onClick={() => handleSort("name")}>
                Name{getArrow("name")}
              </th>
              <th onClick={() => handleSort("cpu")}>
                CPU (%) {getArrow("cpu")}
              </th>
              <th onClick={() => handleSort("memory")}>
                RAM (MB) {getArrow("memory")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map(group => {
              const groupKey = group.name + (group.exe || "");
              return (
                <React.Fragment key={groupKey}>
                  <tr
                    className={expandedGroup === groupKey ? "highlighted-row" : ""}
                    onClick={() => setExpandedGroup(expandedGroup === groupKey ? null : groupKey)}
                    onContextMenu={e => handleGroupContextMenu(e, groupKey)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      {group.icon ? (
                        <img
                          src={`data:image/png;base64,${group.icon}`}
                          alt="icon"
                          className="process-icon"
                        />
                      ) : (
                        <GearIcon />
                      )}
                    </td>
                    <td>
                      {group.name}
                      {group.processes.length > 1 && (
                        <span style={{ color: "#888", marginLeft: 8 }}>
                          ({group.processes.length})
                        </span>
                      )}
                    </td>
                    <td>{group.totalCpu.toFixed(1)}</td>
                    <td>
                      {/* Only show MB, remove % for RAM */}
                      {(group.totalMemory / 1024).toFixed(1)} MB
                    </td>
                  </tr>
                  {expandedGroup === groupKey && group.processes.map(proc => (
                    <tr
                      key={proc.pid}
                      className={highlightedPid === proc.pid ? "highlighted-row expanded-row" : "expanded-row"}
                      onContextMenu={e => handleContextMenu(e, proc.pid)}
                    >
                      <td></td>
                      <td style={{ paddingLeft: 32 }}>{proc.name} (PID: {proc.pid})</td>
                      <td>{proc.cpu.toFixed(1)}</td>
                      <td>
                        {(proc.memory / 1024).toFixed(1)} MB
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      
      {groupContextMenu && (
        <div
          className="context-menu"
          style={{ top: groupContextMenu.y, left: groupContextMenu.x, position: "fixed", zIndex: 1000 }}
          onMouseLeave={handleCloseGroupMenu}
        >
          <button onClick={() => handleEndGroupClick(groupContextMenu.groupKey)}>End All</button>
        </div>
      )}
      {confirmEndGroup && (
        <div className="context-menu"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            position: "fixed",
            zIndex: 1001
          }}
        >
          <div style={{ padding: "8px 16px" }}>
            End all tasks for <b>{confirmEndGroup.name}</b>?
          </div>
          <button onClick={handleConfirmEndGroup}>Yes</button>
          <button onClick={handleCancelEndGroup}>No</button>
        </div>
      )}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, position: "fixed", zIndex: 1000 }}
          onMouseLeave={handleCloseMenu}
        >
          <button onClick={() => handleEndTaskClick(contextMenu.pid)}>End Task</button>
        </div>
      )}
      {confirmEnd && (
        <div className="context-menu"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            position: "fixed",
            zIndex: 1001
          }}
        >
          <div style={{ padding: "8px 16px" }}>
            End task for <b>{confirmEnd.name}</b>?
          </div>
          <button onClick={handleConfirmEnd}>Yes</button>
          <button onClick={handleCancelEnd}>No</button>
        </div>
      )}
      {lastEnded && (
        <div style={{
          position: "fixed",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#dff0d8",
          color: "#222",
          padding: "8px 24px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 2000
        }}>
          Ended task: <b>{lastEnded}</b>
        </div>
      )}
    </div>
  );
};

export default Processes;