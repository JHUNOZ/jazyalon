import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { BRAND_INFO } from '../../data/mockData';
import { formatCLP } from '../../utils/formatters';

export default function AnnouncementBar() {
  const { siteSettings } = useShop();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const fallbackAnnouncements = [
    `🇨🇱 Corsetería Victoriana & Alta Costura en Chile`,
    `🌹 10% OFF en tu primera compra con el cupón: ${BRAND_INFO.defaultCoupon}`,
    `✨ Envíos gratis a todo Chile por compras sobre ${formatCLP(BRAND_INFO.freeShippingThreshold)}`,
    `📦 Despachos rápidos vía Starken, Chilexpress y Blue Express`,
    `💳 Hasta 6 cuotas sin interés con Webpay Plus y Transferencia`
  ];

  const dynamicAnnouncements =
    Array.isArray(siteSettings?.announcementMessages) &&
    siteSettings.announcementMessages.length > 0
      ? siteSettings.announcementMessages
      : fallbackAnnouncements;

  const safeIndex =
    dynamicAnnouncements.length > 0 ? currentIndex % dynamicAnnouncements.length : 0;

  useEffect(() => {
    if (isPaused || dynamicAnnouncements.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dynamicAnnouncements.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, dynamicAnnouncements.length]);

  return (
    <div
      className="bg-[#050505] text-white/90 py-2 px-4 relative z-50 border-b border-white/10 text-[10px] sm:text-xs tracking-[0.2em] uppercase font-medium shadow-sm transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <button
          onClick={() =>
            setCurrentIndex(
              (prev) => (prev - 1 + dynamicAnnouncements.length) % dynamicAnnouncements.length
            )
          }
          aria-label="Anterior"
          className="p-0.5 text-white/60 hover:text-luxury-gold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 text-center truncate px-3">
          <span className="font-semibold text-white/90 tracking-[0.18em] transition-all duration-300">
            {dynamicAnnouncements[safeIndex]}
          </span>
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % dynamicAnnouncements.length)}
          aria-label="Siguiente"
          className="p-0.5 text-white/60 hover:text-luxury-gold transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
