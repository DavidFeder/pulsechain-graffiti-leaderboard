interface PulseChainLogoProps {
  className?: string;
  size?: number;
}

/**
 * Lightweight inline SVG logo (replaces the previous ~463 KB PNG).
 * Keeps the magenta/pink PulseChain accent and stays crisp at any size.
 */
export function PulseChainLogo({ className = '', size = 40 }: PulseChainLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PulseChain Logo"
      role="img"
    >
      {/* Soft outer glow circle */}
      <circle cx="32" cy="32" r="30" fill="url(#pulseGlow)" opacity="0.25" />
      {/* Main circle */}
      <circle cx="32" cy="32" r="26" fill="#0a0a0a" stroke="url(#pulseStroke)" strokeWidth="2.5" />
      {/* Inner accent ring */}
      <circle cx="32" cy="32" r="18" stroke="#FF00AA" strokeWidth="1.5" opacity="0.6" />
      {/* Stylized P / pulse mark */}
      <path
        d="M26 22h10c5.5 0 9 3.2 9 8s-3.5 8-9 8H30v10h-4V22zm4 4v8h6c3 0 5-1.6 5-4s-2-4-5-4h-6z"
        fill="url(#pulseFill)"
      />
      <defs>
        <linearGradient id="pulseGlow" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#00D4FF" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#FF00AA" />
        </linearGradient>
        <linearGradient id="pulseStroke" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#00D4FF" />
          <stop offset="1" stopColor="#FF00AA" />
        </linearGradient>
        <linearGradient id="pulseFill" x1="20" y1="20" x2="50" y2="50">
          <stop stopColor="#00D4FF" />
          <stop offset="0.6" stopColor="#FF00AA" />
        </linearGradient>
      </defs>
    </svg>
  );
}
