/**
 * Motion foundation for JAZYALON.
 * - Registers GSAP plugins once.
 * - Defines the single easing used across the whole site: cubic-bezier(0.22, 1, 0.36, 1).
 * - Exposes a tiny "ready" store so entrance animations wait for the preloader.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, CustomEase);

// The one easing curve of the site ("lento, fluido y deliberado").
CustomEase.create('jz', '0.22, 1, 0.36, 1');

export { gsap, ScrollTrigger };

/** True when the visitor asked the OS for less motion. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True for mouse-like devices (enables cursor + magnetic effects). */
export const hasFinePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------------------------------------------------------------------
 * Smooth-scroll instance holder (set by <SmoothScroll />)
 * ------------------------------------------------------------------------- */
export const smooth = { lenis: null };

/** Jump to top without animation (used by page transitions). */
export const scrollToTopNow = () => {
  if (smooth.lenis) smooth.lenis.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
};

/* ---------------------------------------------------------------------------
 * Ready store: entrance animations run immediately without freeze.
 * ------------------------------------------------------------------------- */
const readyState = { done: true, callbacks: new Set() };

export const setReady = () => {
  readyState.done = true;
  readyState.callbacks.forEach((cb) => cb());
  readyState.callbacks.clear();
};

/** Run cb as soon as the intro is finished. Returns a cleanup function. */
export const onReady = (cb) => {
  if (readyState.done) {
    cb();
    return () => {};
  }
  readyState.callbacks.add(cb);
  return () => readyState.callbacks.delete(cb);
};
