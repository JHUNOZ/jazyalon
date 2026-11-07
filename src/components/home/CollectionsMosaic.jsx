import React from 'react';
import { ArrowUpRight, Crown } from 'lucide-react';
import { COLLECTIONS } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';
import SectionHeading from '../motion/SectionHeading';

const COLLECTION_TO_CATEGORY_MAP = {
  'brocado-imperial': 'corsets-brocado',
  'encaje-romantico': 'corsets-encaje',
  'mangas-encaje': 'corsets-mangas',
  'denim-lurex': 'corsets-denim'
};

export default function CollectionsMosaic({ setCurrentView }) {
  const { setSelectedCollection, setSelectedCategory, collections, products } = useShop();

  const handleSelectCollection = (colId) => {
    if (colId === 'destacados-principal') {
      setSelectedCollection(null);
      setSelectedCategory('all');
    } else {
      setSelectedCategory('all');
      setSelectedCollection(colId);
    }
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allCols = collections && collections.length > 0 ? collections : COLLECTIONS;
  const activeProducts = (products || []).filter(p => p.is_active !== false);

  // Resolve Primary Corset (#1), cover photo, and live synchronized product count
  const getCollectionMeta = (col) => {
    if (!col) return { coverImage: '/fotos/01.png', countText: '0 Diseños', primaryCorset: null };

    const mappedCatId = COLLECTION_TO_CATEGORY_MAP[col.id] || col.id;
    const colProducts = col.id === 'destacados-principal'
      ? activeProducts.filter(p => p.isFeatured || p.isNew || p.is_featured)
      : activeProducts.filter(
          p => p.collection === col.id || p.category === col.id || p.category === mappedCatId
        );

    const primaryCorset =
      colProducts.find(p => p.id === col.primaryProductId) ||
      activeProducts.find(p => p.id === col.primaryProductId) ||
      colProducts.find(p => p.isCollectionPrimary) ||
      colProducts[0] ||
      null;

    const coverImage =
      (col.usePrimaryProductCover && primaryCorset ? (primaryCorset.images?.[0] || primaryCorset.image_url) : null) ||
      col.image ||
      primaryCorset?.images?.[0] ||
      primaryCorset?.image_url ||
      '/fotos/01.png';

    const countText = col.id === 'destacados-principal'
      ? `${colProducts.length} Destacados`
      : `${colProducts.length} ${colProducts.length === 1 ? 'Diseño' : 'Diseños'}`;

    return { coverImage, countText, primaryCorset };
  };

  const primaryFeatured = allCols.find(c => c.isPrimaryFeatured) || allCols[0];
  const remainingCols = allCols.filter(c => c.id !== primaryFeatured?.id);
  const secondHeroCol = remainingCols[0] || null;
  const gridCols = remainingCols.slice(1);

  const primaryMeta = getCollectionMeta(primaryFeatured);
  const secondMeta = getCollectionMeta(secondHeroCol);

  return (
    <section id="colecciones" className="jz-section bg-[var(--jz-bg)]">
      <div className="jz-wrap">
        <SectionHeading
          index="03"
          label="LÍNEAS DE DISEÑO SINCRONIZADAS"
          title="*Colecciones*"
        />

        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
          {/* FILA SUPERIOR: COLECCIÓN PRINCIPAL (7 COLS) + SEGUNDA COLECCIÓN (5 COLS) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
            {/* 1. CUADRO PRINCIPAL (7 COLS) */}
            {primaryFeatured && (
              <div
                onClick={() => handleSelectCollection(primaryFeatured.id)}
                className={`${secondHeroCol ? 'md:col-span-7' : 'md:col-span-12'} group relative overflow-hidden min-h-[300px] sm:min-h-[360px] border border-[var(--jz-line)] hover:border-[#C8A96B] transition-all duration-500 cursor-pointer bg-[var(--jz-bg-2)] flex flex-col justify-between p-5 sm:p-7 rounded-xl shadow-sm hover:shadow-xl`}
              >
                <img
                  src={primaryMeta.coverImage}
                  alt={primaryFeatured.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.86] contrast-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50" />

                <div className="relative z-20 flex items-start justify-between gap-3">
                  <div className="max-w-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--jz-champagne)]" />
                      <span className="jz-label text-[10px] text-white/85">JAZYALON • COLECCIÓN PRINCIPAL</span>
                    </div>
                    <h3 className="jz-display text-2xl sm:text-3xl lg:text-4xl text-white font-light uppercase tracking-wide">
                      {primaryFeatured.name}
                    </h3>
                    {primaryFeatured.subtitle && (
                      <p className="text-xs text-white/80 font-light mt-1 line-clamp-2">
                        {primaryFeatured.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className="jz-label text-[10px] text-[var(--jz-champagne)] px-2.5 py-0.5 rounded-full bg-black/55 border border-white/15 backdrop-blur-sm">
                        ✦ {primaryMeta.countText}
                      </span>
                      {primaryMeta.primaryCorset && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-[#C8A96B]/45 text-[10px] text-[#FAF8F5] backdrop-blur-sm">
                          <Crown className="w-3 h-3 text-[#C8A96B]" />
                          <span>#1: <strong className="text-[#C8A96B]">{primaryMeta.primaryCorset.name}</strong></span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-full bg-black/55 group-hover:bg-[#C8A96B] group-hover:text-[#181514] text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="relative z-20 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelectCollection(primaryFeatured.id); }}
                    className="jz-label px-7 py-2 rounded-full bg-[#FAF8F5]/95 group-hover:bg-[#9E7B3B] text-[#181514] group-hover:text-white border border-[#D6CEBF]/60 transition-all duration-300 backdrop-blur-md shadow-xl text-[10px] font-semibold"
                  >
                    Explorar Colección
                  </button>
                </div>
              </div>
            )}

            {/* 2. SEGUNDA COLECCIÓN DESTACADA (5 COLS) */}
            {secondHeroCol && (
              <div
                onClick={() => handleSelectCollection(secondHeroCol.id)}
                className="md:col-span-5 group relative overflow-hidden min-h-[300px] sm:min-h-[360px] border border-[var(--jz-line)] hover:border-[#C8A96B] transition-all duration-500 cursor-pointer bg-[var(--jz-bg-2)] flex flex-col justify-between p-5 sm:p-7 rounded-xl shadow-sm hover:shadow-xl"
              >
                <img
                  src={secondMeta.coverImage}
                  alt={secondHeroCol.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.84] contrast-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50" />

                <div className="relative z-20 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--jz-champagne)]" />
                      <span className="jz-label text-[10px] text-white/85">JAZYALON</span>
                    </div>
                    <h3 className="jz-display text-xl sm:text-2xl lg:text-3xl text-white font-light uppercase tracking-wide">
                      {secondHeroCol.name}
                    </h3>
                    {secondHeroCol.subtitle && (
                      <p className="text-[11px] text-white/75 font-light mt-1 line-clamp-2">
                        {secondHeroCol.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="jz-label text-[10px] text-white/85 px-2.5 py-0.5 rounded-full bg-black/55 border border-white/15 backdrop-blur-sm">
                        {secondMeta.countText}
                      </span>
                      {secondMeta.primaryCorset && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 border border-[#C8A96B]/45 text-[10px] text-[#FAF8F5] backdrop-blur-sm">
                          <Crown className="w-3 h-3 text-[#C8A96B]" />
                          <span className="truncate max-w-[180px]">#1: <strong className="text-[#C8A96B]">{secondMeta.primaryCorset.name}</strong></span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-full bg-black/55 group-hover:bg-[#C8A96B] group-hover:text-[#181514] text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="relative z-20 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelectCollection(secondHeroCol.id); }}
                    className="jz-label px-7 py-2 rounded-full bg-[#FAF8F5]/95 group-hover:bg-[#9E7B3B] text-[#181514] group-hover:text-white border border-[#D6CEBF]/60 transition-all duration-300 backdrop-blur-md shadow-xl text-[10px] font-semibold"
                  >
                    Ver Colección
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FILAS INFERIORES: TODAS LAS DEMÁS COLECCIONES DINÁMICAS */}
          {gridCols.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {gridCols.map((col) => {
                const meta = getCollectionMeta(col);
                return (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollection(col.id)}
                    className="group relative overflow-hidden aspect-[4/4.6] border border-[var(--jz-line)] hover:border-[#C8A96B] transition-all duration-500 cursor-pointer bg-[var(--jz-bg-2)] flex flex-col justify-between p-5 sm:p-6 rounded-xl shadow-sm hover:shadow-xl"
                  >
                    <img
                      src={meta.coverImage}
                      alt={col.name}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105 filter brightness-[0.86]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50" />

                    <div className="relative z-20 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--jz-champagne)]" />
                          <span className="jz-label text-[10px] text-white/85">JAZYALON</span>
                        </div>
                        <h3 className="jz-display text-xl sm:text-2xl text-white font-light uppercase tracking-wide">
                          {col.name}
                        </h3>
                        {col.subtitle && (
                          <p className="text-[11px] text-white/75 font-light mt-1 line-clamp-2">
                            {col.subtitle}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="jz-label text-[10px] text-white/85 px-2 py-0.5 rounded-full bg-black/55 border border-white/15">
                            {meta.countText}
                          </span>
                          {meta.primaryCorset && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 border border-[#C8A96B]/45 text-[9px] text-[#FAF8F5] backdrop-blur-sm">
                              <Crown className="w-2.5 h-2.5 text-[#C8A96B]" />
                              <span className="truncate max-w-[170px]">#1: {meta.primaryCorset.name}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        aria-hidden="true"
                        className="w-8 h-8 rounded-full bg-black/55 group-hover:bg-[#C8A96B] group-hover:text-[#181514] text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="relative z-20 flex justify-center pb-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSelectCollection(col.id); }}
                        className="jz-label px-7 py-2 rounded-full bg-[#FAF8F5]/95 group-hover:bg-[#9E7B3B] text-[#181514] group-hover:text-white border border-[#D6CEBF]/60 transition-all duration-300 backdrop-blur-md shadow-xl text-[10px] font-semibold"
                      >
                        Ver Colección
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
