/**
 * HONE CATALOG PRO V3.0 — Utilidades de Exportación e Importación (CSV / JSON)
 */

import { generateUniqueSKU } from './skuGenerator';

export const exportProductsToJSON = (products = [], filePrefix = 'JAZYALON_HONE_CATALOG') => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${filePrefix}_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const parseImportedCatalogText = (text, fileName = '') => {
  let parsed = [];
  if (fileName.endsWith('.json')) {
    parsed = JSON.parse(text);
  } else if (fileName.endsWith('.csv')) {
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

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  return parsed.map(item => ({
    name: item.name || item.titulo || item.nombre || 'Corset Importado',
    sku: item.sku || generateUniqueSKU(item.category || item.categoria),
    price: parseFloat(item.price || item.precio) || 44990,
    oldPrice: item.oldPrice || item.old_price ? parseFloat(item.oldPrice || item.old_price) : null,
    stock: parseInt(item.stock) || 10,
    category: item.category || item.categoria || 'corsets-brocado',
    collection: item.collection || item.coleccion || 'brocado-imperial',
    description: item.description || item.descripcion || '',
    image_url: item.image_url || item.imagen || (Array.isArray(item.images) ? item.images[0] : null),
    images: Array.isArray(item.images) ? item.images : (item.image_url ? [item.image_url] : []),
    sizes: Array.isArray(item.sizes) ? item.sizes : ['XS', 'S', 'M', 'L', 'XL'],
    colors: Array.isArray(item.colors) ? item.colors : [
      { name: 'Negro', hex: '#111111', availableSizes: ['XS', 'S', 'M', 'L'], outOfStockSizes: ['XL'] }
    ],
    isNew: item.isNew !== undefined ? !!item.isNew : true,
    isFeatured: item.isFeatured !== undefined ? !!item.isFeatured : true,
    is_active: true
  }));
};
