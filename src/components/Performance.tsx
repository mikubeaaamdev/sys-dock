import React, { useState } from 'react';
import './Performance.css';

// Placeholder system specs (replace with real detection if needed)
const systemSpecs = {
  cpu: { name: 'Intel Core i7', cores: 8, speed: '3.6 GHz' },
  memory: { total: 32, used: 9.9, available: 15.9, percent: 62 },
  gpu: { name: 'NVIDIA RTX 3080', vram: '10 GB' },
  disks: [
    { name: 'C:', type: 'SSD', size: '512 GB', used: '200 GB' },
    { name: 'D:', type: 'HDD', size: '1 TB', used: '500 GB' }
  ],
  network: { name: 'WiFi', speed: '300 Mbps' }
};

const tabs = [
  { key: 'cpu', label: 'CPU' },
  { key: 'memory', label: 'MEMORY' },
  { key: 'gpu', label: 'GPU' },
  { key: 'disks', label: 'DISKS' },
  { key: 'network', label: 'NETWORK' }
];

const Performance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('memory');

  return (
    <div className="performance-container">
      <h1 className="performance-title">PERFOR-MANCE</h1>
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
      <div>
        {activeTab === 'memory' && (
          <div className="memory-section">
            {/* Left: Circular Memory Usage */}
            <div className="memory-left">
              <div className="memory-title">Memory</div>
              <div className="memory-circle">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" stroke="#c6e17d" strokeWidth="12" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="#fff"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - systemSpecs.memory.percent / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s' }}
                  />
                </svg>
                <div className="memory-circle-text">
                  {systemSpecs.memory.used} / {systemSpecs.memory.available} GB<br />
                  ({systemSpecs.memory.percent}%)
                </div>
              </div>
              <div className="memory-details">
                In Use (Compressed)<br />
                <span>10.4 GB (535 MB)</span>
                <br /><br />
                Committed<br />
                <span>14.2/18.3 GB</span>
                <br /><br />
                Cached<br />
                <span>5.3 GB</span>
                <br /><br />
                Paged Pool<br />
                <span>468 MB</span>
                <br />
                Non-paged Pool<br />
                <span>460 MB</span>
              </div>
            </div>
            {/* Right: Memory Graph and Details */}
            <div className="memory-right">
              <div className="memory-usage-title">Memory</div>
              <div className="memory-usage-subtitle">Memory Usage</div>
              <div className="memory-graph-container">
                <svg width="100%" height="120" viewBox="0 0 400 120">
                  <polyline
                    fill="none"
                    stroke="#ff6f47"
                    strokeWidth="4"
                    points="0,80 40,40 80,60 120,30 160,70 200,50 240,90 280,60 320,80 360,40 400,80"
                  />
                </svg>
                <div className="memory-graph-label">60 seconds</div>
                <div className="memory-graph-label">Memory Composition</div>
                <div className="memory-composition-bar"></div>
              </div>
              <div className="memory-hardware-details">
                <div>
                  <div>Speed:</div>
                  <div><strong>2400 MHz</strong></div>
                </div>
                <div>
                  <div>Slots Used:</div>
                  <div><strong>2 of 4</strong></div>
                </div>
                <div>
                  <div>Form Factor:</div>
                  <div><strong>DIMM</strong></div>
                </div>
                <div>
                  <div>Hardware Reserved:</div>
                  <div><strong>125 MB</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Add similar sections for CPU, GPU, Disks, Network */}
        {activeTab === 'cpu' && (
          <div>
            <h2>CPU</h2>
            <div>Name: {systemSpecs.cpu.name}</div>
            <div>Cores: {systemSpecs.cpu.cores}</div>
            <div>Speed: {systemSpecs.cpu.speed}</div>
          </div>
        )}
        {activeTab === 'gpu' && (
          <div>
            <h2>GPU</h2>
            <div>Name: {systemSpecs.gpu.name}</div>
            <div>VRAM: {systemSpecs.gpu.vram}</div>
          </div>
        )}
        {activeTab === 'disks' && (
          <div>
            <h2>Disks</h2>
            {systemSpecs.disks.map((disk, idx) => (
              <div key={idx}>
                <div>Name: {disk.name}</div>
                <div>Type: {disk.type}</div>
                <div>Size: {disk.size}</div>
                <div>Used: {disk.used}</div>
                <hr />
              </div>
            ))}
          </div>
        )}
        {activeTab === 'network' && (
          <div>
            <h2>Network</h2>
            <div>Name: {systemSpecs.network.name}</div>
            <div>Speed: {systemSpecs.network.speed}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Performance;