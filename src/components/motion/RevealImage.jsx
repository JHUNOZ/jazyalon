import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../../lib/motion';

/**
 * Editorial image: clip-path curtain reveal on enter + optional scroll parallax.
 * Layout is reserved through `ratio` so there are no layout shifts.
 *
 *  wrap  (clip-path reveal, aspect-ratio)
 *   └─ inner (parallax translate, 120% tall)
 *       └─ img  (scale-down reveal)
 */
export default function RevealImage({
  src,
  alt,
  ratio = '4 / 5',
  className = '',
  imgClassName = '',
  parallax = true,
  from = 'bottom', // 'bottom' | 'left' | 'right'
  eager = false,
  children,
  ...rest
}) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const imgRef = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const wrap = wrapRef.current;

    const insets = {
      bottom: 'inset(100% 0% 0% 0%)',
      left: 'inset(0% 100% 0% 0%)',
      right: 'inset(0% 0% 0% 100%)',
    };

    const ctx = gsap.context(() => {
      gsap.set(wrap, { clipPath: insets[from] });
      gsap.set(imgRef.current, { scale: 1.3 });

      const tl = gsap.timeline({
        defaults: { ease: 'jz' },
        scrollTrigger: { trigger: wrap, start: 'top 88%', once: true },
      });
      tl.to(wrap, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4 }, 0)
        .to(imgRef.current, { scale: 1, duration: 1.9 }, 0);

      if (parallax) {
        gsap.fromTo(
          innerRef.current,
          { yPercent: -7 },
          {
            yPercent: 7, ease: 'none',
            scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        );
      }
    }, wrap);

    return () => ctx.revert();
  }, [from, parallax, src]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`} style={{ aspectRatio: ratio }} {...rest}>
      <div ref={innerRef} className="absolute inset-x-0 -top-[10%] h-[120%] will-change-transform">
        <div className="jz-zoom-target h-full w-full">
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={`h-full w-full object-cover will-change-transform ${imgClassName}`}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
