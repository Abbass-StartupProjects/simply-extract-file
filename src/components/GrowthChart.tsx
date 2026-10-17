type Props = {
  className?: string;
};

// Stock-ticker style uptrend that sweeps across the hero — the growth
// metaphor. Pure SVG + CSS: the line draws itself once via dash-offset,
// the area fades in behind it, and the tip pulses. No script, no observers.
export default function GrowthChart({ className = '' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 320"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="growth-line" x1="0" y1="320" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="0.55" stopColor="#fdb81e" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdb81e" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fdb81e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area under the curve */}
      <path
        className="chart-area"
        d="M0,296 L90,282 L170,290 L260,244 L340,256 L430,208 L520,222 L610,168 L700,182 L790,128 L880,142 L970,84 L1060,96 L1200,28 L1200,320 L0,320 Z"
        fill="url(#growth-area)"
      />

      {/* The trend line */}
      <path
        className="chart-line"
        pathLength={1}
        d="M0,296 L90,282 L170,290 L260,244 L340,256 L430,208 L520,222 L610,168 L700,182 L790,128 L880,142 L970,84 L1060,96 L1200,28"
        stroke="url(#growth-line)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.45))' }}
      />

      {/* Pulsing tip at the end of the trend */}
      <circle className="chart-tip" cx="1200" cy="28" r="5" fill="#34d399" />
      <circle className="chart-tip-ring" cx="1200" cy="28" r="5" stroke="#34d399" fill="none" />
    </svg>
  );
}
