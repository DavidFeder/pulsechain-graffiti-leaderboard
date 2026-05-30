interface PulseChainLogoProps {
  className?: string;
  size?: number;
}

/**
 * PulseChain / ValidatorStore logo (served from /public)
 */
export function PulseChainLogo({ className = '', size = 40 }: PulseChainLogoProps) {
  return (
    <img
      src="/LogoTransparent.png"
      alt="PulseChain Logo"
      width={size}
      height={size}
      className={`${className} object-contain`}
      loading="eager"
    />
  );
}
