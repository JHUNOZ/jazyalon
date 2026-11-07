import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './HoneCatalog.module.css';
import { generateUniqueSKU } from './skuGenerator';
import {
  formatCLP,
  isVideoUrl,
  parseProductSpecifications,
  serializeProductSpecifications,
  calculateTotalVariantStock,
  calculateBundleTotals,
  isProductBundle,
  calculateDiscountSavings
} from './productUtils';
import { convertImageFileToWebP, convertMultipleFilesToWebP, formatBytes } from '../../utils/webpConverter';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Tag,
  Package,
  AlertTriangle,
  Copy,
  Download,
  UploadCloud,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  FileText,
  Sliders,
  CheckSquare,
  Square,
  ArrowUpDown,
  Filter,
  Zap,
  Box,
  Dice5,
  Clipboard,
  CheckCheck,
  HelpCircle,
  PlusCircle,
  MinusCircle,
  FileSpreadsheet,
  SlidersHorizontal,
  Wand2,
  ListPlus,
  CheckCircle2,
  ShoppingBag,
  Percent,
  DollarSign,
  Gift,
  ChevronLeft,
  ChevronRight,
  Crown,
  Palette,
  Ruler,
  FolderPlus
} from 'lucide-react';

// Safe fallback Supabase client (compatible with Vite & Next.js)
const getEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {}
  return '';
};

const defaultSupabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://placeholder.supabase.co';
const defaultSupabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'placeholder';
const defaultSupabase = createClient(defaultSupabaseUrl, defaultSupabaseKey);

