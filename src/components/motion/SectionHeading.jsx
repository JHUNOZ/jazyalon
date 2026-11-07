import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../../lib/motion';

/**
 * Editorial section opener with compact, balanced spacing:
 *   01 — LABEL ─────────────────────────  (aside)
 *   Serif title in Spanish (always visible, zero empty voids)
 */
export default function SectionHeading({ index, label, title, aside, compact = false, className = '' }) {
  const lineRef = useRef(null);
  const titleRef = useRef(null);

  const tokens = title.split(' ');

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.8,
            ease: 'jz',
            scrollTrigger: { trigger: lineRef.current, start: 'top 95%', once: true },
          }
        );
      }
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0.4, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'jz',
            scrollTrigger: { trigger: titleRef.current, start: 'top 95%', once: true },
          }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <header className={`mb-2 sm:mb-3 ${className}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="jz-num text-base sm:text-lg text-[#9E7B3B] font-bold font-mono">{index}</span>
        <span className="jz-label text-[#5E564F] text-[10px] tracking-[0.22em] font-bold">{label}</span>
        <span ref={lineRef} className="jz-line flex-1 bg-[#D6CEBF] origin-left" />
        {aside ? <div className="hidden sm:block">{aside}</div> : null}
      </div>

      <h2
        ref={titleRef}
        className={`jz-display mt-1 sm:mt-1.5 text-[#181514] font-normal tracking-wide ${
          compact ? 'text-[clamp(1.5rem,3.2vw,2.2rem)]' : 'text-[clamp(1.7rem,3.8vw,2.7rem)]'
        }`}
      >
        {tokens.map((token, i) => {
          const emphasised = token.startsWith('*') && token.endsWith('*') && token.length > 2;
          const word = emphasised ? token.slice(1, -1) : token;
          return (
            <React.Fragment key={`${word}-${i}`}>
              {emphasised ? <em className="italic text-[#9E7B3B] font-normal">{word}</em> : word}
              {i < tokens.length - 1 ? ' ' : null}
            </React.Fragment>
          );
        })}
      </h2>
    </header>
  );
}
