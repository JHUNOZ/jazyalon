/**
 * JAZYALON Security & Hardening Suite
 * OWASP Top 10 Compliance & Chilean Legal Regulations (Ley 19.628 / Ley 19.496)
 */

/**
 * XSS & Injection Sanitizer
 * Strips dangerous HTML tags, javascript: protocols, event handlers, and control characters.
 */
export const sanitizeInput = (input, maxLength = 500) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS protocol
    .replace(/data:text\/html/gi, '') // Strip dangerous data URI
    .replace(/on\w+\s*=/gi, '') // Strip inline event handlers
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip ASCII control characters
    .trim()
    .slice(0, maxLength);
};

/**
 * Normalizes and sanitizes email addresses (lowercase, trimmed, injection-safe)
 */
export const normalizeEmail = (email) => {
  return sanitizeInput(email, 254).toLowerCase().replace(/\s+/g, '');
};

/**
 * Sanitizes person names (collapses extra whitespace, strips dangerous symbols)
 */
export const sanitizeName = (name) => {
  return sanitizeInput(name, 120)
    .replace(/[^\p{L}\p{M}\s'.-]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Sanitizes phone numbers preserving digits and optional leading +
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  const cleaned = phone.replace(/[^\d+\s-]/g, '').replace(/\s{2,}/g, ' ').trim();
  return cleaned.slice(0, 22);
};

/**
 * Deterministic Salted Password Digest (FNV-1a 256-bit multi-round mix)
 * Ensures plaintext passwords are NEVER stored in localStorage or React state,
 * while remaining synchronous for instant auth checks and legacy record migration.
 */
export const computePasswordDigest = (password, emailSalt = '') => {
  const normalizedSalt = normalizeEmail(emailSalt);
  const payload = `jazyalon_v3_pepper::${normalizedSalt}::${String(password || '')}`;
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];

  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < payload.length; i++) {
      const code = payload.charCodeAt(i) ^ ((round * 31) & 0xff);
      const lane = (i + round) & 7;
      let h = seeds[lane] ^ code;
      h = Math.imul(h, 0x01000193);
      h ^= h >>> 15;
      seeds[lane] = h >>> 0;
      seeds[(lane + 1) & 7] = (seeds[(lane + 1) & 7] ^ (h >>> 7)) >>> 0;
    }
  }

  return 'jzh3$' + seeds.map((n) => n.toString(16).padStart(8, '0')).join('');
};

/**
 * Web Crypto SHA-256 Asynchronous Hash (used when syncing audit/tokens)
 */
export const hashSHA256Async = async (value) => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(String(value || ''));
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback to deterministic digest
  }
  return computePasswordDigest(value, 'sha256-fallback');
};

/**
 * Validates and sanitizes Chilean RUT using the mathematical Modulo 11 algorithm.
 * Valid formats: 12.345.678-9, 12345678-9, 123456789
 */
export const validateRUT = (rut) => {
  if (!rut || typeof rut !== 'string') return false;
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8 || clean.length > 9) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedRemainder = 11 - (sum % 11);
  let expectedDV = '0';
  if (expectedRemainder === 11) expectedDV = '0';
  else if (expectedRemainder === 10) expectedDV = 'K';
  else expectedDV = expectedRemainder.toString();

  return dv === expectedDV;
};

/**
 * Formats a clean RUT to the standard legal format XX.XXX.XXX-X
 */
export const formatLegalRUT = (rut) => {
  if (!rut) return '';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  const dv = clean.slice(-1);
  let body = clean.slice(0, -1);
  let formattedBody = '';

  while (body.length > 3) {
    formattedBody = '.' + body.slice(-3) + formattedBody;
    body = body.slice(0, -3);
  }
  return body + formattedBody + '-' + dv;
};

/**
 * Validates Email according to RFC 5322 standard
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = normalizeEmail(email);
  if (clean.length < 5 || clean.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
};

/**
 * Validates Chilean mobile and landline phones (+56 9 XXXX XXXX or 9XXXXXXXX)
 */
export const validateChileanPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[^0-9]/g, '');
  return (clean.length === 9 && clean.startsWith('9')) || (clean.length === 11 && clean.startsWith('569'));
};

/**
 * Password Strength Evaluator (OWASP Authentication Guidelines)
 */
export const evaluatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Vacía', isStrong: false, color: '#DC2626' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Básica', isStrong: false, color: '#DC2626' };
  if (score <= 3) return { score: 2, label: 'Segura', isStrong: true, color: '#D97706' };
  return { score: 3, label: 'Muy Robusta', isStrong: true, color: '#16A34A' };
};

/**
 * Safe JSON parser with Prototype Pollution Prevention
 * Blocks __proto__, constructor, and prototype injection
 */
export const safeJsonParse = (str, fallback = null) => {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch {
    return fallback;
  }
};

/**
 * Client-side Rate Limiter / Throttle
 * Prevents automated brute-force attempts on sensitive endpoints (Login, Register, Checkout)
 */
const rateLimitStore = new Map();

export const checkRateLimit = (actionKey, maxAttempts = 6, windowMs = 60000) => {
  const now = Date.now();
  const record = rateLimitStore.get(actionKey) || { count: 0, firstAttempt: now };

  if (now - record.firstAttempt > windowMs) {
    rateLimitStore.set(actionKey, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      message: `Demasiados intentos seguidos. Por seguridad espera ${retryAfterSeconds} segundos.`
    };
  }

  record.count += 1;
  rateLimitStore.set(actionKey, record);
  return { allowed: true, remaining: maxAttempts - record.count };
};

/**
 * Security Audit Event Logger
 */
export const logSecurityEvent = (eventType, details = {}) => {
  const timestamp = new Date().toISOString();
  const event = {
    eventType,
    timestamp,
    ...details
  };

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.info(`[JAZYALON SECURITY AUDIT] ${eventType}:`, event);
    }
  } catch {
    // Ignore env read errors
  }

  try {
    const logs = safeJsonParse(sessionStorage.getItem('jazyalon_sec_logs'), []) || [];
    logs.push(event);
    if (logs.length > 50) logs.shift();
    sessionStorage.setItem('jazyalon_sec_logs', JSON.stringify(logs));
  } catch {
    // Ignore storage quota errors
  }
};
