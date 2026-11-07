import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../../lib/motion';

/**
 * Fade + translate on scroll. Animates only opacity and transform.
 * - `selector`: animate matching descendants with a stagger instead of the wrapper itself.
 */
export default function Reveal({
  as: Tag = 'div',
  className = '',
  children,
  y = 22,
  delay = 0,
  duration = 0.85,
  stagger = 0.08,
  selector,
  start = 'top 92%',
  ...rest
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const el = ref.current;

    const ctx = gsap.context(() => {
      const targets = selector ? el.querySelectorAll(selector) : el;
      gsap.set(targets, { opacity: 0, y });
      gsap.to(targets, {
        opacity: 1, y: 0, duration, delay, stagger: selector ? stagger : 0, ease: 'jz',
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [selector, y, delay, duration, stagger, start]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
