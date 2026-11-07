import React, { useState } from 'react';
import { Plus, Minus, MessageCircle, Ruler } from 'lucide-react';
import { FAQ_ITEMS } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';
import SectionHeading from '../motion/SectionHeading';
import Reveal from '../motion/Reveal';

export default function FaqSection() {
  const { setIsSizeGuideOpen } = useShop();
  const [openIndex, setOpenIndex] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('all');

  const topicFilters = [
    { id: 'all', label: 'Todas' },
    { id: 'tallas', label: 'Tallas & Medidas' },
    { id: 'envios', label: 'Envíos Chile' },
    { id: 'corsets', label: 'Ballenas & Calce' }
  ];

  const filteredFaqs = FAQ_ITEMS.filter((item, idx) => {
    if (selectedTopic === 'all') return true;
    if (selectedTopic === 'tallas') return idx === 0;
    if (selectedTopic === 'envios') return idx === 1 || idx === 3;
    if (selectedTopic === 'corsets') return idx === 2;
    return true;
  });

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" data-cursor-zone className="jz-section">
      <div className="jz-wrap">
        <SectionHeading
          index="05"
          label="PREGUNTAS FRECUENTES // GUÍA DE COMPRA"
          title="Información & *QA*"
        />

        {/* Filter Pills */}
        <Reveal y={10} className="mt-3 flex flex-wrap gap-x-6 gap-y-2 sm:mt-4" role="tablist" aria-label="Filtrar preguntas">
          {topicFilters.map((tab) => {
            const active = selectedTopic === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedTopic(tab.id);
                  setOpenIndex(null);
                }}
                className={`jz-label relative pb-1 transition-colors duration-300 ${
                  active ? 'text-[var(--jz-ivory)] font-bold' : 'text-[var(--jz-sand-dim)] hover:text-[var(--jz-ivory)]'
                }`}
              >
                {tab.label}
                <span
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--jz-champagne)] transition-transform duration-300 [transition-timing-function:var(--jz-ease)] ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </Reveal>

        {/* Minimalist Editorial Accordion Rows */}
        <Reveal selector="[data-faq-row]" stagger={0.04} y={15} className="mt-4 border-t border-[var(--jz-line)] sm:mt-6">
          {filteredFaqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                data-faq-row
                className="border-b border-[var(--jz-line)] transition-colors duration-300 hover:bg-white/[0.01]"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(index)}
                  className="flex w-full items-start justify-between gap-4 py-3.5 text-left sm:py-4.5"
                >
                  <div className="flex items-start gap-4 sm:gap-6 min-w-0">
                    <span className="jz-num pt-0.5 text-base text-[var(--jz-sand-dim)] font-mono">
                      0{index + 1}
                    </span>
                    <h3 className="jz-display text-[1.2rem] sm:text-[1.45rem] leading-tight text-[var(--jz-ivory)] font-light">
                      {item.question}
                    </h3>
                  </div>

                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-xl text-[var(--jz-champagne)] transition-transform duration-300 [transition-timing-function:var(--jz-ease)] ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>

                <div
                  className="grid transition-[grid-template-rows,opacity] duration-500 [transition-timing-function:var(--jz-ease)]"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
                >
                  <div className="overflow-hidden pl-[2.2rem] pr-4 sm:pl-[3.5rem]">
                    <div className="pb-5 text-xs sm:text-sm leading-relaxed text-[var(--jz-sand)] font-light max-w-3xl">
                      <p className="mb-3">{item.answer}</p>

                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        {item.question.toLowerCase().includes('talla') && (
                          <button
                            type="button"
                            onClick={() => setIsSizeGuideOpen(true)}
                            className="jz-label jz-link text-[var(--jz-champagne)] flex items-center gap-1.5"
                          >
                            <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Abrir Guía de Medidas</span>
                          </button>
                        )}
                        <a
                          href="https://wa.me/56940187563?text=Hola%20JAZYALON!%20Tengo%20una%20consulta%20adicional."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jz-label jz-link text-[var(--jz-ivory)] flex items-center gap-1.5"
                        >
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Asesoría directa WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
