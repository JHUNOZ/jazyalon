import React, { useState } from 'react';
import { ArrowRight, Ruler, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import SectionHeading from '../motion/SectionHeading';
import Reveal from '../motion/Reveal';
import Magnetic from '../motion/Magnetic';

const PILLARS = [
  {
    num: '01',
    title: 'Estructura Modeladora',
    desc: 'Varillas firmes que no se deforman con el uso y ofrecen un soporte anatómico seguro.',
  },
  {
    num: '02',
    title: 'Moldeado de Silueta',
    desc: 'Ajuste ergonómico con reducción de cintura de 5 a 10 cm con total comodidad.',
  },
  {
    num: '03',
    title: 'Telas de Alta Calidad',
    desc: 'Brocados, satén, encaje floral y denim estructurado con costuras reforzadas.',
  },
];

export default function SpotlightFeature({ setCurrentView }) {
  const { products, setSelectedCategory, setSelectedCollection, setIsSizeGuideOpen } = useShop();
  const [active, setActive] = useState(0);

  const featuredCorset = products.find(p => p.isFeatured || p.isNew) || products[0];
  const spotlightImage = featuredCorset?.images?.[0] || featuredCorset?.image_url || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';

  const handleExplore = () => {
    setSelectedCollection(null);
    setSelectedCategory('all');
    setCurrentView('catalog');
  };

  return (
    <section id="ingenieria-corset" className="jz-section bg-[var(--jz-bg)] relative">
      <div className="jz-wrap">
        <SectionHeading
          index="02"
          label="CALIDAD Y CONFECCIÓN"
          title="Nuestros *Corsets*"
        />

        <div className="mt-4 sm:mt-6 grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
          {/* FOTO PRINCIPAL SINCRONIZADA CON EL CATÁLOGO REAL */}
          <Reveal y={15} className="lg:col-span-5 relative overflow-hidden aspect-[4/5] bg-[#EDE8DE] rounded-2xl border border-[#D6CEBF] group shadow-sm">
            <img
              src={spotlightImage}
              alt={featuredCorset?.name || "Corsetería victoriana JAZYALON"}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.95] contrast-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            {/* Badge flotante inferior */}
            <div className="absolute bottom-4 inset-x-4 z-20 bg-[#FAF8F5]/95 backdrop-blur-md border border-[#D6CEBF] p-2.5 text-center rounded-xl shadow-md">
              <span className="jz-label text-[10px] text-[#9E7B3B] flex items-center justify-center gap-2 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{featuredCorset ? featuredCorset.name : 'Corsetería Estructurada JAZYALON'}</span>
              </span>
            </div>
          </Reveal>

          {/* BENEFICIOS Y PILARES EDITORIALES */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <Reveal y={10}>
              <p className="jz-body text-xs sm:text-sm text-[#5E564F] font-light leading-relaxed mb-4 max-w-xl">
                Cada diseño <strong className="font-semibold text-[#181514]">JAZYALON</strong> está estructurado para ceñir y estilizar la figura con total soporte, realzando tu silueta con terminaciones de alta costura.
              </p>
            </Reveal>

            {/* 3 Tarjetas compactas de beneficios */}
            <Reveal selector="[data-pillar-card]" stagger={0.05} y={10} className="space-y-2.5 mb-5">
              {PILLARS.map((pillar, i) => {
                const isActive = active === i;
                return (
                  <div
                    key={pillar.num}
                    data-pillar-card
                    onClick={() => setActive(i)}
                    className={`p-3.5 border rounded-xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#EDE8DE] border-[#9E7B3B] shadow-sm translate-x-1'
                        : 'bg-[#FFFFFF] border-[#D6CEBF] hover:border-[#181514]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`jz-num text-sm font-bold px-2 py-0.5 border rounded ${
                        isActive
                          ? 'bg-[#9E7B3B] text-white border-[#9E7B3B]'
                          : 'bg-[#EAE4D8] text-[#5E564F] border-[#D6CEBF]'
                      }`}>
                        {pillar.num}
                      </span>
                      <div className="min-w-0">
                        <h4 className="jz-display text-[1.2rem] text-[#181514] leading-snug mb-0.5 font-normal">
                          {pillar.title}
                        </h4>
                        <p className="jz-body text-xs text-[#5E564F] font-light leading-relaxed">
                          {pillar.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Reveal>

            {/* Botones de acción */}
            <Reveal y={10} className="flex flex-wrap items-center gap-3">
              <Magnetic>
                <button type="button" onClick={handleExplore} className="px-7 py-3 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center gap-2">
                  <span>Explorar Catálogo Completo</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </Magnetic>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="jz-label jz-link text-[#181514] hover:text-[#9E7B3B] flex items-center gap-2 font-bold"
              >
                <Ruler className="h-4 w-4 text-[#9E7B3B]" aria-hidden="true" />
                <span>Guía de Tallas & Calce</span>
              </button>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
