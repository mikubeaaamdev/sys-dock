import React from 'react';

interface WeatherIconProps {
  type: 'cloud' | 'sun' | 'rain' | 'cloudy';
  size?: number;
  className?: string;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ type, size = 24, className = '' }) => {
  const renderIcon = () => {
    switch (type) {
      case 'cloud':
        return (
          <path
            d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
            fill="currentColor"
          />
        );
      case 'cloudy':
        return (
          <>
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="currentColor" opacity="0.7"/>
            <circle cx="12" cy="6" r="4" fill="#FFD700"/>
          </>
        );
      case 'sun':
        return (
          <>
            <circle cx="12" cy="12" r="5" fill="#FFD700"/>
            <line x1="12" y1="1" x2="12" y2="3" stroke="#FFD700" strokeWidth="2"/>
            <line x1="12" y1="21" x2="12" y2="23" stroke="#FFD700" strokeWidth="2"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#FFD700" strokeWidth="2"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#FFD700" strokeWidth="2"/>
            <line x1="1" y1="12" x2="3" y2="12" stroke="#FFD700" strokeWidth="2"/>
            <line x1="21" y1="12" x2="23" y2="12" stroke="#FFD700" strokeWidth="2"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#FFD700" strokeWidth="2"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#FFD700" strokeWidth="2"/>
          </>
        );
      case 'rain':
        return (
          <>
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="currentColor"/>
            <line x1="8" y1="21" x2="9" y2="23" stroke="#4A90E2" strokeWidth="2"/>
            <line x1="13" y1="21" x2="14" y2="23" stroke="#4A90E2" strokeWidth="2"/>
            <line x1="18" y1="21" x2="19" y2="23" stroke="#4A90E2" strokeWidth="2"/>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {renderIcon()}
    </svg>
  );
};

export default WeatherIcon;