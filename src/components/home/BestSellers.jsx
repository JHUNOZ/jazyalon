import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import VictorianDivider from '../common/VictorianDivider';
import ProductCard from '../catalog/ProductCard';

export default function BestSellers({ setCurrentView }) {
  const { products, setSelectedCategory } = useShop();
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 4);

  return (
    <section id="destacados" className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <VictorianDivider 
        title="Piezas Destacadas" 
        subtitle="Los Corsets Más Elegidos" 
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="text-center mt-5">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setCurrentView('catalog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0B0B0B] hover:bg-luxury-gold text-white rounded text-[10px] uppercase tracking-[0.2em] font-semibold transition-all shadow-luxury-sm transform hover:-translate-y-0.5"
        >
          <span>Ver catálogo completo</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
}
