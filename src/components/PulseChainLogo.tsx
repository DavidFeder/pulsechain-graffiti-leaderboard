interface PulseChainLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official PulseChain logo (transparent PNG from the official branding kit).
 * Served from /public/LogoTransparent.png
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
      decoding="async"
    />
  );
}
