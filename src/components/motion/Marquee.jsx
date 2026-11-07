import React, { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';

/**
 * Infinite text marquee driven by GSAP.
 * Scrolling speeds it up and flips its direction with the scroll direction, then it calms down again.
 * Static when the visitor prefers reduced motion.
 *
 * `children` is one "unit" of content; it is repeated `repeat` times to fill the track.
 */
export default function Marquee({ children, speed = 60, className = '', repeat = 4, ariaHidden = true }) {
  const trackRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const track = trackRef.current;
    let dir = 1;
    let extra = 0;

    const ctx = gsap.context(() => {
      // One unit = 100/repeat % of the track. Percent-based so it stays correct on resize.
      const unitPx = track.scrollWidth / repeat;
      const loop = gsap.to(track, {
        xPercent: -100 / repeat,
        duration: Math.max(unitPx / speed, 8),
        ease: 'none',
        repeat: -1,
      });

      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          dir = self.direction === 1 ? 1 : -1;
          extra = Math.min(Math.abs(self.getVelocity()) / 400, 4);
        },
      });

      const tick = () => {
        extra *= 0.94; // decay back to the calm base speed
        loop.timeScale(dir * (1 + extra));
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    }, track);

    return () => ctx.revert();
  }, [speed, repeat]);

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden={ariaHidden}>
      <div ref={trackRef} className="jz-marquee">
        {Array.from({ length: repeat }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center">{children}</div>
        ))}
      </div>
    </div>
  );
}
