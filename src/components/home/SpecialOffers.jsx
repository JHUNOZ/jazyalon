import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import VictorianDivider from '../common/VictorianDivider';
import ProductCard from '../catalog/ProductCard';

export default function SpecialOffers({ setCurrentView }) {
  const { products, setSelectedCategory } = useShop();
  const scrollRef = useRef(null);

  const offerProducts = products.filter(p => p.isOffer || (p.oldPrice && p.oldPrice > p.price));

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id="ofertas" className="pt-2 sm:pt-4 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Title - Compact and clean */}
      <VictorianDivider 
        title="Ofertas Especiales" 
        subtitle="Precios Exclusivos de Temporada" 
        className="mb-4 sm:mb-6"
      />

      {/* Fluid Slider (Countdown Banner completely removed as requested) */}
      <div className="relative group/slider">
        <button
          onClick={() => scroll('left')}
          aria-label="Anterior"
          className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 text-black border border-luxury-border shadow-lg flex items-center justify-center transition-all duration-300 opacity-80 group-hover/slider:opacity-100 hover:bg-black hover:text-white hover:scale-110"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 hide-scrollbar scroll-smooth snap-x"
        >
          {offerProducts.map((product) => (
            <div 
              key={product.id} 
              className="w-[200px] sm:w-[220px] md:w-[240px] lg:w-[255px] shrink-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          aria-label="Siguiente"
          className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 text-black border border-luxury-border shadow-lg flex items-center justify-center transition-all duration-300 opacity-80 group-hover/slider:opacity-100 hover:bg-black hover:text-white hover:scale-110"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center mt-3 sm:mt-4">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setCurrentView('catalog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-luxury-charcoal hover:text-luxury-gold font-semibold transition-colors group"
        >
          <span>Explorar todas las piezas con descuento</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </section>
  );
}
