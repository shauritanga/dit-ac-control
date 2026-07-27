type DitLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Official DIT logo (`public/dit-logo.png`, from project root `dit-logo.png`). */
export function DitLogo({ size = 40, className = '', title = 'Dar es Salaam Institute of Technology' }: DitLogoProps) {
  return (
    <img
      src="/dit-logo.png"
      width={size}
      height={size}
      alt={title}
      className={`dit-logo ${className}`.trim()}
      draggable={false}
    />
  );
}
