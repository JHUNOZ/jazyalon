import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Check, Package, CreditCard, UserCheck, Truck } from 'lucide-react';

export default function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const pillTimerRef = useRef(null);

  // Show pill briefly on initial load for 1 second, then auto-hide
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setShowPill(true);
      pillTimerRef.current = setTimeout(() => {
        setShowPill(false);
      }, 1000);
    }, 1200);

    return () => {
      clearTimeout(initialTimer);
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isOpen) return;
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    setShowPill(true);
    // Disappear after exactly 1 second
    pillTimerRef.current = setTimeout(() => {
      setShowPill(false);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    setShowPill(false);
  };

  const handleToggleOpen = () => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    setShowPill(false);
    setIsOpen(prev => !prev);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* POPUP MENU WHEN EXPANDED */}
      {isOpen && (
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Seguridad y Confidencialidad de tu Compra"
          className="absolute bottom-16 right-0 w-[92vw] max-w-sm sm:max-w-md bg-[#181514]/98 text-white border border-[#9E7B3B]/80 p-5 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-fadeIn text-xs"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#9E7B3B]/20 border border-[#9E7B3B]/60 flex items-center justify-center text-[#9E7B3B] shadow-sm">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-white text-[11px] leading-tight font-sans">
                  Compra Segura & Confidencial
                </h4>
                <p className="text-[9.5px] text-[#9E7B3B] tracking-wide font-medium mt-0.5">
                  Garantía y protección en cada pedido
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Cerrar panel de seguridad"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Symmetrical, Polished Guarantee Cards */}
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {/* Card 1: Pagos */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#9E7B3B]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-white text-[11px] font-bold mb-1">
                <CreditCard className="w-3.5 h-3.5 text-[#9E7B3B] shrink-0" />
                <span>Pagos Encriptados</span>
              </div>
              <p className="text-white/70 text-[10px] leading-relaxed">
                Transacciones protegidas con cifrado bancario. No guardamos datos de tus tarjetas.
              </p>
            </div>

            {/* Card 2: Embalaje */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#9E7B3B]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-white text-[11px] font-bold mb-1">
                <Package className="w-3.5 h-3.5 text-[#9E7B3B] shrink-0" />
                <span>Embalaje Discreto</span>
              </div>
              <p className="text-white/70 text-[10px] leading-relaxed">
                Paquetes 100% neutros y sellados sin descripciones exteriores del contenido.
              </p>
            </div>

            {/* Card 3: Privacidad */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#9E7B3B]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-white text-[11px] font-bold mb-1">
                <UserCheck className="w-3.5 h-3.5 text-[#9E7B3B] shrink-0" />
                <span>Medidas Privadas</span>
              </div>
              <p className="text-white/70 text-[10px] leading-relaxed">
                Tus medidas corporales son confidenciales y exclusivas para tu confección.
              </p>
            </div>

            {/* Card 4: Despacho */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#9E7B3B]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-white text-[11px] font-bold mb-1">
                <Truck className="w-3.5 h-3.5 text-[#9E7B3B] shrink-0" />
                <span>Despacho Asegurado</span>
              </div>
              <p className="text-white/70 text-[10px] leading-relaxed">
                Seguimiento en línea en tiempo real hasta la entrega en tu domicilio en Chile.
              </p>
            </div>
          </div>

          {/* Action & Status Footer */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Navegación protegida
            </span>

            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-[#9E7B3B] hover:bg-white hover:text-[#181514] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </aside>
      )}

      {/* FLOATING INTERACTIVE LOCK ICON (CANDADO) */}
      <button
        type="button"
        onClick={handleToggleOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Compra Segura y Confidencial"
        aria-expanded={isOpen}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-pointer hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-[#9E7B3B] border-white text-white rotate-12 ring-4 ring-[#9E7B3B]/40'
            : 'bg-[#181514]/95 hover:bg-[#181514] border-[#9E7B3B] text-[#9E7B3B] hover:text-white hover:border-white'
        }`}
      >
        <Lock className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'scale-110' : 'group-hover:scale-110'}`} />

        {/* Status Indicator Dot (Green pulse) */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#181514] rounded-full shadow-sm animate-pulse" />

        {/* Floating Pill: Automatically disappears after 1 second */}
        <span 
          className={`pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[#181514]/95 border border-[#9E7B3B]/50 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-white shadow-xl transition-all duration-300 ${
            showPill && !isOpen 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 translate-x-2'
          }`}
        >
          🔒 Compra Segura & Discreta
        </span>
      </button>
    </div>
  );
}
