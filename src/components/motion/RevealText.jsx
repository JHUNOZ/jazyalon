import React, { useLayoutEffect, useRef } from 'react';
import { gsap, onReady, prefersReducedMotion } from '../../lib/motion';

/**
 * Word-by-word masked reveal (each word slides up from behind its own clip).
 *
 * - `text` supports *emphasis*: words wrapped in asterisks become italic champagne (via .jz-display em).
 * - `when="scroll"` (default) plays when the heading enters the viewport.
 * - `when="ready"` plays right after the preloader finishes (used by the hero).
 * - Accessible: the real text lives in aria-label, the split spans are aria-hidden.
 */
export default function RevealText({
  text,
  as: Tag = 'h2',
  className = '',
  when = 'scroll',
  delay = 0,
  stagger = 0.075,
  duration = 1.15,
  start = 'top 96%',
}) {
  const ref = useRef(null);
  const tokens = text.split(' ');
  const plain = text.replace(/\*/g, '');

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const el = ref.current;
    const words = el.querySelectorAll('.jz-word');
    let offReady = () => {};

    const ctx = gsap.context(() => {
      gsap.set(words, { yPercent: 118 });
      const play = () =>
        gsap.to(words, { yPercent: 0, duration, delay, stagger, ease: 'jz', overwrite: 'auto' });

      if (when === 'ready') {
        offReady = onReady(play);
      } else {
        gsap.to(words, {
          yPercent: 0, duration, delay, stagger, ease: 'jz',
          scrollTrigger: { trigger: el, start, once: true },
        });
      }
    }, el);

    return () => {
      offReady();
      ctx.revert();
    };
  }, [text, when, delay, stagger, duration, start]);

  return (
    <Tag ref={ref} className={className} aria-label={plain}>
      {tokens.map((token, i) => {
        const emphasised = token.startsWith('*') && token.endsWith('*') && token.length > 2;
        const word = emphasised ? token.slice(1, -1) : token;
        return (
          <React.Fragment key={`${word}-${i}`}>
            <span className="jz-mask" aria-hidden="true">
              <span className="jz-word">{emphasised ? <em>{word}</em> : word}</span>
            </span>
            {i < tokens.length - 1 ? ' ' : null}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}
