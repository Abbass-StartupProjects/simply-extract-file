import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

type Props = {
  value: string;
};

export default function CountUp({ value }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Number.parseInt(value, 10);
    if (Number.isNaN(target)) {
      el.textContent = value;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = value;
      return;
    }

    const counter = { current: 0 };
    const tween = gsap.to(counter, {
      current: target,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = `${Math.round(counter.current)}`;
      },
      onComplete: () => {
        el.textContent = value;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value]);

  return <span ref={ref}>{value}</span>;
}
