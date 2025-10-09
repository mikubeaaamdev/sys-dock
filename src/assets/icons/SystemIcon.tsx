import React from 'react';

interface SystemIconProps {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'gpu' | 'wifi' | 'reminder' | 'home' | 'settings' | 'performance' | 'storage' | 'widgets' | 'tools' | 'favorites';
  size?: number;
  className?: string;
}

const SystemIcon: React.FC<SystemIconProps> = ({ type, size = 24, className = '' }) => {
  const renderIcon = () => {
    switch (type) {
      case 'cpu':
        return (
          <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
        );
      case 'memory':
        return (
          <>
            <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="6" y="8" width="2" height="8" fill="currentColor"/>
            <rect x="10" y="8" width="2" height="8" fill="currentColor"/>
            <rect x="14" y="8" width="2" height="8" fill="currentColor"/>
          </>
        );
      case 'disk':
        return (
          <>
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </>
        );
      case 'network':
        return (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </>
        );
      case 'gpu':
        return (
          <>
            <rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="6" y="10" width="12" height="4" fill="currentColor"/>
          </>
        );
      case 'wifi':
        return (
          <>
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9z" fill="currentColor"/>
            <path d="M5 13l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.86 9.14 5 13z" fill="currentColor"/>
            <path d="M9 17l2 2c.55-.55 1.45-.55 2 0l2-2C13.78 15.78 10.22 15.78 9 17z" fill="currentColor"/>
          </>
        );
      case 'reminder':
        return (
          <>
            <path d="M9 1v6l3-3 3 3V1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="4" y="7" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
            <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2"/>
            <line x1="8" y1="15" x2="12" y2="15" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'home':
        return (
          <>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" strokeWidth="2"/>
            <polyline points="9,22 9,12 15,12 15,22" fill="none" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'performance':
        return (
          <>
            <polyline points="22,6 13.5,15.5 8.5,10.5 2,17" fill="none" stroke="currentColor" strokeWidth="2"/>
            <polyline points="16,6 22,6 22,12" fill="none" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'storage':
        return (
          <>
            <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" fill="none" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'widgets':
        return (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'tools':
        return (
          <>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </>
        );
      case 'favorites':
        return (
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor"/>
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

export default SystemIcon;