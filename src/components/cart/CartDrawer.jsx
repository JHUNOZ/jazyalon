import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  Truck, 
  Tag, 
  Plus, 
  Minus 
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { formatCLP } from '../../utils/formatters';

export default function CartDrawer({ setCurrentView }) {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    cart, 
    cartCount, 
    cartSubtotal, 
    cartTotal, 
    shippingCost, 
    isFreeShipping,
    freeShippingProgress,
    remainingForFreeShipping,
    updateCartQuantity, 
    removeFromCart, 
    appliedCoupon,
    discountPercent,
    discountAmount,
    applyCoupon,
    removeCoupon,
    selectedRegionId,
    setSelectedRegionId,
    regions,
    setIsCheckoutOpen
  } = useShop();

  const [inputCoupon, setInputCoupon] = useState('');

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const success = applyCoupon(inputCoupon);
    if (success) setInputCoupon('');
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#FAF8F5] border-l border-[#D6CEBF] h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slideLeft text-[#181514]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D6CEBF] flex items-center justify-between bg-[#F0ECE4]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#9E7B3B]" />
            <h3 className="jz-display text-xl font-normal text-[#181514] uppercase tracking-wider">
              Carrito de Compras ({cartCount})
            </h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            aria-label="Cerrar carrito"
            className="p-1 text-[#8A8178] hover:text-[#181514] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="bg-[#EAE4D8] px-5 py-3 border-b border-[#D6CEBF] text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[#181514]">
              <Truck className="w-4 h-4 text-[#9E7B3B]" />
              {isFreeShipping ? (
                <strong className="text-emerald-700">¡Tienes Envío Gratis en Chile! 🎉</strong>
              ) : (
                <span>Te faltan <strong className="text-[#9E7B3B]">{formatCLP(remainingForFreeShipping)}</strong> para Envío Gratis</span>
              )}
            </span>
            <span className="font-mono font-bold text-[#9E7B3B]">{freeShippingProgress}%</span>
          </div>
          <div className="w-full bg-[#D6CEBF] rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-[#9E7B3B] transition-all duration-500 rounded-full"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-[#EAE4D8]">
          {cart.length === 0 ? (
            <div className="text-center py-16 px-4">
              <ShoppingBag className="w-12 h-12 text-[#D6CEBF] mx-auto mb-3" />
              <h4 className="jz-display text-2xl font-normal text-[#181514] mb-1">Tu carrito está vacío</h4>
              <p className="text-xs text-[#5E564F] mb-6">Descubre nuestros corsets victorianos y vestidos de gala.</p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setCurrentView('catalog');
                }}
                className="px-6 py-2.5 bg-[#9E7B3B] hover:bg-[#181514] text-white uppercase text-xs tracking-widest font-bold rounded transition-colors shadow-sm"
              >
                Ver Catálogo
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="pt-4 first:pt-0 flex gap-3.5 items-start">
                <img
                  src={item.images?.[0] || ''}
                  alt={item.name}
                  className="w-16 h-20 object-cover rounded-lg border border-[#D6CEBF] shrink-0 bg-[#EAE4D8]"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="jz-display text-base font-normal text-[#181514] truncate">
                      {item.name}
                    </h5>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-[#8A8178] hover:text-rose-600 p-1 transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-[11px] text-[#5E564F] my-1">
                    <span>Talla: <strong className="text-[#9E7B3B]">{item.selectedSize}</strong></span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-[#D6CEBF] rounded bg-[#FFFFFF]">
                      <button onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)} className="px-2.5 py-0.5 text-xs text-[#181514] hover:text-[#9E7B3B]">-</button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-[#181514] font-mono">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)} className="px-2.5 py-0.5 text-xs text-[#181514] hover:text-[#9E7B3B]">+</button>
                    </div>

                    <div className="font-bold text-xs sm:text-sm text-[#181514] font-mono">
                      {formatCLP(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#D6CEBF] bg-[#F0ECE4] space-y-3">
            {/* Coupon */}
            {!appliedCoupon ? (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cupón (ej: antonella10)"
                  value={inputCoupon}
                  onChange={(e) => setInputCoupon(e.target.value)}
                  className="flex-1 bg-[#FFFFFF] border border-[#D6CEBF] px-3 py-1.5 rounded-lg text-xs uppercase text-[#181514] placeholder-[#8A8178] focus:border-[#9E7B3B] focus:outline-none"
                />
                <button type="submit" className="px-4 py-1.5 bg-[#EAE4D8] hover:bg-[#9E7B3B] hover:text-white text-[#181514] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-[#D6CEBF]">
                  Aplicar
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between bg-[#FFFFFF] border border-[#9E7B3B]/40 px-3 py-2 rounded-lg text-xs">
                <span className="text-[#9E7B3B] font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Cupón {appliedCoupon} (-{discountPercent}%)
                </span>
                <button onClick={removeCoupon} className="text-xs text-[#8A8178] hover:text-[#181514] underline">Quitar</button>
              </div>
            )}

            {/* Region */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#5E564F]">Despacho para:</span>
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="bg-[#FFFFFF] border border-[#D6CEBF] text-xs rounded-lg px-2.5 py-1.5 text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
              >
                {regions.map(r => (
                  <option key={r.id} value={r.id} className="bg-[#FFFFFF] text-[#181514]">{r.name.split(' ')[0]} ({formatCLP(r.shippingCost)})</option>
                ))}
              </select>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs text-[#5E564F] pt-2 border-t border-[#D6CEBF]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-[#181514] font-mono font-semibold">{formatCLP(cartSubtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#9E7B3B] font-medium">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono">-{formatCLP(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Envío:</span>
                <span>{isFreeShipping ? <strong className="text-emerald-700">Gratis ($0)</strong> : <span className="text-[#181514] font-mono">{formatCLP(shippingCost)}</span>}</span>
              </div>

              <div className="flex justify-between text-base font-bold text-[#181514] pt-2 border-t border-[#D6CEBF]">
                <span>Total a Pagar:</span>
                <span className="text-[#9E7B3B] font-mono">{formatCLP(cartTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleProceedCheckout}
              className="w-full py-3.5 bg-[#9E7B3B] hover:bg-[#181514] text-white font-bold uppercase tracking-[0.2em] text-xs rounded-lg shadow-xl transition-colors"
            >
              Iniciar Pago Seguro • {formatCLP(cartTotal)}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
