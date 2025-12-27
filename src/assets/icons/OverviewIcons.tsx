import React from 'react';

// CPU Icon
export const CpuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 2h10v2h2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h-2v2H7v-2H5v-2H3v-2h2v-2H3v-2h2V8H3V6h2V4h2V2zm2 4v12h6V6H9z"/>
  </svg>
);

// Memory/RAM Icon
export const MemoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z"/>
  </svg>
);

// Processes/Activity Icon
export const ProcessesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
    <path d="M20 19H4V5h16v14z" opacity="0.3"/>
    <rect x="4" y="5" width="16" height="14" fill="none" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

// Uptime/Clock Icon
export const UptimeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </svg>
);

// Storage/Disk Icon
export const StorageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16z"/>
    <circle cx="6" cy="6" r="1.5"/>
    <circle cx="6" cy="12" r="1.5"/>
    <circle cx="6" cy="18" r="1.5"/>
    <rect x="9" y="5" width="11" height="2"/>
    <rect x="9" y="11" width="11" height="2"/>
    <rect x="9" y="17" width="11" height="2"/>
  </svg>
);

// Health/Status Icon
export const HealthIcon: React.FC<{ className?: string; status?: 'excellent' | 'good' | 'warning'; style?: React.CSSProperties }> = ({ className, status = 'excellent', style }) => {
  if (status === 'warning') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>
    );
  }
  
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
};
