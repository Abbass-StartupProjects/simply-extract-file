import { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
};

// Wraps each routed page; runs a short entrance animation whenever the view
// changes so navigating feels intentional instead of an instant swap.
// Uses the browser-native Web Animations API — no JS ticker work, and the
// compositor handles the tween so it stays cheap even on long pages.
export default function PageTransition({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anim = el.animate(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
    );
    return () => anim.cancel();
  }, []);

  return <div ref={ref}>{children}</div>;
}
