import React, { useState, useMemo } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import ProductCard from '../catalog/ProductCard';
import SectionHeading from '../motion/SectionHeading';
import Reveal from '../motion/Reveal';
import Magnetic from '../motion/Magnetic';

export default function NewArrivals({ setCurrentView }) {
  const { products, categories, setSelectedCategory, setSelectedCollection } = useShop();
  const [activeTab, setActiveTab] = useState('all');

  // Dynamic tabs synchronized in real-time with Admin Panel categories
  const dynamicTabs = useMemo(() => {
    const base = [{ id: 'all', label: 'Ver Todos' }];
    const activeCats = (categories || []).filter(c => c.id !== 'all');
    activeCats.forEach(cat => {
      base.push({ id: cat.id, label: cat.name });
    });
    return base;
  }, [categories]);

  // Filter New Drops (Nuevos Ingresos = Destacados de Temporada), sorted by dropOrder
  const newProducts = useMemo(() => {
    const activeList = (products || []).filter(p => p.is_active !== false);
    const dropsOnly = activeList.filter(p => p.isNew);
    const sourceList = dropsOnly.length > 0 ? dropsOnly : activeList.filter(p => p.isFeatured || p.is_featured);
    const filtered = activeTab === 'all'
      ? sourceList
      : sourceList.filter(p => p.category === activeTab || p.categoryName === activeTab);

    return [...filtered]
      .sort((a, b) => (a.dropOrder || 999) - (b.dropOrder || 999))
      .slice(0, 8);
  }, [products, activeTab]);

  const openCatalog = () => {
    setSelectedCollection(null);
    setSelectedCategory(activeTab === 'all' ? 'all' : activeTab);
    setCurrentView('catalog');
  };

  return (
    <section id="nuevos-ingresos" data-cursor-zone className="jz-section">
      <div className="jz-wrap">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHeading
            index="01"
            label="NUEVOS DROPS • DESTACADOS DE TEMPORADA"
            title="Nuevos *Ingresos*"
          />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9E7B3B]/10 border border-[#9E7B3B]/30 text-[#9E7B3B] text-[10px] uppercase tracking-widest font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Destacados en Portada</span>
          </span>
        </div>

        {/* Filter tabs: synchronized with categories (Compact swipeable horizontal pill bar on mobile) */}
        <Reveal className="mt-3 sm:mt-4" y={10}>
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            {/* Scroll horizontal suave en móviles sin saturar */}
            <div 
              className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar w-full sm:w-auto -mx-4 px-4 sm:mx-0 sm:px-0" 
              role="tablist" 
              aria-label="Filtrar nuevos ingresos"
            >
              {dynamicTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-all duration-300 ${
                      active
                        ? 'bg-[#181514] text-white shadow-sm'
                        : 'bg-[#EDE8DE] text-[#6E655D] hover:text-[#181514] hover:bg-[#E2DDD2]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button 
              type="button" 
              onClick={openCatalog} 
              className="hidden sm:inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#181514] hover:text-[#9E7B3B] font-bold shrink-0"
            >
              <span>Ver Catálogo</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </Reveal>

        {/* Clean, perfectly aligned luxury grid */}
        {newProducts.length > 0 ? (
          <Reveal
            key={activeTab}
            selector="[data-card]"
            stagger={0.06}
            className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 sm:mt-6"
          >
            {newProducts.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </Reveal>
        ) : (
          <div className="mt-6 p-8 border border-[#D6CEBF] bg-[#EDE8DE] rounded-2xl text-center">
            <p className="text-xs text-[#5E564F]">
              No hay nuevos ingresos en esta categoría por el momento.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center sm:mt-8">
          <Magnetic>
            <button type="button" onClick={openCatalog} className="px-7 py-3 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md">
              Ver Todos los Nuevos Ingresos
            </button>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
