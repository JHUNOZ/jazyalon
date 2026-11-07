import React, { useEffect, useRef } from 'react';
import { gsap, hasFinePointer, prefersReducedMotion } from '../../lib/motion';

/**
 * Magnetic wrapper: the child gently follows the pointer when it gets close, then settles back.
 * Wrap primary CTAs only. Transform-only, no layout cost.
 */
export default function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return undefined;
    const el = ref.current;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.55)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.55)' });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => { xTo(0); yTo(0); };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={`inline-block will-change-transform ${className}`}>
      {children}
    </span>
  );
}
