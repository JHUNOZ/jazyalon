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

        {/* Filter tabs: synchronized with categories */}
        <Reveal className="mt-3 flex flex-wrap items-end justify-between gap-3 sm:mt-4" y={10}>
          <div className="flex flex-wrap gap-x-6 gap-y-2" role="tablist" aria-label="Filtrar nuevos ingresos">
            {dynamicTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`jz-label relative pb-1 transition-colors duration-300 ${active ? 'text-[#181514] font-bold' : 'text-[#8A8178] hover:text-[#181514]'}`}
                >
                  {tab.label}
                  <span
                    className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#9E7B3B] transition-transform duration-300 [transition-timing-function:var(--jz-ease)] ${active ? 'scale-x-100' : 'scale-x-0'}`}
                  />
                </button>
              );
            })}
          </div>

          <button type="button" onClick={openCatalog} className="jz-label jz-link text-[#181514] hover:text-[#9E7B3B] font-bold">
            Ver Todos los Nuevos Ingresos
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
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
