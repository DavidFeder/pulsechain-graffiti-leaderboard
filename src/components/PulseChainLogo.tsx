import React from 'react';

interface PulseChainLogoProps {
  className?: string;
  size?: number;
}

/**
 * PulseChain / ValidatorStore logo
 * Loaded from: https://github.com/DavidFeder/pulsechain-staking-launchpad-validatorstore
 */
export function PulseChainLogo({ className = '', size = 40 }: PulseChainLogoProps) {
  return (
    <img
      src="https://raw.githubusercontent.com/DavidFeder/pulsechain-staking-launchpad-validatorstore/main/LogoTransparent.png"
      alt="PulseChain Logo"
      width={size}
      height={size}
      className={`${className} object-contain`}
      loading="eager"
    />
  );
}
