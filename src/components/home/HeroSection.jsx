import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { HERO_SLIDES } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';
import { gsap, prefersReducedMotion } from '../../lib/motion';
import RevealText from '../motion/RevealText';
import Magnetic from '../motion/Magnetic';

const SLIDE_SECONDS = 6;

export default function HeroSection({ setCurrentView }) {
  const { setSelectedCategory, setSelectedCollection, heroSlides, categories, collections } = useShop();
  const slides = heroSlides?.length ? heroSlides : HERO_SLIDES;
  const [current, setCurrent] = useState(0);

  const sectionRef = useRef(null);
  const mediaRef = useRef(null);
  const contentRef = useRef(null);
  const cardRef = useRef(null);
  const wrapRefs = useRef([]);
  const imgRefs = useRef([]);
  const barRefs = useRef([]);
  const tweenRef = useRef(null);
  const pausedRef = useRef(false);
  const busyRef = useRef(false);
  const prevRef = useRef(0);
  const touchStartX = useRef(null);

  const reduced = prefersReducedMotion();
  const total = slides.length;
  const activeSlide = slides[current] || slides[0] || {};

  const goTo = useCallback((index) => {
    if (busyRef.current || index === prevRef.current) return;
    busyRef.current = true;
    tweenRef.current?.kill();

    const words = contentRef.current?.querySelectorAll('[data-hero-title] .jz-word');
    if (words?.length && !reduced) {
      gsap.to(words, { yPercent: -100, duration: 0.35, stagger: 0.02, ease: 'power2.in' });
    }
    gsap.delayedCall(reduced ? 0 : 0.2, () => setCurrent(index));
    gsap.delayedCall(reduced ? 0 : 1.0, () => { busyRef.current = false; });
  }, [reduced]);

  const goNext = useCallback(() => goTo((prevRef.current + 1) % total), [goTo, total]);
  const goPrev = useCallback(() => goTo((prevRef.current - 1 + total) % total), [goTo, total]);

  /* Initial setup */
  useEffect(() => {
    const ctx = gsap.context(() => {
      wrapRefs.current.forEach((wrap, i) => {
        gsap.set(wrap, { zIndex: i === 0 ? 2 : 1, clipPath: i === 0 ? 'inset(0% 0% 0%)' : 'inset(0% 0% 0% 100%)' });
      });
      if (!reduced) {
        gsap.fromTo(imgRefs.current[0], { scale: 1.15 }, { scale: 1.04, duration: 2.0, ease: 'jz' });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced]);

  /* Slide transition */
  useEffect(() => {
    const prev = prevRef.current;
    const next = current;
    if (prev === next) return undefined;

    const wraps = wrapRefs.current;
    const imgs = imgRefs.current;
    const d = reduced ? 0 : 1;

    gsap.killTweensOf([wraps[next], imgs[next], wraps[prev]]);
    gsap.set(wraps[next], { zIndex: 3, clipPath: 'inset(0% 0% 0% 100%)' });
    gsap.set(imgs[next], { scale: 1.18, xPercent: 4 });

    gsap.timeline({
      defaults: { ease: 'jz' },
      onComplete: () => {
        gsap.set(wraps[prev], { zIndex: 1, clipPath: 'inset(0% 0% 0% 100%)', xPercent: 0 });
        gsap.set(wraps[next], { zIndex: 2 });
      },
    })
      .to(wraps[next], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 * d }, 0)
      .to(imgs[next], { scale: 1.04, xPercent: 0, duration: 1.8 * d }, 0)
      .to(wraps[prev], { xPercent: -6, duration: 1.1 * d }, 0);

    prevRef.current = next;
    return undefined;
  }, [current, reduced]);

  /* Autoplay timer */
  useEffect(() => {
    if (reduced) return undefined;
    const bars = barRefs.current;
    gsap.set(bars, { scaleX: 0 });
    const tween = gsap.to(bars[current], {
      scaleX: 1, duration: SLIDE_SECONDS, ease: 'none', delay: 0.2,
      onComplete: goNext,
    });
    tweenRef.current = tween;
    return () => { tween.kill(); };
  }, [current, reduced, goNext]);

  /* Scroll Parallax (Card stays 100% visible, never disappears) */
  useEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      const st = { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.fromTo(mediaRef.current, { yPercent: 0 }, { yPercent: 6, ease: 'none', scrollTrigger: st });
      gsap.to(contentRef.current, { yPercent: -8, ease: 'none', scrollTrigger: st });
      if (cardRef.current) {
        gsap.to(cardRef.current, { yPercent: -6, ease: 'none', scrollTrigger: st });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  const handleCta = () => {
    const targetKey = (activeSlide.category || '').trim();
    const matchCat = (categories || []).find(
      c => c.id === targetKey || c.name?.toLowerCase() === targetKey.toLowerCase()
    );
    const matchCol = (collections || []).find(
      c => c.id === targetKey || c.name?.toLowerCase() === targetKey.toLowerCase()
    );

    if (matchCat && matchCat.id !== 'all') {
      setSelectedCollection(null);
      setSelectedCategory(matchCat.id);
    } else if (matchCol && matchCol.id !== 'destacados-principal') {
      setSelectedCategory('all');
      setSelectedCollection(matchCol.id);
    } else {
      setSelectedCollection(null);
      setSelectedCategory('all');
    }
    setCurrentView('catalog');
  };

  const scrollToNext = () => {
    const nextEl = document.getElementById('nuevos-ingresos');
    if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth' });
  };

  const pause = (value) => {
    pausedRef.current = value;
    tweenRef.current?.paused(value);
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) goNext();
    if (diff < -50) goPrev();
    touchStartX.current = null;
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carrusel"
      aria-label="Portada JAZYALON"
      className="relative w-full overflow-hidden bg-[var(--jz-bg)] h-[calc(100svh-4.5rem)] min-h-[520px] max-h-[880px] jz-grain group/hero"
      onMouseEnter={() => pause(true)}
      onMouseLeave={() => pause(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* MEDIA BACKGROUND SLIDER WITH FLOATING IDLE EFFECT */}
      <div ref={mediaRef} className="absolute inset-x-0 -top-[8%] h-[116%] will-change-transform" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            ref={(el) => { wrapRefs.current[i] = el; }}
            className="absolute inset-0 will-change-transform overflow-hidden"
          >
            <div className={`h-full w-full ${i === current ? 'animate-hero-float' : ''}`}>
              <img
                ref={(el) => { imgRefs.current[i] = el; }}
                src={slide.image}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover object-center will-change-transform filter brightness-[0.85] contrast-105"
              />
            </div>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/25 to-black/45" />
      </div>

      {/* OVERLAID BRAND BADGE (TOP RIGHT) */}
      <aside
        ref={cardRef}
        className="absolute right-[var(--jz-gutter)] top-6 hidden flex-col items-center border border-[var(--jz-champagne)]/30 bg-black/80 px-4 py-2.5 text-center backdrop-blur-md lg:flex z-30 shadow-xl opacity-100"
      >
        <img src="/images/logos/LOGO_PR.png" alt="JAZYALON" className="h-10 w-auto object-contain" />
        <span className="jz-label mt-1 text-[var(--jz-champagne)] text-[8px] tracking-[0.25em]">Santiago de Chile</span>
      </aside>

      {/* CONTENT BOTTOM (CENTERED AND TIDY) */}
      <div ref={contentRef} className="jz-wrap relative z-20 flex h-full flex-col justify-end pb-5 sm:pb-7 will-change-transform">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto w-full">
          
          <p className="jz-label mb-2 text-white/90 flex items-center justify-center gap-3">
            <span className="jz-num normal-case tracking-normal text-base text-[var(--jz-champagne)]">{String(current + 1).padStart(2, '0')}</span>
            <span className="h-px w-6 sm:w-10 bg-[var(--jz-champagne)]" />
            <span>{activeSlide.tag ? `${activeSlide.tag} • COLECCIÓN JAZYALON` : 'COLECCIÓN PRIMAVERA / VERANO 2026'}</span>
            <span className="h-px w-6 sm:w-10 bg-[var(--jz-champagne)]" />
            <span className="jz-num normal-case tracking-normal text-base text-[var(--jz-champagne)]">{String(total).padStart(2, '0')}</span>
          </p>

          <div data-hero-title key={activeSlide.id} className="flex flex-col items-center justify-center w-full">
            <RevealText
              text={activeSlide.title || 'Corsets Victorianos'}
              as="h1"
              when="scroll"
              start="top 98%"
              delay={0.1}
              stagger={0.06}
              className="jz-display text-[clamp(2.4rem,6.5vw,5.5rem)] text-white text-center max-w-[18ch]"
            />
            {activeSlide.subtitle && (
              <p className="mt-2 max-w-xl text-xs sm:text-sm text-white/85 font-light tracking-wide leading-relaxed drop-shadow">
                {activeSlide.subtitle}
              </p>
            )}
          </div>

          {/* Centered CTA button */}
          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <Magnetic>
              <button type="button" onClick={handleCta} className="jz-btn jz-btn--solid shadow-xl">
                <span>{activeSlide.cta || 'DESCUBRIR COLECCIÓN'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </Magnetic>
            <span className="jz-label text-white/80 text-[10px] hidden sm:inline">
              BALLENAS DE ACERO GENUINO • DESPACHOS A TODO CHILE
            </span>
          </div>

          {/* Slider Controls: Paired closer together with indicator bars */}
          <div className="mt-4 sm:mt-5 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Diapositiva anterior"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-white hover:text-black text-white border border-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center gap-2" role="group" aria-label="Seleccionar diapositiva">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ir a diapositiva ${i + 1}: ${slide.title}`}
                  aria-current={i === current}
                  className="group relative h-4 w-6 sm:w-8"
                >
                  <span className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
                  <span
                    ref={(el) => { barRefs.current[i] = el; }}
                    className="absolute inset-x-0 top-1/2 h-px origin-left bg-[var(--jz-champagne)]"
                    style={{ transform: reduced && i === current ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente diapositiva"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-white hover:text-black text-white border border-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>

        {/* FLECHA INDICADORA PARA DESLIZAR HACIA ABAJO */}
        <div className="flex justify-center pt-2 sm:pt-3">
          <button
            type="button"
            onClick={scrollToNext}
            aria-label="Deslizar a la siguiente sección"
            className="flex flex-col items-center gap-0.5 text-white/60 hover:text-[var(--jz-champagne)] transition-colors animate-bounce"
          >
            <span className="jz-label text-[9px] tracking-[0.3em] uppercase">Deslizar</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
