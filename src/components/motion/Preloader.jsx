import React, { useEffect, useRef, useState } from 'react';
import { gsap, smooth, setReady, prefersReducedMotion } from '../../lib/motion';

const NAME = 'JAZYALON'.split('');

/**
 * Minimalist luxury preloader:
 * - LOGO_NR.png centered above the brand name
 * - Letters rise with crisp masked reveal
 * - Hairline progress bar fills with antique gold
 * - Smooth lift to reveal the hero
 */
export default function Preloader() {
  const rootRef = useRef(null);
  const logoRef = useRef(null);
  const [visible, setVisible] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!visible) {
      setReady();
      return undefined;
    }

    const root = rootRef.current;
    if (!root) return undefined;

    const bar = root.querySelector('[data-bar]');
    const count = root.querySelector('[data-count]');
    const counter = { v: 0 };

    // Prevent scrolling during the short intro
    document.documentElement.style.overflow = 'hidden';
    smooth.lenis?.stop();

    const ctx = gsap.context(() => {
      gsap.set(logoRef.current, { opacity: 0, scale: 0.92, y: 10 });
      gsap.set(bar, { scaleX: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'jz' },
        onComplete: () => {
          document.documentElement.style.overflow = '';
          smooth.lenis?.start();
          setVisible(false);
          setReady();
        },
      });

      tl.to(logoRef.current, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.1)
        .to(bar, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 0.2)
        .to(counter, {
          v: 100, duration: 0.9, ease: 'power2.inOut',
          onUpdate: () => { 
            if (count) count.textContent = String(Math.round(counter.v)).padStart(3, '0'); 
          },
        }, 0.2)
        .to(root.querySelector('[data-center-box]'), { opacity: 0, scale: 0.96, duration: 0.35, ease: 'power2.in' }, 1.15)
        .to(root, { yPercent: -100, duration: 0.65, ease: 'jz' }, 1.3)
        .call(setReady, null, 1.35);
    }, rootRef);

    return () => {
      ctx.revert();
      document.documentElement.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Cargando JAZYALON"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070608] text-[var(--jz-ivory)]"
    >
      <div data-center-box className="flex flex-col items-center text-center px-4">
        {/* LOGO_PR.PNG CENTERED */}
        <img 
          ref={logoRef}
          src="/images/logos/LOGO_PR.png" 
          alt="JAZYALON" 
          className="h-32 sm:h-40 md:h-48 lg:h-52 w-auto max-w-[85vw] object-contain filter drop-shadow-[0_0_40px_rgba(200,169,107,0.45)]"
        />

        <span className="jz-label text-[10px] sm:text-xs tracking-[0.35em] text-[var(--jz-champagne)] mt-5">
          ALTA COSTURA & CORSETS
        </span>

        {/* Hairline Progress Bar */}
        <div className="w-56 sm:w-80 mt-7 h-px bg-white/15 overflow-hidden">
          <div data-bar className="h-full w-full origin-left bg-[var(--jz-champagne)] shadow-[0_0_10px_#C8A96B]" />
        </div>
      </div>

      <div className="absolute bottom-6 inset-x-[var(--jz-gutter)] flex items-center justify-between text-xs text-white/40">
        <span className="jz-label text-[9px]">Santiago de Chile</span>
        <span data-count className="jz-num text-sm tabular-nums text-[var(--jz-champagne)] font-mono">000</span>
      </div>
    </div>
  );
}
