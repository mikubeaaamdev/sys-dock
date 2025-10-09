import React from 'react';

interface SysDockLogoProps {
  size?: number;
  className?: string;
}

const SysDockLogo: React.FC<SysDockLogoProps> = ({ size = 120, className = '' }) => {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* SyS Text */}
      <path
        d="M20 40 Q30 20 50 30 Q70 15 90 35 Q110 25 130 40 Q150 30 170 45 Q190 35 210 50 Q230 40 250 55"
        stroke="#2563EB"
        strokeWidth="25"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* y with arrow */}
      <path
        d="M280 30 L300 70 L320 30"
        stroke="#2563EB"
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M300 70 L300 90"
        stroke="#2563EB"
        strokeWidth="25"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrow head */}
      <path
        d="M285 75 L300 90 L315 75"
        stroke="#2563EB"
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* s */}
      <path
        d="M340 40 Q350 30 370 35 Q380 40 375 50 Q370 60 350 55 Q330 50 335 60 Q340 70 360 65"
        stroke="#2563EB"
        strokeWidth="25"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* DOCK Text */}
      <g transform="translate(20, 140)">
        {/* D */}
        <path
          d="M0 0 L0 60 L25 60 Q40 60 40 45 Q40 30 40 15 Q40 0 25 0 Z"
          fill="#2563EB"
        />
        
        {/* O */}
        <ellipse
          cx="85"
          cy="30"
          rx="25"
          ry="30"
          fill="none"
          stroke="#2563EB"
          strokeWidth="20"
        />
        
        {/* C */}
        <path
          d="M170 0 Q140 0 140 30 Q140 60 170 60"
          stroke="#2563EB"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* K */}
        <path
          d="M220 0 L220 60 M220 30 L250 0 M220 30 L250 60"
          stroke="#2563EB"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default SysDockLogo;