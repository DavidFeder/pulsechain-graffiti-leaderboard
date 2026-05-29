import React from 'react';

// Logo is located at: src/LogoTransparent.png
// (copied from pulsechain-staking-launchpad-validatorstore repo)
import logoSrc from '../LogoTransparent.png';

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
