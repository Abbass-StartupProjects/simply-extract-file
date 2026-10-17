import { useRef, type CSSProperties, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** Glow tint as an rgb triplet, e.g. "37, 99, 235" */
  glow?: string;
};

// React Bits-style spotlight card: a soft radial light follows the pointer.
// Implemented with CSS custom properties only — no re-renders, no observers,
// mousemove writes two variables and the browser does the rest on the GPU.
export default function SpotlightCard({ children, className = '', glow = '37, 99, 235' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--spotlight-x', `${e.clientX - r.left}px`);
    el.style.setProperty('--spotlight-y', `${e.clientY - r.top}px`);
  };

  const style = {
    '--spotlight-glow': glow,
  } as CSSProperties;

  return (
    <div ref={ref} onMouseMove={onMove} className={`spotlight-card ${className}`} style={style}>
      {children}
    </div>
  );
}
