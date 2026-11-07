import React from 'react';
import { Heart, ArrowLeft, ShoppingBag, Trash2, Sparkles, ShieldCheck } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { formatCLP } from '../../utils/formatters';
import VictorianDivider from '../common/VictorianDivider';
import ProductCard from './ProductCard';

export default function WishlistView({ setCurrentView }) {
  const { wishlist, toggleWishlist, addToCart, showToast } = useShop();

  const totalWishlistValue = wishlist.reduce((acc, p) => acc + (p.price || 0), 0);

  const handleAddAllToCart = () => {
    wishlist.forEach(p => {
      addToCart(p, p.sizes?.[0] || 'S', p.colors?.[0]?.name || 'Negro', 1);
    });
    if (showToast) {
      showToast(`¡${wishlist.length} prendas añadidas a tu carrito! 🖤`, 'success');
    }
  };

  const handleClearWishlist = () => {
    if (window.confirm('¿Segura que deseas vaciar tu lista de favoritos?')) {
      wishlist.forEach(p => toggleWishlist(p));
      if (showToast) {
        showToast('Lista de favoritos vaciada', 'info');
      }
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[65vh]">
      
      <VictorianDivider 
        title="Mis Favoritos" 
        subtitle="Tu Selección Exclusiva Guardada" 
      />

      {wishlist.length === 0 ? (
        <div className="text-center py-16 bg-[#EDE8DE] border border-[#D6CEBF] max-w-md mx-auto p-8 rounded-2xl shadow-sm animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#9E7B3B]/10 border border-[#9E7B3B]/40 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-[#9E7B3B] opacity-80" />
          </div>
          <h3 className="jz-display text-2xl text-[#181514] font-normal mb-2">
            No tienes piezas favoritas aún
          </h3>
          <p className="jz-body text-xs text-[#5E564F] mb-6 font-light leading-relaxed">
            Explora nuestra corsetería victoriana y guarda las prendas que te enamoren haciendo clic en el corazón. Quedarán guardadas en tu navegador para cuando decidas comprar.
          </p>
          <button
            onClick={() => setCurrentView('catalog')}
            className="px-6 py-2.5 bg-[#9E7B3B] hover:bg-[#181514] text-white uppercase text-xs tracking-widest font-bold rounded-lg transition-colors shadow-sm"
          >
            Explorar Colección
          </button>
        </div>
      ) : (
        <div>
          {/* Top Actions & Subtotal Bar */}
          <div className="mb-6 p-4 bg-[#EDE8DE] border border-[#D6CEBF] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('catalog')}
                className="jz-label text-xs text-[#5E564F] hover:text-[#9E7B3B] flex items-center gap-1.5 font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Seguir explorando</span>
              </button>

              <span className="text-[#D6CEBF] hidden sm:inline">|</span>

              <div className="text-xs text-[#181514]">
                <span className="font-bold">{wishlist.length}</span> {wishlist.length === 1 ? 'prenda' : 'prendas'} guardadas • <span className="text-[#8A8178]">Valor aprox:</span> <strong className="font-mono text-[#9E7B3B]">{formatCLP(totalWishlistValue)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleAddAllToCart}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#9E7B3B] hover:bg-[#181514] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Añadir Todas al Carrito</span>
              </button>

              <button
                onClick={handleClearWishlist}
                title="Vaciar lista de deseos"
                className="p-2 border border-[#D6CEBF] bg-[#FFFFFF] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded-lg text-[#8A8178] transition-colors"
                aria-label="Vaciar lista"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid of Wishlist Items */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlist.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Persistence reassurance footer */}
          <div className="mt-8 text-center text-[11px] text-[#8A8178] flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9E7B3B]" />
            <span>Tus favoritos están guardados de forma segura en este navegador (Ley 19.628). Puedes volver cuando quieras.</span>
          </div>
        </div>
      )}

    </div>
  );
}
