import React, { useState, useMemo, useEffect } from 'react';
import { Heart, Eye, ShoppingBag, Check, Crown, Bell } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { formatCLP, calculateDiscount } from '../../utils/formatters';

/**
 * Editorial product card with dynamic Color & Size Selection below the photo.
 *  - Below photo: Interactive color swatches with live preview switch.
 *  - Selecting a color shows the available and out-of-stock sizes for that color.
 *  - Clicking size or quick add purchases that exact color & size variation.
 */
export default function ProductCard({ product, isCollectionPrimaryBadge = false }) {
  const {
    addToCart,
    toggleWishlist,
    isInWishlist,
    setSelectedProduct,
  } = useShop();

  // Colors definition (fallback safe)
  const colors = useMemo(() => {
    if (product.colors && product.colors.length > 0) return product.colors;
    return [
      { 
        name: 'Negro', 
        hex: '#111111', 
        availableSizes: product.sizes || ['S', 'M', 'L'], 
        outOfStockSizes: [],
        image: product.images?.[0] 
      }
    ];
  }, [product.colors, product.sizes, product.images]);

  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const safeColorIdx = selectedColorIdx < colors.length ? selectedColorIdx : 0;
  const activeColor = colors[safeColorIdx] || colors[0];

  // Available sizes for currently selected color
  const availableSizes = useMemo(() => {
    if (Array.isArray(activeColor?.availableSizes)) {
      return activeColor.availableSizes;
    }
    return product.sizes || ['S', 'M', 'L'];
  }, [activeColor, product.sizes]);

  const outOfStockSizes = useMemo(() => {
    return activeColor?.outOfStockSizes || [];
  }, [activeColor]);

  // Combined sizes list preserving order
  const displaySizes = useMemo(() => {
    const baseList = product.sizes && product.sizes.length > 0 
      ? product.sizes 
      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
    const relevant = baseList.filter(sz => availableSizes.includes(sz) || outOfStockSizes.includes(sz));
    return relevant.length > 0 ? relevant : baseList;
  }, [product.sizes, availableSizes, outOfStockSizes]);

  const [selectedSize, setSelectedSize] = useState(() => availableSizes[0] || displaySizes[0] || 'S');
  const [justAdded, setJustAdded] = useState(false);

  // Keep selectedSize synchronized in real-time if Admin toggles size stock
  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  const isCurrentSizeAvailable = availableSizes.includes(selectedSize) && (product.stock === undefined || Number(product.stock) > 0);

  const handleSelectColor = (idx, e) => {
    e.stopPropagation();
    setSelectedColorIdx(idx);
    const newColor = colors[idx];
    const newAvail = Array.isArray(newColor?.availableSizes) ? newColor.availableSizes : (product.sizes || ['S']);
    if (newAvail.length > 0 && !newAvail.includes(selectedSize)) {
      setSelectedSize(newAvail[0]);
    }
  };

  const handleSelectSize = (sz, isAvailable, e) => {
    e.stopPropagation();
    setSelectedSize(sz);
    if (!isAvailable) {
      setSelectedProduct({
        ...product,
        initialColor: activeColor?.name,
        initialSize: sz
      });
    }
  };

  const isFavorited = isInWishlist(product.id);
  const discount = calculateDiscount(product.oldPrice, product.price);

  const primaryImage = activeColor?.image || product.images?.[0] || product.image_url || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';
  const secondaryImage = product.images?.[1] && product.images[1] !== primaryImage ? product.images[1] : null;

  const handleToggleFav = (e) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleOpenDetail = () => {
    setSelectedProduct({
      ...product,
      initialColor: activeColor?.name,
      initialSize: selectedSize
    });
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (!isCurrentSizeAvailable) {
      handleOpenDetail();
      return;
    }
    addToCart(product, selectedSize, activeColor?.name || 'Estándar', 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const ease = '[transition-timing-function:var(--jz-ease)]';

  return (
    <article className="group relative flex flex-col justify-between" data-card>
      <div>
        {/* PHOTOGRAPH */}
        <div
          data-cursor="Ver"
          onClick={handleOpenDetail}
          className={`relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#EDE8DE] rounded-xl border transition-colors duration-300 ${
            isCollectionPrimaryBadge ? 'border-[#C8A96B] ring-1 ring-[#C8A96B]/40' : 'border-[#D6CEBF]'
          }`}
        >
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ${ease} group-hover:scale-[1.05]`}
          />
          {secondaryImage && (
            <img
              src={secondaryImage}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-[800ms] ${ease} group-hover:opacity-100 group-hover:scale-[1.05]`}
            />
          )}

          {/* Soft floor shade so actions stay legible */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100" />

          {/* Top Row: Primary Crown / Discount / Badge + Wishlist */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-3.5 z-10 gap-2">
            <div className="flex flex-col items-start gap-1">
              {isCollectionPrimaryBadge && (
                <span className="inline-flex items-center gap-1 bg-[#181514]/90 border border-[#C8A96B]/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#C8A96B] font-bold rounded shadow-md backdrop-blur-sm">
                  <Crown className="w-2.5 h-2.5" />
                  <span>#1 Colección</span>
                </span>
              )}
              {discount > 0 ? (
                <span className="jz-label bg-[#9E7B3B] px-2 py-0.5 text-[0.6rem] text-white font-bold rounded shadow-sm">
                  -{discount}%
                </span>
              ) : product.badge ? (
                <span className="jz-label border border-white/50 bg-black/60 px-2 py-0.5 text-[0.6rem] text-white backdrop-blur-sm rounded shadow-sm">
                  {product.badge}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleToggleFav}
              aria-label={isFavorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              aria-pressed={isFavorited}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-xs text-white transition-transform duration-300 hover:scale-110 shrink-0"
            >
              <Heart
                strokeWidth={1.6}
                className={`h-4 w-4 drop-shadow transition-colors ${isFavorited ? 'fill-[#9E7B3B] text-[#9E7B3B]' : ''}`}
              />
            </button>
          </div>

          {/* Hover Overlay Action Buttons (Discreto en desktop, limpio en móvil) */}
          <div
            className={`hidden sm:block jz-card-actions absolute inset-x-0 bottom-0 translate-y-3 p-3 opacity-0 transition-[opacity,transform] duration-500 ${ease} group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 z-10`}
          >
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenDetail(); }}
                className="jz-label flex items-center justify-center gap-1.5 border border-white/70 bg-black/70 py-2.5 text-[0.625rem] text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-black rounded font-semibold"
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                Ver Detalle
              </button>
              <button
                type="button"
                onClick={handleQuickAdd}
                className={`jz-label flex items-center justify-center gap-1.5 py-2.5 text-[0.625rem] text-white transition-colors duration-300 rounded shadow-md font-bold ${
                  justAdded
                    ? 'border border-emerald-600 bg-emerald-600'
                    : isCurrentSizeAvailable
                      ? 'border border-[#9E7B3B] bg-[#9E7B3B] hover:border-[#181514] hover:bg-[#181514]'
                      : 'border border-white/40 bg-[#181514]/90 hover:bg-[#9E7B3B]'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Añadido
                  </>
                ) : isCurrentSizeAvailable ? (
                  <>
                    <ShoppingBag className="h-3 w-3" aria-hidden="true" />
                    Añadir ({selectedSize})
                  </>
                ) : (
                  <>
                    <Bell className="h-3 w-3" aria-hidden="true" />
                    Avisarme
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* BELOW PHOTO: COLOR PICKER & SIZE SELECTOR */}
        <div className="mt-2 space-y-1.5">
          {/* Colors Swatches Row */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Elegir color">
              {colors.map((c, i) => {
                const isActive = i === safeColorIdx;
                return (
                  <button
                    key={c.name || i}
                    type="button"
                    onClick={(e) => handleSelectColor(i, e)}
                    title={`Color: ${c.name}`}
                    aria-label={`Seleccionar color ${c.name}`}
                    className={`relative w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full border transition-all duration-200 transform hover:scale-115 ${
                      isActive 
                        ? 'ring-2 ring-[#9E7B3B] ring-offset-1 ring-offset-[#FAF8F5] scale-110 border-white' 
                        : 'border-[#A39A8E]/60 hover:border-[#181514]'
                    }`}
                    style={{ backgroundColor: c.hex || '#111111' }}
                  >
                    {isActive && (
                      <span className="sr-only">Seleccionado</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Color Name */}
            <span className="text-[9px] sm:text-[10px] text-[#8A8178] truncate max-w-[100px] sm:max-w-[120px] font-medium">
              {activeColor.name}
            </span>
          </div>

          {/* Sizes Row for the selected color */}
          <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Tallas disponibles">
            {displaySizes.map((sz) => {
              const isAvailable = availableSizes.includes(sz) && (product.stock === undefined || Number(product.stock) > 0);
              const isSelected = selectedSize === sz && isAvailable;

              return (
                <button
                  key={sz}
                  type="button"
                  onClick={(e) => handleSelectSize(sz, isAvailable, e)}
                  title={isAvailable ? `Talla ${sz}` : `Talla ${sz} (Agotada)`}
                  aria-pressed={isSelected}
                  className={`text-[8.5px] sm:text-[9px] uppercase px-1.5 py-0.5 rounded transition-all font-mono font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-[#9E7B3B] text-white shadow-xs border border-[#9E7B3B]'
                      : isAvailable
                        ? 'bg-[#EDE8DE] text-[#181514] border border-[#D6CEBF] hover:border-[#9E7B3B]'
                        : 'bg-[#F2EFE9] text-[#A39A8E] border border-dashed border-[#D6CEBF] line-through opacity-60'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>

        {/* PRODUCT TITLE & CATEGORY */}
        <div className="mt-1.5 sm:mt-2">
          <p className="text-[9px] sm:text-[10px] text-[#8A8178] font-bold uppercase tracking-wider truncate">
            {product.categoryName}
          </p>
          <h3 
            onClick={handleOpenDetail}
            className="jz-display line-clamp-2 text-[1rem] sm:text-[1.15rem] leading-snug sm:leading-[1.15] text-[#181514] font-normal hover:text-[#9E7B3B] transition-colors cursor-pointer mt-0.5"
          >
            {product.name}
          </h3>
        </div>
      </div>

      {/* PRICE + MOBILE QUICK ADD */}
      <div className="mt-2 pt-1 border-t border-[#D6CEBF]/50 flex items-center justify-between gap-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {product.oldPrice && (
            <span className="text-[10px] sm:text-[11px] tabular-nums text-[#8A8178] line-through font-mono">
              {formatCLP(product.oldPrice)}
            </span>
          )}
          <span className="text-xs sm:text-sm font-bold tabular-nums text-[#181514] font-mono">
            {formatCLP(product.price)}
          </span>
        </div>

        {/* Botón sutil en móviles al lado del precio para comprar sin invadir la foto */}
        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label={`Añadir ${product.name} al carro`}
          className="sm:hidden p-1.5 rounded-lg bg-[#9E7B3B] text-white active:scale-95 transition-transform shadow-xs"
        >
          {justAdded ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <ShoppingBag className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </article>
  );
}
