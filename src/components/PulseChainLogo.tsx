import React from 'react';

// Best practice: Place images in src/assets/
// Move LogoTransparent.png into src/assets/LogoTransparent.png if not already there.
import logoSrc from '../assets/LogoTransparent.png';

interface PulseChainLogoProps {
  className?: string;
  size?: number;
}

/**
 * PulseChain / ValidatorStore logo (bundled locally)
 */
export function PulseChainLogo({ className = '', size = 40 }: PulseChainLogoProps) {
  return (
    <img
      src={logoSrc}
      alt="PulseChain Logo"
      width={size}
      height={size}
      className={`${className} object-contain`}
      loading="eager"
    />
  );
}
