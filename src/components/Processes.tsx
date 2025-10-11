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

const Processes: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>("cpu");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [totalMemory, setTotalMemory] = useState<number>(1); // KB

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
    const dir = sortDirection === "asc" ? 1 : -1;
    if (sortColumn === "name") {
      return a.name.localeCompare(b.name) * dir;
    }
    if (sortColumn === "memory") {
      return (getRamPercent(b.memory) - getRamPercent(a.memory)) * dir;
    }
    return (b[sortColumn] - a[sortColumn]) * dir;
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
                RAM (%) {getArrow("memory")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProcesses.map((proc) => (
              <tr key={proc.pid}>
                <td>
                  {proc.icon ? (
                    <img
                      src={`data:image/png;base64,${proc.icon}`}
                      alt="icon"
                      className="process-icon"
                    />
                  ) : (
                    <GearIcon />
                  )}
                </td>
                <td>{proc.name}</td>
                <td>{proc.cpu.toFixed(1)}</td>
                <td>{getRamPercent(proc.memory).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Processes;