import React, { useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { formatCLP } from '../../utils/formatters';

export default function SearchModal({ setCurrentView }) {
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    products, 
    setSelectedProduct,
    setSearchQuery: setGlobalSearch,
    setSelectedCategory
  } = useShop();

  const [query, setQuery] = useState('');

  if (!isSearchOpen) return null;

  const results = query.trim() === '' 
    ? [] 
    : products.filter(p => {
        const q = query.toLowerCase();
        return p.name.toLowerCase().includes(q) || 
               p.categoryName.toLowerCase().includes(q);
      }).slice(0, 6);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setIsSearchOpen(false);
  };

  const handleSearchAll = (e) => {
    e.preventDefault();
    setGlobalSearch(query);
    setSelectedCategory('all');
    setCurrentView('catalog');
    setIsSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-[#FAF8F5] rounded-2xl border border-[#D6CEBF] shadow-2xl w-full max-w-2xl overflow-hidden relative text-[#181514]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSearchAll} className="p-4 sm:p-5 border-b border-[#D6CEBF] flex items-center gap-3.5 bg-[#F0ECE4]">
          <Search className="w-5 h-5 text-[#9E7B3B] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar corsets, vestidos, blusas, terciopelo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm sm:text-base text-[#181514] placeholder-[#8A8178] bg-transparent focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="p-1 text-[#8A8178] hover:text-[#181514]" aria-label="Limpiar búsqueda">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="text-xs text-[#5E564F] hover:text-[#9E7B3B] uppercase font-semibold tracking-wider ml-2 shrink-0 transition-colors"
          >
            Cerrar
          </button>
        </form>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="space-y-3.5 text-xs">
              <span className="text-[#5E564F] uppercase tracking-widest text-[10px] font-bold block">Búsquedas Sugeridas:</span>
              <div className="flex flex-wrap gap-2">
                {['Corset Overbust', 'Corset Underbust', 'Terciopelo', 'Encaje Francés', 'Vestido de Gala'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-3.5 py-1.5 bg-[#FFFFFF] border border-[#D6CEBF] rounded-full hover:border-[#9E7B3B] hover:text-[#9E7B3B] text-[#181514] text-xs transition-colors shadow-sm"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className="flex items-center gap-3.5 p-3 bg-[#FFFFFF] hover:bg-[#F0ECE4] border border-[#D6CEBF] hover:border-[#9E7B3B] rounded-xl cursor-pointer transition-all group shadow-sm"
                  >
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-14 h-18 object-cover rounded-lg border border-[#D6CEBF] shrink-0 bg-[#EAE4D8]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-[#9E7B3B] font-semibold">{prod.categoryName}</div>
                      <div className="jz-display text-base text-[#181514] truncate group-hover:text-[#9E7B3B] transition-colors">{prod.name}</div>
                      <div className="text-xs font-bold text-[#181514] font-mono mt-0.5">{formatCLP(prod.price)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3.5 border-t border-[#D6CEBF] text-center">
                <button onClick={handleSearchAll} className="text-xs text-[#9E7B3B] hover:text-[#181514] uppercase tracking-wider font-bold inline-flex items-center gap-1.5 transition-colors">
                  <span>Ver todos los resultados para "{query}"</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-[#5E564F]">
              No encontramos resultados para "{query}". Prueba con otra palabra clave.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
