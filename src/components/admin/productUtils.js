/**
 * HONE CATALOG PRO V3.0 — Utilidades de Producto, Variantes, Matriz de Tallas/Colores y Combos
 * Totalmente compatible con tiendas de ropa/corsetería y tiendas generales
 */

export const formatCLP = (val) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(val || 0);
};

export const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.startsWith('data:video/');
};

/**
 * Extrae las especificaciones técnicas, variantes, matriz de ropa (tallas/colores) y combos
 */
export const parseProductSpecifications = (specifications) => {
  let attributes = [];
  let variantConfig = {
    enabled: false,
    name: 'Talla',
    variants: []
  };
  let bundleConfig = {
    enabled: false,
    items: []
  };
  let apparelConfig = {
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Negro',
        hex: '#111111',
        availableSizes: ['XS', 'S', 'M', 'L'],
        outOfStockSizes: ['XL'],
        image: ''
      }
    ]
  };

  if (!specifications) {
    return { attributes, variantConfig, bundleConfig, apparelConfig };
  }

  try {
    const parsed = typeof specifications === 'string'
      ? JSON.parse(specifications)
      : specifications;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.__hone_variants && typeof parsed.__hone_variants === 'object') {
        variantConfig = {
          enabled: !!parsed.__hone_variants.enabled,
          name: parsed.__hone_variants.name || 'Talla',
          variants: Array.isArray(parsed.__hone_variants.variants)
            ? parsed.__hone_variants.variants
            : []
        };
      }

      if (parsed.__hone_bundle && typeof parsed.__hone_bundle === 'object') {
        bundleConfig = {
          enabled: !!parsed.__hone_bundle.enabled,
          items: Array.isArray(parsed.__hone_bundle.items)
            ? parsed.__hone_bundle.items
            : []
        };
      }

      if (parsed.__hone_apparel && typeof parsed.__hone_apparel === 'object') {
        apparelConfig = {
          sizes: Array.isArray(parsed.__hone_apparel.sizes) && parsed.__hone_apparel.sizes.length > 0
            ? parsed.__hone_apparel.sizes
            : ['XS', 'S', 'M', 'L', 'XL'],
          colors: Array.isArray(parsed.__hone_apparel.colors) && parsed.__hone_apparel.colors.length > 0
            ? parsed.__hone_apparel.colors
            : apparelConfig.colors
        };
      }

      attributes = Object.entries(parsed)
        .filter(([key]) => key !== '__hone_variants' && key !== '__hone_bundle' && key !== '__hone_apparel')
        .map(([key, value]) => ({ key, value: String(value) }));
    }
  } catch {
    if (typeof specifications === 'string' && specifications.trim() !== '') {
      attributes = [{ key: 'Detalles', value: specifications }];
    }
  }

  return { attributes, variantConfig, bundleConfig, apparelConfig };
};

/**
 * Serializa los atributos, variantes, matriz de ropa y combos en JSON
 */
export const serializeProductSpecifications = (
  specList = [],
  variantConfig = null,
  bundleConfig = null,
  apparelConfig = null
) => {
  const specsObject = {};

  if (Array.isArray(specList)) {
    specList.forEach(item => {
      if (item && item.key && item.key.trim() && item.value && String(item.value).trim()) {
        specsObject[item.key.trim()] = String(item.value).trim();
      }
    });
  }

  if (
    variantConfig &&
    variantConfig.enabled &&
    Array.isArray(variantConfig.variants) &&
    variantConfig.variants.length > 0
  ) {
    specsObject.__hone_variants = {
      enabled: true,
      name: (variantConfig.name || 'Talla').trim(),
      variants: variantConfig.variants
        .filter(v => v && v.name && String(v.name).trim() !== '')
        .map((v, idx) => ({
          id: v.id || `var-${idx}-${Date.now()}`,
          name: String(v.name).trim(),
          sku: v.sku ? String(v.sku).trim() : '',
          stock: parseInt(v.stock) >= 0 ? parseInt(v.stock) : 0,
          price: v.price && parseFloat(v.price) > 0 ? parseFloat(v.price) : null
        }))
    };
  }

  if (
    bundleConfig &&
    bundleConfig.enabled &&
    Array.isArray(bundleConfig.items) &&
    bundleConfig.items.length > 0
  ) {
    specsObject.__hone_bundle = {
      enabled: true,
      items: bundleConfig.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: parseFloat(item.price) || 0,
        originalPrice: parseFloat(item.originalPrice || item.price) || 0,
        sku: item.sku || '',
        image_url: item.image_url || '',
        quantity: parseInt(item.quantity) > 0 ? parseInt(item.quantity) : 1
      }))
    };
  }

  if (apparelConfig && typeof apparelConfig === 'object') {
    specsObject.__hone_apparel = {
      sizes: Array.isArray(apparelConfig.sizes) ? apparelConfig.sizes : ['XS', 'S', 'M', 'L', 'XL'],
      colors: Array.isArray(apparelConfig.colors) ? apparelConfig.colors : []
    };
  }

  return Object.keys(specsObject).length > 0 ? JSON.stringify(specsObject) : null;
};

export const calculateTotalVariantStock = (variants = []) => {
  if (!Array.isArray(variants) || variants.length === 0) return 0;
  return variants.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0);
};

export const calculateBundleTotals = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { totalOriginalPrice: 0, totalItemsCount: 0 };
  }

  return items.reduce(
    (acc, item) => {
      const qty = parseInt(item.quantity) > 0 ? parseInt(item.quantity) : 1;
      const itemPrice = parseFloat(item.price) || 0;
      return {
        totalOriginalPrice: acc.totalOriginalPrice + itemPrice * qty,
        totalItemsCount: acc.totalItemsCount + qty
      };
    },
    { totalOriginalPrice: 0, totalItemsCount: 0 }
  );
};

export const isProductBundle = (product) => {
  if (!product) return false;
  if (product.category === 'Promociones & Combos' || product.badge === 'COMBO PACK') return true;
  const { bundleConfig } = parseProductSpecifications(product.specifications);
  return bundleConfig.enabled && bundleConfig.items.length > 0;
};

export const calculateDiscountSavings = (oldPrice, price) => {
  const op = parseFloat(oldPrice) || 0;
  const p = parseFloat(price) || 0;
  if (op <= p || p <= 0) {
    return { savingsAmount: 0, discountPercentage: 0 };
  }
  const savingsAmount = op - p;
  const discountPercentage = Math.round((savingsAmount / op) * 100);
  return { savingsAmount, discountPercentage };
};
