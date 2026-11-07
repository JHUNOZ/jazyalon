import React, { useCallback, useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, scrollToTopNow, prefersReducedMotion } from '../../lib/motion';

/**
 * Fluid page transitions between views (home / catalog / wishlist / contact).
 *
 * `navigate` is a drop-in replacement for `setCurrentView`: header, footer and sections keep calling it
 * exactly as before. When the view really changes, a carbon curtain covers the content instantly,
 * the view swaps underneath, and the curtain wipes upwards to unveil the new page.
 * (The header stays above the curtain, so navigation never disappears.)
 *
 * Usage:
 *   const { navigate, curtainRef } = usePageTransition(currentView, setCurrentView);
 *   <div ref={curtainRef} className="jz-curtain"><span ...>JAZYALON</span></div>
 */
export function usePageTransition(currentView, setCurrentView) {
  const curtainRef = useRef(null);
  const viewRef = useRef(currentView);
  const mountedRef = useRef(false);

  useEffect(() => { viewRef.current = currentView; }, [currentView]);

  // After every view swap, recalculate trigger positions for the new DOM.
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return undefined; }
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [currentView]);

  const navigate = useCallback((view) => {
    const curtain = curtainRef.current;

    if (view === viewRef.current || !curtain || prefersReducedMotion()) {
      setCurrentView(view);
      return;
    }

    const mark = curtain.querySelector('[data-mark]');
    gsap.killTweensOf([curtain, mark]);

    // 1. Cover instantly (no flash of the old/new page), 2. swap view, 3. wipe upwards.
    gsap.set(curtain, { scaleY: 1, transformOrigin: '50% 0%' });
    gsap.set(mark, { opacity: 1, y: 0 });
    setCurrentView(view);
    scrollToTopNow();

    gsap.timeline({ defaults: { ease: 'jz' } })
      .to(mark, { opacity: 0, y: -16, duration: 0.5 }, 0.1)
      .to(curtain, { scaleY: 0, duration: 1, transformOrigin: '50% 0%' }, 0.28);
  }, [setCurrentView]);

  return { navigate, curtainRef };
}

/** The curtain element itself. */
export const Curtain = React.forwardRef(function Curtain(_, ref) {
  return (
    <div ref={ref} className="jz-curtain" aria-hidden="true">
      <span data-mark className="jz-display text-[clamp(2rem,6vw,4.5rem)] tracking-[0.2em] text-[var(--jz-ivory)]">
        JAZYALON
      </span>
    </div>
  );
});
