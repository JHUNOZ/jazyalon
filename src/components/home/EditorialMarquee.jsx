import React from 'react';
import Marquee from '../motion/Marquee';

const ITEMS = [
  'NUEVA TEMPORADA DISPONIBLE',
  'AUTÉNTICAS BALLENAS DE ACERO',
  'REDUCCIÓN DE CINTURA 5 A 10 CM',
  'ALTA COSTURA FEMENINA',
  'ENVÍOS GRATIS SOBRE $60.000',
  'ATENCIÓN PERSONALIZADA SANTIAGO DE CHILE',
  'BROCADOS Y ENCAJES EXCLUSIVOS',
];

/** Editorial ticker: serif italics between hairlines. Reacts to scroll velocity. */
export default function EditorialMarquee() {
  return (
    <div className="relative z-20 border-y border-[var(--jz-line)] bg-[var(--jz-bg)] py-5 select-none">
      <Marquee speed={55} repeat={4}>
        {ITEMS.map((text) => (
          <span key={text} className="flex shrink-0 items-center">
            <span className="jz-display whitespace-nowrap px-8 text-2xl italic font-light text-[var(--jz-ivory)] sm:text-3xl">
              {text}
            </span>
            <span className="text-[var(--jz-champagne)]" aria-hidden="true">✦</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}
