import React from 'react';

// IMPORTANT:
// Copy LogoTransparent.png from your other repo into:
// src/assets/LogoTransparent.png
// Then commit the image to this repo.
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
