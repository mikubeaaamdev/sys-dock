import React from 'react';
import './CircularProgress.css';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  backgroundColor?: string;
  title: string;
  subtitle: string;
  centerText?: string;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color,
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  title,
  subtitle,
  centerText,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`circular-progress ${className}`}>
      <div className="progress-header">
        <h3 className="progress-title">{title}</h3>
        <span className="progress-percentage">{percentage}%</span>
      </div>
      
      <div className="progress-container">
        <svg width={size} height={size} className="progress-svg">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="progress-circle"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        
        <div className="progress-center">
          {centerText && <span className="center-text">{centerText}</span>}
          <span className="progress-subtitle">{subtitle}</span>
        </div>
      </div>
    </div>
  );
};

export default CircularProgress;