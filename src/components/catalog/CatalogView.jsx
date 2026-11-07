import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  RotateCcw,
  Sparkles,
  Crown
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CATEGORIES, COLLECTIONS } from '../../data/mockData';
import ProductCard from './ProductCard';
import VictorianDivider from '../common/VictorianDivider';
import Reveal from '../motion/Reveal';

const CATEGORY_TO_COLLECTION_MAP = {
  'corsets-brocado': 'brocado-imperial',
  'corsets-encaje': 'encaje-romantico',
  'corsets-mangas': 'mangas-encaje',
  'corsets-denim': 'denim-lurex'
};

const COLLECTION_TO_CATEGORY_MAP = {
  'brocado-imperial': 'corsets-brocado',
  'encaje-romantico': 'corsets-encaje',
  'mangas-encaje': 'corsets-mangas',
  'denim-lurex': 'corsets-denim'
};

export default function CatalogView() {
  const { 
    products,
    categories,
    collections,
    selectedCategory,
    setSelectedCategory,
    selectedCollection,
    setSelectedCollection,
    searchQuery,
    setSearchQuery,
    selectedSizeFilter,
    setSelectedSizeFilter,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy
  } = useShop();

  const currentCategories = categories && categories.length > 0 ? categories : CATEGORIES;
  const currentCollections = (collections && collections.length > 0 ? collections : COLLECTIONS).filter(c => c.id !== 'destacados-principal');

  const [priceChip, setPriceChip] = useState('all');
  const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const handlePriceChip = (chip) => {
    setPriceChip(chip);
    if (chip === 'all') setPriceRange([0, 250000]);
    if (chip === 'low') setPriceRange([0, 44000]);
    if (chip === 'mid') setPriceRange([44000, 65000]);
    if (chip === 'high') setPriceRange([65000, 250000]);
  };

  const activeCollectionObj = useMemo(() => {
    if (!selectedCollection) return null;
    return (collections || COLLECTIONS).find(c => c.id === selectedCollection) || null;
  }, [selectedCollection, collections]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      if (p.is_active === false) return false;

      if (selectedCategory && selectedCategory !== 'all') {
        const mappedCol = CATEGORY_TO_COLLECTION_MAP[selectedCategory] || selectedCategory;
        const matchCat =
          p.category === selectedCategory ||
          p.categoryName === selectedCategory ||
          p.collection === selectedCategory ||
          p.collection === mappedCol;
        if (!matchCat) return false;
      }

      if (selectedCollection) {
        const mappedCat = COLLECTION_TO_CATEGORY_MAP[selectedCollection] || selectedCollection;
        const matchCol =
          p.collection === selectedCollection ||
          p.category === selectedCollection ||
          p.category === mappedCat;
        if (!matchCol) return false;
      }

      if (selectedSizeFilter && selectedSizeFilter !== 'all') {
        if (!p.sizes || !p.sizes.includes(selectedSizeFilter)) return false;
      }
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCat = p.categoryName?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchColor = (p.colors || []).some(c => c.name?.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchSku && !matchColor) return false;
      }
      return true;
    }).sort((a, b) => {
      // 1. Always prioritize the Primary Corset (#1) of the active collection
      if (activeCollectionObj?.primaryProductId) {
        if (a.id === activeCollectionObj.primaryProductId) return -1;
        if (b.id === activeCollectionObj.primaryProductId) return 1;
      }
      if (sortBy === 'featured') {
        const aPrimary = (activeCollectionObj?.primaryProductId === a.id) || a.isCollectionPrimary ? 1 : 0;
        const bPrimary = (activeCollectionObj?.primaryProductId === b.id) || b.isCollectionPrimary ? 1 : 0;
        if (bPrimary !== aPrimary) return bPrimary - aPrimary;
      }

      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      if (sortBy === 'rating') return (b.rating || 5) - (a.rating || 5);
      return ((b.isFeatured || b.isNew) ? 1 : 0) - ((a.isFeatured || a.isNew) ? 1 : 0);
    });
  }, [products, selectedCategory, selectedCollection, activeCollectionObj, selectedSizeFilter, priceRange, searchQuery, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedCollection(null);
    setSelectedSizeFilter('all');
    setPriceChip('all');
    setPriceRange([0, 250000]);
    setSearchQuery('');
    setSortBy('featured');
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedCollection !== null || selectedSizeFilter !== 'all' || priceChip !== 'all' || searchQuery !== '';

  return (
    <div data-cursor-zone className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
      {activeCollectionObj ? (
        <div className="relative overflow-hidden rounded-2xl border border-[#D6CEBF] bg-[#181514] text-white mb-6 p-6 sm:p-8 shadow-lg">
          {activeCollectionObj.image && (
            <img
              src={activeCollectionObj.image}
              alt={activeCollectionObj.name}
              className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-75"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#181514] via-[#181514]/85 to-transparent" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8A96B]/20 border border-[#C8A96B]/50 text-[#C8A96B] text-[10px] font-bold uppercase tracking-widest mb-2">
                <Crown className="w-3 h-3" />
                <span>Colección Oficial JAZYALON</span>
              </div>
              <h1 className="jz-display text-3xl sm:text-4xl text-white font-light uppercase tracking-wide">
                {activeCollectionObj.name}
              </h1>
              {activeCollectionObj.subtitle && (
                <p className="text-xs sm:text-sm text-white/80 font-light mt-1.5">
                  {activeCollectionObj.subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCollection(null)}
              className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-[#C8A96B] hover:text-[#181514] text-white border border-white/25 text-[11px] font-bold uppercase tracking-wider transition-all backdrop-blur-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>Ver Todo el Catálogo</span>
            </button>
          </div>
        </div>
      ) : (
        <VictorianDivider 
          title="Catálogo & Tienda" 
          subtitle="CORSETERÍA // COLECCIÓN SINCRONIZADA" 
        />
      )}

      {/* QUICK CATEGORY CHIPS */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 hide-scrollbar mb-2 justify-start sm:justify-center">
        {currentCategories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setSelectedCollection(null); setSelectedCategory(cat.id); }}
              className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap transition-all duration-300 ${
                isSelected
                  ? 'bg-[#9E7B3B] text-white font-bold shadow-sm'
                  : 'bg-[#EDE8DE] text-[#5E564F] border border-[#D6CEBF] hover:text-[#181514] hover:border-[#9E7B3B]'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* QUICK COLLECTION CHIPS */}
      {currentCollections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 hide-scrollbar mb-4 justify-start sm:justify-center">
          <span className="text-[10px] uppercase tracking-widest text-[#8A8178] font-bold shrink-0">Colecciones:</span>
          <button
            onClick={() => setSelectedCollection(null)}
            className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
              !selectedCollection
                ? 'bg-[#181514] text-[#FAF8F5]'
                : 'bg-[#FAF8F5] text-[#5E564F] border border-[#D6CEBF] hover:border-[#9E7B3B]'
            }`}
          >
            Todas
          </button>
          {currentCollections.map(col => {
            const isSelected = selectedCollection === col.id;
            return (
              <button
                key={col.id}
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedCollection(isSelected ? null : col.id);
                }}
                className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#181514] text-[#C8A96B] border border-[#9E7B3B]'
                    : 'bg-[#FAF8F5] text-[#5E564F] border border-[#D6CEBF] hover:border-[#9E7B3B]'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 text-[#9E7B3B]" />
                <span>{col.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* FILTERS & SEARCH CONTROL PANEL */}
      <div className="bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl p-4 sm:p-5 mb-6 space-y-3 shadow-sm">
        {/* Top Row: Search Input + Sorting */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Live Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8178]" />
            <input
              type="text"
              placeholder="Buscar por nombre de corset, SKU, encaje, brocado, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-[#FFFFFF] border border-[#D6CEBF] rounded-xl text-xs text-[#181514] placeholder-[#8A8178] focus:border-[#9E7B3B] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8178] hover:text-[#181514] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sorters & Reset */}
          <div className="flex items-center gap-3">
            <span className="jz-label text-[#5E564F] hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#FFFFFF] border border-[#D6CEBF] text-[#181514] rounded-xl text-xs px-3.5 py-2.5 focus:border-[#9E7B3B] focus:outline-none"
            >
              <option value="featured">Destacados & Principal Primero</option>
              <option value="newest">Nuevos Ingresos (New Drops)</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="rating">Mejor Valorados</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="jz-label text-[#9E7B3B] hover:underline flex items-center gap-1.5 px-2 py-1"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Quick Size Pills & Price Chips */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#D6CEBF] text-xs">
          {/* Size Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="jz-label text-[#8A8178] mr-1">Talla:</span>
            <button
              onClick={() => setSelectedSizeFilter('all')}
              className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-lg ${
                selectedSizeFilter === 'all'
                  ? 'bg-[#9E7B3B] text-white shadow-sm'
                  : 'bg-[#FFFFFF] border border-[#D6CEBF] text-[#5E564F] hover:border-[#181514] hover:text-[#181514]'
              }`}
            >
              Todas
            </button>
            {allSizes.map(sz => (
              <button
                key={sz}
                onClick={() => setSelectedSizeFilter(sz)}
                className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-lg ${
                  selectedSizeFilter === sz
                    ? 'bg-[#9E7B3B] text-white shadow-sm'
                    : 'bg-[#FFFFFF] border border-[#D6CEBF] text-[#5E564F] hover:border-[#181514] hover:text-[#181514]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Price Range Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="jz-label text-[#8A8178] mr-1">Precio:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'low', label: 'Hasta $44.000' },
              { id: 'mid', label: '$44.000 - $65.000' },
              { id: 'high', label: '+$65.000' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePriceChip(p.id)}
                className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-lg ${
                  priceChip === p.id
                    ? 'bg-[#9E7B3B] text-white shadow-sm'
                    : 'bg-[#FFFFFF] border border-[#D6CEBF] text-[#5E564F] hover:border-[#181514] hover:text-[#181514]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCT COUNT & ACTIVE FILTER INFO */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 text-xs text-[#8A8178]">
        <span>Mostrando <strong className="text-[#181514]">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'diseño' : 'diseños'}</span>
        <div className="flex items-center gap-3">
          {selectedCollection && activeCollectionObj && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181514] text-[#C8A96B] text-[10px] font-bold uppercase tracking-wider">
              <Crown className="w-3 h-3" />
              <span>Colección: {activeCollectionObj.name}</span>
              <button onClick={() => setSelectedCollection(null)} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="jz-label text-[#9E7B3B] font-bold">
              Categoría: {currentCategories.find(c => c.id === selectedCategory)?.name || selectedCategory}
            </span>
          )}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      {filteredProducts.length > 0 ? (
        <Reveal
          selector="[data-card]"
          stagger={0.08}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
        >
          {filteredProducts.map((product, index) => {
            const isPrimaryOfCollection =
              (activeCollectionObj && activeCollectionObj.primaryProductId === product.id) ||
              (!activeCollectionObj && index === 0 && product.isCollectionPrimary);
            return (
              <ProductCard
                key={product.id}
                product={product}
                isCollectionPrimaryBadge={isPrimaryOfCollection}
              />
            );
          })}
        </Reveal>
      ) : (
        <div className="border border-[#D6CEBF] bg-[#EDE8DE] p-12 text-center my-8 rounded-2xl shadow-sm">
          <h3 className="jz-display text-2xl text-[#181514] mb-2 font-normal">
            No encontramos productos con estos filtros
          </h3>
          <p className="text-xs text-[#5E564F] mb-6">
            Intenta limpiando los filtros para ver todos los corsets disponibles.
          </p>
          <button
            onClick={resetFilters}
            className="px-6 py-2.5 bg-[#9E7B3B] hover:bg-[#181514] text-white uppercase text-xs tracking-widest font-bold rounded-lg transition-colors shadow-sm"
          >
            Limpiar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
