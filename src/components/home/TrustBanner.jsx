import React from 'react';
import { Truck, ShieldCheck, RefreshCw, MessageSquare } from 'lucide-react';
import { BRAND_INFO } from '../../data/mockData';
import { formatCLP } from '../../utils/formatters';

export default function TrustBanner() {
  const items = [
    {
      icon: <Truck className="w-4 h-4 text-luxury-gold" />,
      title: "Envíos a Todo Chile",
      desc: `Gratis sobre ${formatCLP(BRAND_INFO.freeShippingThreshold)}`
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-luxury-gold" />,
      title: "Pagos 100% Seguros",
      desc: "Hasta 6 cuotas sin interés"
    },
    {
      icon: <RefreshCw className="w-4 h-4 text-luxury-gold" />,
      title: "Garantía de Talla",
      desc: "Cambios rápidos en Chile"
    },
    {
      icon: <MessageSquare className="w-4 h-4 text-luxury-gold" />,
      title: "Asesoría de Medidas",
      desc: "Atención por WhatsApp"
    }
  ];

  return (
    <section id="confianza" className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-luxury-border p-4 sm:p-6 shadow-luxury-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col items-center group">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-luxury-border flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-luxury-charcoal mb-0.5">
                {item.title}
              </h4>
              <p className="text-[10px] text-luxury-muted font-light">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