const CORSET_COLOR_PRESETS = [
  { name: 'Negro', hex: '#111111' },
  { name: 'Burdeos', hex: '#581828' },
  { name: 'Blanco Marfil', hex: '#F4F4F4' },
  { name: 'Champagne', hex: '#DECBB3' },
  { name: 'Café Moca', hex: '#4B362A' },
  { name: 'Rojo Carmesí', hex: '#8C1D2E' },
  { name: 'Azul Índigo', hex: '#222F5B' },
  { name: 'Celeste Denim', hex: '#4E6E9E' },
  { name: 'Plata Oscura', hex: '#4A4A4A' },
  { name: 'Rosa Empolvado', hex: '#E8C4CC' }
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const CATEGORY_TO_COLLECTION_DEFAULT = {
  'corsets-brocado': 'brocado-imperial',
  'corsets-encaje': 'encaje-romantico',
  'corsets-mangas': 'mangas-encaje',
  'corsets-denim': 'denim-lurex'
};

export default function HoneCatalog({
  customSupabaseClient = null,
  externalProducts = null,
  onAddProduct = null,
  onAddMultipleProducts = null,
  onUpdateProduct = null,
  onDeleteProduct = null,
  externalCategories = null,
  externalCollections = null,
  onAddCategory = null,
  onAddCollection = null,
  onSetPrimaryCorset = null,
  initialCategory = 'all',
  initialViewMode = 'table',
  autoOpenNewModal = false,
  autoEditProduct = null,
  onConsumeAutoAction = null
}) {
  const supabase = customSupabaseClient || defaultSupabase;
  const isStoreConnected = Array.isArray(externalProducts);

  const [localProducts, setLocalProducts] = useState([]);
  const products = isStoreConnected ? externalProducts : localProducts;

  const [loading, setLoading] = useState(!isStoreConnected);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [viewMode, setViewMode] = useState(initialViewMode || 'table'); // 'table' | 'grid' | 'bulk' | 'import'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // Modal Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTabModal, setActiveTabModal] = useState('general'); // 'general' | 'specs'
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastWebpStats, setLastWebpStats] = useState(null);

  // Quick Edit Inline State
  const [quickEditId, setQuickEditId] = useState(null);
  const [quickFormData, setQuickFormData] = useState({});

  // Bulk Upload State
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Import CSV/JSON State
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [showImportHelp, setShowImportHelp] = useState(false);

  // Copied SKU state
  const [copiedSku, setCopiedSku] = useState(null);

  // Dynamic Specifications State
  const [specList, setSpecList] = useState([{ key: '', value: '' }]);

  // Universal Variants State
  const [variantConfig, setVariantConfig] = useState({
    enabled: false,
    name: 'Talla',
    variants: []
  });
  const [bulkVariantsText, setBulkVariantsText] = useState('');

  // Apparel / Corsetry Color & Size Availability Matrix State
  const [garmentSizes, setGarmentSizes] = useState(['XS', 'S', 'M', 'L', 'XL']);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [garmentColors, setGarmentColors] = useState([
    {
      name: 'Negro',
      hex: '#111111',
      availableSizes: ['XS', 'S', 'M', 'L'],
      outOfStockSizes: ['XL'],
      image: ''
    }
  ]);

  // Custom Category State & Quick Inline Creator
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [quickNewCatOpen, setQuickNewCatOpen] = useState(false);
  const [quickNewCatName, setQuickNewCatName] = useState('');

  // Combo & Promo Builder Modal State
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingComboId, setEditingComboId] = useState(null);
  const [promoOperationMode, setPromoOperationMode] = useState('bundle'); // 'bundle' | 'direct_discount'
  const [comboSearch, setComboSearch] = useState('');
  const [comboCategoryFilter, setComboCategoryFilter] = useState('all');
  const [selectedComboItems, setSelectedComboItems] = useState([]);
  const [comboPricingMode, setComboPricingMode] = useState('percent');
  const [comboPrice, setComboPrice] = useState('');
  const [comboDiscountPercent, setComboDiscountPercent] = useState(20);
  const [comboStock, setComboStock] = useState('');
  const [comboFormData, setComboFormData] = useState({
    name: '',
    sku: '',
    category: 'corsets-brocado',
    collection: 'destacados-principal',
    description: '',
    badge: 'PROMO',
    image_url: '',
    images: [],
    is_active: true,
    is_featured: true
  });

  // Main Product Form Data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    specifications: '',
    price: '',
    old_price: '',
    discount: 0,
    stock: 12,
    category: 'corsets-brocado',
    collection: 'brocado-imperial',
    isCollectionPrimary: false,
    isNew: true,
    dropOrder: 1,
    image_url: '',
    images: [],
    badge: 'NUEVO DROP',
    is_active: true,
    is_featured: true
  });

  // Toast Notification
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  const importInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopySku = (skuText, e) => {
    if (e) e.stopPropagation();
    if (!skuText) return;
    navigator.clipboard.writeText(skuText);
    setCopiedSku(skuText);
    showToast(`SKU copiado: ${skuText}`);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  useEffect(() => {
    if (!isStoreConnected) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [isStoreConnected]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, stockFilter, statusFilter, sortBy, viewMode]);

  const fetchProducts = async () => {
    if (isStoreConnected) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocalProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Resolve available Categories & Collections
  const availableCategories = React.useMemo(() => {
    if (Array.isArray(externalCategories) && externalCategories.length > 0) {
      return externalCategories.filter(c => c.id !== 'all');
    }
    const base = [
      { id: 'corsets-brocado', name: 'Corsets Brocado & Satén' },
      { id: 'corsets-encaje', name: 'Corsets de Encaje' },
      { id: 'corsets-mangas', name: 'Corsets con Mangas' },
      { id: 'corsets-denim', name: 'Corsets Denim & Lúrex' }
    ];
    products.forEach(p => {
      if (p.category && !base.some(b => b.id === p.category)) {
        base.push({ id: p.category, name: p.categoryName || p.category });
      }
    });
    return base;
  }, [externalCategories, products]);

  const availableCollections = React.useMemo(() => {
    if (Array.isArray(externalCollections) && externalCollections.length > 0) {
      return externalCollections;
    }
    return [
      { id: 'destacados-principal', name: 'Nuevos Drops & Destacados' },
      { id: 'brocado-imperial', name: 'Brocado & Satén' },
      { id: 'encaje-romantico', name: 'Encaje Floral' },
      { id: 'mangas-encaje', name: 'Mangas de Encaje' },
      { id: 'denim-lurex', name: 'Denim & Lúrex' }
    ];
  }, [externalCollections]);

  const getCategoryLabel = (catId) => {
    const found = availableCategories.find(c => c.id === catId || c.name === catId);
    return found ? found.name : (catId || 'Corsetería');
  };

  const getCollectionLabel = (colId) => {
    const found = availableCollections.find(c => c.id === colId || c.name === colId);
    return found ? found.name : (colId || 'Sin colección');
  };

  const resolveCollectionForCategory = (catId) => {
    const mappedId = CATEGORY_TO_COLLECTION_DEFAULT[catId] || catId;
    const found = availableCollections.find(
      c => c.id === mappedId || c.id === catId || c.name?.toLowerCase() === getCategoryLabel(catId)?.toLowerCase()
    );
    return found?.id || availableCollections[1]?.id || availableCollections[0]?.id || 'brocado-imperial';
  };

  // Metrics Calculation
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active !== false).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;
  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
  const totalInventoryValue = products.reduce(
    (acc, curr) => acc + ((parseFloat(curr.price) || 0) * (parseInt(curr.stock) || 0)),
    0
  );

  // Filter & Sort Logic
  const filteredProducts = products
    .filter(p => {
      const searchLower = search.toLowerCase();
      const { variantConfig: pVarConf } = parseProductSpecifications(p.specifications);
      const variantMatch = pVarConf.variants?.some(
        v =>
          (v.name || '').toLowerCase().includes(searchLower) ||
          (v.sku || '').toLowerCase().includes(searchLower)
      );
      const colorMatch = (p.colors || []).some(c => (c.name || '').toLowerCase().includes(searchLower));
      const sizeMatch = (p.sizes || []).some(s => (s || '').toLowerCase().includes(searchLower));

      const matchSearch =
        (p.name || '').toLowerCase().includes(searchLower) ||
        (p.sku || '').toLowerCase().includes(searchLower) ||
        (p.category || '').toLowerCase().includes(searchLower) ||
        (p.categoryName || '').toLowerCase().includes(searchLower) ||
        variantMatch ||
        colorMatch ||
        sizeMatch;

      const mappedColForFilter = CATEGORY_TO_COLLECTION_DEFAULT[selectedCategory] || selectedCategory;
      const matchCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.collection === selectedCategory ||
        p.collection === mappedColForFilter ||
        p.categoryName === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'instock') matchStock = (p.stock || 0) > 0;
      if (stockFilter === 'lowstock') matchStock = (p.stock || 0) > 0 && (p.stock || 0) <= 5;
      if (stockFilter === 'outofstock') matchStock = (p.stock || 0) <= 0;

      let matchStatus = true;
      if (statusFilter === 'published') matchStatus = p.is_active !== false;
      if (statusFilter === 'draft') matchStatus = p.is_active === false;
      if (statusFilter === 'newdrops') matchStatus = !!p.isNew;
      if (statusFilter === 'discount') {
        matchStatus = (p.discount || 0) > 0 || ((p.old_price || p.oldPrice || 0) > (p.price || 0));
      }

      return matchSearch && matchCategory && matchStock && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      if (sortBy === 'price_desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      if (sortBy === 'stock_desc') return (parseInt(b.stock) || 0) - (parseInt(a.stock) || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  // Pagination
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts =
    itemsPerPage >= 99999 ? filteredProducts : filteredProducts.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }
    for (let i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l !== 1) rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  // =========================================================
  // APPAREL SIZE & COLOR MATRIX HANDLERS
  // =========================================================

  const handleToggleGarmentSize = (sizeStr) => {
    setGarmentSizes(prev => {
      const exists = prev.includes(sizeStr);
      const nextSizes = exists ? prev.filter(s => s !== sizeStr) : [...prev, sizeStr];
      if (nextSizes.length === 0) return prev;

      // Sync each color's availableSizes / outOfStockSizes
      setGarmentColors(prevColors =>
        prevColors.map(c => {
          if (exists) {
            return {
              ...c,
              availableSizes: (c.availableSizes || []).filter(s => s !== sizeStr),
              outOfStockSizes: (c.outOfStockSizes || []).filter(s => s !== sizeStr)
            };
          } else {
            return {
              ...c,
              availableSizes: Array.from(new Set([...(c.availableSizes || []), sizeStr]))
            };
          }
        })
      );
      return nextSizes;
    });
  };

  const handleAddCustomSize = () => {
    const clean = customSizeInput.trim().toUpperCase();
    if (!clean) return;
    if (!garmentSizes.includes(clean)) {
      handleToggleGarmentSize(clean);
    }
    setCustomSizeInput('');
  };

  const handleAddColorVariant = (preset = null) => {
    const newColor = {
      name: preset ? preset.name : 'Nuevo Color',
      hex: preset ? preset.hex : '#581828',
      availableSizes: [...garmentSizes],
      outOfStockSizes: [],
      image: formData.image_url || formData.images?.[0] || ''
    };
    setGarmentColors(prev => [...prev, newColor]);
    showToast(`Color "${newColor.name}" añadido a la prenda`);
  };

  const handleUpdateColorField = (colorIdx, field, val) => {
    setGarmentColors(prev => prev.map((c, idx) => (idx === colorIdx ? { ...c, [field]: val } : c)));
  };

  const handleRemoveColorVariant = (colorIdx) => {
    if (garmentColors.length <= 1) {
      showToast('La prenda debe tener al menos 1 color configurado', 'error');
      return;
    }
    setGarmentColors(prev => prev.filter((_, idx) => idx !== colorIdx));
  };

  // Toggle whether a specific size is Available or Out-of-Stock (Agotada) for a specific Color
  const handleToggleSizeAvailabilityForColor = (colorIdx, sizeStr) => {
    setGarmentColors(prev =>
      prev.map((c, idx) => {
        if (idx !== colorIdx) return c;
        const isCurrentlyAvailable = (c.availableSizes || []).includes(sizeStr);
        if (isCurrentlyAvailable) {
          return {
            ...c,
            availableSizes: (c.availableSizes || []).filter(s => s !== sizeStr),
            outOfStockSizes: Array.from(new Set([...(c.outOfStockSizes || []), sizeStr]))
          };
        } else {
          return {
            ...c,
            availableSizes: Array.from(new Set([...(c.availableSizes || []), sizeStr])),
            outOfStockSizes: (c.outOfStockSizes || []).filter(s => s !== sizeStr)
          };
        }
      })
    );
  };

  // Upload specific photo for a Color Swatch (automatically optimized in background)
  const handleColorImageUpload = async (colorIdx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const converted = await convertImageFileToWebP(file);
      handleUpdateColorField(colorIdx, 'image', converted.dataUrl);
      setLastWebpStats(converted);
      showToast('Foto de color cargada y optimizada ✦');
    } catch (err) {
      showToast('Error al procesar foto de color: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // OPEN PRODUCT MODAL
  // =========================================================
  const handleOpenModal = (product = null) => {
    setActiveTabModal('general');
    setBulkVariantsText('');
    setLastWebpStats(null);
    setIsCustomCategory(false);
    setCustomCatName('');

    if (product) {
      setEditingId(product.id);

      const { attributes, variantConfig: vConf, apparelConfig } = parseProductSpecifications(product.specifications);
      if (attributes.length > 0) {
        setSpecList(attributes);
      } else if (product.specs && typeof product.specs === 'object') {
        const fromSpecs = Object.entries(product.specs).map(([key, value]) => ({ key, value: String(value) }));
        setSpecList(fromSpecs.length > 0 ? fromSpecs : [{ key: '', value: '' }]);
      } else {
        setSpecList([{ key: '', value: '' }]);
      }
      setVariantConfig(vConf);

      const prodSizes =
        Array.isArray(product.sizes) && product.sizes.length > 0
          ? product.sizes
          : apparelConfig.sizes || ['XS', 'S', 'M', 'L', 'XL'];
      setGarmentSizes(prodSizes);

      const prodColors =
        Array.isArray(product.colors) && product.colors.length > 0
          ? product.colors.map(c => ({
              name: c.name || 'Negro',
              hex: c.hex || '#111111',
              availableSizes: Array.isArray(c.availableSizes) ? c.availableSizes : prodSizes,
              outOfStockSizes: Array.isArray(c.outOfStockSizes) ? c.outOfStockSizes : [],
              image: c.image || product.image_url || product.images?.[0] || ''
            }))
          : apparelConfig.colors;
      setGarmentColors(prodColors);

      let galleryImages = [];
      if (Array.isArray(product.images)) galleryImages = product.images;
      else if (typeof product.images === 'string') {
        try {
          galleryImages = JSON.parse(product.images);
        } catch {
          galleryImages = [];
        }
      }
      if (product.image_url && !galleryImages.includes(product.image_url)) {
        galleryImages = [product.image_url, ...galleryImages];
      }

      const prodCategory = product.category || availableCategories[0]?.id || 'corsets-brocado';

      setFormData({
        name: product.name || '',
        sku: product.sku || generateUniqueSKU(prodCategory),
        description: product.description || '',
        specifications: product.specifications || '',
        price: product.price || '',
        old_price: product.old_price || product.oldPrice || '',
        discount: product.discount || 0,
        stock: product.stock !== undefined ? product.stock : 12,
        category: prodCategory,
        collection: product.collection || availableCollections[0]?.id || 'brocado-imperial',
        isCollectionPrimary: !!product.isCollectionPrimary,
        isNew: product.isNew !== undefined ? !!product.isNew : true,
        dropOrder: product.dropOrder || 1,
        image_url: product.image_url || galleryImages[0] || '',
        images: galleryImages,
        badge: product.badge || '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        is_featured: product.is_featured !== undefined ? !!product.is_featured : !!product.isFeatured
      });
    } else {
      setEditingId(null);
      const defaultCat =
        selectedCategory && selectedCategory !== 'all'
          ? selectedCategory
          : availableCategories[0]?.id || 'corsets-brocado';
      const defaultCol = resolveCollectionForCategory(defaultCat);
      setSpecList([
        { key: 'Estructura', value: 'Corsetería estructurada con varillas' },
        { key: 'Ajuste', value: 'Lazada trasera regulable' }
      ]);
      setVariantConfig({ enabled: false, name: 'Talla', variants: [] });
      setGarmentSizes(['XS', 'S', 'M', 'L', 'XL']);
      setGarmentColors([
        {
          name: 'Negro',
          hex: '#111111',
          availableSizes: ['XS', 'S', 'M', 'L'],
          outOfStockSizes: ['XL'],
          image: ''
        },
        {
          name: 'Burdeos',
          hex: '#581828',
          availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
          outOfStockSizes: [],
          image: ''
        }
      ]);
      setFormData({
        name: '',
        sku: generateUniqueSKU(defaultCat),
        description: '',
        specifications: '',
        price: '44990',
        old_price: '54990',
        discount: 18,
        stock: 15,
        category: defaultCat,
        collection: defaultCol,
        isCollectionPrimary: false,
        isNew: true,
        dropOrder: 1,
        image_url: '',
        images: [],
        badge: 'NUEVO DROP',
        is_active: true,
        is_featured: true
      });
    }
    setModalOpen(true);
  };

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
    if (autoOpenNewModal) {
      handleOpenModal(null);
      if (onConsumeAutoAction) onConsumeAutoAction();
    } else if (autoEditProduct) {
      handleOpenModal(autoEditProduct);
      if (onConsumeAutoAction) onConsumeAutoAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenNewModal, autoEditProduct]);

  const handleGenerateModalSku = () => {
    const newSku = generateUniqueSKU(formData.category);
    setFormData(prev => ({ ...prev, sku: newSku }));
    showToast(`SKU generado: ${newSku}`);
  };

  // =========================================================
  // MULTI-IMAGE UPLOAD WITH AUTOMATIC WEBP CONVERSION
  // =========================================================
  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const convertedResults = await convertMultipleFilesToWebP(
        files,
        { quality: 0.85, maxWidth: 1400, maxHeight: 1750 },
        (pct) => setUploadProgress(pct)
      );

      const uploadedUrls = [];

      for (let i = 0; i < convertedResults.length; i++) {
        const item = convertedResults[i];
        if (isStoreConnected) {
          uploadedUrls.push(item.dataUrl);
        } else {
          // Try Supabase Storage with the converted .webp File; fallback to DataURL if offline/local
          const fileName = `prod_${Date.now()}_${i}_${item.fileName}`;
          const filePath = `products/${fileName}`;
          try {
            const { error: uploadError } = await supabase.storage
              .from('admin_uploads')
              .upload(filePath, item.webpFile, {
                contentType: 'image/webp',
                cacheControl: '3600',
                upsert: true
              });
            if (!uploadError) {
              const { data } = supabase.storage.from('admin_uploads').getPublicUrl(filePath);
              uploadedUrls.push(data?.publicUrl || item.dataUrl);
            } else {
              uploadedUrls.push(item.dataUrl);
            }
          } catch {
            uploadedUrls.push(item.dataUrl);
          }
        }
      }

      if (convertedResults.length > 0) {
        setLastWebpStats(convertedResults[convertedResults.length - 1]);
      }

      setFormData(prev => {
        const newImages = [...(prev.images || []), ...uploadedUrls];
        return {
          ...prev,
          images: newImages,
          image_url: prev.image_url || uploadedUrls[0] || ''
        };
      });

      // Also set default color image if empty
      setGarmentColors(prev =>
        prev.map((c, idx) => (idx === 0 && !c.image ? { ...c, image: uploadedUrls[0] } : c))
      );

      showToast(`¡${uploadedUrls.length} foto(s) cargadas y optimizadas con éxito! ✦`);
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error al procesar imágenes: ' + err.message, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const setAsPrimaryImage = (url) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    showToast('Foto de portada actualizada');
  };

  const removeGalleryImage = (urlToRemove) => {
    setFormData(prev => {
      const updatedImages = (prev.images || []).filter(img => img !== urlToRemove);
      const nextPrimary =
        prev.image_url === urlToRemove ? updatedImages[0] || '' : prev.image_url;
      return {
        ...prev,
        images: updatedImages,
        image_url: nextPrimary
      };
    });
  };

  // =========================================================
  // SAVE PRODUCT (SYNCED WITH STORE & SUPABASE)
  // =========================================================
  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('El nombre del corset/prenda es obligatorio', 'error');
      return;
    }

    let finalCategoryId = formData.category;
    let finalCategoryName = getCategoryLabel(formData.category);
    let finalCollectionId = formData.collection || 'brocado-imperial';

    if (isCustomCategory && customCatName.trim()) {
      finalCategoryId = customCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      finalCategoryName = customCatName.trim();
      finalCollectionId = finalCategoryId;
      if (onAddCategory) {
        onAddCategory({ id: finalCategoryId, name: finalCategoryName });
      }
      if (onAddCollection) {
        onAddCollection({
          id: finalCategoryId,
          name: finalCategoryName,
          title: finalCategoryName,
          subtitle: 'Colección Exclusiva JAZYALON',
          image: formData.image_url || formData.images?.[0] || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
        });
      }
    }

    const apparelObj = {
      sizes: garmentSizes,
      colors: garmentColors.map(c => ({
        ...c,
        image: c.image || formData.image_url || formData.images?.[0] || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      }))
    };

    const existingBundle = editingId
      ? parseProductSpecifications(products.find(p => p.id === editingId)?.specifications).bundleConfig
      : null;

    const specsJson = serializeProductSpecifications(specList, variantConfig, existingBundle, apparelObj);

    const specsKeyVal = {};
    specList.forEach(s => {
      if (s.key?.trim() && s.value?.trim()) {
        specsKeyVal[s.key.trim()] = s.value.trim();
      }
    });

    let finalStock = parseInt(formData.stock) || 0;
    if (variantConfig.enabled && variantConfig.variants?.length > 0) {
      finalStock = calculateTotalVariantStock(variantConfig.variants);
    }

    const primaryImg =
      formData.image_url ||
      (formData.images && formData.images[0]) ||
      '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || generateUniqueSKU(finalCategoryId),
      description: formData.description.trim(),
      specifications: specsJson,
      specs: specsKeyVal,
      price: parseFloat(formData.price) || 0,
      old_price: formData.old_price ? parseFloat(formData.old_price) : null,
      oldPrice: formData.old_price ? parseFloat(formData.old_price) : null,
      discount: parseInt(formData.discount) || 0,
      stock: finalStock,
      category: finalCategoryId,
      categoryName: finalCategoryName,
      collection: finalCollectionId,
      isCollectionPrimary: !!formData.isCollectionPrimary,
      isNew: !!formData.isNew,
      dropOrder: parseInt(formData.dropOrder) || 1,
      image_url: primaryImg,
      images: formData.images?.length ? formData.images : [primaryImg],
      sizes: apparelObj.sizes,
      colors: apparelObj.colors,
      badge: formData.badge ? formData.badge.trim() : (formData.isNew ? 'NUEVO DROP' : ''),
      is_active: formData.is_active,
      is_featured: formData.isNew ? true : formData.is_featured,
      isFeatured: formData.isNew ? true : formData.is_featured
    };

    try {
      if (isStoreConnected) {
        if (editingId) {
          onUpdateProduct && onUpdateProduct(editingId, payload);
          if (payload.isCollectionPrimary && onSetPrimaryCorset) {
            onSetPrimaryCorset(payload.collection, editingId);
          }
          showToast('Prenda actualizada y sincronizada en el sitio web ✦');
        } else {
          const created = onAddProduct && onAddProduct(payload);
          if (payload.isCollectionPrimary && created?.id && onSetPrimaryCorset) {
            onSetPrimaryCorset(payload.collection, created.id);
          }
          showToast('Prenda creada y publicada en el sitio web ✦');
        }
      } else {
        if (editingId) {
          const { error } = await supabase.from('products').update(payload).eq('id', editingId);
          if (error) throw error;
          showToast('Producto actualizado exitosamente');
        } else {
          const { error } = await supabase.from('products').insert([payload]);
          if (error) throw error;
          showToast('Producto creado y publicado en catálogo');
        }
        fetchProducts();
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving product:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  };

  // =========================================================
  // BULK DRAG & DROP UPLOAD (WITH AUTOMATIC WEBP CONVERSION)
  // =========================================================
  const handleBulkFilesSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    showToast(`Preparando y optimizando ${files.length} imagen(es)...`);

    const defaultCat = availableCategories[0]?.id || 'corsets-brocado';
    const defaultCol = availableCollections[1]?.id || availableCollections[0]?.id || 'brocado-imperial';

    const newRows = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      try {
        const converted = await convertImageFileToWebP(file);
        const baseName = file.name.includes('.')
          ? file.name.substring(0, file.name.lastIndexOf('.'))
          : file.name;
        const cleanTitle = baseName
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        newRows.push({
          id: `bulk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          file: converted.webpFile,
          preview: converted.dataUrl,
          webpFileName: converted.fileName,
          savingsPercent: converted.savingsPercent,
          webpSize: converted.webpSize,
          name: cleanTitle.startsWith('Img') ? `Corset JAZYALON Diseño ${idx + 1}` : cleanTitle,
          category: defaultCat,
          collection: defaultCol,
          isNew: true,
          price: '44990',
          stock: '12',
          sku: generateUniqueSKU(defaultCat),
          status: 'pending'
        });
      } catch (err) {
        console.error('WebP conversion error on bulk file:', err);
      }
    }

    setBulkFiles(prev => [...prev, ...newRows]);
    if (newRows.length > 0) {
      showToast(`¡${newRows.length} fotos listas para publicar! ✦`);
    }
  };

  const updateBulkRow = (id, field, value) => {
    setBulkFiles(prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const regenerateBulkRowSku = (id, category) => {
    const fresh = generateUniqueSKU(category);
    setBulkFiles(prev => prev.map(row => (row.id === id ? { ...row, sku: fresh } : row)));
    showToast(`Nuevo SKU: ${fresh}`);
  };

  const removeBulkRow = (id) => {
    setBulkFiles(prev => prev.filter(row => row.id !== id));
  };

  const processBulkUpload = async () => {
    if (bulkFiles.length === 0) return;

    setBulkUploading(true);
    const createdPayloads = [];

    for (let i = 0; i < bulkFiles.length; i++) {
      const row = bulkFiles[i];
      setBulkFiles(prev => prev.map((r, idx) => (idx === i ? { ...r, status: 'uploading' } : r)));

      let publicUrl = row.preview;

      if (!isStoreConnected) {
        try {
          const filePath = `products/bulk_${Date.now()}_${i}_${row.webpFileName}`;
          const { error: uploadError } = await supabase.storage
            .from('admin_uploads')
            .upload(filePath, row.file, { contentType: 'image/webp', cacheControl: '3600', upsert: true });
          if (!uploadError) {
            const { data } = supabase.storage.from('admin_uploads').getPublicUrl(filePath);
            if (data?.publicUrl) publicUrl = data.publicUrl;
          }
        } catch {}
      }

      const productPayload = {
        name: row.name.trim() || 'Nuevo Corset JAZYALON',
        sku: row.sku || generateUniqueSKU(row.category),
        category: row.category || 'corsets-brocado',
        categoryName: getCategoryLabel(row.category),
        collection: row.collection || 'brocado-imperial',
        price: parseFloat(row.price) || 44990,
        stock: parseInt(row.stock) || 12,
        image_url: publicUrl,
        images: [publicUrl],
        isNew: !!row.isNew,
        isFeatured: true,
        is_featured: true,
        is_active: true,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          {
            name: 'Negro',
            hex: '#111111',
            availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
            outOfStockSizes: [],
            image: publicUrl
          }
        ],
        description: `Diseño exclusivo JAZYALON estructurado con varillas modeladoras y ajuste trasero.`,
        badge: row.isNew ? 'NUEVO DROP' : 'COLECCIÓN'
      };

      createdPayloads.push(productPayload);
      setBulkFiles(prev => prev.map((r, idx) => (idx === i ? { ...r, status: 'done' } : r)));
    }

    if (isStoreConnected && onAddMultipleProducts) {
      onAddMultipleProducts(createdPayloads);
    } else if (!isStoreConnected) {
      try {
        await supabase.from('products').insert(createdPayloads);
        fetchProducts();
      } catch (err) {
        showToast('Error guardando lote: ' + err.message, 'error');
      }
    }

    setBulkUploading(false);
    showToast(`¡${createdPayloads.length} corsets publicados en la tienda! ✦`);
    setTimeout(() => {
      setBulkFiles([]);
      setViewMode('table');
    }, 900);
  };

  // =========================================================
  // INLINE & TABLE ACTIONS
  // =========================================================
  const handleQuickStockAdjust = async (product, delta, e) => {
    if (e) e.stopPropagation();
    const currentStock = parseInt(product.stock) || 0;
    const newStock = Math.max(0, currentStock + delta);
    if (newStock === currentStock) return;

    if (isStoreConnected && onUpdateProduct) {
      onUpdateProduct(product.id, { stock: newStock });
    } else {
      setLocalProducts(products.map(p => (p.id === product.id ? { ...p, stock: newStock } : p)));
      await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
    }
  };

  const startQuickEdit = (product) => {
    setQuickEditId(product.id);
    setQuickFormData({
      name: product.name,
      sku: product.sku || '',
      price: product.price,
      old_price: product.old_price || product.oldPrice || '',
      discount: product.discount || 0,
      stock: product.stock,
      category: product.category,
      collection: product.collection || 'brocado-imperial',
      isNew: !!product.isNew,
      is_active: product.is_active !== false
    });
  };

  const saveQuickEdit = async (id) => {
    const nextPrice = parseFloat(quickFormData.price) || 0;
    const rawOld = parseFloat(quickFormData.old_price) || 0;
    const finalOldPrice = rawOld > nextPrice ? rawOld : null;
    const computedDiscount =
      finalOldPrice && nextPrice > 0 ? Math.round(((finalOldPrice - nextPrice) / finalOldPrice) * 100) : 0;

    const updatedFields = {
      name: quickFormData.name,
      sku: quickFormData.sku,
      price: nextPrice,
      old_price: finalOldPrice,
      oldPrice: finalOldPrice,
      discount: computedDiscount,
      stock: parseInt(quickFormData.stock) || 0,
      category: quickFormData.category,
      categoryName: getCategoryLabel(quickFormData.category),
      collection: quickFormData.collection,
      isNew: !!quickFormData.isNew,
      isFeatured: quickFormData.isNew ? true : true,
      is_active: quickFormData.is_active
    };

    if (isStoreConnected && onUpdateProduct) {
      onUpdateProduct(id, updatedFields);
      setQuickEditId(null);
      return;
    }

    try {
      const { error } = await supabase.from('products').update(updatedFields).eq('id', id);
      if (error) throw error;
      setLocalProducts(products.map(p => (p.id === id ? { ...p, ...updatedFields } : p)));
      setQuickEditId(null);
      showToast('Producto actualizado exitosamente');
    } catch (err) {
      showToast('Error al actualizar: ' + err.message, 'error');
    }
  };

  const handleDuplicate = async (product) => {
    const newSku = generateUniqueSKU(product.category);
    const { id, created_at, ...rest } = product;
    const duplicated = {
      ...rest,
      name: `${product.name} (Copia)`,
      sku: newSku,
      isCollectionPrimary: false
    };

    if (isStoreConnected && onAddProduct) {
      onAddProduct(duplicated);
      return;
    }

    try {
      const { data, error } = await supabase.from('products').insert([duplicated]).select().single();
      if (error) throw error;
      setLocalProducts([data, ...products]);
      showToast(`Producto duplicado con SKU: ${newSku}`);
    } catch (err) {
      showToast('Error al duplicar: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás segura de eliminar esta prenda del catálogo?')) return;

    if (isStoreConnected && onDeleteProduct) {
      onDeleteProduct(id);
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
      return;
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setLocalProducts(products.filter(p => p.id !== id));
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
      showToast('Producto eliminado exitosamente');
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  const handleToggleActive = async (product) => {
    const newStatus = product.is_active === false ? true : false;
    if (isStoreConnected && onUpdateProduct) {
      onUpdateProduct(product.id, { is_active: newStatus });
      return;
    }
    setLocalProducts(products.map(p => (p.id === product.id ? { ...p, is_active: newStatus } : p)));
    await supabase.from('products').update({ is_active: newStatus }).eq('id', product.id);
  };

  const handleToggleNewDropInline = (product) => {
    const nextNew = !product.isNew;
    if (isStoreConnected && onUpdateProduct) {
      onUpdateProduct(product.id, {
        isNew: nextNew,
        isFeatured: nextNew ? true : product.isFeatured,
        badge: nextNew ? 'NUEVO DROP' : product.badge
      });
    }
  };

  // Crear Categoría + Colección en 1 solo clic directamente desde la barra superior de HONE Catalog
  const handleQuickCreateCategoryAndCollection = (e) => {
    if (e) e.preventDefault();
    const cleanName = (quickNewCatName || '').trim();
    if (!cleanName) return;
    const slugId = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (onAddCategory) {
      onAddCategory({ id: slugId, name: cleanName });
    }
    if (onAddCollection) {
      onAddCollection({
        id: slugId,
        name: cleanName,
        title: cleanName,
        subtitle: 'Colección Exclusiva JAZYALON',
        image: products[0]?.image_url || products[0]?.images?.[0] || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      });
    }

    setSelectedCategory(slugId);
    setQuickNewCatName('');
    setQuickNewCatOpen(false);
    showToast(`Colección y Categoría "${cleanName}" creada y sincronizada en la web ✦`);
  };

  // Alternar talla Disponible <-> Agotada con 1 clic directamente en la fila de la tabla HONE
  const handleToggleSizeInlineOnRow = (product, sizeKey, e) => {
    if (e) e.stopPropagation();
    const baseColors = Array.isArray(product.colors) && product.colors.length > 0
      ? product.colors
      : [{
          name: 'Negro',
          hex: '#111111',
          availableSizes: Array.isArray(product.sizes) ? product.sizes : ['XS', 'S', 'M', 'L'],
          outOfStockSizes: []
        }];

    const firstColor = baseColors[0];
    const isCurrentlyAvail = (firstColor.availableSizes || []).includes(sizeKey);

    const updatedColors = baseColors.map((c, idx) => {
      if (idx !== 0) return c;
      const prevAvail = Array.isArray(c.availableSizes) ? c.availableSizes : [];
      const prevOut = Array.isArray(c.outOfStockSizes) ? c.outOfStockSizes : [];
      if (isCurrentlyAvail) {
        return {
          ...c,
          availableSizes: prevAvail.filter(s => s !== sizeKey),
          outOfStockSizes: Array.from(new Set([...prevOut, sizeKey]))
        };
      } else {
        return {
          ...c,
          availableSizes: Array.from(new Set([...prevAvail, sizeKey])),
          outOfStockSizes: prevOut.filter(s => s !== sizeKey)
        };
      }
    });

    const allAvailSizes = STANDARD_SIZES.filter(sz =>
      updatedColors.some(c => (c.availableSizes || []).includes(sz))
    );

    if (isStoreConnected && onUpdateProduct) {
      onUpdateProduct(product.id, {
        colors: updatedColors,
        sizes: allAvailSizes.length > 0 ? allAvailSizes : ['S', 'M', 'L']
      });
    }
  };

  // =========================================================
  // COMBO / PROMO PACK ENGINE
  // =========================================================
  const { totalOriginalPrice: comboTotalOrig } = calculateBundleTotals(selectedComboItems);

  let finalComboPrice = 0;
  let finalComboDiscount = 0;
  let comboSavings = 0;

  if (comboPricingMode === 'fixed') {
    finalComboPrice =
      comboPrice !== ''
        ? parseFloat(comboPrice) || 0
        : comboTotalOrig > 0
        ? Math.round(comboTotalOrig * 0.8)
        : 0;
    if (comboTotalOrig > 0 && finalComboPrice < comboTotalOrig) {
      const { savingsAmount, discountPercentage } = calculateDiscountSavings(comboTotalOrig, finalComboPrice);
      comboSavings = savingsAmount;
      finalComboDiscount = discountPercentage;
    }
  } else {
    finalComboDiscount = parseInt(comboDiscountPercent) || 0;
    finalComboPrice = Math.round(comboTotalOrig * (1 - finalComboDiscount / 100));
    comboSavings = comboTotalOrig - finalComboPrice;
  }

  const recommendedComboStock =
    selectedComboItems.length > 0
      ? Math.min(
          ...selectedComboItems.map(i =>
            Math.floor((parseInt(i.stock) || 0) / (parseInt(i.quantity) || 1))
          )
        )
      : 10;

  const handleOpenComboModal = (product = null, initialMode = 'bundle') => {
    setComboSearch('');
    setComboCategoryFilter('all');

    if (product) {
      setEditingComboId(product.id);
      setPromoOperationMode('bundle');
      const { bundleConfig } = parseProductSpecifications(product.specifications);
      const items = (bundleConfig.items || []).map(bItem => {
        const fullProd = products.find(p => p.id === bItem.productId);
        return {
          productId: bItem.productId || fullProd?.id || '',
          name: bItem.name || fullProd?.name || 'Corset',
          price: bItem.price !== undefined ? bItem.price : fullProd?.price || 0,
          originalPrice: bItem.originalPrice || fullProd?.old_price || fullProd?.oldPrice || fullProd?.price || 0,
          sku: bItem.sku || fullProd?.sku || '',
          image_url: bItem.image_url || fullProd?.image_url || fullProd?.images?.[0] || '',
          quantity: bItem.quantity || 1,
          stock: fullProd?.stock !== undefined ? fullProd.stock : 10
        };
      });
      setSelectedComboItems(items);
      setComboPricingMode('fixed');
      setComboPrice(product.price ? String(product.price) : '');
      setComboDiscountPercent(product.discount || 20);
      setComboStock(product.stock !== undefined ? String(product.stock) : String(recommendedComboStock));
      setComboFormData({
        name: product.name || '',
        sku: product.sku || generateUniqueSKU('PROMO'),
        category: product.category || availableCategories[0]?.id || 'corsets-brocado',
        collection: product.collection || 'destacados-principal',
        description: product.description || '',
        badge: product.badge || 'PROMO',
        image_url: product.image_url || product.images?.[0] || '',
        images: product.images || [],
        is_active: product.is_active !== false,
        is_featured: true
      });
    } else {
      setEditingComboId(null);
      setPromoOperationMode(initialMode === 'direct_discount' ? 'direct_discount' : 'bundle');
      setSelectedComboItems([]);
      setComboPricingMode('percent');
      setComboPrice('');
      setComboDiscountPercent(20);
      setComboStock('10');
      setComboFormData({
        name: '',
        sku: generateUniqueSKU('PROMO'),
        category: availableCategories[0]?.id || 'corsets-brocado',
        collection: 'destacados-principal',
        description: '',
        badge: 'PROMO',
        image_url: '',
        images: [],
        is_active: true,
        is_featured: true
      });
    }
    setComboModalOpen(true);
  };

  const handleToggleProductInCombo = (prod) => {
    const exists = selectedComboItems.some(i => i.productId === prod.id);
    if (exists) {
      setSelectedComboItems(prev => prev.filter(i => i.productId !== prod.id));
    } else {
      const img = prod.image_url || prod.images?.[0] || '';
      const baseNormalPrice = parseFloat(prod.old_price || prod.oldPrice || prod.price) || 0;
      const newItem = {
        productId: prod.id,
        name: prod.name,
        price: baseNormalPrice,
        originalPrice: baseNormalPrice,
        sku: prod.sku || '',
        image_url: img,
        quantity: 1,
        stock: prod.stock !== undefined ? prod.stock : 10
      };
      setSelectedComboItems(prev => {
        const next = [...prev, newItem];
        if (!comboFormData.image_url && img) {
          setComboFormData(f => ({ ...f, image_url: img }));
        }
        return next;
      });
    }
  };

  const handleUpdateComboItemQty = (prodId, delta) => {
    setSelectedComboItems(prev =>
      prev.map(item =>
        item.productId === prodId
          ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
          : item
      )
    );
  };

  const handleGenerateComboName = () => {
    if (selectedComboItems.length === 0) {
      showToast('Selecciona al menos un corset primero', 'error');
      return;
    }
    const names = selectedComboItems.map(i => i.name);
    const suggested =
      names.length === 1
        ? `Promo Especial: ${names[0]}`
        : names.length === 2
        ? `Promo Corsetería: ${names.join(' + ')}`
        : `Promo Colección: ${names.slice(0, 2).join(' + ')} (+${names.length - 2} más)`;
    setComboFormData(prev => ({ ...prev, name: suggested }));
  };

  const handleSubmitCombo = async (e) => {
    e.preventDefault();
    if (selectedComboItems.length === 0) {
      showToast('Selecciona al menos un corset para la promo', 'error');
      return;
    }

    // MODO 1: APLICAR % DESCUENTO DIRECTO A LAS PRENDAS SELECCIONADAS
    if (promoOperationMode === 'direct_discount' && !editingComboId) {
      const pct = Math.max(0, Math.min(90, parseInt(comboDiscountPercent) || 0));
      let updatedCount = 0;

      for (const item of selectedComboItems) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) continue;
        const basePrice = parseFloat(prod.old_price || prod.oldPrice || prod.price) || 0;
        if (basePrice <= 0) continue;

        const nextPrice = pct > 0 ? Math.round(basePrice * (1 - pct / 100)) : basePrice;
        const nextOldPrice = pct > 0 ? basePrice : null;
        const patch = {
          price: nextPrice,
          old_price: nextOldPrice,
          oldPrice: nextOldPrice,
          discount: pct,
          badge: pct > 0 ? `-${pct}% OFF` : (prod.badge === `-${prod.discount}% OFF` ? '' : prod.badge)
        };

        if (isStoreConnected && onUpdateProduct) {
          onUpdateProduct(prod.id, patch);
        } else {
          await supabase.from('products').update(patch).eq('id', prod.id);
        }
        updatedCount++;
      }

      if (!isStoreConnected) fetchProducts();
      showToast(
        pct > 0
          ? `¡Descuento de ${pct}% aplicado a ${updatedCount} prenda(s)! ✦`
          : `Descuento retirado en ${updatedCount} prenda(s)`
      );
      setComboModalOpen(false);
      return;
    }

    // MODO 2: CREAR / EDITAR PROMO O COMBO EN CATÁLOGO
    if (!comboFormData.name.trim()) {
      showToast('Ingresa un nombre para la promo', 'error');
      return;
    }

    const finalPriceVal = finalComboPrice > 0 ? finalComboPrice : comboTotalOrig;
    const finalOldPriceVal = comboTotalOrig > finalPriceVal ? comboTotalOrig : null;
    const collectedImages = Array.from(
      new Set([
        comboFormData.image_url,
        ...selectedComboItems.map(i => i.image_url).filter(Boolean)
      ])
    ).filter(Boolean);

    const bundleSpecObj = { enabled: true, items: selectedComboItems };
    const specsJson = serializeProductSpecifications([], null, bundleSpecObj, null);

    const payload = {
      name: comboFormData.name.trim(),
      sku: comboFormData.sku.trim() || generateUniqueSKU('PROMO'),
      category: comboFormData.category || 'corsets-brocado',
      categoryName: getCategoryLabel(comboFormData.category),
      collection: comboFormData.collection || 'destacados-principal',
      description:
        comboFormData.description.trim() ||
        `Promo exclusiva JAZYALON con ${selectedComboItems.length} diseño(s) seleccionado(s).`,
      specifications: specsJson,
      price: finalPriceVal,
      old_price: finalOldPriceVal,
      oldPrice: finalOldPriceVal,
      discount: finalComboDiscount,
      stock: comboStock !== '' ? parseInt(comboStock) : recommendedComboStock,
      badge: comboFormData.badge || (finalComboDiscount > 0 ? `PROMO -${finalComboDiscount}%` : 'PROMO'),
      image_url: collectedImages[0] || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
      images: collectedImages,
      isNew: true,
      isFeatured: true,
      is_active: comboFormData.is_active,
      is_featured: true
    };

    if (isStoreConnected) {
      if (editingComboId && onUpdateProduct) {
        onUpdateProduct(editingComboId, payload);
      } else if (onAddProduct) {
        onAddProduct(payload);
      }
      setComboModalOpen(false);
      return;
    }

    try {
      if (editingComboId) {
        await supabase.from('products').update(payload).eq('id', editingComboId);
      } else {
        await supabase.from('products').insert([payload]);
      }
      setComboModalOpen(false);
      fetchProducts();
    } catch (err) {
      showToast('Error al guardar promo: ' + err.message, 'error');
    }
  };

  // =========================================================
  // BULK SELECTION & IMPORT / EXPORT
  // =========================================================
  const handleSelectAll = () => {
    const pageIds = paginatedProducts.map(p => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleExecuteBulkAction = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;

    if (bulkAction === 'activate') {
      selectedIds.forEach(id => onUpdateProduct && onUpdateProduct(id, { is_active: true }));
      showToast(`${selectedIds.length} prendas publicadas`);
    } else if (bulkAction === 'deactivate') {
      selectedIds.forEach(id => onUpdateProduct && onUpdateProduct(id, { is_active: false }));
      showToast(`${selectedIds.length} prendas ocultadas`);
    } else if (bulkAction === 'newdrop') {
      selectedIds.forEach(id =>
        onUpdateProduct && onUpdateProduct(id, { isNew: true, isFeatured: true, badge: 'NUEVO DROP' })
      );
      showToast(`${selectedIds.length} prendas destacadas en Nuevos Ingresos ✦`);
    } else if (bulkAction === 'generatesku') {
      selectedIds.forEach(id => {
        const item = products.find(p => p.id === id);
        if (item && onUpdateProduct) {
          onUpdateProduct(id, { sku: generateUniqueSKU(item.category) });
        }
      });
      showToast(`SKUs regenerados para ${selectedIds.length} prendas`);
    } else if (bulkAction === 'delete') {
      if (window.confirm(`¿Eliminar ${selectedIds.length} prendas seleccionadas?`)) {
        selectedIds.forEach(id => onDeleteProduct && onDeleteProduct(id));
      }
    }
    setSelectedIds([]);
    setBulkAction('');
  };

  const handleImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let parsed = [];
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          parsed = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = values[idx] || '';
            });
            return obj;
          });
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map(item => ({
            name: item.name || item.nombre || 'Corset Importado',
            sku: item.sku || generateUniqueSKU(item.category || 'corsets-brocado'),
            price: parseFloat(item.price || item.precio) || 44990,
            stock: parseInt(item.stock) || 10,
            category: item.category || 'corsets-brocado',
            collection: item.collection || 'brocado-imperial',
            description: item.description || '',
            image_url: item.image_url || item.images?.[0] || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
            images: item.images || [item.image_url || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'],
            sizes: item.sizes || ['XS', 'S', 'M', 'L', 'XL'],
            colors: item.colors || [
              { name: 'Negro', hex: '#111111', availableSizes: ['XS', 'S', 'M', 'L'], outOfStockSizes: ['XL'] }
            ],
            isNew: true,
            isFeatured: true,
            is_active: true
          }));
          setImportPreview(formatted);
          setViewMode('import');
          showToast(`${formatted.length} prendas listas para importar`);
        }
      } catch (err) {
        showToast('Error al leer archivo: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    try {
      if (isStoreConnected && onAddMultipleProducts) {
        onAddMultipleProducts(importPreview);
      } else {
        await supabase.from('products').insert(importPreview);
        fetchProducts();
      }
      setImportPreview([]);
      setViewMode('table');
    } finally {
      setImporting(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `JAZYALON_HONE_CATALOG_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Catálogo exportado en JSON');
  };

  // Price & Discount Calculation
  const handlePriceChange = (price, oldPrice) => {
    const p = parseFloat(price) || 0;
    const op = parseFloat(oldPrice) || 0;
    let discount = 0;
    if (op > p && p > 0) {
      discount = Math.round(((op - p) / op) * 100);
    }
    setFormData(prev => ({
      ...prev,
      price,
      old_price: oldPrice,
      discount
    }));
  };

  const handleApplyPercentDiscount = (pctRaw) => {
    const pct = Math.max(0, Math.min(90, parseInt(pctRaw) || 0));
    setFormData(prev => {
      const currentOld = parseFloat(prev.old_price) || 0;
      const currentPrice = parseFloat(prev.price) || 0;
      const basePrice = currentOld > currentPrice ? currentOld : (currentOld || currentPrice);
      if (basePrice <= 0) {
        return { ...prev, discount: pct };
      }
      if (pct <= 0) {
        return {
          ...prev,
          price: String(basePrice),
          old_price: '',
          discount: 0
        };
      }
      const discounted = Math.round(basePrice * (1 - pct / 100));
      return {
        ...prev,
        price: String(discounted),
        old_price: String(basePrice),
        discount: pct
      };
    });
  };

  // Spec Helpers
  const handleSpecChange = (index, field, value) => {
    const updated = [...specList];
    updated[index][field] = value;
    setSpecList(updated);
  };
  const addSpecRow = () => setSpecList([...specList, { key: '', value: '' }]);
  const removeSpecRow = (index) => {
    const updated = specList.filter((_, i) => i !== index);
    setSpecList(updated.length ? updated : [{ key: '', value: '' }]);
  };

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.badgeRow}>
            <span className={styles.honeBrand}>HONE CATALOG</span>
            <span className={styles.versionBadge}>CATÁLOGO MAESTRO • CORSETERÍA</span>
            <span className={styles.webpBadgePill}>
              <Zap size={11} /> Optimización Automática
            </span>
          </div>
          <h1 className={styles.title}>Catálogo y Gestor de Corsetería</h1>
          <p className={styles.subtitle}>
            Subida individual y masiva de prendas, código SKU automático, disponibilidad de tallas por color, colecciones y destacados sincronizados en vivo.
          </p>
        </div>

        <div className={styles.topActions}>
          <div className={styles.importBtnGroup}>
            <label className={styles.btnSecondary} title="Importar Catálogo (CSV / JSON)">
              <FileSpreadsheet size={15} />
              <span>Importar</span>
              <input
                type="file"
                ref={importInputRef}
                accept=".csv,.json"
                onChange={handleImportFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowImportHelp(true)}
              className={styles.btnHelpQuestion}
              title="¿Cómo funciona el botón Importar?"
            >
              <HelpCircle size={14} />
            </button>
          </div>

          <button onClick={handleExportJSON} className={styles.btnSecondary} title="Exportar Catálogo en JSON">
            <Download size={15} />
            <span>Exportar</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'bulk' ? 'table' : 'bulk')}
            className={`${styles.btnSecondary} ${viewMode === 'bulk' ? styles.btnActive : ''}`}
          >
            <UploadCloud size={15} />
            <span>Carga Masiva</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenComboModal(null, 'bundle')}
            className={styles.btnComboAdd}
          >
            <Gift size={15} />
            <span>Crear Promo</span>
          </button>

          <button onClick={() => handleOpenModal()} className={styles.btnAdd}>
            <Plus size={15} />
            <span>Subir Corset</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Prendas</span>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue}>{totalProducts}</span>
            <Package size={18} className={styles.metricIcon} />
          </div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Publicadas en Web</span>
          <div className={styles.metricValueWrap}>
            <span className={`${styles.metricValue} ${styles.textSuccess}`}>{activeProducts}</span>
            <Eye size={18} className={styles.metricIcon} />
          </div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Nuevos Drops (Destacados)</span>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue} style={{ color: '#8C6A2E' }}>
              {products.filter(p => p.isNew).length}
            </span>
            <Sparkles size={18} className={styles.metricIcon} />
          </div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Valor en Inventario</span>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue}>{formatCLP(totalInventoryValue)}</span>
            <Crown size={18} className={styles.metricIcon} />
          </div>
        </div>
      </div>

      {/* IMPORT PREVIEW VIEW */}
      {viewMode === 'import' && (
        <div className={styles.bulkContainer}>
          <div className={styles.bulkHeader}>
            <div>
              <h3>Importador de Catálogo ({importPreview.length} prendas detectadas)</h3>
              <p>Revisa la vista previa antes de sincronizar con la tienda en tiempo real.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className={styles.btnSecondary} onClick={() => setViewMode('table')}>
                Cancelar
              </button>
              <button className={styles.btnAdd} onClick={executeImport} disabled={importing}>
                <Zap size={16} />
                <span>Confirmar e Importar Todas</span>
              </button>
            </div>
          </div>
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>SKU Generado</th>
                  <th>Categoría</th>
                  <th>Precio (CLP)</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong style={{ color: '#181514' }}>{item.name}</strong></td>
                    <td><span className={styles.skuTagInline}>{item.sku}</span></td>
                    <td><span className={styles.categoryBadge}>{getCategoryLabel(item.category)}</span></td>
                    <td><span style={{ color: '#065F46', fontWeight: 700 }}>{formatCLP(item.price)}</span></td>
                    <td><span>{item.stock} un.</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BULK UPLOAD VIEW */}
      {viewMode === 'bulk' && (
        <div className={styles.bulkContainer}>
          <div className={styles.bulkHeader}>
            <div>
              <h3>Carga Masiva de Corsets y Prendas</h3>
              <p>
                Arrastra o selecciona varias fotos a la vez. Cada imagen se optimiza automáticamente y puedes asignarle su Categoría, Colección y estado de Destacado antes de publicar.
              </p>
            </div>
            <button className={styles.btnSecondary} onClick={() => setViewMode('table')}>
              Cerrar Carga Masiva
            </button>
          </div>

          <div className={styles.dropzone} onClick={() => bulkInputRef.current?.click()}>
            <UploadCloud size={42} className={styles.dropIcon} />
            <h4>Haz clic o arrastra múltiples fotos de corsets aquí</h4>
            <p>Se optimizarán automáticamente para que tu sitio web cargue rápido</p>
            <input
              type="file"
              ref={bulkInputRef}
              multiple
              accept="image/*"
              onChange={handleBulkFilesSelect}
              style={{ display: 'none' }}
            />
          </div>

          {bulkFiles.length > 0 && (
            <div className={styles.bulkTableWrap}>
              <div className={styles.bulkTableActions}>
                <span>{bulkFiles.length} corsets listos para publicar</span>
                <button onClick={processBulkUpload} disabled={bulkUploading} className={styles.btnAdd}>
                  {bulkUploading ? <RefreshCw size={15} className={styles.spin} /> : <Zap size={15} />}
                  <span>{bulkUploading ? 'Publicando...' : 'Publicar Todo el Lote'}</span>
                </button>
              </div>

              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '76px' }}>Foto</th>
                      <th>Nombre del Corset / Prenda</th>
                      <th>Categoría</th>
                      <th>Colección</th>
                      <th style={{ width: '115px' }}>Precio (CLP)</th>
                      <th style={{ width: '80px' }}>Stock</th>
                      <th>SKU Único</th>
                      <th>Destacado</th>
                      <th style={{ width: '50px' }}>Quitar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkFiles.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={row.preview} alt="preview" className={styles.bulkImgPreview} />
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateBulkRow(row.id, 'name', e.target.value)}
                            className={styles.inlineInput}
                          />
                        </td>
                        <td>
                          <select
                            value={row.category}
                            onChange={(e) => updateBulkRow(row.id, 'category', e.target.value)}
                            className={styles.inlineInput}
                          >
                            {availableCategories.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.collection}
                            onChange={(e) => updateBulkRow(row.id, 'collection', e.target.value)}
                            className={styles.inlineInput}
                          >
                            {availableCollections.map(col => (
                              <option key={col.id} value={col.id}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateBulkRow(row.id, 'price', e.target.value)}
                            className={styles.inlineInput}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => updateBulkRow(row.id, 'stock', e.target.value)}
                            className={styles.inlineInput}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={row.sku}
                              onChange={(e) => updateBulkRow(row.id, 'sku', e.target.value)}
                              className={styles.inlineInput}
                            />
                            <button
                              type="button"
                              onClick={() => regenerateBulkRowSku(row.id, row.category)}
                              className={styles.btnGenIcon}
                              title="Regenerar SKU"
                            >
                              <Dice5 size={14} />
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={row.isNew}
                            onChange={(e) => updateBulkRow(row.id, 'isNew', e.target.checked)}
                            title="Destacar en Nuevos Ingresos"
                          />
                        </td>
                        <td>
                          <button onClick={() => removeBulkRow(row.id)} className={styles.btnActionIcon}>
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BARRA COMPACTA DE COLECCIONES / CATEGORÍAS + CREACIÓN EN 1 CLIC */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px 14px',
          marginBottom: '12px',
          background: '#FFFFFF',
          border: '1px solid #E5E0D8',
          borderRadius: '11px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#8C6A2E',
              fontWeight: 800,
              marginRight: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Layers size={13} /> Colecciones / Categorías:
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '5px 11px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: selectedCategory === 'all' ? '1px solid #181514' : '1px solid #D4CCC0',
              background: selectedCategory === 'all' ? '#181514' : '#FAF9F6',
              color: selectedCategory === 'all' ? '#FFFFFF' : '#575049',
              transition: 'all 0.15s ease'
            }}
          >
            Todas ({products.length})
          </button>

          {availableCategories.map(cat => {
            const mappedCol = CATEGORY_TO_COLLECTION_DEFAULT[cat.id] || cat.id;
            const count = products.filter(p => p.category === cat.id || p.collection === cat.id || p.collection === mappedCol).length;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: active ? '1px solid #181514' : '1px solid #D4CCC0',
                  background: active ? '#181514' : '#FAF9F6',
                  color: active ? '#FFFFFF' : '#575049',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.name} <span style={{ opacity: 0.75, fontSize: '0.68rem' }}>({count})</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => handleOpenModal(null)}
              className={styles.btnAdd}
              style={{ height: '30px', padding: '0 11px', fontSize: '0.73rem' }}
            >
              <Plus size={13} />
              <span>Subir en &quot;{getCategoryLabel(selectedCategory)}&quot;</span>
            </button>
          )}

          {!quickNewCatOpen ? (
            <button
              type="button"
              onClick={() => setQuickNewCatOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: '8px',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: '#FBF7EE',
                border: '1px dashed #B6914B',
                color: '#8C6A2E'
              }}
            >
              <FolderPlus size={13} />
              <span>+ Nueva Colección</span>
            </button>
          ) : (
            <form
              onSubmit={handleQuickCreateCategoryAndCollection}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Ej: Corsets Novia..."
                value={quickNewCatName}
                onChange={e => setQuickNewCatName(e.target.value)}
                className={styles.inlineInput}
                style={{ width: '175px', padding: '5px 9px', fontSize: '0.75rem' }}
              />
              <button
                type="submit"
                className={styles.btnAdd}
                style={{ padding: '5px 10px', fontSize: '0.73rem' }}
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickNewCatOpen(false);
                  setQuickNewCatName('');
                }}
                className={styles.btnActionIcon}
                style={{ width: '26px', height: '26px' }}
              >
                <X size={13} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* SEARCH, FILTER & CONTROLS TOOLBAR */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            ref={searchInputRef}
            placeholder="Buscar por nombre de corset, SKU, talla (XS, S, M) o color (Negro, Burdeos)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} className={styles.clearSearchBtn}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.selectWrapper}>
            <Filter size={14} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.select}
            >
              <option value="all">Todas las Categorías</option>
              {availableCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.select}
            >
              <option value="all">Todos los Estados</option>
              <option value="published">Publicados en Web</option>
              <option value="newdrops">✦ Nuevos Ingresos (New Drops)</option>
              <option value="discount">En Oferta / Descuento</option>
              <option value="draft">Ocultos / Borradores</option>
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <ArrowUpDown size={14} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.select}>
              <option value="created_at_desc">Orden del Catálogo</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="stock_desc">Mayor Stock</option>
              <option value="name_asc">Nombre A-Z</option>
            </select>
          </div>

          <div className={styles.viewModeToggle}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewBtnActive : ''}`}
            >
              <Layers size={16} />
              <span>Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            >
              <ImageIcon size={16} />
              <span>Tarjetas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Selector */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkSelectCount}>
            <CheckSquare size={16} />
            <span>{selectedIds.length} prenda(s) seleccionada(s)</span>
          </div>
          <div className={styles.bulkActionControls}>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className={styles.select}>
              <option value="">Acciones en lote...</option>
              <option value="newdrop">✦ Destacar como Nuevo Ingreso (New Drop)</option>
              <option value="activate">Publicar en tienda</option>
              <option value="deactivate">Ocultar de tienda</option>
              <option value="generatesku">Regenerar SKUs únicos</option>
              <option value="delete">Eliminar seleccionadas</option>
            </select>
            <button onClick={handleExecuteBulkAction} className={styles.btnExecute}>
              Aplicar
            </button>
            <button onClick={() => setSelectedIds([])} className={styles.btnCancelSelect}>
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* PRODUCTS DISPLAY */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <RefreshCw size={28} className={styles.spin} />
          <p>Sincronizando HONE CATALOG...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <Package size={46} className={styles.emptyIcon} />
          <h3>No se encontraron prendas</h3>
          <p>Sube un nuevo corset individualmente o mediante Carga Masiva.</p>
          <button onClick={() => handleOpenModal()} className={styles.btnAdd}>
            <Plus size={15} />
            <span>Subir Corset</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <button onClick={handleSelectAll} className={styles.checkboxBtn}>
                    {paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.includes(p.id)) ? (
                      <CheckSquare size={18} className={styles.checkedIcon} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
                <th style={{ width: '64px' }}>Foto</th>
                <th>Prenda, Colores & Tallas</th>
                <th>SKU</th>
                <th>Categoría & Colección</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado / New Drop</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const isQuickEditing = quickEditId === product.id;
                const isBundle = isProductBundle(product);
                const mainImg = product.image_url || product.images?.[0];

                if (isQuickEditing) {
                  return (
                    <tr key={product.id} className={styles.quickEditRow}>
                      <td colSpan="9">
                        <div className={styles.quickEditContainer}>
                          <div className={styles.quickEditHeader}>
                            <strong>Edición Rápida: {product.name}</strong>
                            <button onClick={() => setQuickEditId(null)} className={styles.btnActionIcon}>
                              <X size={16} />
                            </button>
                          </div>
                          <div className={styles.quickEditGrid}>
                            <div className={styles.formGroup}>
                              <label>Nombre</label>
                              <input
                                type="text"
                                value={quickFormData.name}
                                onChange={e => setQuickFormData({ ...quickFormData, name: e.target.value })}
                                className={styles.input}
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label>SKU</label>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input
                                  type="text"
                                  value={quickFormData.sku}
                                  onChange={e => setQuickFormData({ ...quickFormData, sku: e.target.value })}
                                  className={styles.input}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuickFormData({
                                      ...quickFormData,
                                      sku: generateUniqueSKU(quickFormData.category)
                                    })
                                  }
                                  className={styles.btnGenSku}
                                >
                                  <Dice5 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className={styles.formGroup}>
                              <label>Precio Venta (CLP)</label>
                              <input
                                type="number"
                                value={quickFormData.price}
                                onChange={e => setQuickFormData({ ...quickFormData, price: e.target.value })}
                                className={styles.input}
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label>Precio Antes / % Dcto</label>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <input
                                  type="number"
                                  placeholder="Antes"
                                  value={quickFormData.old_price || ''}
                                  onChange={e => setQuickFormData({ ...quickFormData, old_price: e.target.value })}
                                  className={styles.input}
                                />
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const pct = parseInt(e.target.value) || 0;
                                    const base =
                                      parseFloat(quickFormData.old_price) > parseFloat(quickFormData.price)
                                        ? parseFloat(quickFormData.old_price)
                                        : parseFloat(quickFormData.price) || 0;
                                    if (base <= 0) return;
                                    if (pct === 0) {
                                      setQuickFormData({ ...quickFormData, price: base, old_price: '', discount: 0 });
                                    } else {
                                      setQuickFormData({
                                        ...quickFormData,
                                        old_price: base,
                                        price: Math.round(base * (1 - pct / 100)),
                                        discount: pct
                                      });
                                    }
                                  }}
                                  className={styles.modalSelect}
                                  style={{ width: '88px' }}
                                >
                                  <option value="">% Dcto</option>
                                  <option value="0">Sin dcto</option>
                                  <option value="10">-10%</option>
                                  <option value="15">-15%</option>
                                  <option value="20">-20%</option>
                                  <option value="25">-25%</option>
                                  <option value="30">-30%</option>
                                  <option value="40">-40%</option>
                                </select>
                              </div>
                            </div>
                            <div className={styles.formGroup}>
                              <label>Stock Total</label>
                              <input
                                type="number"
                                value={quickFormData.stock}
                                onChange={e => setQuickFormData({ ...quickFormData, stock: e.target.value })}
                                className={styles.input}
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label>Categoría</label>
                              <select
                                value={quickFormData.category}
                                onChange={e => setQuickFormData({ ...quickFormData, category: e.target.value })}
                                className={styles.modalSelect}
                              >
                                {availableCategories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className={styles.formGroup}>
                              <label>Colección</label>
                              <select
                                value={quickFormData.collection}
                                onChange={e => setQuickFormData({ ...quickFormData, collection: e.target.value })}
                                className={styles.modalSelect}
                              >
                                {availableCollections.map(col => (
                                  <option key={col.id} value={col.id}>{col.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className={styles.quickEditActions}>
                            <button onClick={() => setQuickEditId(null)} className={styles.btnSecondary}>
                              Cancelar
                            </button>
                            <button onClick={() => saveQuickEdit(product.id)} className={styles.btnAdd}>
                              Guardar Cambios
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={product.id} className={isSelected ? styles.rowSelected : ''}>
                    <td>
                      <button onClick={() => handleToggleSelect(product.id)} className={styles.checkboxBtn}>
                        {isSelected ? <CheckSquare size={18} className={styles.checkedIcon} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td>
                      <div className={styles.thumbWrapper}>
                        {mainImg ? (
                          <img src={mainImg} alt={product.name} className={styles.productThumb} />
                        ) : (
                          <div className={styles.thumbPlaceholder}><ImageIcon size={18} /></div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.productTitleCol}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={styles.productName}>{product.name}</span>
                          {product.isCollectionPrimary && (
                            <span className={styles.primaryCorsetPill} title="Se muestra primero en su colección">
                              <Crown size={11} /> #1 Colección
                            </span>
                          )}
                          {isBundle && (
                            <span className={styles.comboBadgePill}>
                              <Package size={11} /> PROMO
                            </span>
                          )}
                          {product.badge && !isBundle && (
                            <span className={styles.badgePill}>{product.badge}</span>
                          )}
                        </div>

                        {/* Swatches de Colores & Tallas de Ropa */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {Array.isArray(product.colors) && product.colors.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {product.colors.map((c, cIdx) => (
                                <span
                                  key={cIdx}
                                  title={`${c.name} — Disp: ${(c.availableSizes || []).join(', ') || 'Ninguna'} | Agotadas: ${(c.outOfStockSizes || []).join(', ') || 'Ninguna'}`}
                                  style={{
                                    width: '13px',
                                    height: '13px',
                                    borderRadius: '50%',
                                    backgroundColor: c.hex || '#111',
                                    border: '1px solid #C5BEB3',
                                    display: 'inline-block'
                                  }}
                                />
                              ))}
                              <span style={{ fontSize: '0.72rem', color: '#575049', marginLeft: '2px' }}>
                                ({product.colors.length} {product.colors.length === 1 ? 'color' : 'colores'})
                              </span>
                            </div>
                          )}
                          {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.68rem', color: '#575049', marginRight: '2px' }}>Tallas (1-clic):</span>
                              {product.sizes.map(sz => {
                                const firstColor = Array.isArray(product.colors) && product.colors[0] ? product.colors[0] : null;
                                const isOut = firstColor
                                  ? (firstColor.outOfStockSizes || []).includes(sz) && !(firstColor.availableSizes || []).includes(sz)
                                  : false;
                                return (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={(e) => handleToggleSizeInlineOnRow(product, sz, e)}
                                    title={isOut ? `Talla ${sz} AGOTADA — Clic para activar` : `Talla ${sz} DISPONIBLE — Clic para marcar agotada`}
                                    style={{
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.66rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: isOut ? '1px solid #FECDD3' : '1px solid #86EFAC',
                                      background: isOut ? '#FFF1F2' : '#ECFDF5',
                                      color: isOut ? '#BE123C' : '#065F46',
                                      textDecoration: isOut ? 'line-through' : 'none'
                                    }}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.skuActionRow}>
                        <span className={styles.skuText}>{product.sku || 'SIN SKU'}</span>
                        {product.sku && (
                          <button
                            onClick={(e) => handleCopySku(product.sku, e)}
                            className={styles.copySkuBtn}
                            title="Copiar SKU"
                          >
                            {copiedSku === product.sku ? <CheckCheck size={12} color="#059669" /> : <Clipboard size={12} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={styles.categoryBadge}>{getCategoryLabel(product.category)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#8C6A2E', fontWeight: 600 }}>
                          Col: {getCollectionLabel(product.collection)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.priceColumn}>
                        <span className={styles.priceMain}>{formatCLP(product.price)}</span>
                        {(product.old_price || product.oldPrice) > product.price && (
                          <span className={styles.priceOld}>
                            {formatCLP(product.old_price || product.oldPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.fastStockControl}>
                        <button
                          onClick={(e) => handleQuickStockAdjust(product, -1, e)}
                          className={styles.stockIncBtn}
                          disabled={product.stock <= 0}
                        >
                          <MinusCircle size={15} />
                        </button>
                        <span
                          className={`${styles.stockIndicator} ${
                            product.stock <= 0
                              ? styles.stockRed
                              : product.stock <= 5
                              ? styles.stockYellow
                              : styles.stockGreen
                          }`}
                        >
                          {product.stock <= 0 ? '0 un.' : `${product.stock} un.`}
                        </span>
                        <button
                          onClick={(e) => handleQuickStockAdjust(product, 1, e)}
                          className={styles.stockIncBtn}
                        >
                          <PlusCircle size={15} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`${styles.statusToggle} ${
                            product.is_active !== false ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          <span className={styles.statusDot}></span>
                          {product.is_active !== false ? 'Publicado' : 'Oculto'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleNewDropInline(product)}
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            border: product.isNew ? '1px solid #B6914B' : '1px solid #D4CCC0',
                            background: product.isNew ? '#FBF7EE' : '#FFFFFF',
                            color: product.isNew ? '#8C6A2E' : '#575049',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                          title="Los Nuevos Ingresos se muestran como Destacados en la portada"
                        >
                          {product.isNew ? '✦ Destacado (Drop)' : '+ Destacar'}
                        </button>
                        {onSetPrimaryCorset && (
                          <button
                            type="button"
                            onClick={() => {
                              const colId = product.collection || product.collectionId || product.category || 'corsets-brocado';
                              onSetPrimaryCorset(colId, product.id);
                              showToast(`♛ "${product.name}" elegido como Corset #1 de su colección`);
                            }}
                            style={{
                              fontSize: '0.66rem',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              border: product.isCollectionPrimary ? '1px solid #181514' : '1px solid #D4CCC0',
                              background: product.isCollectionPrimary ? '#181514' : '#FFFFFF',
                              color: product.isCollectionPrimary ? '#FFFFFF' : '#575049',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                            title="Elegir para que se muestre primero en su colección"
                          >
                            {product.isCollectionPrimary ? '♛ #1 en su Colección' : '♛ Hacer #1 Colección'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionButtonsRow}>
                        <button
                          onClick={() => startQuickEdit(product)}
                          className={styles.btnActionIcon}
                          title="Edición Rápida"
                        >
                          <Sliders size={15} />
                        </button>
                        <button
                          onClick={() => (isBundle ? handleOpenComboModal(product) : handleOpenModal(product))}
                          className={styles.btnActionIcon}
                          title="Editar Prenda, Tallas y Colores"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(product)}
                          className={styles.btnActionIcon}
                          title="Duplicar Prenda"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className={`${styles.btnActionIcon} ${styles.btnDeleteIcon}`}
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className={styles.grid}>
          {paginatedProducts.map((product) => {
            const isBundle = isProductBundle(product);
            const mainImg = product.image_url || product.images?.[0];
            return (
              <div key={product.id} className={styles.gridCard}>
                <div className={styles.gridCardMedia}>
                  {mainImg ? (
                    <img src={mainImg} alt={product.name} className={styles.gridCardImg} />
                  ) : (
                    <div className={styles.noImagePlaceholder}><ImageIcon size={32} /></div>
                  )}
                  {product.isCollectionPrimary && (
                    <span className={styles.primaryCorsetPill} style={{ position: 'absolute', top: 10, left: 10, zIndex: 4 }}>
                      <Crown size={11} /> #1 Colección
                    </span>
                  )}
                  {!product.isCollectionPrimary && product.badge && (
                    <span className={styles.gridBadge}>{product.badge}</span>
                  )}
                  {product.stock <= 0 && <span className={styles.gridAgotado}>AGOTADO</span>}

                  <div className={styles.gridCardOverlay}>
                    <button
                      onClick={() => (isBundle ? handleOpenComboModal(product) : handleOpenModal(product))}
                      className={styles.gridOverlayBtn}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDuplicate(product)} className={styles.gridOverlayBtn} title="Duplicar">
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className={`${styles.gridOverlayBtn} ${styles.btnDeleteIcon}`}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.gridCardBody}>
                  <div className={styles.gridCardCategoryRow}>
                    <span className={styles.categoryBadge}>{getCategoryLabel(product.category)}</span>
                    <span className={product.stock <= 0 ? styles.stockRed : styles.stockGreen}>
                      {product.stock} en stock
                    </span>
                  </div>
                  <h3 className={styles.gridCardTitle}>{product.name}</h3>
                  <div style={{ display: 'flex', gap: '4px', margin: '4px 0' }}>
                    {(product.colors || []).map((c, idx) => (
                      <span
                        key={idx}
                        title={c.name}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: c.hex || '#111',
                          border: '1px solid #C5BEB3'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div className={styles.gridCardPriceRow}>
                      <span className={styles.priceMain}>{formatCLP(product.price)}</span>
                    </div>
                    <span className={styles.skuTagInline}>{product.sku}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION BAR */}
      {filteredProducts.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> a <strong>{endIndex}</strong> de <strong>{totalItems}</strong> prendas
            </span>
          </div>
          {totalPages > 1 && (
            <div className={styles.paginationNav}>
              <button
                type="button"
                className={styles.pageNavBtn}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              {getPageNumbers().map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`dots-${idx}`} className={styles.pageBtnDots}>...</span>
                ) : (
                  <button
                    key={`page-${pageNum}`}
                    type="button"
                    className={`${styles.pageBtn} ${currentPage === pageNum ? styles.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              )}
              <button
                type="button"
                className={styles.pageNavBtn}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* IMPORT HELP MODAL */}
      {showImportHelp && (
        <div className={styles.modalOverlay} onClick={() => setShowImportHelp(false)}>
          <div className={styles.helpModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} style={{ color: '#8C6A2E' }} />
                <h3 className={styles.modalTitle}>¿Cómo funciona el botón Importar?</h3>
              </div>
              <button className={styles.closeModal} onClick={() => setShowImportHelp(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.helpModalContent}>
              <p>
                Puedes cargar catálogos completos desde un archivo <strong>.CSV</strong> o <strong>.JSON</strong>. Si no incluyes el código SKU, el motor HONE lo generará automáticamente.
              </p>
              <div className={styles.helpSection}>
                <h4>Columnas soportadas:</h4>
                <div className={styles.codeBox}>
                  <code>name, price, stock, category, collection, sku, description, image_url</code>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => setShowImportHelp(false)} className={styles.btnAdd}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRODUCT EDITOR MODAL (WITH APPAREL SIZES/COLORS & WEBP)   */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalSub}>HONE CATALOG PRO V3.0 • SINCRONIZADO EN TIEMPO REAL</span>
                <h2 className={styles.modalTitle}>
                  {editingId ? 'Editar Prenda / Corset' : 'Subir Nuevo Corset al Catálogo'}
                </h2>
              </div>
              <button className={styles.closeModal} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs — Compacto en 1 solo paso principal */}
            <div className={styles.modalTabs}>
              <button
                type="button"
                className={`${styles.modalTab} ${(activeTabModal === 'general' || activeTabModal === 'apparel') ? styles.modalTabActive : ''}`}
                onClick={() => setActiveTabModal('general')}
              >
                <Sparkles size={15} />
                <span>1. Todo en 1 Paso: Datos, Fotos, Tallas y Colores</span>
                <span className={styles.tabBadgeActive}>{garmentColors.length} colores · {garmentSizes.length} tallas</span>
              </button>
              <button
                type="button"
                className={`${styles.modalTab} ${activeTabModal === 'specs' ? styles.modalTabActive : ''}`}
                onClick={() => setActiveTabModal('specs')}
              >
                <Box size={15} />
                <span>2. Ficha Técnica (Opcional)</span>
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className={styles.modalForm}>
              {/* PASO ÚNICO COMPACTO EN 2 COLUMNAS: DATOS + FOTOS WEBP (IZQ) | TALLAS & COLORES (DER) */}
              {(activeTabModal === 'general' || activeTabModal === 'apparel') && (
                <div className={styles.tabContent}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                      gap: '18px',
                      alignItems: 'start'
                    }}
                  >
                    {/* COLUMNA IZQUIERDA: DATOS, COLECCIÓN, FOTOS WEBP Y DESTACADOS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup} style={{ flex: 1.8 }}>
                          <label>Nombre del Corset / Prenda *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Corset Overbust Brocado Victoriano"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.formGroup} style={{ flex: 1.2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label>SKU Auto</label>
                            <button
                              type="button"
                              onClick={handleGenerateModalSku}
                              className={styles.btnGenSkuAction}
                            >
                              <Dice5 size={12} />
                              <span>Generar</span>
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              required
                              value={formData.sku}
                              onChange={e => setFormData({ ...formData, sku: e.target.value })}
                              className={styles.input}
                            />
                            <button
                              type="button"
                              onClick={() => handleCopySku(formData.sku)}
                              className={styles.copySkuBtnModal}
                              title="Copiar SKU"
                            >
                              <Clipboard size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Precio, Descuento y Stock */}
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Precio Venta (CLP) *</label>
                          <input
                            type="number"
                            required
                            placeholder="44990"
                            value={formData.price}
                            onChange={e => handlePriceChange(e.target.value, formData.old_price)}
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Precio Antes (Normal)</label>
                          <input
                            type="number"
                            placeholder="54990"
                            value={formData.old_price}
                            onChange={e => handlePriceChange(formData.price, e.target.value)}
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.formGroup} style={{ maxWidth: '108px' }}>
                          <label>% Descuento</label>
                          <input
                            type="number"
                            min="0"
                            max="90"
                            placeholder="Ej: 20"
                            value={formData.discount || ''}
                            onChange={e => handleApplyPercentDiscount(e.target.value)}
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.formGroup} style={{ maxWidth: '100px' }}>
                          <label>Stock Total *</label>
                          <input
                            type="number"
                            required
                            value={formData.stock}
                            onChange={e => setFormData({ ...formData, stock: e.target.value })}
                            className={styles.input}
                          />
                        </div>
                      </div>

                      {/* Botones rápidos para añadir descuento en 1 clic */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '-4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#575049', fontWeight: 700 }}>
                          Añadir descuento rápido:
                        </span>
                        {[0, 10, 15, 20, 25, 30, 40].map(pct => {
                          const isSelectedPct = Number(formData.discount || 0) === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleApplyPercentDiscount(pct)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '999px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: isSelectedPct ? '1px solid #059669' : '1px solid #D4CCC0',
                                background: isSelectedPct ? '#ECFDF5' : '#FAF9F6',
                                color: isSelectedPct ? '#065F46' : '#575049'
                              }}
                            >
                              {pct === 0 ? 'Sin dcto' : `-${pct}%`}
                            </button>
                          );
                        })}
                      </div>

                      {/* Categoría & Colección */}
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Categoría del Catálogo *</label>
                          <select
                            value={isCustomCategory ? '__custom__' : formData.category}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setIsCustomCategory(true);
                              } else {
                                setIsCustomCategory(false);
                                setFormData({
                                  ...formData,
                                  category: e.target.value,
                                  collection: resolveCollectionForCategory(e.target.value)
                                });
                              }
                            }}
                            className={styles.modalSelect}
                          >
                            {availableCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            <option value="__custom__">+ Crear Nueva Categoría / Colección...</option>
                          </select>

                          {isCustomCategory && (
                            <div style={{ marginTop: '6px' }}>
                              <input
                                type="text"
                                required
                                placeholder="Nombre de nueva Categoría/Colección..."
                                value={customCatName}
                                onChange={e => setCustomCatName(e.target.value)}
                                className={styles.input}
                              />
                            </div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label>Colección en la Web *</label>
                          <select
                            value={formData.collection}
                            onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                            className={styles.modalSelect}
                          >
                            {availableCollections.map(col => (
                              <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Fotos con Optimización Automática */}
                      <div className={styles.galleryUploadArea} style={{ padding: '12px' }}>
                        <div className={styles.galleryUploadHeader} style={{ marginBottom: (formData.images || []).length > 0 ? '10px' : 0 }}>
                          <div>
                            <h4 style={{ fontSize: '0.84rem', margin: 0, color: '#181514' }}>Fotos del Corset</h4>
                            <p style={{ fontSize: '0.72rem', margin: '2px 0 0 0', color: '#575049' }}>Se optimizan automáticamente al subirlas.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={styles.btnAdd}
                            disabled={uploading}
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            <UploadCloud size={14} />
                            <span>{uploading ? 'Optimizando...' : 'Subir Foto(s)'}</span>
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            accept="image/*,video/*"
                            onChange={handleMultipleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </div>

                        {lastWebpStats && (
                          <div style={{ marginBottom: '8px' }}>
                            <span className={styles.webpBadgePill}>
                              Imagen optimizada: {formatBytes(lastWebpStats.originalSize)} → {formatBytes(lastWebpStats.webpSize)} (-{lastWebpStats.savingsPercent}%)
                            </span>
                          </div>
                        )}

                        {(formData.images || []).length > 0 && (
                          <div className={styles.galleryGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: '8px' }}>
                            {formData.images.map((url, idx) => {
                              const isPrimary = formData.image_url === url || (!formData.image_url && idx === 0);
                              return (
                                <div key={idx} className={`${styles.galleryItem} ${isPrimary ? styles.galleryItemPrimary : ''}`} style={{ height: '90px' }}>
                                  <img src={url} alt="gallery" className={styles.galleryImg} />
                                  {isPrimary && <span className={styles.primaryBadge} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>Portada</span>}
                                  <div className={styles.galleryActions}>
                                    {!isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => setAsPrimaryImage(url)}
                                        className={styles.btnSetPrimary}
                                        style={{ fontSize: '0.6rem', padding: '2px 5px' }}
                                      >
                                        Portada
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeGalleryImage(url)}
                                      className={styles.btnRemoveImg}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Switches rápidos de Posicionamiento Web */}
                      <div className={styles.newDropBannerBox} style={{ padding: '10px 12px' }}>
                        <div className={styles.formRowCheckboxes} style={{ marginTop: 0, gap: '6px' }}>
                          <div className={styles.checkboxItem}>
                            <input
                              type="checkbox"
                              id="modal-isnew"
                              checked={formData.isNew}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  isNew: e.target.checked,
                                  is_featured: e.target.checked ? true : formData.is_featured,
                                  badge: e.target.checked && !formData.badge ? 'NUEVO DROP' : formData.badge
                                })
                              }
                            />
                            <label htmlFor="modal-isnew" style={{ color: '#8C6A2E', fontWeight: 600, fontSize: '0.78rem' }}>
                              ✦ Destacar en &quot;Nuevos Ingresos (New Drops)&quot; de la portada
                            </label>
                          </div>

                          <div className={styles.checkboxItem}>
                            <input
                              type="checkbox"
                              id="modal-primary-collection"
                              checked={formData.isCollectionPrimary}
                              onChange={e => setFormData({ ...formData, isCollectionPrimary: e.target.checked })}
                            />
                            <label htmlFor="modal-primary-collection" style={{ color: '#065F46', fontWeight: 600, fontSize: '0.78rem' }}>
                              ♛ Mostrar #1 Primero en la colección &quot;{getCollectionLabel(formData.collection)}&quot;
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Descripción Breve</label>
                        <textarea
                          rows="2"
                          placeholder="Estructura de varillas, tela (brocado, encaje, satén) y calce..."
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          className={styles.textarea}
                        />
                      </div>
                    </div>

                    {/* COLUMNA DERECHA: TALLAS Y COLORES EN 1 CLIC */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* 1. Selector de Tallas Globales */}
                      <div className={styles.colorMatrixCard} style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#181514', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Ruler size={14} color="#8C6A2E" />
                            <span>Tallas del Corset</span>
                          </h4>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="+ Otra (S/M)"
                              value={customSizeInput}
                              onChange={e => setCustomSizeInput(e.target.value)}
                              className={styles.inlineInput}
                              style={{ width: '95px', padding: '3px 7px', fontSize: '0.72rem' }}
                            />
                            <button type="button" onClick={handleAddCustomSize} className={styles.btnSecondary} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                              +
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {STANDARD_SIZES.map(sz => {
                            const active = garmentSizes.includes(sz);
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => handleToggleGarmentSize(sz)}
                                className={`${styles.sizePillToggle} ${active ? styles.sizePillAvailable : ''}`}
                                style={!active ? { background: '#FFFFFF', color: '#575049', borderColor: '#D4CCC0', padding: '4px 9px', fontSize: '0.73rem' } : { padding: '4px 9px', fontSize: '0.73rem' }}
                              >
                                {active ? <Check size={11} /> : null}
                                <span>{sz}</span>
                              </button>
                            );
                          })}
                          {garmentSizes
                            .filter(s => !STANDARD_SIZES.includes(s))
                            .map(sz => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => handleToggleGarmentSize(sz)}
                                className={`${styles.sizePillToggle} ${styles.sizePillAvailable}`}
                                style={{ padding: '4px 9px', fontSize: '0.73rem' }}
                              >
                                <Check size={11} />
                                <span>{sz}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* 2. Colores y Tallas Disponibles / Agotadas en 1 clic */}
                      <div className={styles.colorMatrixCard} style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <h4 style={{ margin: 0, color: '#181514', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Palette size={14} color="#8C6A2E" />
                              <span>Colores y Disponibilidad por Talla</span>
                            </h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.71rem', color: '#575049' }}>
                              Clic en una talla para alternar <strong style={{ color: '#065F46' }}>Disponible</strong> / <strong style={{ color: '#BE123C' }}>Agotada</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddColorVariant()}
                            className={styles.btnAdd}
                            style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                          >
                            <Plus size={13} />
                            <span>Color</span>
                          </button>
                        </div>

                        {/* Presets rápidos de color */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                          {CORSET_COLOR_PRESETS.map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleAddColorVariant(preset)}
                              className={styles.presetBtn}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 7px', fontSize: '0.68rem' }}
                            >
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: preset.hex,
                                  border: '1px solid #C5BEB3'
                                }}
                              />
                              <span>{preset.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Lista compacta de colores */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '2px' }}>
                          {garmentColors.map((colorObj, cIdx) => (
                            <div key={cIdx} className={styles.colorMatrixRow} style={{ padding: '10px', marginBottom: 0 }}>
                              <div className={styles.colorHeaderBar} style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <input
                                    type="color"
                                    value={colorObj.hex || '#111111'}
                                    onChange={e => handleUpdateColorField(cIdx, 'hex', e.target.value)}
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      background: 'transparent'
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={colorObj.name}
                                    onChange={e => handleUpdateColorField(cIdx, 'name', e.target.value)}
                                    className={styles.inlineInput}
                                    style={{ width: '135px', fontWeight: 600, padding: '4px 8px', fontSize: '0.76rem' }}
                                  />
                                  {colorObj.image && (
                                    <img
                                      src={colorObj.image}
                                      alt={colorObj.name}
                                      style={{ width: '26px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #E5E0D8' }}
                                    />
                                  )}
                                  <label className={styles.btnSecondary} style={{ fontSize: '0.68rem', padding: '3px 8px', cursor: 'pointer' }}>
                                    <UploadCloud size={11} />
                                    <span>Foto</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={e => handleColorImageUpload(cIdx, e)}
                                      style={{ display: 'none' }}
                                    />
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveColorVariant(cIdx)}
                                  className={styles.btnActionIconDanger}
                                  style={{ width: '24px', height: '24px' }}
                                  title="Eliminar color"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {garmentSizes.map(sz => {
                                  const isAvail = (colorObj.availableSizes || []).includes(sz);
                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => handleToggleSizeAvailabilityForColor(cIdx, sz)}
                                      className={`${styles.sizePillToggle} ${
                                        isAvail ? styles.sizePillAvailable : styles.sizePillOutOfStock
                                      }`}
                                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                                    >
                                      <span>{sz}</span>
                                      <span style={{ fontSize: '0.62rem', opacity: 0.9 }}>
                                        {isAvail ? '✓ Disp' : '✕ Agot'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GALLERY */}
              {activeTabModal === 'gallery' && (
                <div className={styles.tabContent}>
                  <div className={styles.webpNoticeBanner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Zap size={18} color="#059669" />
                      <div>
                        <strong>Optimización Automática Activa:</strong> Cualquier foto que subas se optimiza automáticamente para máxima velocidad y nitidez en la tienda.
                      </div>
                    </div>
                    {lastWebpStats && (
                      <span className={styles.webpBadgePill}>
                        Última foto: {formatBytes(lastWebpStats.originalSize)} → {formatBytes(lastWebpStats.webpSize)} (-{lastWebpStats.savingsPercent}%)
                      </span>
                    )}
                  </div>

                  <div className={styles.galleryUploadArea}>
                    <div className={styles.galleryUploadHeader}>
                      <div>
                        <h4>Galería de Fotos del Corset</h4>
                        <p>La imagen marcada como &quot;Principal&quot; será la portada del producto y contará con Lupa HD 2.5x en la tienda.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.btnAdd}
                        disabled={uploading}
                      >
                        <UploadCloud size={16} />
                        <span>{uploading ? 'Optimizando fotos...' : 'Subir Foto(s)'}</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*,video/*"
                        onChange={handleMultipleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {uploading && (
                      <div className={styles.progressBarWrapper}>
                        <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}

                    <div className={styles.galleryGrid}>
                      {(formData.images || []).length === 0 ? (
                        <div className={styles.emptyGallery}>
                          <ImageIcon size={36} />
                          <p>Aún no has subido fotos para este corset.</p>
                        </div>
                      ) : (
                        formData.images.map((url, idx) => {
                          const isPrimary = formData.image_url === url || (!formData.image_url && idx === 0);
                          const isVideo = isVideoUrl(url);
                          return (
                            <div key={idx} className={`${styles.galleryItem} ${isPrimary ? styles.galleryItemPrimary : ''}`}>
                              {isVideo ? (
                                <video src={url} autoPlay muted loop playsInline className={styles.galleryImg} />
                              ) : (
                                <img src={url} alt="gallery" className={styles.galleryImg} />
                              )}
                              {isPrimary && <span className={styles.primaryBadge}>Portada</span>}
                              <div className={styles.galleryActions}>
                                {!isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => setAsPrimaryImage(url)}
                                    className={styles.btnSetPrimary}
                                  >
                                    Hacer Portada
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(url)}
                                  className={styles.btnRemoveImg}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRICING & INVENTORY */}
              {activeTabModal === 'pricing' && (
                <div className={styles.tabContent}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Precio de Venta (CLP) *</label>
                      <input
                        type="number"
                        required
                        placeholder="44990"
                        value={formData.price}
                        onChange={e => handlePriceChange(e.target.value, formData.old_price)}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Precio Anterior / Tachado (Opcional)</label>
                      <input
                        type="number"
                        placeholder="54990"
                        value={formData.old_price}
                        onChange={e => handlePriceChange(formData.price, e.target.value)}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Descuento Calculado</label>
                      <div className={styles.discountBadgeDisplay}>
                        {formData.discount > 0 ? `${formData.discount}% OFF` : 'Precio Normal'}
                      </div>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Stock Total en Inventario *</label>
                      <input
                        type="number"
                        required
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SPECIFICATIONS / FICHA TÉCNICA */}
              {activeTabModal === 'specs' && (
                <div className={styles.tabContent}>
                  <div className={styles.specsHeader}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#181514' }}>
                        Ficha Técnica de Corsetería
                      </h4>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#575049' }}>
                        Se muestra en la ventana de detalle del producto junto a la tabla de medidas y políticas.
                      </p>
                    </div>
                    <button type="button" onClick={addSpecRow} className={styles.btnAddRowSmall}>
                      <Plus size={14} /> Añadir Detalle
                    </button>
                  </div>

                  <div className={styles.specsList} style={{ marginTop: '10px' }}>
                    {specList.map((spec, index) => (
                      <div key={index} className={styles.specRowCard}>
                        <span className={styles.specIndexBadge}>#{index + 1}</span>
                        <input
                          type="text"
                          placeholder="Atributo (ej: Estructura, Material, Cierre)"
                          value={spec.key}
                          onChange={(e) => handleSpecChange(index, 'key', e.target.value)}
                          className={styles.input}
                          style={{ flex: 1 }}
                        />
                        <input
                          type="text"
                          placeholder="Valor (ej: Ballenas flexibles, Encaje floral, Lazada trasera)"
                          value={spec.value}
                          onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                          className={styles.input}
                          style={{ flex: 2 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecRow(index)}
                          className={styles.btnActionIconDanger}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setModalOpen(false)} className={styles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnAdd} disabled={uploading}>
                  {editingId ? 'Guardar Cambios y Sincronizar Web' : 'Publicar Corset en la Tienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMO & DISCOUNT BUILDER MODAL */}
      {comboModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setComboModalOpen(false)}>
          <div className={styles.comboModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.comboModalHeader}>
              <div>
                <span className={styles.comboModalSub}>HONE PROMO & DESCUENTOS</span>
                <h2 className={styles.comboModalTitle}>
                  {editingComboId ? 'Editar Promo' : 'Crear Promo o Añadir Descuento'}
                </h2>
              </div>
              <button className={styles.closeModal} onClick={() => setComboModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitCombo}
              className={styles.modalForm}
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <div className={styles.comboModalBody}>
                <div className={styles.comboPickerCol}>
                  <div className={styles.comboColTitle}>
                    <ShoppingBag size={18} color="#8C6A2E" />
                    <span>
                      1. Selecciona la(s) prenda(s) ({selectedComboItems.length} seleccionada{selectedComboItems.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div className={styles.comboPickerSearchWrap}>
                    <input
                      type="text"
                      placeholder="Buscar corset por nombre o SKU..."
                      value={comboSearch}
                      onChange={(e) => setComboSearch(e.target.value)}
                      className={styles.comboPickerSearch}
                    />
                  </div>
                  <div className={styles.comboPickerList}>
                    {products
                      .filter(p => (p.name || '').toLowerCase().includes(comboSearch.toLowerCase()))
                      .map(p => {
                        const isSelected = selectedComboItems.some(item => item.productId === p.id);
                        const img = p.image_url || p.images?.[0];
                        const hasDiscount = (p.old_price || p.oldPrice || 0) > (p.price || 0);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleToggleProductInCombo(p)}
                            className={`${styles.comboProductItem} ${isSelected ? styles.comboProductItemSelected : ''}`}
                          >
                            <div className={styles.comboProductInfo}>
                              {img && <img src={img} alt={p.name} className={styles.comboProductThumb} />}
                              <div className={styles.comboProductText}>
                                <span className={styles.comboProductName}>{p.name}</span>
                                <div className={styles.comboProductMeta}>
                                  <span>SKU: {p.sku}</span>
                                  {hasDiscount && (
                                    <span style={{ color: '#059669', fontWeight: 700, marginLeft: '6px' }}>
                                      (-{p.discount || Math.round((((p.old_price || p.oldPrice) - p.price) / (p.old_price || p.oldPrice)) * 100)}%)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={styles.comboProductPrice}>{formatCLP(p.price)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className={styles.comboConfigCol}>
                  <div className={styles.comboColTitle}>
                    <Percent size={18} color="#059669" />
                    <span>2. Configura el Descuento o Precio Promo</span>
                  </div>

                  {/* Selector de Modo: Crear Promo/Combo vs Aplicar Descuento Directo */}
                  {!editingComboId && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '5px',
                        background: '#F5F2EC',
                        borderRadius: '10px',
                        border: '1px solid #E5DFD3',
                        marginBottom: '12px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPromoOperationMode('bundle')}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: promoOperationMode === 'bundle' ? '1px solid #181514' : '1px solid transparent',
                          background: promoOperationMode === 'bundle' ? '#181514' : 'transparent',
                          color: promoOperationMode === 'bundle' ? '#FFFFFF' : '#575049'
                        }}
                      >
                        🎁 Crear Promo / Combo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoOperationMode('direct_discount');
                          setComboPricingMode('percent');
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: promoOperationMode === 'direct_discount' ? '1px solid #059669' : '1px solid transparent',
                          background: promoOperationMode === 'direct_discount' ? '#059669' : 'transparent',
                          color: promoOperationMode === 'direct_discount' ? '#FFFFFF' : '#575049'
                        }}
                      >
                        🏷️ Añadir % Descuento Directo
                      </button>
                    </div>
                  )}

                  <div className={styles.comboSummaryBox}>
                    <div className={styles.comboMetricItem}>
                      <span className={styles.comboMetricLabel}>Valor Normal</span>
                      <span className={styles.comboMetricVal}>{formatCLP(comboTotalOrig)}</span>
                    </div>
                    <div className={styles.comboMetricItem}>
                      <span className={styles.comboMetricLabel}>Precio Promo</span>
                      <span className={styles.comboMetricVal} style={{ color: '#065F46' }}>
                        {formatCLP(finalComboPrice)}
                      </span>
                    </div>
                    <div className={styles.comboMetricItem}>
                      <span className={styles.comboMetricLabel}>Ahorro Clienta</span>
                      <span className={styles.comboMetricVal} style={{ color: '#8C6A2E' }}>
                        {formatCLP(comboSavings)} ({finalComboDiscount}% OFF)
                      </span>
                    </div>
                  </div>

                  {/* Controles de Descuento (% o Precio Fijo) */}
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #E5DFD3',
                      background: '#FAF9F6',
                      marginBottom: '12px'
                    }}
                  >
                    {promoOperationMode === 'bundle' && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setComboPricingMode('percent')}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '7px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: comboPricingMode === 'percent' ? '1px solid #059669' : '1px solid #D4CCC0',
                            background: comboPricingMode === 'percent' ? '#ECFDF5' : '#FFFFFF',
                            color: comboPricingMode === 'percent' ? '#065F46' : '#575049'
                          }}
                        >
                          Por % de Descuento
                        </button>
                        <button
                          type="button"
                          onClick={() => setComboPricingMode('fixed')}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '7px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: comboPricingMode === 'fixed' ? '1px solid #8C6A2E' : '1px solid #D4CCC0',
                            background: comboPricingMode === 'fixed' ? '#FBF7EE' : '#FFFFFF',
                            color: comboPricingMode === 'fixed' ? '#8C6A2E' : '#575049'
                          }}
                        >
                          Precio Fijo Manual
                        </button>
                      </div>
                    )}

                    {(comboPricingMode === 'percent' || promoOperationMode === 'direct_discount') ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#181514', marginBottom: '6px' }}>
                          Porcentaje de Descuento (%)
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {[10, 15, 20, 25, 30, 40, 50].map(pct => {
                            const activePct = Number(comboDiscountPercent) === pct;
                            return (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setComboDiscountPercent(pct)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.73rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: activePct ? '1px solid #059669' : '1px solid #D4CCC0',
                                  background: activePct ? '#059669' : '#FFFFFF',
                                  color: activePct ? '#FFFFFF' : '#181514'
                                }}
                              >
                                -{pct}%
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={comboDiscountPercent}
                            onChange={e => setComboDiscountPercent(e.target.value)}
                            className={styles.input}
                            style={{ maxWidth: '120px' }}
                          />
                          <span style={{ fontSize: '0.76rem', color: '#575049', fontWeight: 600 }}>
                            % de descuento aplicado automáticamente
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                        <label>Precio Final de la Promo (CLP)</label>
                        <input
                          type="number"
                          value={comboPrice}
                          onChange={e => setComboPrice(e.target.value)}
                          placeholder={String(Math.round(comboTotalOrig * 0.8))}
                          className={styles.input}
                        />
                      </div>
                    )}
                  </div>

                  {promoOperationMode === 'bundle' ? (
                    <>
                      <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <label>Nombre de la Promo *</label>
                          <button type="button" onClick={handleGenerateComboName} className={styles.btnGenSkuAction}>
                            Sugerir Nombre
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Promo 2 Corsets Brocado & Encaje"
                          value={comboFormData.name}
                          onChange={e => setComboFormData({ ...comboFormData, name: e.target.value })}
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Etiqueta / Sello</label>
                          <input
                            type="text"
                            value={comboFormData.badge}
                            onChange={e => setComboFormData({ ...comboFormData, badge: e.target.value })}
                            placeholder="PROMO"
                            className={styles.input}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Stock de la Promo</label>
                          <input
                            type="number"
                            value={comboStock}
                            onChange={e => setComboStock(e.target.value)}
                            className={styles.input}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        fontSize: '0.76rem',
                        color: '#065F46',
                        lineHeight: 1.45
                      }}
                    >
                      Al aplicar el descuento directo se rebajará el precio de cada prenda seleccionada en la tienda y se notificará automáticamente a las clientas suscritas sobre la baja de precio.
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setComboModalOpen(false)} className={styles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnComboAdd}>
                  <Gift size={16} />
                  <span>
                    {promoOperationMode === 'direct_discount' && !editingComboId
                      ? `Aplicar -${parseInt(comboDiscountPercent) || 0}% a Prenda(s)`
                      : editingComboId
                      ? 'Guardar Cambios de Promo'
                      : 'Publicar Promo en Catálogo'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
