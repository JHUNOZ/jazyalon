/**
 * Chilean Peso (CLP) Formatter & Utility Functions
 */

export const formatCLP = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount).replace('CLP', '$').trim();
};

export const calculateDiscount = (oldPrice, currentPrice) => {
  if (!oldPrice || oldPrice <= currentPrice) return 0;
  return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
};

export const calculateSavings = (oldPrice, currentPrice) => {
  if (!oldPrice || oldPrice <= currentPrice) return 0;
  return oldPrice - currentPrice;
};

export const formatRUT = (rut) => {
  const clean = rut.replace(/[^0-9kK]/g, '');
  if (clean.length <= 1) return clean;
  let result = clean.slice(-1);
  let rest = clean.slice(0, -1);
  result = '-' + result;
  while (rest.length > 3) {
    result = '.' + rest.slice(-3) + result;
    rest = rest.slice(0, -3);
  }
  return rest + result;
};
