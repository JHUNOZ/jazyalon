import React from 'react';
import { Truck, CreditCard, Sparkles, MessageCircle } from 'lucide-react';
import { formatCLP } from '../../utils/formatters';
import { BRAND_INFO } from '../../data/mockData';
import SectionHeading from '../motion/SectionHeading';
import Reveal from '../motion/Reveal';

export default function ShippingTableSection() {
  const pillars = [
    {
      num: '01',
      tag: 'Despacho Nacional',
      title: 'Envíos a Todo Chile',
      desc: 'Despacho prioritario vía Starken, Chilexpress y Blue Express a domicilio o sucursal con seguimiento online.',
      icon: Truck
    },
    {
      num: '02',
      tag: 'Beneficio Exclusivo',
      title: 'Envío Gratis',
      desc: `Despacho sin costo a todo Chile en compras superiores a ${formatCLP(BRAND_INFO.freeShippingThreshold)}.`,
      icon: Sparkles
    },
    {
      num: '03',
      tag: 'Transacción Protegida',
      title: 'Transferencia & Webpay',
      desc: 'Pago con transferencia bancaria y tarjetas de crédito con hasta 6 cuotas sin interés.',
      icon: CreditCard
    },
    {
      num: '04',
      tag: 'Atención Directa',
      title: 'Asesoría de Tallas',
      desc: 'Atención personalizada para resolver dudas sobre calce y medidas al WhatsApp +56 9 4018 7563.',
      icon: MessageCircle
    }
  ];

  return (
    <section id="tabla-envios" data-cursor-zone className="jz-section">
      <div className="jz-wrap">
        <SectionHeading
          index="06"
          label="COMPRA SEGURA EN CHILE"
          title="*Garantía*"
        />

        {/* 4-Pillar Minimalist Luxury Concierge Bar */}
        <Reveal selector="[data-pillar]" stagger={0.05} y={15} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--jz-line)] border border-[var(--jz-line)] sm:mt-6">
          {pillars.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.num}
                data-pillar
                className="bg-[var(--jz-bg)] p-5 sm:p-6 flex flex-col justify-between group transition-colors duration-300 hover:bg-[var(--jz-bg-2)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="jz-num text-lg text-[var(--jz-sand-dim)] font-mono">{item.num}</span>
                    <IconComponent className="w-5 h-5 text-[var(--jz-champagne)] stroke-[1.5]" aria-hidden="true" />
                  </div>

                  <p className="jz-label text-[0.625rem] text-[var(--jz-sand-dim)] mb-1.5">
                    {item.tag}
                  </p>

                  <h3 className="jz-display text-[1.25rem] leading-snug text-[var(--jz-ivory)] mb-2">
                    {item.title}
                  </h3>
                </div>

                <p className="jz-body text-xs text-[var(--jz-sand)] font-light leading-relaxed mt-2">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
