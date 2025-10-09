import React from 'react';
import './PerformanceChart.css';

interface PerformanceChartProps {
  title: string;
  percentage: number;
  color: string;
  data: number[];
  className?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title,
  percentage,
  color,
  data,
  className = ''
}) => {
  // Generate SVG path for the line chart
  const generatePath = (data: number[], width: number, height: number) => {
    if (data.length === 0) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const chartWidth = 240;
  const chartHeight = 60;
  const path = generatePath(data, chartWidth, chartHeight);

  return (
    <div className={`performance-chart ${className}`}>
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <span className="chart-percentage">{percentage}%</span>
      </div>
      
      <div className="chart-container">
        <svg 
          width={chartWidth} 
          height={chartHeight} 
          className="chart-svg"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {/* Background grid lines */}
          <defs>
            <pattern id="grid" width="20" height="15" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Chart line */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line"
          />
          
          {/* Gradient fill under the line */}
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`}
            fill={`url(#gradient-${title})`}
          />
        </svg>
      </div>
    </div>
  );
};

export default PerformanceChart;