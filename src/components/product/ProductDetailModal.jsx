import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  ShoppingBag, 
  Check, 
  Ruler, 
  Star,
  MessageCircle,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Info,
  ZoomIn,
  Bell,
  Maximize2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { syncStockAlertToDb } from '../../lib/supabase';
import { formatCLP, calculateDiscount, calculateSavings } from '../../utils/formatters';
import { sanitizeInput, validateEmail, safeJsonParse } from '../../utils/security';
import ProductCard from '../catalog/ProductCard';

export default function ProductDetailModal() {
  const { selectedProduct, setSelectedProduct } = useShop();
  if (!selectedProduct) return null;

  return (
    <ProductDetailContent
      key={selectedProduct.id}
      selectedProduct={selectedProduct}
      setSelectedProduct={setSelectedProduct}
    />
  );
}

function ProductDetailContent({ selectedProduct, setSelectedProduct }) {
  const { 
    addToCart, 
    toggleWishlist, 
    isInWishlist, 
    setIsCheckoutOpen,
    products,
    brandPolicies,
    sizeChart,
    showToast
  } = useShop();

  const modalScrollRef = useRef(null);

  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedProduct(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct.id, setSelectedProduct]);

  // Colors list from product or fallback
  const colors = useMemo(() => {
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
      return selectedProduct.colors;
    }
    return [
      {
        name: 'Negro & Plata',
        hex: '#111111',
        availableSizes: selectedProduct.sizes || ['XS', 'S', 'M', 'L', 'XL'],
        outOfStockSizes: ['XXL'],
        image: selectedProduct.images?.[0]
      }
    ];
  }, [selectedProduct.colors, selectedProduct.sizes, selectedProduct.images]);

  // Find initial color (from product.initialColor if selected from card)
  const [selectedColorIdx, setSelectedColorIdx] = useState(() => {
    if (selectedProduct.initialColor) {
      const foundIdx = colors.findIndex(c => c.name === selectedProduct.initialColor);
      if (foundIdx !== -1) return foundIdx;
    }
    return 0;
  });

  const activeColor = colors[selectedColorIdx] || colors[0];

  // Available and out-of-stock sizes for active color
  const availableSizes = useMemo(() => {
    if (activeColor?.availableSizes && activeColor.availableSizes.length > 0) {
      return activeColor.availableSizes;
    }
    return selectedProduct.sizes || ['S', 'M', 'L'];
  }, [activeColor, selectedProduct.sizes]);

  const outOfStockSizes = useMemo(() => {
    return activeColor?.outOfStockSizes || [];
  }, [activeColor]);

  const allDisplaySizes = useMemo(() => {
    const baseList = selectedProduct.sizes && selectedProduct.sizes.length > 0 
      ? selectedProduct.sizes 
      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const relevant = baseList.filter(sz => availableSizes.includes(sz) || outOfStockSizes.includes(sz));
    return relevant.length > 0 ? relevant : availableSizes;
  }, [selectedProduct.sizes, availableSizes, outOfStockSizes]);

  // Selected size (defaults to initialSize, or first available size)
  const [selectedSize, setSelectedSize] = useState(() => {
    if (selectedProduct.initialSize) {
      return selectedProduct.initialSize;
    }
    return availableSizes[0] || 'S';
  });

  // Check if chosen size is currently available in the active color
  const isSelectedSizeAvailable = availableSizes.includes(selectedSize);

  // Main gallery & active photo
  const allImages = useMemo(() => {
    const list = selectedProduct.images && selectedProduct.images.length > 0 
      ? [...selectedProduct.images]
      : ['/catalogo/1be329e9-0b8d-4bb6-a8c0-db204d9e8dd4.jpeg'];
    
    // If active color has a dedicated image that is not in the list, insert it first
    if (activeColor?.image && !list.includes(activeColor.image)) {
      return [activeColor.image, ...list];
    }
    return list;
  }, [selectedProduct.images, activeColor]);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [userWaistCm, setUserWaistCm] = useState('');
  const [calcRecommendation, setCalcRecommendation] = useState(null);

  // Tabs for bottom section (Tabla de Medidas & Políticas)
  const [activeBottomTab, setActiveBottomTab] = useState('medidas'); // 'medidas' | 'cambios' | 'envios' | 'garantia'

  // HD Zoom state and cursor tracker
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const imageContainerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  // Restock alert state
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertError, setAlertError] = useState('');
  const [alertLoading, setAlertLoading] = useState(false);

  // When changing color: adjust photo and auto-adjust size if currently out of stock
  const handleSelectColor = (idx) => {
    setSelectedColorIdx(idx);
    const newColor = colors[idx];
    const newAvail = newColor?.availableSizes?.length ? newColor.availableSizes : (selectedProduct.sizes || ['S']);
    
    // Switch to color image if available
    if (newColor?.image) {
      const imgIdx = allImages.findIndex(img => img === newColor.image);
      if (imgIdx !== -1) {
        setSelectedImageIdx(imgIdx);
      }
    }

    if (!newAvail.includes(selectedSize)) {
      setSelectedSize(newAvail[0] || 'S');
    }
    setAlertSuccess(false);
    setAlertError('');
  };

  const handleSelectSize = (sz) => {
    setSelectedSize(sz);
    setAlertSuccess(false);
    setAlertError('');
  };

  const handleStockAlertSubmit = (e) => {
    e.preventDefault();
    setAlertError('');
    const clean = sanitizeInput(alertEmail);
    if (!validateEmail(clean)) {
      setAlertError('Por favor ingresa un correo electrónico válido (ej: tu@correo.cl)');
      return;
    }

    setAlertLoading(true);
    try {
      const existingAlerts = safeJsonParse(localStorage.getItem('jazyalon_stock_alerts'), []);
      const newAlert = {
        id: `alert-${Date.now()}`,
        email: clean,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        color: activeColor.name,
        size: selectedSize,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('jazyalon_stock_alerts', JSON.stringify([...existingAlerts, newAlert]));
      syncStockAlertToDb(newAlert);
      window.dispatchEvent(new Event('jazyalon-alerts-updated'));
      setAlertSuccess(true);
      if (showToast) {
        showToast(`¡Aviso configurado para ${selectedProduct.name} (Talla ${selectedSize})! 🖤`, 'success');
      }
    } catch (err) {
      setAlertError('No pudimos registrar tu alerta. Inténtalo nuevamente.');
    } finally {
      setAlertLoading(false);
    }
  };

  const isFavorited = isInWishlist(selectedProduct.id);
  const discount = calculateDiscount(selectedProduct.oldPrice, selectedProduct.price);
  const savings = calculateSavings(selectedProduct.oldPrice, selectedProduct.price);

  const handleCalculateSize = (e) => {
    e.preventDefault();
    const waist = parseFloat(userWaistCm);
    if (!waist || isNaN(waist)) return;

    let rec = '';
    if (waist < 63) rec = 'XS';
    else if (waist <= 69) rec = 'S';
    else if (waist <= 75) rec = 'M';
    else if (waist <= 81) rec = 'L';
    else if (waist <= 89) rec = 'XL';
    else rec = 'XXL';

    setCalcRecommendation(rec);
    if (availableSizes.includes(rec)) {
      setSelectedSize(rec);
    }
  };

  const handleAddToCart = () => {
    if (!isSelectedSizeAvailable) return;
    addToCart(selectedProduct, selectedSize, activeColor?.name || 'Estándar', quantity);
  };

  const handleBuyNow = () => {
    if (!isSelectedSizeAvailable) return;
    addToCart(selectedProduct, selectedSize, activeColor?.name || 'Estándar', quantity);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const relatedProducts = products
    .filter(p => p.id !== selectedProduct.id && (p.category === selectedProduct.category || p.collection === selectedProduct.collection))
    .slice(0, 3);

  const waMessage = encodeURIComponent(
    `¡Hola JAZYALON! Quisiera consultar sobre el producto ${selectedProduct.name} en color "${activeColor?.name}" y talla "${selectedSize}" (SKU: ${selectedProduct.sku}).`
  );

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${selectedProduct.name}`}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
      onClick={() => setSelectedProduct(null)}
    >
      <div 
        ref={modalScrollRef}
        className="bg-[#FAF8F5] border border-[#D6CEBF] shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto relative my-auto text-[#181514] rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedProduct(null)}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-[#EDE8DE] hover:bg-[#181514] hover:text-white border border-[#D6CEBF] flex items-center justify-center text-[#8A8178] transition-all shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-8 md:p-10">
          {/* TOP SECTION: PHOTO GALLERY & PRODUCT INFO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Gallery Column with Interactive HD Zoom */}
            <div className="lg:col-span-6 space-y-4">
              <div 
                ref={imageContainerRef}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
                className="relative aspect-[4/5] w-full overflow-hidden bg-[#EDE8DE] rounded-xl border border-[#D6CEBF] shadow-inner cursor-crosshair group"
              >
                <img
                  src={allImages[selectedImageIdx] || allImages[0]}
                  alt={selectedProduct.name}
                  style={{
                    transformOrigin: isZooming ? `${zoomPos.x}% ${zoomPos.y}%` : 'center center',
                    transform: isZooming ? 'scale(2.5)' : 'scale(1)',
                    transition: isZooming ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out'
                  }}
                  className="w-full h-full object-cover object-center select-none"
                />

                {discount > 0 && (
                  <span className="absolute top-4 left-4 jz-label bg-[#9E7B3B] text-white px-3 py-1 text-[11px] font-bold rounded shadow-md pointer-events-none z-10">
                    -{discount}% OFF
                  </span>
                )}

                {/* Floating HD Zoom Badge */}
                <div className="absolute top-4 right-4 pointer-events-none z-10">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border transition-all ${
                    isZooming 
                      ? 'bg-black/90 text-[#9E7B3B] border-[#9E7B3B] shadow-lg scale-105' 
                      : 'bg-black/60 text-white/90 border-white/20'
                  }`}>
                    <ZoomIn className="w-3.5 h-3.5 text-[#9E7B3B]" />
                    <span>{isZooming ? 'Zoom HD 2.5x • Ballenas & Textura' : 'Pasa el cursor para Zoom HD'}</span>
                  </span>
                </div>

                {/* Fullscreen HD Zoom trigger button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  aria-label="Ver en pantalla completa HD"
                  title="Ampliar en pantalla completa HD"
                  className="absolute bottom-4 right-4 z-10 p-2 rounded-full bg-black/75 hover:bg-[#9E7B3B] text-white border border-white/20 transition-all shadow-md transform hover:scale-110 active:scale-95"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Color preview badge over image */}
                <span className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 pointer-events-none z-10">
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60" style={{ backgroundColor: activeColor.hex }} />
                  <span>{activeColor.name}</span>
                </span>
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`w-16 h-20 overflow-hidden rounded-lg border transition-all shrink-0 ${
                        selectedImageIdx === idx 
                          ? 'border-[#9E7B3B] ring-2 ring-[#9E7B3B] scale-102' 
                          : 'border-[#D6CEBF] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Miniatura" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Configuration Column */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div>
                {/* Category & SKU */}
                <div className="flex items-center justify-between jz-label text-[#8A8178] mb-1.5">
                  <span className="text-[#9E7B3B] font-bold uppercase tracking-wider">{selectedProduct.categoryName}</span>
                  <span className="font-mono text-xs">SKU: {selectedProduct.sku}</span>
                </div>

                <h1 className="jz-display text-2xl sm:text-3xl md:text-4xl text-[#181514] font-normal leading-tight mb-2">
                  {selectedProduct.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center text-[#9E7B3B]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#181514]">{selectedProduct.rating}</span>
                  <span className="text-xs text-[#8A8178]">({selectedProduct.reviewsCount} reseñas verificadas)</span>
                </div>

                {/* Price Container */}
                <div className="p-4 bg-[#EDE8DE] border border-[#D6CEBF] rounded-xl flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold text-[#181514] font-mono">
                        {formatCLP(selectedProduct.price)}
                      </span>
                      {selectedProduct.oldPrice && (
                        <span className="text-xs text-[#8A8178] line-through font-mono">
                          {formatCLP(selectedProduct.oldPrice)}
                        </span>
                      )}
                    </div>
                    {savings > 0 && (
                      <span className="jz-label text-[#9E7B3B] text-[10px] mt-0.5 block font-bold">
                        Ahorras: {formatCLP(savings)}
                      </span>
                    )}
                  </div>

                  <span className="jz-label text-[10px] text-emerald-800 font-bold bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Stock en Santiago
                  </span>
                </div>

                <p className="font-sans text-xs sm:text-sm text-[#5E564F] font-light leading-relaxed mb-5">
                  {selectedProduct.description}
                </p>

                {/* 1. SELECTOR DE COLORES (CLIENT REQUIREMENT) */}
                <div className="mb-5 p-3.5 bg-[#FAF8F5] border border-[#D6CEBF] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase tracking-wider text-[#181514] font-bold">
                      Color seleccionado: <span className="text-[#9E7B3B] font-extrabold">{activeColor.name}</span>
                    </label>
                    <span className="text-[10px] text-[#8A8178]">
                      {colors.length} {colors.length === 1 ? 'color' : 'colores'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap" role="group" aria-label="Colores disponibles">
                    {colors.map((c, i) => {
                      const isActive = i === selectedColorIdx;
                      return (
                        <button
                          key={c.name || i}
                          type="button"
                          onClick={() => handleSelectColor(i)}
                          className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                            isActive
                              ? 'border-[#9E7B3B] bg-[#EDE8DE] ring-2 ring-[#9E7B3B]/40 shadow-sm'
                              : 'border-[#D6CEBF] bg-[#FFFFFF] hover:border-[#181514]'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className={`text-xs ${isActive ? 'font-bold text-[#181514]' : 'text-[#5E564F]'}`}>
                            {c.name}
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#9E7B3B]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SELECTOR DE TALLAS ASOCIADAS AL COLOR (CLIENT REQUIREMENT) */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase tracking-wider text-[#181514] font-bold">
                      Talla: <span className="text-[#9E7B3B] font-extrabold">{selectedSize}</span>
                    </label>
                    <button
                      onClick={() => setActiveBottomTab('medidas')}
                      className="jz-label text-[#5E564F] hover:text-[#9E7B3B] flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <Ruler className="w-3.5 h-3.5 text-[#9E7B3B]" />
                      <span>Ver Tabla de Medidas</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allDisplaySizes.map(sz => {
                      const isAvailable = availableSizes.includes(sz);
                      const isSelected = selectedSize === sz;

                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleSelectSize(sz)}
                          title={isAvailable ? `Talla ${sz} (Disponible en ${activeColor.name})` : `Talla ${sz} (Agotada en ${activeColor.name} - Clic para avisarte cuando esté disponible)`}
                          aria-pressed={isSelected}
                          className={`min-w-[48px] h-10 px-3 text-xs font-bold uppercase rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? isAvailable
                                ? 'bg-[#9E7B3B] text-white border border-[#9E7B3B] shadow-sm'
                                : 'bg-[#181514] text-white border-2 border-[#9E7B3B] shadow-md ring-2 ring-[#9E7B3B]/40'
                              : isAvailable
                                ? 'bg-[#FFFFFF] border border-[#D6CEBF] text-[#181514] hover:border-[#9E7B3B] hover:text-[#9E7B3B]'
                                : 'bg-[#F2EFE9] border border-dashed border-[#D6CEBF] text-[#A39A8E] hover:border-[#9E7B3B] hover:text-[#181514]'
                          }`}
                        >
                          <span className={!isAvailable && !isSelected ? 'line-through opacity-65' : ''}>{sz}</span>
                          {!isAvailable && (
                            <span className={`text-[7px] no-underline tracking-normal font-sans font-bold -mt-0.5 ${isSelected ? 'text-[#9E7B3B]' : 'text-red-700/80'}`}>
                              Agotado
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* RESTOCK ALERT BOX (CLIENT REQUIREMENT) */}
                  {!isSelectedSizeAvailable ? (
                    <div className="mt-4 p-4 bg-[#181514] text-white rounded-xl border border-[#9E7B3B] shadow-xl animate-fadeIn">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#9E7B3B] uppercase tracking-wider mb-1.5">
                        <Bell className="w-4 h-4 text-[#9E7B3B] animate-bounce shrink-0" />
                        <span>Talla {selectedSize} Agotada en {activeColor.name}</span>
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed mb-3">
                        ¿Quieres esta pieza? Déjanos tu email y te avisaremos inmediatamente cuando repongamos stock de la talla <strong>{selectedSize}</strong> en color <strong>{activeColor.name}</strong>.
                      </p>

                      {alertSuccess ? (
                        <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-lg text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>¡Suscripción confirmada! Te notificaremos a <strong>{alertEmail}</strong> apenas ingrese nuevo stock ✦</span>
                        </div>
                      ) : (
                        <form onSubmit={handleStockAlertSubmit} className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="tu.correo@ejemplo.com"
                              value={alertEmail}
                              onChange={(e) => setAlertEmail(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 focus:border-[#9E7B3B] focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={alertLoading}
                              className="bg-[#9E7B3B] hover:bg-white hover:text-[#181514] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 shadow-md flex items-center gap-1.5"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>{alertLoading ? 'Guardando...' : 'Avisarme'}</span>
                            </button>
                          </div>
                          {alertError && (
                            <span className="text-[10px] text-rose-400 block font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {alertError}
                            </span>
                          )}
                        </form>
                      )}
                    </div>
                  ) : (
                    outOfStockSizes.length > 0 && (
                      <p className="text-[10px] text-[#8A8178] mt-2">
                        * Puedes hacer clic en las tallas agotadas para activar tu aviso de reposición de stock.
                      </p>
                    )
                  )}
                </div>

                {/* Purchase Action Buttons */}
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2.5 sm:gap-3">
                    {/* Quantity Picker */}
                    <div className={`flex items-center border border-[#D6CEBF] bg-[#FFFFFF] rounded-lg overflow-hidden shrink-0 ${!isSelectedSizeAvailable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                        className="px-3 py-2 text-[#181514] hover:text-[#9E7B3B] font-bold"
                        aria-label="Disminuir cantidad"
                      >
                        -
                      </button>
                      <span className="px-3 py-2 text-xs font-mono font-bold text-[#181514]">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)} 
                        className="px-3 py-2 text-[#181514] hover:text-[#9E7B3B] font-bold"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>

                    {/* Add to Cart */}
                    <button
                      onClick={handleAddToCart}
                      disabled={!isSelectedSizeAvailable}
                      className={`flex-1 py-3 px-3 sm:px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm ${
                        isSelectedSizeAvailable
                          ? 'bg-[#181514] hover:bg-[#9E7B3B] text-white cursor-pointer'
                          : 'bg-[#A39A8E]/40 text-[#5E564F] cursor-not-allowed border border-[#D6CEBF]'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {isSelectedSizeAvailable 
                          ? `Añadir (${formatCLP(selectedProduct.price * quantity)})` 
                          : `Talla ${selectedSize} Agotada`}
                      </span>
                    </button>

                    {/* Wishlist */}
                    <button
                      onClick={() => toggleWishlist(selectedProduct)}
                      aria-label="Guardar en favoritos"
                      className={`p-3 rounded-lg border transition-colors shrink-0 ${
                        isFavorited ? 'bg-[#9E7B3B] text-white border-[#9E7B3B]' : 'border-[#D6CEBF] bg-[#FFFFFF] text-[#181514] hover:border-[#181514]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Buy Now Direct Button */}
                  {isSelectedSizeAvailable ? (
                    <button
                      onClick={handleBuyNow}
                      className="w-full py-3.5 bg-[#9E7B3B] hover:bg-[#181514] text-white font-bold rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Comprar Ahora con Despacho a Chile</span>
                    </button>
                  ) : (
                    <div className="w-full py-2.5 bg-[#EDE8DE] border border-[#D6CEBF] text-[#8A8178] font-medium rounded-lg text-xs text-center">
                      Selecciona otra talla disponible o suscríbete arriba para avisarte cuando vuelva a estar en stock.
                    </div>
                  )}

                  {/* WhatsApp Support Query */}
                  <a
                    href={`https://wa.me/56940187563?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 border border-emerald-600/40 text-emerald-800 bg-emerald-50/70 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Consultar stock o dudas de talla por WhatsApp</span>
                  </a>
                </div>

                {/* Specs Box */}
                {selectedProduct.specs && (
                  <div className="bg-[#EDE8DE] p-3.5 border border-[#D6CEBF] rounded-xl text-xs mt-5">
                    <span className="jz-label text-[#8A8178] block mb-1.5 text-[10px] font-bold">
                      Estructura & Ballenas de Acero:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#5E564F]">
                      {Object.entries(selectedProduct.specs).slice(0, 4).map(([k, v]) => (
                        <div key={k}><strong className="capitalize text-[#181514]">{k}:</strong> {v}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 3. AL FINAL: TABLA DE MEDIDAS & POLÍTICAS (CLIENT REQUIREMENT) */}
          <div className="mt-10 pt-8 border-t border-[#D6CEBF]">
            
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-[#D6CEBF] pb-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveBottomTab('medidas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                  activeBottomTab === 'medidas'
                    ? 'bg-[#181514] text-white shadow-sm'
                    : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 text-[#9E7B3B]" />
                <span>Tabla de Medidas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('cambios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                  activeBottomTab === 'cambios'
                    ? 'bg-[#181514] text-white shadow-sm'
                    : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#9E7B3B]" />
                <span>Cambios y Devoluciones</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('envios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                  activeBottomTab === 'envios'
                    ? 'bg-[#181514] text-white shadow-sm'
                    : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#9E7B3B]" />
                <span>Políticas de Envío</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('garantia')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                  activeBottomTab === 'garantia'
                    ? 'bg-[#181514] text-white shadow-sm'
                    : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#9E7B3B]" />
                <span>Garantía de Ballenas</span>
              </button>
            </div>

            {/* TAB CONTENT: TABLA DE MEDIDAS */}
            {activeBottomTab === 'medidas' && (
              <div className="mt-5 p-5 bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl animate-fadeIn space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="jz-display text-xl text-[#181514] font-normal">
                      Tabla de Medidas para Corsetería & Vestidos
                    </h3>
                    <p className="text-xs text-[#5E564F] mt-0.5">
                      Mide tu cintura natural (2 a 3 cm sobre el ombligo). La corsetería victoriana reduce entre 5 y 10 cm con el lazado posterior.
                    </p>
                  </div>

                  {/* Calculator inlined */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="Cintura en cm (ej: 68)"
                      value={userWaistCm}
                      onChange={(e) => setUserWaistCm(e.target.value)}
                      className="bg-[#FFFFFF] border border-[#D6CEBF] rounded-lg px-3 py-2 text-xs text-[#181514] placeholder-[#8A8178] w-40 focus:border-[#9E7B3B] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCalculateSize}
                      className="bg-[#181514] hover:bg-[#9E7B3B] text-white text-xs uppercase px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap shadow-xs"
                    >
                      Calcular
                    </button>
                  </div>
                </div>

                {calcRecommendation && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Para tus {userWaistCm} cm de cintura, te recomendamos la <strong>Talla {calcRecommendation}</strong>.</span>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-[#D6CEBF] bg-[#FFFFFF]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF8F5] uppercase tracking-wider text-[10px] text-[#9E7B3B] border-b border-[#D6CEBF] font-extrabold">
                      <tr>
                        <th className="p-3">Talla</th>
                        <th className="p-3">Cintura Recomendada</th>
                        <th className="p-3">Busto</th>
                        <th className="p-3">Cadera</th>
                        <th className="p-3 text-right">Disponibilidad ({activeColor.name})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D6CEBF]">
                      {(sizeChart || []).map((row) => {
                        const inStock = availableSizes.includes(row.size);
                        const isChosen = selectedSize === row.size;

                        return (
                          <tr 
                            key={row.size} 
                            onClick={() => inStock && setSelectedSize(row.size)}
                            className={`cursor-pointer transition-colors ${
                              isChosen 
                                ? 'bg-[#9E7B3B]/10 font-bold' 
                                : inStock 
                                  ? 'hover:bg-[#FAF8F5]' 
                                  : 'opacity-50 bg-gray-50'
                            }`}
                          >
                            <td className="p-3 font-mono text-sm text-[#9E7B3B] font-bold">{row.size}</td>
                            <td className="p-3 text-[#181514] font-medium">{row.cintura}</td>
                            <td className="p-3 text-[#5E564F]">{row.busto}</td>
                            <td className="p-3 text-[#5E564F]">{row.cadera}</td>
                            <td className="p-3 text-right">
                              {inStock ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                                  <Check className="w-3 h-3" /> En Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] text-[#8A8178] bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                  Agotado en {activeColor.name}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: POLÍTICAS DE CAMBIOS */}
            {activeBottomTab === 'cambios' && (
              <div className="mt-5 p-5 bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl animate-fadeIn space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="jz-display text-xl text-[#181514] font-normal">
                    {brandPolicies?.returns?.title || "Políticas de Cambios y Devoluciones"}
                  </h3>
                  <span className="text-[10px] bg-[#9E7B3B] text-white px-2.5 py-0.5 rounded font-bold">
                    {brandPolicies?.returns?.badge || "10 Días de Garantía"}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-[#5E564F] leading-relaxed">
                  {(brandPolicies?.returns?.points || [
                    "Dispones de 10 días corridos desde recibido el paquete para solicitar cambio de talla o modelo.",
                    "La prenda debe entregarse sin signos de uso, sin perfumes, sin lavado y con todas sus etiquetas y empaques originales intactos.",
                    "Por motivos de higiene y confección íntima, corsets con uso prolongado o intervenidos no aplican para cambio.",
                    "Atención y asesoría directa por nuestro canal de WhatsApp (+56 9 4018 7563) con tu número de orden."
                  ]).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9E7B3B] mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* TAB CONTENT: POLÍTICAS DE ENVÍO */}
            {activeBottomTab === 'envios' && (
              <div className="mt-5 p-5 bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl animate-fadeIn space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="jz-display text-xl text-[#181514] font-normal">
                    {brandPolicies?.shipping?.title || "Políticas de Despacho & Cobertura"}
                  </h3>
                  <span className="text-[10px] bg-[#181514] text-white px-2.5 py-0.5 rounded font-bold">
                    Todo Chile
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-[#5E564F] leading-relaxed">
                  {(brandPolicies?.shipping?.points || [
                    "Región Metropolitana: Despacho prioritario en 24 a 48 horas hábiles.",
                    "Regiones de Chile: Despacho por Starken, Chilexpress y Blue Express en 1 a 4 días hábiles.",
                    "Envío GRATIS automático en todas las compras a partir de $60.000 CLP.",
                    "Cada pedido se despacha con código de rastreo en línea y embalaje reforzado y discreto."
                  ]).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9E7B3B] mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* TAB CONTENT: GARANTÍA */}
            {activeBottomTab === 'garantia' && (
              <div className="mt-5 p-5 bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl animate-fadeIn space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="jz-display text-xl text-[#181514] font-normal">
                    {brandPolicies?.warranty?.title || "Garantía de Corsetería de Época"}
                  </h3>
                  <span className="text-[10px] bg-[#9E7B3B] text-white px-2.5 py-0.5 rounded font-bold">
                    Ballenas de Acero Genuino
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-[#5E564F] leading-relaxed">
                  {(brandPolicies?.warranty?.points || [
                    "Estructuras 100% equipadas con ballenas de acero templado y espiralado (no utilizamos plástico).",
                    "Garantía de reducción efectiva de cintura de 5 a 10 cm con ajuste ergonómico y panel de modestia.",
                    "Costuras de alta resistencia y brocados finos de importación directa."
                  ]).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9E7B3B] mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[#D6CEBF]">
              <h3 className="jz-display text-2xl text-[#181514] mb-6">
                Otras Piezas de la Colección:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {relatedProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX HD INSPECTION MODAL */}
      {isLightboxOpen && (
        <div 
          role="dialog"
          aria-label="Inspección HD de prenda"
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Cerrar vista HD"
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-[#9E7B3B] text-white flex items-center justify-center transition-all z-30 shadow-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center">
            <img 
              src={allImages[selectedImageIdx] || allImages[0]}
              alt={selectedProduct.name}
              className="max-h-[82vh] w-auto object-contain rounded-xl border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 text-center text-white/90 text-xs tracking-wider">
              <span className="text-[#9E7B3B] font-bold">{selectedProduct.name}</span> — {activeColor.name} • <span className="text-white/60">Inspección de Ballenas de Acero & Costuras HD</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
