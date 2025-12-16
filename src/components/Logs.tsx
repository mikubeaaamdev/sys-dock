import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import './Logs.css';

interface PerformanceLog {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  disk_usage: number;
  disk_total: number;
}

interface SystemLogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

type TabType = 'performance' | 'events';

const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('performance');
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [filteredSystemLogs, setFilteredSystemLogs] = useState<SystemLogEntry[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setIntervalValue] = useState<number>(5);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<PerformanceLog[]>('get_performance_logs');
      setLogs(result);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch performance logs:', err);
      setError('Failed to fetch performance logs');
      setLoading(false);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<SystemLogEntry[]>('fetch_system_logs');
      setSystemLogs(result);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
      setError('Failed to fetch system logs');
      setLoading(false);
    }
  };

  const startLogging = async () => {
    try {
      await invoke('start_performance_logging', { intervalSecs: interval });
      setIsLogging(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start logging:', err);
      setError('Failed to start performance logging');
    }
  };

  const stopLogging = async () => {
    try {
      await invoke('stop_performance_logging');
      setIsLogging(false);
      await fetchLogs();
    } catch (err) {
      console.error('Failed to stop logging:', err);
      setError('Failed to stop performance logging');
    }
  };

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchLogs();
      invoke<boolean>('is_performance_logging_active').then(async (isActive) => {
        setIsLogging(isActive);
        // Auto-start logging if enabled in settings and not already logging
        if (!isActive && localStorage.getItem('auto_start_logging') === 'true') {
          await startLogging();
        }
      }).catch(() => {});
    } else {
      fetchSystemLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    let refreshInterval: number | undefined;
    if (isLogging && activeTab === 'performance') {
      refreshInterval = window.setInterval(() => {
        fetchLogs();
      }, 3000); // Refresh display every 3 seconds
    }
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [isLogging, activeTab]);

  useEffect(() => {
    let filtered = [...systemLogs];

    if (filterLevel !== 'all') {
      filtered = filtered.filter(log => log.level.toLowerCase() === filterLevel.toLowerCase());
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query)
      );
    }

    setFilteredSystemLogs(filtered);
  }, [systemLogs, filterLevel, searchQuery]);

  const clearLogs = async () => {
    if (activeTab === 'performance') {
      try {
        await invoke('clear_performance_logs');
        setLogs([]);
      } catch (err) {
        console.error('Failed to clear logs:', err);
        setError('Failed to clear logs');
      }
    } else {
      setSystemLogs([]);
      setFilteredSystemLogs([]);
    }
  };

  const exportLogsCSV = async () => {
    try {
      const headers = 'Timestamp,CPU Usage (%),Memory Usage (GB),Memory Total (GB),Disk Usage (GB),Disk Total (GB)\n';
      const rows = logs.map(log =>
        `${log.timestamp},${log.cpu_usage.toFixed(2)},${(log.memory_usage / (1024**3)).toFixed(2)},${(log.memory_total / (1024**3)).toFixed(2)},${(log.disk_usage / (1024**3)).toFixed(2)},${(log.disk_total / (1024**3)).toFixed(2)}`
      ).join('\n');

      const csvContent = headers + rows;
      
      const filePath = await save({
        defaultPath: `performance-logs-${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, csvContent);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export CSV file');
    }
  };

  const exportLogsJSON = async () => {
    try {
      const jsonContent = JSON.stringify(logs, null, 2);
      
      const filePath = await save({
        defaultPath: `performance-logs-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, jsonContent);
      }
    } catch (err) {
      console.error('Failed to export JSON:', err);
      setError('Failed to export JSON file');
    }
  };

  const formatBytes = (bytes: number) => (bytes / (1024 ** 3)).toFixed(2);

  const getLevelClass = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'log-level-error';
      case 'warning':
        return 'log-level-warning';
      case 'info':
        return 'log-level-info';
      default:
        return 'log-level-debug';
    }
  };

  const exportSystemLogs = async () => {
    try {
      const logText = filteredSystemLogs.map(log =>
        `[${log.timestamp}] [${log.level}] [${log.source}] ${log.message}`
      ).join('\n');

      const filePath = await save({
        defaultPath: `system-logs-${new Date().toISOString().split('T')[0]}.txt`,
        filters: [{
          name: 'Text',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, logText);
      }
    } catch (err) {
      console.error('Failed to export system logs:', err);
      setError('Failed to export system logs');
    }
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h1>LOGS</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance Logs
          </button>
          <button
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            System Events
          </button>
        </div>
      </div>

      {activeTab === 'performance' ? (
        <>
          <div className="logs-controls">
            <div className="interval-control">
              <label>Interval (seconds):</label>
              <input
                type="number"
                min="1"
                max="60"
                value={interval}
                onChange={(e) => setIntervalValue(parseInt(e.target.value) || 5)}
                disabled={isLogging}
                className="interval-input"
              />
            </div>
            {!isLogging ? (
              <button onClick={startLogging} className="btn-start">
                Start Logging
              </button>
            ) : (
              <button onClick={stopLogging} className="btn-stop">
                Stop Logging
              </button>
            )}
            <button onClick={fetchLogs} className="btn-refresh" disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={exportLogsCSV} className="btn-export" disabled={logs.length === 0}>
              Export CSV
            </button>
            <button onClick={exportLogsJSON} className="btn-export" disabled={logs.length === 0}>
              Export JSON
            </button>
            <button onClick={clearLogs} className="btn-clear" disabled={isLogging}>
              Clear
            </button>
          </div>

          {error && (
            <div className="logs-error">
              <span>{error}</span>
            </div>
          )}

          {isLogging && (
            <div className="logs-status">
              <span className="status-active">● Logging Active</span>
              <span>Recording every {interval} seconds</span>
            </div>
          )}

          <div className="logs-stats">
            <span>Total Logs: {logs.length}</span>
            {logs.length > 0 && (
              <>
                <span>Avg CPU: {(logs.reduce((acc, l) => acc + l.cpu_usage, 0) / logs.length).toFixed(1)}%</span>
                <span>Avg Memory: {formatBytes(logs.reduce((acc, l) => acc + l.memory_usage, 0) / logs.length)} GB</span>
              </>
            )}
          </div>

          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>CPU Usage</th>
                  <th>Memory Usage</th>
                  <th>Memory Total</th>
                  <th>Disk Usage</th>
                  <th>Disk Total</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-logs">
                      {loading ? 'Loading logs...' : isLogging ? 'Waiting for data...' : 'No logs recorded. Click "Start Logging" to begin.'}
                    </td>
                  </tr>
                ) : (
                  logs.slice().reverse().map((log, index) => (
                    <tr key={index}>
                      <td className="log-timestamp">{log.timestamp}</td>
                      <td className="log-metric">{log.cpu_usage.toFixed(1)}%</td>
                      <td className="log-metric">{formatBytes(log.memory_usage)} GB</td>
                      <td className="log-metric">{formatBytes(log.memory_total)} GB</td>
                      <td className="log-metric">{formatBytes(log.disk_usage)} GB</td>
                      <td className="log-metric">{formatBytes(log.disk_total)} GB</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="logs-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <button onClick={fetchSystemLogs} className="btn-refresh" disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={exportSystemLogs} className="btn-export" disabled={filteredSystemLogs.length === 0}>
              Export
            </button>
            <button onClick={clearLogs} className="btn-clear">
              Clear
            </button>
          </div>

          {error && (
            <div className="logs-error">
              <span>{error}</span>
            </div>
          )}

          <div className="logs-stats">
            <span>Total: {systemLogs.length}</span>
            <span>Filtered: {filteredSystemLogs.length}</span>
            <span className="log-level-error">Errors: {systemLogs.filter(l => l.level.toLowerCase() === 'error').length}</span>
            <span className="log-level-warning">Warnings: {systemLogs.filter(l => l.level.toLowerCase() === 'warning').length}</span>
          </div>

          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredSystemLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="no-logs">
                      {loading ? 'Loading logs...' : 'No logs to display'}
                    </td>
                  </tr>
                ) : (
                  filteredSystemLogs.map((log, index) => (
                    <tr key={index}>
                      <td className="log-timestamp">{log.timestamp}</td>
                      <td className={`log-level ${getLevelClass(log.level)}`}>
                        {log.level}
                      </td>
                      <td className="log-source">{log.source}</td>
                      <td className="log-message">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Logs;
