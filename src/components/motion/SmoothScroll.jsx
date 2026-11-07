import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, smooth, prefersReducedMotion } from '../../lib/motion';

/**
 * Walks up from the wheel target: if any ancestor is a scrollable overflow container
 * (modals, cart drawer, mobile menu...) Lenis must NOT hijack the wheel.
 */
const shouldPreventLenis = (node) => {
  let el = node;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.hasAttribute?.('data-lenis-prevent')) return true;
    const { overflowY } = window.getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
};

/**
 * Inertial smooth scroll (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Disabled entirely when the visitor prefers reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      prevent: shouldPreventLenis,
    });
    smooth.lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      smooth.lenis = null;
    };
  }, []);

  return null;
}
