import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';

let lenis: Lenis | null = null;
let tickerFn: ((time: number) => void) | null = null;

export function initSmoothScroll() {
  if (lenis) return lenis;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if ('scrollBehavior' in document.documentElement.style && window.matchMedia('(pointer: coarse)').matches && !('onwheel' in window)) return null;

  lenis = new Lenis({
    // Frame-rate-independent smoothing: the scroll position eases toward the
    // target every tick. Reads as "silky" without the lag of a fixed duration.
    lerp: 0.1,
    smoothWheel: true,
    // Only smooth the wheel; leave touch alone so mobile stays native-fast.
    syncTouch: false,
    // Elements marked data-lenis-prevent (modals) scroll natively: wheel events
    // over them never scroll the page behind.
    prevent: (node) =>
      node instanceof HTMLElement &&
      (node.hasAttribute('data-lenis-prevent') || !!node.closest('[data-lenis-prevent]')),
  });

  // GSAP ScrollTrigger must hear about Lenis-driven scroll positions,
  // otherwise parallax and pinned sections desync.
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis from GSAP's single shared ticker so scrolling, parallax and
  // reveals all update in one RAF pass; lagSmoothing(0) avoids position jumps
  // after a tab stall.
  tickerFn = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function destroySmoothScroll() {
  if (tickerFn) gsap.ticker.remove(tickerFn);
  tickerFn = null;
  lenis?.destroy();
  lenis = null;
}

export function scrollToTop(immediate = false) {
  if (lenis) {
    lenis.scrollTo(0, { immediate, duration: immediate ? 0 : 0.6 });
  } else {
    window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
  }
}
