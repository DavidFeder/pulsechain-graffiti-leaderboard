import React from 'react';

interface PulseChainLogoProps {
  className?: string;
  size?: number;
}

/**
 * PulseChain official hexagon logo (simplified SVG recreation)
 * Blue to hot magenta gradient + signature white line
 */
export function PulseChainLogo({ className = '', size = 40 }: PulseChainLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="PulseChain logo"
    >
      <defs>
        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#FF00AA" />
        </linearGradient>
      </defs>

      {/* Hexagon */}
      <polygon
        points="50,5 93,27 93,73 50,95 7,73 7,27"
        fill="url(#pulseGradient)"
        stroke="#1a1a2e"
        strokeWidth="3"
      />

      {/* Signature white pulse line */}
      <polyline
        points="20,50 32,38 45,62 58,30 70,55 82,42"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  );
}
