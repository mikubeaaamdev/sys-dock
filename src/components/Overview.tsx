import React from 'react';
import WeatherWidget from './widgets/WeatherWidget';
import CircularProgress from './widgets/CircularProgress';
import PerformanceChart from './widgets/PerformanceChart';
import ReminderWidget from './widgets/ReminderWidget';
import './Overview.css';

const Overview: React.FC = () => {
  // Sample data for charts
  const cpuData = [20, 35, 45, 30, 50, 40, 35, 45, 55, 40, 30, 25, 35, 45, 50, 35];
  const wifiData = [70, 80, 85, 90, 85, 88, 92, 89, 85, 88, 90, 95, 92, 88, 85, 89];
  const gpu0Data = [10, 15, 20, 18, 25, 22, 18, 20, 15, 12, 18, 22, 25, 20, 15, 12];
  const gpu1Data = [5, 8, 12, 10, 15, 12, 8, 10, 7, 5, 8, 12, 15, 10, 7, 7];

  return (
    <div className="overview">
      <div className="overview-grid">
        {/* Left Column - Weather and Reminder */}
        <div className="left-column">
          <WeatherWidget />
          <ReminderWidget />
        </div>
        
        {/* Center Column - Circular Progress */}
        <div className="center-column">
          <CircularProgress
            title="Memory"
            percentage={62}
            color="#4ADE80"
            centerText="9.9/ 15.9 GB"
            subtitle="(62%)"
            className="memory"
          />
          
          <CircularProgress
            title="Disk 0 (C:)"
            percentage={12}
            color="#FF6B6B"
            centerText="HDD"
            subtitle="12%"
            className="disk-primary"
          />
          
          <CircularProgress
            title="Disk 1 (D:)"
            percentage={1}
            color="#22C55E"
            centerText="SSD"
            subtitle="1%"
            className="disk-secondary"
          />
        </div>
        
        {/* Right Column - Performance Charts */}
        <div className="right-column">
          <PerformanceChart
            title="CPU"
            percentage={41}
            color="#EF4444"
            data={cpuData}
            className="cpu"
          />
          
          <PerformanceChart
            title="WIFI"
            percentage={89}
            color="#3B82F6"
            data={wifiData}
            className="wifi"
          />
          
          <PerformanceChart
            title="GPU 0"
            percentage={12}
            color="#3B82F6"
            data={gpu0Data}
            className="gpu-0"
          />
          
          <PerformanceChart
            title="GPU 1"
            percentage={7}
            color="#EF4444"
            data={gpu1Data}
            className="gpu-1"
          />
        </div>
      </div>
    </div>
  );
};

export default Overview;