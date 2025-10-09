import React from 'react';
import './SystemChart.css';

const SystemChart: React.FC = () => {
  return (
    <div className="system-chart glass">
      <div className="chart-container">
        <div style={{ padding: '20px', color: 'white' }}>
          <h3>System Performance Chart</h3>
          <p>Chart.js integration coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default SystemChart;