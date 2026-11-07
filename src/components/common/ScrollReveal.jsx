import React, { useEffect, useRef, useState } from 'react';

export default function ScrollReveal({ 
  children, 
  className = "", 
  threshold = 0.08,
  delay = 0 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down');
  const domRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Enters viewport: visible. Exits viewport: reversibly fades away
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: "-20px 0px -20px 0px"
      }
    );

    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [threshold]);

  return (
    <div
      ref={domRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform ${
        isVisible 
          ? 'opacity-100 scale-100 translate-y-0 filter-none pointer-events-auto' 
          : scrollDirection === 'down'
            ? 'opacity-0 scale-[0.96] translate-y-16 blur-[1px] pointer-events-none'
            : 'opacity-0 scale-[0.96] -translate-y-12 blur-[1px] pointer-events-none'
      } ${className}`}
    >
      {children}
    </div>
  );
}
