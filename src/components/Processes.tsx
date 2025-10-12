import React, { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import "./Processes.css";

type ProcessInfo = {
  name: string;
  cpu: number;      // %
  memory: number;   // KB
  pid: number;
  exe?: string;
  icon?: string | null;
};

type SortColumn = "name" | "cpu" | "memory";
type SortDirection = "asc" | "desc";

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
      const result = await invoke<ProcessInfo[]>("fetch_processes");
      setProcesses(result);
      // Fetch total memory for RAM % calculation
      const sys = await invoke<{ memory: any; total: number }>("fetch_system_overview");
      setTotalMemory(sys.memory?.total || 1);
    };
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 1000);
    return () => clearInterval(interval);
  }, []);

  // RAM % calculation
  const getRamPercent = (memKb: number) =>
    totalMemory > 0 ? ((memKb / totalMemory) * 100) : 0;

  const sortedProcesses = [...processes].sort((a, b) => {
    // Always sort by RAM usage (descending)
    return b.memory - a.memory;
  });

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

  const handleGroupContextMenu = (e: React.MouseEvent, groupKey: string, groupName: string) => {
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

  const grouped = groupProcesses(processes);

  return (
    <div className="processes-container">
      <h2>Processes</h2>
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
                RAM (%) / MB {getArrow("memory")}
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(group => {
              const groupKey = group.name + (group.exe || "");
              return (
                <React.Fragment key={groupKey}>
                  <tr
                    className={expandedGroup === groupKey ? "highlighted-row" : ""}
                    onClick={() => setExpandedGroup(expandedGroup === groupKey ? null : groupKey)}
                    onContextMenu={e => handleGroupContextMenu(e, groupKey, group.name)}
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
                      {getRamPercent(group.totalMemory).toFixed(1)}% / {(group.totalMemory / 1024).toFixed(1)} MB
                    </td>
                  </tr>
                  {expandedGroup === groupKey && group.processes.map(proc => (
                    <tr
                      key={proc.pid}
                      className={highlightedPid === proc.pid ? "highlighted-row" : ""}
                      onContextMenu={e => handleContextMenu(e, proc.pid)}
                      style={{ background: "#f5faff" }}
                    >
                      <td></td>
                      <td style={{ paddingLeft: 32 }}>{proc.name} (PID: {proc.pid})</td>
                      <td>{proc.cpu.toFixed(1)}</td>
                      <td>
                        {getRamPercent(proc.memory).toFixed(1)}% / {(proc.memory / 1024).toFixed(1)} MB
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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