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
  const getUsageLevel = (pct: number) => {
    if (pct >= 80) return 'high';
    if (pct >= 60) return 'medium';
    return 'low';
  };

  return (
    <div className={`performance-chart ${className} usage-${getUsageLevel(percentage)}`}>
      <div className="chart-header">
        <div className="chart-title-section">
          <span className="chart-title">{title}</span>
          {info && <span className="chart-info">{info}</span>}
        </div>
        <div className="chart-percentage" style={{ color }}>
          {Math.round(percentage)}%
        </div>
      </div>
      
      <div className="chart-content">
        <svg className="chart-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 10, 20, 30].map((val) => (
            <line 
              key={val} 
              x1="0" 
              y1={val} 
              x2="100" 
              y2={val} 
              stroke="currentColor" 
              strokeWidth="0.3" 
              opacity="0.1"
            />
          ))}
          
          {/* Area fill */}
          <defs>
            <linearGradient id={`gradient-${className}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          <polygon
            points={`0,30 ${data.map((val, i) => `${(i / (data.length - 1)) * 100},${30 - val * 0.3}`).join(' ')} 100,30`}
            fill={`url(#gradient-${className})`}
          />
          
          {/* Chart line */}
          <polyline
            points={data.map((val, i) => `${(i / (data.length - 1)) * 100},${30 - val * 0.3}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default PerformanceChart;