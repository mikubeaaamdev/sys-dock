import React from 'react';
import './PerformanceChart.css';

interface PerformanceChartProps {
  title: string;
  percentage: number;
  color: string;
  data: number[];
  className?: string;
  info?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title,
  percentage,
  color,
  data,
  className = '',
  info
}) => {
  return (
    <div className={`performance-chart ${className}`}>
      <div className="chart-header">
        <span className="chart-title">{title}</span>
        <span className="chart-percentage">{Math.round(percentage)}%</span>
      </div>
      
      <div className="chart-content">
        <svg className="chart-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 10, 20, 30, 40].map((val) => (
            <line 
              key={val} 
              x1="0" 
              y1={40-val} 
              x2="100" 
              y2={40-val} 
              stroke="rgba(255,255,255,0.1)" 
              strokeWidth="0.5" 
            />
          ))}
          
          {/* Chart line */}
          <polyline
            points={data.map((val, i) => `${(i / (data.length - 1)) * 100},${40 - val * 0.4}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      {info && <div className="chart-info">{info}</div>}
    </div>
  );
};

export default PerformanceChart;