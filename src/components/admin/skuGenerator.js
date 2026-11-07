/**
 * HONE CATALOG PRO V3.0 — Generador Inteligente de Códigos SKU Únicos
 * Adaptado para Corsetería & Alta Costura JAZYALON y tiendas universales
 */

export const generateUniqueSKU = (category = 'COR', prefix = 'JAZ') => {
  const cleanCat = (category || 'COR')
    .replace(/^corsets[-_\s]*/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const catCode = (cleanCat.substring(0, 3) || 'COR').padEnd(3, 'X');

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const randomLetter = chars.charAt(Math.floor(Math.random() * chars.length));

  return `${prefix}-${catCode}-${randomDigits}${randomLetter}`;
};

export const generateVariantSKU = (parentSku, variantName, index = 0) => {
  const base = parentSku || generateUniqueSKU('COR');
  const cleanVar = (variantName || `V${index + 1}`)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 6);
  return `${base}-${cleanVar || index + 1}`;
};
