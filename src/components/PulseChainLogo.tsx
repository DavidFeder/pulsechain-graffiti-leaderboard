interface PulseChainLogoProps {
  className?: string
  size?: number
}

/**
 * Official-style PulseChain logo as a lightweight SVG.
 * Matches the purple hexagon + pulse mark used in PulseChain branding.
 * Replaces the previous ~450 KB PNG for much faster loads.
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
      <defs>
        <linearGradient id="plsHex" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B2FF7" />
          <stop offset="0.55" stopColor="#A855F7" />
          <stop offset="1" stopColor="#FF00AA" />
        </linearGradient>
        <linearGradient id="plsPulse" x1="18" y1="32" x2="46" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0B3FF" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E0B3FF" />
        </linearGradient>
      </defs>

      {/* Hexagon */}
      <path
        d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
        fill="url(#plsHex)"
      />

      {/* Inner pulse / waveform mark */}
      <path
        d="M16 33.5 H22 L26 22 L32 42 L38 26 L42 33.5 H48"
        stroke="url(#plsPulse)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
