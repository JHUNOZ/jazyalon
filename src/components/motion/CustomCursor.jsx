import React, { useEffect, useRef } from 'react';
import { gsap, hasFinePointer, prefersReducedMotion } from '../../lib/motion';

/**
 * Discreet custom cursor.
 *  - Active only inside elements marked with [data-cursor-zone] (the page body, never the header/footer).
 *  - A tiny dot by default; grows into a disc with a label over elements with data-cursor="Ver" / "Explorar".
 *  - Links and buttons make the dot swell slightly.
 *  - Only on fine pointers and when reduced motion is not requested.
 */
export default function CustomCursor() {
  const followerRef = useRef(null);
  const discRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return undefined;

    const follower = followerRef.current;
    const disc = discRef.current;
    const label = labelRef.current;

    document.documentElement.classList.add('jz-cursor-on');

    const moveX = gsap.quickTo(follower, 'x', { duration: 0.45, ease: 'power3.out' });
    const moveY = gsap.quickTo(follower, 'y', { duration: 0.45, ease: 'power3.out' });

    let state = 'dot';
    const setState = (next, text = '') => {
      if (next === state && label.textContent === text) return;
      state = next;
      label.textContent = text;
      const scale = next === 'label' ? 1 : next === 'link' ? 0.32 : 0.1;
      gsap.to(disc, { scale, duration: 0.6, ease: 'jz', overwrite: 'auto' });
      gsap.to(label, { opacity: next === 'label' ? 1 : 0, duration: 0.35, overwrite: 'auto' });
    };

    const onMove = (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const inZone = !!target?.closest('[data-cursor-zone]');
      gsap.to(follower, { opacity: inZone ? 1 : 0, duration: 0.3, overwrite: 'auto' });
      moveX(e.clientX);
      moveY(e.clientY);
      if (!inZone) return;

      const labelled = target.closest('[data-cursor]');
      if (labelled) setState('label', labelled.getAttribute('data-cursor'));
      else if (target.closest('a, button, input, textarea, select, [role="button"]')) setState('link');
      else setState('dot');
    };

    const onLeave = () => gsap.to(follower, { opacity: 0, duration: 0.3 });

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.documentElement.classList.remove('jz-cursor-on');
    };
  }, []);

  return (
    <div ref={followerRef} className="jz-cursor" aria-hidden="true">
      <span ref={discRef} className="jz-cursor__disc" />
      <span ref={labelRef} className="jz-cursor__label" />
    </div>
  );
}
