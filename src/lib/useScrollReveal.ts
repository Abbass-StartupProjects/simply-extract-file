import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Failsafe marker: CSS keeps .reveal elements visible until this hook has
    // successfully started, so a script error or unsupported browser can never
    // leave content permanently invisible.
    document.documentElement.classList.add('js-reveal-ok');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion or very old browsers: reveal everything at once, no GSAP.
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      container.querySelectorAll('.reveal').forEach((el) => el.classList.add('revealed'));
      return;
    }

    // Plain 2D fade-and-rise only: 3D transforms (rotationX/perspective) make
    // text-heavy cards rasterize and look blurry, and scale causes subpixel
    // jitter on grids. This keeps reveals crisp and cheap to composite.
    const REVEAL_FROM = { opacity: 0, y: 24 };
    const REVEAL_TO = {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: 'power2.out',
      overwrite: true,
    };

    const cleanup = (el: Element) => {
      gsap.set(el, { clearProps: 'all' });
      el.classList.remove('reveal', 'revealed');
    };

    // Elements currently animating; scan() must skip them or any DOM mutation
    // (e.g. a vote-error message appearing) would restart their tween.
    const inFlight = new WeakSet<Element>();

    const animate = (els: Element[]) => {
      const fresh = els.filter((el) => !inFlight.has(el));
      if (fresh.length === 0) return;
      fresh.forEach((el) => inFlight.add(el));
      gsap.fromTo(fresh, REVEAL_FROM, {
        ...REVEAL_TO,
        stagger: 0.06,
        onComplete: () => {
          fresh.forEach((el) => {
            inFlight.delete(el);
            cleanup(el);
          });
        },
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
        if (entering.length === 0) return;
        entering.forEach((el) => {
          el.classList.add('revealed');
          observer.unobserve(el);
        });
        // Stagger overlaps when several cards enter the viewport in the same
        // frame (e.g. a whole grid row).
        animate(entering);
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const scan = () => {
      // Reveal anything already inside the viewport (e.g. cards that loaded
      // in place while the user is looking at that section) and observe the rest.
      container.querySelectorAll('.reveal:not(.revealed)').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('revealed');
          animate([el]);
        } else {
          observer.observe(el);
        }
      });
    };

    scan();

    // Content that renders after mount (e.g. data fetched from the database)
    // must also be picked up, or it would stay invisible.
    const mutation = new MutationObserver(scan);
    mutation.observe(container, { childList: true, subtree: true });

    // One last sweep once everything has loaded, in case of timing edge cases.
    const onLoad = () => scan();
    window.addEventListener('load', onLoad, { once: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener('load', onLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
