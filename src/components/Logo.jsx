const AVAILABLE_SIZES = [64, 128, 256, 512];

function closestSize(minimum) {
  return AVAILABLE_SIZES.find(candidate => candidate >= minimum) || AVAILABLE_SIZES.at(-1);
}

export default function Logo({ size = 32, showText = false, className = '' }) {
  const baseSize = closestSize(size);
  const retinaSize = closestSize(size * 2);
  const highDensitySize = closestSize(size * 4);
  const srcSet = [
    `/logo-mark-${retinaSize}.png 2x`,
    ...(highDensitySize > retinaSize ? [`/logo-mark-${highDensitySize}.png 4x`] : [])
  ].join(', ');

  return (
    <span className={`logo${className ? ` ${className}` : ''}`}>
      <img
        className="logo-mark-image"
        src={`/logo-mark-${baseSize}.png`}
        srcSet={srcSet}
        width={size}
        height={size}
        alt={showText ? '' : 'PrepSense'}
        aria-hidden={showText ? 'true' : undefined}
      />
      {showText && <span className="logo-wordmark">PrepSense</span>}
    </span>
  );
}
