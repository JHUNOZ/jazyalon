import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  PRODUCTS,
  BRAND_INFO,
  CHILE_REGIONS,
  SHIPPING_TABLE_DATA,
  CATEGORIES,
  COLLECTIONS,
  HERO_SLIDES,
  BRAND_POLICIES,
  SIZE_CHART,
  ORDER_STAGES
} from '../data/mockData';
import {
  safeJsonParse,
  sanitizeInput,
  sanitizeName,
  normalizeEmail,
  sanitizePhone,
  validateEmail,
  validateRUT,
  formatLegalRUT,
  computePasswordDigest,
  logSecurityEvent
} from '../utils/security';
import {
  supabase,
  isSupabaseConfigured,
  signInWithCloud,
  fetchCurrentCloudSessionUser,
  signOutFromCloud,
  registerUserInCloud,
  createSecondaryAdminAccountInCloud,
  syncProfileUpdateToDb,
  mapDbRowToProduct,
  mapDbOrderToStoreOrder,
  syncCategoryToDb,
  removeCategoryFromDb,
  syncCollectionToDb,
  removeCollectionFromDb,
  syncProductToDb,
  syncMultipleProductsToDb,
  removeProductFromDb,
  syncSiteSettingsToDb,
  syncAdminEmailToDb,
  removeAdminEmailFromDb,
  syncHeroSlidesToDb,
  syncCouponToDb,
  removeCouponFromDb,
  syncSubscriberToDb,
  removeSubscriberFromDb,
  syncNotificationToDb,
  createOrderInDb,
  updateOrderInDb,
  trackOrderInCloud
} from '../lib/supabase';

const ShopContext = createContext();

export const PRIMARY_ADMIN_EMAIL = 'jazz@jazyalon.cl';

const STORAGE_KEYS = {
  PRODUCTS: 'jazyalon_v2_products',
  CATEGORIES: 'jazyalon_v2_categories',
  COLLECTIONS: 'jazyalon_v2_collections',
  HERO_SLIDES: 'jazyalon_v2_hero_slides',
  USERS: 'jazyalon_v2_users',
  CURRENT_USER: 'jazyalon_v2_current_user',
  ADMIN_EMAILS: 'jazyalon_v2_admin_emails',
  SITE_SETTINGS: 'jazyalon_v2_site_settings',
  COUPONS: 'jazyalon_v2_coupons',
  SUBSCRIBERS: 'jazyalon_v2_subscribers',
  LAST_SUBSCRIBED_EMAIL: 'jazyalon_last_subscribed_email',
  SUB_NOTIFICATIONS: 'jazyalon_v2_sub_notifications',
  READ_NOTIFS: 'jazyalon_v2_read_notifs',
  ORDERS: 'jazyalon_v2_orders',
  CART: 'jazyalon_cart',
  WISHLIST: 'jazyalon_wishlist'
};

const DEFAULT_ADMIN_EMAILS = [
  {
    email: PRIMARY_ADMIN_EMAIL,
    name: 'Jazz',
    addedBy: 'Sistema',
    addedAt: '2026-10-01T10:00:00Z',
    isPrimary: true
  }
];

const getDefaultFutureDropDate = () => {
  const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  d.setHours(20, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DEFAULT_ANNOUNCEMENT_MESSAGES = [
  '🇨🇱 Corsetería Victoriana & Alta Costura en Chile',
  `🌹 10% OFF en tu primera compra con el cupón: ${BRAND_INFO.defaultCoupon || 'antonella10'}`,
  `✨ Envíos gratis a todo Chile por compras sobre $${Number(BRAND_INFO.freeShippingThreshold || 85000).toLocaleString('es-CL')}`,
  '📦 Despachos rápidos vía Starken, Chilexpress y Blue Express',
  '💳 Hasta 6 cuotas sin interés con Webpay Plus y Transferencia'
];

const DEFAULT_BENEFITS_CONFIG = {
  badgeText: '10% DE DESCUENTO EN TU PRIMERA COMPRA',
  title: 'Únete a Nuestra Comunidad',
  subtitle: 'Suscríbete para recibir novedades de nuevos ingresos y activa tu descuento con el código',
  featuredCouponCode: 'antonella10',
  footerNote: 'Cero spam. Solo invitaciones a nuevos lanzamientos.',
  notifyOnPriceDrop: true,
  notifyOnNewCollection: true,
  notifyOnLowStock: true,
  lowStockThreshold: 3
};

const DEFAULT_SITE_SETTINGS = {
  maintenance: {
    enabled: false,
    mode: 'standard', // 'standard' | 'drop'
    message: 'Estamos en mantenimiento. Volvemos pronto.',
    dropName: 'Drop 02 — Edición Limitada',
    dropDate: getDefaultFutureDropDate()
  },
  announcementMessages: DEFAULT_ANNOUNCEMENT_MESSAGES,
  benefitsConfig: DEFAULT_BENEFITS_CONFIG
};

const DEFAULT_COUPONS = [
  {
    code: 'antonella10',
    discountPercent: 10,
    description: '10% de descuento en tu primera compra al suscribirte',
    requireSubscription: true,
    firstPurchaseOnly: true,
    minPurchase: 0,
    maxUses: 0,
    usedCount: 0,
    expiresAt: '',
    isActive: true
  }
];

const DEFAULT_USERS = [
  {
    id: 'usr-admin-01',
    name: 'Jazz',
    email: PRIMARY_ADMIN_EMAIL,
    passwordDigest: computePasswordDigest('Jazyalon2026!Admin', PRIMARY_ADMIN_EMAIL),
    role: 'admin',
    phone: '+56 9 4018 7563',
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'usr-cust-01',
    name: 'Valentina R.',
    email: 'valentina@correo.cl',
    passwordDigest: computePasswordDigest('cliente1234', 'valentina@correo.cl'),
    role: 'customer',
    phone: '+56 9 8765 4321',
    rut: '19.482.391-5',
    address: 'Av. Apoquindo 4500, Depto 1204',
    comuna: 'Las Condes',
    createdAt: '2026-10-12T14:30:00Z'
  }
];

const INITIAL_ORDERS = [
  {
    id: 'ord-001',
    orderNumber: 'JAZY-CL-849201',
    customerName: 'Valentina R.',
    customerEmail: 'valentina@correo.cl',
    customerPhone: '+56 9 8765 4321',
    customerRut: '19.482.391-5',
    address: 'Av. Apoquindo 4500, Depto 1204',
    comuna: 'Las Condes',
    regionName: 'Región Metropolitana de Santiago',
    carrier: 'starken',
    trackingCode: 'STK-94820194',
    paymentMethod: 'webpay',
    status: 'en_camino',
    autoMode: false,
    total: 44990,
    createdAt: '2026-10-19T15:20:00Z',
    updatedAt: '2026-10-20T11:40:00Z',
    items: [
      {
        id: 'prod-001',
        name: 'Corset Overbust Brocado Victoriano',
        sku: 'JAZ-COR-001',
        selectedColor: 'Burdeos',
        selectedSize: 'S',
        quantity: 1,
        price: 44990,
        image: '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      }
    ],
    history: [
      { status: 'recibido', label: 'Pedido Recibido', timestamp: '19 Oct, 15:20', note: 'Orden confirmada vía Webpay Plus.' },
      { status: 'preparacion', label: 'En Preparación & Control', timestamp: '19 Oct, 17:05', note: 'Revisión de costuras y estructura completada.' },
      { status: 'empacado', label: 'Empaque Discreto Listo', timestamp: '20 Oct, 09:30', note: 'Embalaje sellado listo para despacho.' },
      { status: 'en_camino', label: 'En Camino a tu Dirección', timestamp: '20 Oct, 11:40', note: 'Despachado vía Starken (Código: STK-94820194).' }
    ]
  },
  {
    id: 'ord-002',
    orderNumber: 'JAZY-CL-849315',
    customerName: 'Camila S.',
    customerEmail: 'camila@correo.cl',
    customerPhone: '+56 9 7654 3210',
    customerRut: '20.193.842-K',
    address: 'Av. Libertad 840, Depto 502',
    comuna: 'Viña del Mar',
    regionName: 'Región de Valparaíso',
    carrier: 'chilexpress',
    trackingCode: 'CHX-77381920',
    paymentMethod: 'mercadopago',
    status: 'preparacion',
    autoMode: false,
    total: 49990,
    createdAt: '2026-10-20T13:10:00Z',
    updatedAt: '2026-10-20T14:00:00Z',
    items: [
      {
        id: 'prod-008',
        name: 'Corset Manga Larga de Encaje Floral',
        sku: 'JAZ-COR-008',
        selectedColor: 'Negro',
        selectedSize: 'M',
        quantity: 1,
        price: 49990,
        image: '/catalogo/IMG_8375.jpeg'
      }
    ],
    history: [
      { status: 'recibido', label: 'Pedido Recibido', timestamp: '20 Oct, 13:10', note: 'Pago acreditado correctamente.' },
      { status: 'preparacion', label: 'En Preparación & Control', timestamp: '20 Oct, 14:00', note: 'Prenda en revisión de taller antes de empaque.' }
    ]
  }
];

const safeLoad = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = safeJsonParse(raw, null);
    return parsed !== null ? parsed : fallback;
  } catch {
    return fallback;
  }
};

// Sanitiza, elimina contraseñas en texto plano y deduplica la lista de usuarios por correo
const sanitizeUsersList = (rawUsers, adminEmailList = DEFAULT_ADMIN_EMAILS) => {
  const source = Array.isArray(rawUsers) && rawUsers.length > 0 ? rawUsers : DEFAULT_USERS;
  const adminSet = new Set(
    (adminEmailList || []).map((entry) => normalizeEmail(typeof entry === 'string' ? entry : entry?.email))
  );
  const seenEmails = new Set();
  const cleaned = [];

  source.forEach((u, idx) => {
    if (!u || typeof u !== 'object') return;
    const cleanEmail = normalizeEmail(u.email);
    if (
      !cleanEmail ||
      cleanEmail === 'admin@jazyalon.cl' ||
      !validateEmail(cleanEmail) ||
      seenEmails.has(cleanEmail)
    ) {
      return;
    }
    seenEmails.add(cleanEmail);

    const defaultPw = cleanEmail === PRIMARY_ADMIN_EMAIL ? 'Jazyalon2026!Admin' : 'cliente1234';
    const digest =
      u.passwordDigest ||
      (u.password ? computePasswordDigest(u.password, cleanEmail) : computePasswordDigest(defaultPw, cleanEmail));

    const isAuthorizedAdmin = adminSet.has(cleanEmail) || u.role === 'admin' || cleanEmail === PRIMARY_ADMIN_EMAIL;
    const rawName = sanitizeName(u.name);
    const resolvedName =
      cleanEmail === PRIMARY_ADMIN_EMAIL &&
      (!rawName || rawName.toLowerCase().includes('administrador'))
        ? 'Jazz'
        : rawName || (cleanEmail === PRIMARY_ADMIN_EMAIL ? 'Jazz' : cleanEmail.split('@')[0]);

    cleaned.push({
      id: u.id || `usr-${idx + 1}-${Date.now()}`,
      name: resolvedName,
      email: cleanEmail,
      passwordDigest: digest,
      role: isAuthorizedAdmin ? 'admin' : 'customer',
      phone: sanitizePhone(u.phone || ''),
      rut: u.rut ? formatLegalRUT(u.rut) : '',
      address: sanitizeInput(u.address || '', 220),
      comuna: sanitizeInput(u.comuna || '', 100),
      createdAt: u.createdAt || new Date().toISOString()
    });
  });

  // Garantizar que la administradora principal (Jazz) exista siempre
  if (!seenEmails.has(PRIMARY_ADMIN_EMAIL)) {
    cleaned.unshift(DEFAULT_USERS[0]);
  }

  return cleaned;
};

const stripSensitiveUserFields = (user) => {
  if (!user) return null;
  const { password: _pw, passwordDigest: _pd, ...safeUser } = user;
  return safeUser;
};

const sanitizeAdminEmailsList = (rawList) => {
  const source = Array.isArray(rawList) && rawList.length > 0 ? rawList : DEFAULT_ADMIN_EMAILS;
  const seen = new Set();
  const result = [];

  source.forEach((item) => {
    const rawEmail = typeof item === 'string' ? item : item?.email;
    const cleanEmail = normalizeEmail(rawEmail);
    if (
      !cleanEmail ||
      cleanEmail === 'admin@jazyalon.cl' ||
      !validateEmail(cleanEmail) ||
      seen.has(cleanEmail)
    ) {
      return;
    }
    seen.add(cleanEmail);
    const rawName = sanitizeName(item?.name || '');
    const resolvedName =
      cleanEmail === PRIMARY_ADMIN_EMAIL &&
      (!rawName || rawName.toLowerCase().includes('administrador'))
        ? 'Jazz'
        : rawName || (cleanEmail === PRIMARY_ADMIN_EMAIL ? 'Jazz' : 'Acceso Admin');

    result.push({
      email: cleanEmail,
      name: resolvedName,
      addedBy: sanitizeInput(item?.addedBy || 'Administración', 120),
      addedAt: item?.addedAt || new Date().toISOString(),
      isPrimary: cleanEmail === PRIMARY_ADMIN_EMAIL || Boolean(item?.isPrimary)
    });
  });

  if (!seen.has(PRIMARY_ADMIN_EMAIL)) {
    result.unshift(DEFAULT_ADMIN_EMAILS[0]);
  }

  return result;
};

const sanitizeSiteSettings = (rawSettings) => {
  const m = rawSettings?.maintenance || {};
  const rawAnnouncements = Array.isArray(rawSettings?.announcementMessages)
    ? rawSettings.announcementMessages
        .map((msg) => sanitizeInput(String(msg || ''), 180))
        .filter(Boolean)
    : [];
  const b = rawSettings?.benefitsConfig || {};

  return {
    maintenance: {
      enabled: Boolean(m.enabled),
      mode: m.mode === 'drop' ? 'drop' : 'standard',
      message:
        sanitizeInput(m.message || '', 260) || 'Estamos en mantenimiento. Volvemos pronto.',
      dropName: sanitizeInput(m.dropName || '', 120) || 'Drop 02 — Edición Limitada',
      dropDate: m.dropDate || getDefaultFutureDropDate()
    },
    announcementMessages:
      rawAnnouncements.length > 0 ? rawAnnouncements : DEFAULT_ANNOUNCEMENT_MESSAGES,
    benefitsConfig: {
      badgeText:
        sanitizeInput(b.badgeText ?? DEFAULT_BENEFITS_CONFIG.badgeText, 120) ||
        DEFAULT_BENEFITS_CONFIG.badgeText,
      title:
        sanitizeInput(b.title ?? DEFAULT_BENEFITS_CONFIG.title, 120) ||
        DEFAULT_BENEFITS_CONFIG.title,
      subtitle:
        sanitizeInput(b.subtitle ?? DEFAULT_BENEFITS_CONFIG.subtitle, 260) ||
        DEFAULT_BENEFITS_CONFIG.subtitle,
      featuredCouponCode:
        sanitizeInput(b.featuredCouponCode ?? DEFAULT_BENEFITS_CONFIG.featuredCouponCode, 40)
          .toLowerCase()
          .trim() || 'antonella10',
      footerNote:
        sanitizeInput(b.footerNote ?? DEFAULT_BENEFITS_CONFIG.footerNote, 160) ||
        DEFAULT_BENEFITS_CONFIG.footerNote,
      notifyOnPriceDrop: b.notifyOnPriceDrop !== false,
      notifyOnNewCollection: b.notifyOnNewCollection !== false,
      notifyOnLowStock: b.notifyOnLowStock !== false,
      lowStockThreshold: Math.max(1, Math.min(50, Number(b.lowStockThreshold ?? 3) || 3))
    }
  };
};

const sanitizeCouponsList = (rawCoupons) => {
  const source = Array.isArray(rawCoupons) && rawCoupons.length > 0 ? rawCoupons : DEFAULT_COUPONS;
  const seen = new Set();
  const list = [];

  source.forEach((c) => {
    if (!c || typeof c !== 'object') return;
    const code = sanitizeInput(String(c.code || ''), 40)
      .toLowerCase()
      .replace(/\s+/g, '');
    if (!code || seen.has(code)) return;
    seen.add(code);

    list.push({
      code,
      discountPercent: Math.max(1, Math.min(95, Number(c.discountPercent) || 10)),
      description: sanitizeInput(c.description || '', 220),
      requireSubscription: Boolean(c.requireSubscription),
      firstPurchaseOnly: Boolean(c.firstPurchaseOnly),
      minPurchase: Math.max(0, Number(c.minPurchase) || 0),
      maxUses: Math.max(0, Number(c.maxUses) || 0),
      usedCount: Math.max(0, Number(c.usedCount) || 0),
      expiresAt: c.expiresAt || '',
      isActive: c.isActive !== false
    });
  });

  if (!seen.has('antonella10')) {
    list.unshift(DEFAULT_COUPONS[0]);
  }

  return list;
};

const sanitizeSubscribersList = (rawSubscribers) => {
  if (!Array.isArray(rawSubscribers)) return [];
  const seen = new Set();
  const list = [];

  rawSubscribers.forEach((item) => {
    const rawEmail = typeof item === 'string' ? item : item?.email;
    const cleanEmail = normalizeEmail(rawEmail);
    if (!cleanEmail || !validateEmail(cleanEmail) || seen.has(cleanEmail)) return;
    seen.add(cleanEmail);
    list.push({
      email: cleanEmail,
      notifyPriceDrop: item?.notifyPriceDrop !== false,
      notifyNewCollection: item?.notifyNewCollection !== false,
      notifyLowStock: item?.notifyLowStock !== false,
      isActive: item?.isActive !== false,
      subscribedAt: item?.subscribedAt || new Date().toISOString()
    });
  });

  return list;
};

// Normalize product so HONE Catalog and JAZYALON Storefront always share 100% compatible properties
export const normalizeStoreProduct = (p, categoriesList = CATEGORIES) => {
  const images =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : p.image_url
      ? [p.image_url]
      : ['/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'];
  const primaryImg = p.image_url || images[0];

  const sizes =
    Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ['XS', 'S', 'M', 'L', 'XL'];

  const colors =
    Array.isArray(p.colors) && p.colors.length > 0
      ? p.colors.map((c) => ({
          name: c.name || 'Negro',
          hex: c.hex || '#111111',
          availableSizes: Array.isArray(c.availableSizes) ? c.availableSizes : sizes,
          outOfStockSizes: Array.isArray(c.outOfStockSizes) ? c.outOfStockSizes : [],
          image: c.image || primaryImg
        }))
      : [
          {
            name: 'Negro',
            hex: '#111111',
            availableSizes: sizes,
            outOfStockSizes: [],
            image: primaryImg
          }
        ];

  const rawCat = p.category || 'corsets-brocado';
  const matchedCat = categoriesList.find(
    (c) => c.id === rawCat || c.name?.toLowerCase() === rawCat.toLowerCase()
  );
  const categoryId = matchedCat
    ? matchedCat.id
    : rawCat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const categoryName = matchedCat ? matchedCat.name : p.categoryName || rawCat;

  const price = Number(p.price) || 0;
  const oldPrice = p.oldPrice || p.old_price ? Number(p.oldPrice || p.old_price) : null;
  const discount =
    p.discount !== undefined
      ? Number(p.discount)
      : oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

  const isNew =
    p.isNew !== undefined
      ? !!p.isNew
      : p.badge?.toUpperCase().includes('NUEVO') ||
        p.badge?.toUpperCase().includes('DROP') ||
        false;
  const isFeatured =
    p.isFeatured !== undefined
      ? !!p.isFeatured
      : p.is_featured !== undefined
      ? !!p.is_featured
      : isNew;
  const isActive = p.is_active !== undefined ? !!p.is_active : true;

  return {
    ...p,
    id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sku: p.sku || `JAZ-COR-${Math.floor(100 + Math.random() * 900)}`,
    name: sanitizeInput(p.name || 'Corset JAZYALON', 160),
    category: categoryId,
    categoryName,
    collection: p.collection || 'brocado-imperial',
    isCollectionPrimary: !!p.isCollectionPrimary,
    dropOrder: p.dropOrder !== undefined ? Number(p.dropOrder) : 99,
    price,
    oldPrice,
    old_price: oldPrice,
    discount,
    stock: p.stock !== undefined ? Number(p.stock) : 10,
    badge: p.badge !== undefined ? p.badge : isNew ? 'NUEVO DROP' : '',
    isOffer: !!(oldPrice && oldPrice > price),
    isNew,
    isFeatured,
    is_featured: isFeatured,
    is_active: isActive,
    rating: p.rating || 5.0,
    reviewsCount: p.reviewsCount || 12,
    origin: p.origin || 'Importación Directa',
    image_url: primaryImg,
    images: images.includes(primaryImg) ? images : [primaryImg, ...images],
    sizes,
    colors,
    specs: p.specs || {
      estructura: 'Corsetería estructurada con varillas',
      ajuste: 'Lazada trasera regulable'
    }
  };
};

export const ShopProvider = ({ children }) => {
  // Store Catalog Data (Real-time synchronized & Admin-ready)
  const [categories, setCategories] = useState(() => safeLoad(STORAGE_KEYS.CATEGORIES, CATEGORIES));
  const [products, setProducts] = useState(() => {
    const loaded = safeLoad(STORAGE_KEYS.PRODUCTS, PRODUCTS);
    return Array.isArray(loaded)
      ? loaded.map((p) => normalizeStoreProduct(p, CATEGORIES))
      : PRODUCTS;
  });
  const [collections, setCollections] = useState(() =>
    safeLoad(STORAGE_KEYS.COLLECTIONS, COLLECTIONS)
  );
  const [heroSlides, setHeroSlides] = useState(() =>
    safeLoad(STORAGE_KEYS.HERO_SLIDES, HERO_SLIDES)
  );

  // Web Configuration State (Maintenance Mode & Drop Countdown + Authorized Admin Emails)
  const [adminEmails, setAdminEmails] = useState(() =>
    sanitizeAdminEmailsList(safeLoad(STORAGE_KEYS.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS))
  );
  const [siteSettings, setSiteSettings] = useState(() =>
    sanitizeSiteSettings(safeLoad(STORAGE_KEYS.SITE_SETTINGS, DEFAULT_SITE_SETTINGS))
  );
  const [adminPreviewMaintenance, setAdminPreviewMaintenance] = useState(false);

  // Users & Sanitized Auth State (never stores plaintext passwords)
  const [users, setUsers] = useState(() => {
    const initialAdmins = sanitizeAdminEmailsList(
      safeLoad(STORAGE_KEYS.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS)
    );
    return sanitizeUsersList(safeLoad(STORAGE_KEYS.USERS, DEFAULT_USERS), initialAdmins);
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const raw = safeLoad(STORAGE_KEYS.CURRENT_USER, null);
    if (!raw || !raw.email) return null;
    const rawCleanEmail = normalizeEmail(raw.email);
    const cleanEmail =
      rawCleanEmail === 'admin@jazyalon.cl' ? PRIMARY_ADMIN_EMAIL : rawCleanEmail;
    const rawName = sanitizeName(raw.name);
    const resolvedName =
      cleanEmail === PRIMARY_ADMIN_EMAIL &&
      (!rawName || rawName.toLowerCase().includes('administrador'))
        ? 'Jazz'
        : rawName || (cleanEmail === PRIMARY_ADMIN_EMAIL ? 'Jazz' : cleanEmail.split('@')[0]);
    return stripSensitiveUserFields({
      ...raw,
      email: cleanEmail,
      name: resolvedName
    });
  });

  // Coupons, Subscribers & Automatic Notifications State
  const [coupons, setCoupons] = useState(() =>
    sanitizeCouponsList(safeLoad(STORAGE_KEYS.COUPONS, DEFAULT_COUPONS))
  );
  const [subscribers, setSubscribers] = useState(() =>
    sanitizeSubscribersList(safeLoad(STORAGE_KEYS.SUBSCRIBERS, []))
  );
  const [lastSubscribedEmail, setLastSubscribedEmail] = useState(() => {
    try {
      return normalizeEmail(localStorage.getItem(STORAGE_KEYS.LAST_SUBSCRIBED_EMAIL) || '');
    } catch {
      return '';
    }
  });
  const [subscriberNotifications, setSubscriberNotifications] = useState(() => {
    const loaded = safeLoad(STORAGE_KEYS.SUB_NOTIFICATIONS, []);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    const loaded = safeLoad(STORAGE_KEYS.READ_NOTIFS, []);
    return Array.isArray(loaded) ? loaded : [];
  });

  // Orders & Real-Time Tracking State
  const [orders, setOrders] = useState(() =>
    safeLoad(STORAGE_KEYS.ORDERS, isSupabaseConfigured() ? [] : INITIAL_ORDERS)
  );

  // Cart & Wishlist state
  const [cart, setCart] = useState(() => safeJsonParse(localStorage.getItem(STORAGE_KEYS.CART), []));
  const [wishlist, setWishlist] = useState(() =>
    safeJsonParse(localStorage.getItem(STORAGE_KEYS.WISHLIST), [])
  );

  // UI state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [priceRange, setPriceRange] = useState([0, 250000]);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Shipping Region state
  const [selectedRegionId, setSelectedRegionId] = useState('rm');

  // Toast notifications
  const [toast, setToast] = useState(null);

  const broadcastSync = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jazyalon_store_sync'));
    }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Load Cloud Catalog, Settings, Coupons, Notifications & Auth Session on Mount when Supabase is configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;

    (async () => {
      try {
        // 1. Verificar sesión real de Supabase Auth (JWT) para no dejar sesiones locales fantasma
        const cloudSessionUser = await fetchCurrentCloudSessionUser();
        if (active) {
          setCurrentUser(cloudSessionUser ? stripSensitiveUserFields(cloudSessionUser) : null);
        }

        // 2. Cargar configuración pública, categorías, colecciones, productos, carrusel, cupones y avisos en paralelo
        const [
          { data: settingsRow },
          { data: cloudCats },
          { data: cloudCols },
          { data: cloudProds },
          { data: cloudSlides },
          { data: cloudCoupons },
          { data: cloudNotifs }
        ] = await Promise.all([
          supabase.from('site_settings').select('*').eq('id', 'main').maybeSingle(),
          supabase.from('categories').select('*').order('display_order', { ascending: true }),
          supabase.from('collections').select('*').order('display_order', { ascending: true }),
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('hero_slides').select('*').order('display_order', { ascending: true }),
          supabase.from('coupons').select('*').order('created_at', { ascending: true }),
          supabase
            .from('subscriber_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(60)
        ]);

        if (!active) return;

        if (settingsRow) {
          setSiteSettings((prev) =>
            sanitizeSiteSettings({
              maintenance: {
                enabled: settingsRow.maintenance_enabled,
                mode: settingsRow.maintenance_mode,
                message: settingsRow.maintenance_message,
                dropName: settingsRow.drop_name,
                dropDate: settingsRow.drop_target_date
                  ? new Date(settingsRow.drop_target_date).toISOString().slice(0, 16)
                  : getDefaultFutureDropDate()
              },
              announcementMessages:
                settingsRow.announcement_messages || prev.announcementMessages,
              benefitsConfig: settingsRow.benefits_config || prev.benefitsConfig
            })
          );
        }

        let resolvedCategories = CATEGORIES;
        if (Array.isArray(cloudCats) && cloudCats.length > 0) {
          const mappedCats = cloudCats
            .filter((c) => c.id !== 'all')
            .map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description || '',
              display_order: c.display_order || 0,
              count: 0
            }));
          resolvedCategories = [
            { id: 'all', name: 'Todos los Diseños', count: mappedCats.length },
            ...mappedCats
          ];
          setCategories(resolvedCategories);
        }

        if (Array.isArray(cloudCols) && cloudCols.length > 0) {
          setCollections(
            cloudCols.map((col) => ({
              id: col.id,
              name: col.name,
              title: col.name,
              subtitle: col.subtitle || '',
              itemCount: 'Colección Exclusiva',
              image:
                col.image_url ||
                '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
              primaryProductId: col.primary_product_id || null,
              isPrimaryFeatured: Boolean(col.is_primary_featured),
              display_order: col.display_order || 0
            }))
          );
        }

        if (Array.isArray(cloudProds) && cloudProds.length > 0) {
          setProducts(
            cloudProds.map((row) =>
              normalizeStoreProduct(mapDbRowToProduct(row), resolvedCategories)
            )
          );
        }

        if (Array.isArray(cloudSlides) && cloudSlides.length > 0) {
          setHeroSlides(
            cloudSlides.map((s, idx) => ({
              id: s.id ?? idx + 1,
              tag: s.tag || `Drop 0${idx + 1}`,
              title: s.title || '',
              subtitle: s.subtitle || '',
              cta: s.cta || 'Explorar',
              category: s.category || 'all',
              image: s.image || HERO_SLIDES[0].image
            }))
          );
        }

        if (Array.isArray(cloudCoupons) && cloudCoupons.length > 0) {
          setCoupons(
            sanitizeCouponsList(
              cloudCoupons.map((row) => ({
                code: row.code,
                discountPercent: row.discount_percent,
                description: row.description,
                requireSubscription: row.require_subscription,
                firstPurchaseOnly: row.first_purchase_only,
                minPurchase: row.min_purchase,
                maxUses: row.max_uses,
                usedCount: row.used_count,
                expiresAt: row.expires_at ? row.expires_at.slice(0, 10) : '',
                isActive: row.is_active
              }))
            )
          );
        }

        if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
          setSubscriberNotifications(
            cloudNotifs.map((n) => ({
              id: n.id,
              type: n.event_type || 'custom',
              title: n.title,
              message: n.message,
              image: n.image_url || '',
              productId: n.product_id || null,
              collectionId: n.collection_id || null,
              recipientsCount: Number(n.recipients_count) || 0,
              createdAt: n.created_at
            }))
          );
        }
      } catch {
        // Offline / local fallback remains active
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const refreshed = await fetchCurrentCloudSessionUser();
        if (active && refreshed) {
          setCurrentUser(stripSensitiveUserFields(refreshed));
        }
      }
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Persist Catalog, Auth, Settings, Orders, and UI state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HERO_SLIDES, JSON.stringify(heroSlides));
  }, [heroSlides]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_EMAILS, JSON.stringify(adminEmails));
  }, [adminEmails]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SITE_SETTINGS, JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(subscribers));
  }, [subscribers]);

  useEffect(() => {
    if (lastSubscribedEmail) {
      localStorage.setItem(STORAGE_KEYS.LAST_SUBSCRIBED_EMAIL, lastSubscribedEmail);
    }
  }, [lastSubscribedEmail]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUB_NOTIFICATIONS, JSON.stringify(subscriberNotifications));
  }, [subscriberNotifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(stripSensitiveUserFields(currentUser))
      );
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
  }, [wishlist]);

  // Real-time synchronization across tabs and admin actions
  useEffect(() => {
    const handleSync = (e) => {
      if (e.type === 'storage' && e.key && e.key.startsWith('jazyalon_')) {
        try {
          const p = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
          if (p) setProducts(safeJsonParse(p, PRODUCTS));
          const c = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
          if (c) setCategories(safeJsonParse(c, CATEGORIES));
          const col = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
          if (col) setCollections(safeJsonParse(col, COLLECTIONS));
          const h = localStorage.getItem(STORAGE_KEYS.HERO_SLIDES);
          if (h) setHeroSlides(safeJsonParse(h, HERO_SLIDES));
          const s = localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS);
          if (s) setSiteSettings(sanitizeSiteSettings(safeJsonParse(s, DEFAULT_SITE_SETTINGS)));
          const cp = localStorage.getItem(STORAGE_KEYS.COUPONS);
          if (cp) setCoupons(sanitizeCouponsList(safeJsonParse(cp, DEFAULT_COUPONS)));
          const sb = localStorage.getItem(STORAGE_KEYS.SUBSCRIBERS);
          if (sb) setSubscribers(sanitizeSubscribersList(safeJsonParse(sb, [])));
          const sn = localStorage.getItem(STORAGE_KEYS.SUB_NOTIFICATIONS);
          if (sn) setSubscriberNotifications(safeJsonParse(sn, []));
          const ae = localStorage.getItem(STORAGE_KEYS.ADMIN_EMAILS);
          if (ae) setAdminEmails(sanitizeAdminEmailsList(safeJsonParse(ae, DEFAULT_ADMIN_EMAILS)));
          const o = localStorage.getItem(STORAGE_KEYS.ORDERS);
          if (o) setOrders(safeJsonParse(o, INITIAL_ORDERS));
          const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          setCurrentUser(u ? stripSensitiveUserFields(safeJsonParse(u, null)) : null);
        } catch (err) {
          console.error('Error sincronizando tienda:', err);
        }
      }
    };

    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Automatic Real-Time Order Status Progression Engine (when an order has autoMode: true)
  useEffect(() => {
    const hasAutoOrders = orders.some((o) => o.autoMode && o.status !== 'entregado');
    if (!hasAutoOrders) return undefined;

    const timer = setInterval(() => {
      setOrders((prevOrders) => {
        let changed = false;
        const updated = prevOrders.map((order) => {
          if (!order.autoMode || order.status === 'entregado') return order;
          const currentIdx = ORDER_STAGES.findIndex((s) => s.id === order.status);
          if (currentIdx === -1 || currentIdx >= ORDER_STAGES.length - 1) {
            return { ...order, autoMode: false };
          }
          const nextStage = ORDER_STAGES[currentIdx + 1];
          changed = true;
          const nowStr = new Date().toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const nextHistory = [
            ...(order.history || []),
            {
              status: nextStage.id,
              label: nextStage.label,
              timestamp: `Hoy, ${nowStr}`,
              note: `Actualización automática del sistema: ${nextStage.description}`
            }
          ];
          return {
            ...order,
            status: nextStage.id,
            autoMode: nextStage.id !== 'entregado',
            updatedAt: new Date().toISOString(),
            history: nextHistory
          };
        });
        if (changed) {
          setTimeout(() => broadcastSync(), 50);
        }
        return changed ? updated : prevOrders;
      });
    }, 6500);

    return () => clearInterval(timer);
  }, [orders, broadcastSync]);

  // Dynamically compute category counts based on current active products
  const computedCategories = useMemo(() => {
    const activeProds = products.filter((p) => p.is_active !== false);
    return categories.map((cat) => {
      if (cat.id === 'all') {
        return { ...cat, count: activeProds.length };
      }
      const count = activeProds.filter(
        (p) => p.category === cat.id || p.categoryName === cat.name
      ).length;
      return { ...cat, count };
    });
  }, [categories, products]);

  // Ensure category exists in `categories` whenever a product uses a new category
  const ensureCategoryExists = useCallback((catInput, catDisplayName = null) => {
    if (!catInput || catInput === 'all') return 'corsets-brocado';
    const cleanId = catInput.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const readableName =
      catDisplayName ||
      catInput.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    setCategories((prev) => {
      const exists = prev.some(
        (c) => c.id === cleanId || c.name.toLowerCase() === catInput.toLowerCase()
      );
      if (exists) return prev;
      const created = { id: cleanId, name: readableName, count: 1 };
      syncCategoryToDb(created);
      return [...prev, created];
    });
    return cleanId;
  }, []);

  // --- MODO MANTENIMIENTO, TEXTOS SUPERIORES, BENEFICIOS & NOTIFICACIONES AUTOMÁTICAS ---

  const saveMaintenanceSettings = useCallback(
    (patch, { silent = false } = {}) => {
      setSiteSettings((prev) => {
        const merged = sanitizeSiteSettings({
          ...prev,
          maintenance: {
            ...prev.maintenance,
            ...patch
          }
        });
        syncSiteSettingsToDb(merged);
        return merged;
      });
      if (!silent) {
        showToast('Configuración de Modo Mantenimiento guardada ✦');
      }
      broadcastSync();
    },
    [broadcastSync, showToast]
  );

  const saveAnnouncementMessages = useCallback(
    (messagesList) => {
      const cleaned = (Array.isArray(messagesList) ? messagesList : [])
        .map((m) => sanitizeInput(String(m || ''), 180).trim())
        .filter(Boolean);

      if (cleaned.length === 0) {
        showToast('Agrega al menos un texto para la barra superior.', 'info');
        return false;
      }

      setSiteSettings((prev) => {
        const merged = sanitizeSiteSettings({
          ...prev,
          announcementMessages: cleaned
        });
        syncSiteSettingsToDb(merged);
        return merged;
      });
      showToast('Textos de la barra superior actualizados en vivo ✦');
      broadcastSync();
      return true;
    },
    [broadcastSync, showToast]
  );

  const saveBenefitsConfig = useCallback(
    (patch, { silent = false } = {}) => {
      setSiteSettings((prev) => {
        const merged = sanitizeSiteSettings({
          ...prev,
          benefitsConfig: {
            ...prev.benefitsConfig,
            ...patch
          }
        });
        syncSiteSettingsToDb(merged);
        return merged;
      });
      if (!silent) {
        showToast('Configuración de Beneficios y Notificaciones guardada ✦');
      }
      broadcastSync();
    },
    [broadcastSync, showToast]
  );

  // Motor de envío automático de notificaciones a personas suscritas (sin exponer correos PII)
  const dispatchSubscriberNotification = useCallback(
    ({
      type,
      eventType,
      title,
      message,
      productId = null,
      collectionId = null,
      image = ''
    }) => {
      const resolvedType = eventType || type || 'custom';
      const activeSubs = subscribers.filter((s) => {
        if (s.isActive === false) return false;
        if (resolvedType === 'price_drop') return s.notifyPriceDrop !== false;
        if (resolvedType === 'new_collection') return s.notifyNewCollection !== false;
        if (resolvedType === 'low_stock') return s.notifyLowStock !== false;
        return true;
      });

      const notifObj = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: resolvedType,
        title: sanitizeInput(title || 'Novedad en JAZYALON', 160),
        message: sanitizeInput(message || '', 340),
        productId,
        collectionId,
        image: image || '',
        recipientsCount: activeSubs.length,
        createdAt: new Date().toISOString()
      };

      setSubscriberNotifications((prev) => [notifObj, ...prev].slice(0, 60));
      syncNotificationToDb(notifObj);

      // Si el navegador tiene permiso de notificaciones web y la visitante está suscrita, mostrar aviso nativo
      try {
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          window.Notification.permission === 'granted' &&
          activeSubs.length > 0
        ) {
          new window.Notification(`JAZYALON • ${notifObj.title}`, {
            body: notifObj.message,
            icon: '/images/logos/logo-negro.png'
          });
        }
      } catch {
        // Ignorar si el navegador bloquea Notification en contexto restringido
      }

      broadcastSync();
      return notifObj;
    },
    [subscribers, broadcastSync]
  );

  const isEmailSubscribed = useCallback(
    (emailToCheck) => {
      const clean = normalizeEmail(emailToCheck);
      if (!clean) return false;
      return subscribers.some((s) => s.email === clean && s.isActive !== false);
    },
    [subscribers]
  );

  const subscribeNewsletter = useCallback(
    (rawEmail, prefs = {}) => {
      const cleanEmail = normalizeEmail(rawEmail);
      if (!validateEmail(cleanEmail)) {
        return { success: false, message: 'Por favor ingresa un correo electrónico válido.' };
      }

      const already = subscribers.some((s) => s.email === cleanEmail && s.isActive !== false);
      const entry = {
        email: cleanEmail,
        notifyPriceDrop: prefs.notifyPriceDrop !== false,
        notifyNewCollection: prefs.notifyNewCollection !== false,
        notifyLowStock: prefs.notifyLowStock !== false,
        isActive: true,
        subscribedAt: new Date().toISOString()
      };

      setSubscribers((prev) => {
        const rest = prev.filter((item) => item.email !== cleanEmail);
        return sanitizeSubscribersList([entry, ...rest]);
      });
      setLastSubscribedEmail(cleanEmail);
      syncSubscriberToDb(entry);

      // Solicitar permiso de notificación del navegador de forma amigable
      try {
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          window.Notification.permission === 'default'
        ) {
          window.Notification.requestPermission().catch(() => {});
        }
      } catch {
        // ignore
      }

      broadcastSync();
      return {
        success: true,
        alreadySubscribed: already,
        email: cleanEmail,
        featuredCoupon: siteSettings?.benefitsConfig?.featuredCouponCode || 'antonella10'
      };
    },
    [subscribers, siteSettings, broadcastSync]
  );

  const removeSubscriber = useCallback(
    (emailToRemove) => {
      const cleanEmail = normalizeEmail(emailToRemove);
      if (!cleanEmail) return;
      setSubscribers((prev) => prev.filter((s) => s.email !== cleanEmail));
      removeSubscriberFromDb(cleanEmail);
      showToast(`Suscripción eliminada (${cleanEmail})`, 'info');
      broadcastSync();
    },
    [showToast, broadcastSync]
  );

  const markNotificationsRead = useCallback(() => {
    const allIds = subscriberNotifications.map((n) => n.id);
    setReadNotificationIds(allIds);
  }, [subscriberNotifications]);

  const unreadNotificationsCount = useMemo(() => {
    const readSet = new Set(readNotificationIds);
    return subscriberNotifications.filter((n) => !readSet.has(n.id)).length;
  }, [subscriberNotifications, readNotificationIds]);

  // --- ACCESOS AL PANEL DE ADMINISTRACIÓN POR CORREO ---

  const authorizeAdminEmail = useCallback(
    ({ email, name = '', initialPassword = '' }) => {
      const cleanEmail = normalizeEmail(email);
      if (!validateEmail(cleanEmail)) {
        return { success: false, message: 'Ingresa un correo electrónico válido.' };
      }

      const cleanDisplayName = sanitizeName(name) || cleanEmail.split('@')[0];
      const alreadyAuthorized = adminEmails.some((a) => a.email === cleanEmail);

      if (alreadyAuthorized && !initialPassword) {
        return {
          success: false,
          message: 'Este correo ya cuenta con acceso al Panel de Administración.'
        };
      }

      if (initialPassword && initialPassword.length < 6) {
        return {
          success: false,
          message: 'La contraseña inicial debe tener al menos 6 caracteres.'
        };
      }

      const addedEntry = {
        email: cleanEmail,
        name: cleanDisplayName,
        addedBy: currentUser?.email || PRIMARY_ADMIN_EMAIL,
        addedAt: new Date().toISOString(),
        isPrimary: cleanEmail === PRIMARY_ADMIN_EMAIL
      };

      setAdminEmails((prev) => {
        const filtered = prev.filter((item) => item.email !== cleanEmail);
        return sanitizeAdminEmailsList([...filtered, addedEntry]);
      });

      // Primero autorizar correo en admin_authorized_emails (para que el trigger handle_new_auth_user asigne rol admin)
      syncAdminEmailToDb({
        email: cleanEmail,
        displayName: cleanDisplayName,
        addedBy: currentUser?.email || PRIMARY_ADMIN_EMAIL
      }).then(() => {
        if (initialPassword) {
          createSecondaryAdminAccountInCloud({
            name: cleanDisplayName,
            email: cleanEmail,
            password: initialPassword
          });
        }
      });

      // Sincronizar con la lista local de usuarios sin duplicar registros
      setUsers((prevUsers) => {
        const existingIdx = prevUsers.findIndex((u) => normalizeEmail(u.email) === cleanEmail);
        if (existingIdx !== -1) {
          return prevUsers.map((u, i) => {
            if (i !== existingIdx) return u;
            return {
              ...u,
              name: name ? cleanDisplayName : u.name,
              role: 'admin',
              passwordDigest: initialPassword
                ? computePasswordDigest(initialPassword, cleanEmail)
                : u.passwordDigest
            };
          });
        }

        if (initialPassword) {
          const newAdminAccount = {
            id: `usr-adm-${Date.now()}`,
            name: cleanDisplayName,
            email: cleanEmail,
            passwordDigest: computePasswordDigest(initialPassword, cleanEmail),
            role: 'admin',
            phone: '',
            rut: '',
            address: '',
            comuna: '',
            createdAt: new Date().toISOString()
          };
          return [...prevUsers, newAdminAccount];
        }

        return prevUsers;
      });

      if (currentUser && normalizeEmail(currentUser.email) === cleanEmail) {
        setCurrentUser((prev) => (prev ? { ...prev, role: 'admin' } : prev));
      }

      logSecurityEvent('ADMIN_EMAIL_AUTHORIZED', {
        email: cleanEmail,
        by: currentUser?.email || PRIMARY_ADMIN_EMAIL
      });

      showToast(`Acceso de administración habilitado para ${cleanEmail} ✦`);
      broadcastSync();
      return { success: true };
    },
    [adminEmails, currentUser, showToast, broadcastSync]
  );

  const revokeAdminEmail = useCallback(
    (emailToRevoke) => {
      const cleanEmail = normalizeEmail(emailToRevoke);
      if (cleanEmail === PRIMARY_ADMIN_EMAIL) {
        showToast('El correo principal de Jazz no puede ser eliminado.', 'error');
        return { success: false };
      }
      if (adminEmails.length <= 1) {
        showToast('Debe existir al menos un correo administrador activo.', 'error');
        return { success: false };
      }

      setAdminEmails((prev) => prev.filter((item) => item.email !== cleanEmail));
      setUsers((prev) =>
        prev.map((u) =>
          normalizeEmail(u.email) === cleanEmail ? { ...u, role: 'customer' } : u
        )
      );

      if (currentUser && normalizeEmail(currentUser.email) === cleanEmail) {
        setCurrentUser((prev) => (prev ? { ...prev, role: 'customer' } : prev));
      }

      removeAdminEmailFromDb(cleanEmail);
      logSecurityEvent('ADMIN_EMAIL_REVOKED', {
        email: cleanEmail,
        by: currentUser?.email || PRIMARY_ADMIN_EMAIL
      });

      showToast(`Acceso administrativo revocado para ${cleanEmail}`, 'info');
      broadcastSync();
      return { success: true };
    },
    [adminEmails.length, currentUser, showToast, broadcastSync]
  );

  // --- CRUD OPERATIONS (Admin-ready & Live Real-Time + Supabase Cloud Sync) ---

  const addProduct = (newProduct) => {
    const normalized = normalizeStoreProduct(newProduct, categories);
    ensureCategoryExists(normalized.category, normalized.categoryName);

    setProducts((prev) => [normalized, ...prev]);
    syncProductToDb(normalized);

    if (normalized.isCollectionPrimary && normalized.collection) {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== normalized.collection) return col;
          const updatedCol = { ...col, primaryProductId: normalized.id };
          syncCollectionToDb(updatedCol);
          return updatedCol;
        })
      );
    }

    showToast(`Prenda "${normalized.name}" agregada al catálogo ✦`);
    broadcastSync();
    return normalized;
  };

  const addMultipleProducts = (newProductsArray) => {
    const normalizedList = (newProductsArray || []).map((p) =>
      normalizeStoreProduct(p, categories)
    );
    normalizedList.forEach((item) => {
      ensureCategoryExists(item.category, item.categoryName);
    });
    setProducts((prev) => [...normalizedList, ...prev]);
    syncMultipleProductsToDb(normalizedList);
    showToast(`¡${normalizedList.length} prendas publicadas en el catálogo! ✦`);
    broadcastSync();
    return normalizedList;
  };

  const updateProduct = (id, updatedFields) => {
    const existingProd = products.find((p) => p.id === id);
    const mergedPreview = existingProd
      ? normalizeStoreProduct(
          {
            ...existingProd,
            ...updatedFields,
            // Si bajó el precio y no se especificó un oldPrice mayor, preservar el precio anterior como referencia tachada
            ...(updatedFields?.price !== undefined &&
            Number(updatedFields.price) > 0 &&
            Number(updatedFields.price) < Number(existingProd.price) &&
            updatedFields?.oldPrice === undefined &&
            updatedFields?.old_price === undefined
              ? {
                  oldPrice: Math.max(
                    Number(existingProd.oldPrice || 0),
                    Number(existingProd.price || 0)
                  ),
                  old_price: Math.max(
                    Number(existingProd.old_price || 0),
                    Number(existingProd.price || 0)
                  )
                }
              : {})
          },
          categories
        )
      : null;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = mergedPreview || normalizeStoreProduct({ ...p, ...updatedFields }, categories);
        ensureCategoryExists(merged.category, merged.categoryName);
        syncProductToDb(merged);
        if (merged.isCollectionPrimary && merged.collection) {
          setCollections((cols) =>
            cols.map((col) => {
              if (col.id !== merged.collection) return col;
              const updatedCol = { ...col, primaryProductId: merged.id };
              syncCollectionToDb(updatedCol);
              return updatedCol;
            })
          );
        }
        return merged;
      })
    );

    // Disparadores automáticos de notificaciones a clientas suscritas
    if (existingProd && mergedPreview) {
      const bConf = siteSettings?.benefitsConfig || DEFAULT_BENEFITS_CONFIG;
      const prevPrice = Number(existingProd.price) || 0;
      const nextPrice = Number(mergedPreview.price) || 0;
      const prevStock = Number(existingProd.stock ?? 10);
      const nextStock = Number(mergedPreview.stock ?? 10);
      const lowThreshold = Number(bConf.lowStockThreshold || 3);

      // 1) Cuando un producto baja de precio
      if (bConf.notifyOnPriceDrop !== false && nextPrice > 0 && prevPrice > 0 && nextPrice < prevPrice) {
        const dropPct = Math.round(((prevPrice - nextPrice) / prevPrice) * 100);
        dispatchSubscriberNotification({
          type: 'price_drop',
          title: `¡Bajó de precio! ${mergedPreview.name}`,
          message: `${mergedPreview.name} ahora está a $${nextPrice.toLocaleString('es-CL')} (antes $${prevPrice.toLocaleString('es-CL')}${dropPct > 0 ? `, -${dropPct}% OFF` : ''}).`,
          productId: mergedPreview.id,
          image: mergedPreview.images?.[0] || mergedPreview.image_url
        });
      }

      // 2) Cuando un producto queda con pocas unidades
      if (
        bConf.notifyOnLowStock !== false &&
        nextStock > 0 &&
        nextStock <= lowThreshold &&
        prevStock > lowThreshold
      ) {
        dispatchSubscriberNotification({
          type: 'low_stock',
          title: `¡Últimas ${nextStock} ${nextStock === 1 ? 'unidad' : 'unidades'}!`,
          message: `Quedan muy pocas unidades de "${mergedPreview.name}" en la tienda.`,
          productId: mergedPreview.id,
          image: mergedPreview.images?.[0] || mergedPreview.image_url
        });
      }
    }

    showToast('Prenda actualizada y sincronizada ✦');
    broadcastSync();
  };

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    removeProductFromDb(id);
    showToast('Prenda eliminada del catálogo', 'info');
    broadcastSync();
  };

  // Guardado en lote para "Destacados — Nuevos Ingresos" (Botón Guardar cambios en Inicio)
  const saveFeaturedDropsChanges = (orderedDropIds) => {
    const cleanIds = Array.isArray(orderedDropIds) ? orderedDropIds : [];
    const changedRows = [];
    setProducts((prev) =>
      prev.map((p) => {
        const orderIdx = cleanIds.indexOf(p.id);
        if (orderIdx !== -1) {
          const updated = {
            ...p,
            isNew: true,
            isFeatured: true,
            is_featured: true,
            dropOrder: orderIdx + 1,
            badge: p.badge || 'NUEVO DROP'
          };
          changedRows.push(updated);
          return updated;
        }
        if (p.isNew) {
          const updated = {
            ...p,
            isNew: false,
            dropOrder: 99,
            badge: p.badge === 'NUEVO DROP' ? '' : p.badge
          };
          changedRows.push(updated);
          return updated;
        }
        return p;
      })
    );
    if (changedRows.length > 0) {
      syncMultipleProductsToDb(changedRows);
    }
    showToast('Cambios en Destacados guardados en la tienda ✦');
    broadcastSync();
  };

  // Guardado en lote para "Carrusel Principal" (Botón Guardar cambios en Inicio)
  const saveHeroSlidesChanges = (slidesDraft) => {
    if (!Array.isArray(slidesDraft)) return;
    const sanitizedSlides = slidesDraft.map((s, idx) => ({
      ...s,
      id: s.id ?? idx + 1,
      tag: sanitizeInput(s.tag || '', 50),
      title: sanitizeInput(s.title || '', 140),
      subtitle: sanitizeInput(s.subtitle || '', 240),
      cta: sanitizeInput(s.cta || 'Explorar', 70),
      category: sanitizeInput(s.category || 'all', 60),
      image: s.image || HERO_SLIDES[idx]?.image || HERO_SLIDES[0].image
    }));
    setHeroSlides(sanitizedSlides);
    syncHeroSlidesToDb(sanitizedSlides);
    showToast('Cambios del Carrusel guardados en la tienda ✦');
    broadcastSync();
  };

  const setPrimaryCorsetForCollection = (collectionId, productId) => {
    const targetProduct = products.find((p) => p.id === productId);
    setCollections((prev) =>
      prev.map((col) => {
        if (col.id !== collectionId) return col;
        const updatedCol = {
          ...col,
          primaryProductId: productId,
          image: targetProduct?.images?.[0] || targetProduct?.image_url || col.image
        };
        syncCollectionToDb(updatedCol);
        return updatedCol;
      })
    );
    const affectedProducts = [];
    setProducts((prev) =>
      prev.map((p) => {
        if (p.collection === collectionId) {
          const updatedProd = { ...p, isCollectionPrimary: p.id === productId };
          affectedProducts.push(updatedProd);
          return updatedProd;
        }
        return p;
      })
    );
    if (affectedProducts.length > 0) {
      syncMultipleProductsToDb(affectedProducts);
    }
    showToast('Corset principal actualizado para la colección ✦');
    broadcastSync();
  };

  const addCategory = (newCat) => {
    const cat = {
      id: newCat.id || newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: sanitizeInput(newCat.name, 100),
      count: 0,
      ...newCat
    };
    setCategories((prev) => {
      if (prev.some((c) => c.id === cat.id)) return prev;
      return [...prev, cat];
    });
    syncCategoryToDb(cat);
    showToast(`Categoría "${cat.name}" añadida y sincronizada ✦`);
    broadcastSync();
    return cat;
  };

  const updateCategory = (id, updatedFields) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...updatedFields };
        syncCategoryToDb(merged);
        return merged;
      })
    );
    if (updatedFields.name) {
      setProducts((prev) =>
        prev.map((p) => (p.category === id ? { ...p, categoryName: updatedFields.name } : p))
      );
    }
    showToast('Categoría actualizada en toda la tienda ✦');
    broadcastSync();
  };

  const deleteCategory = (id) => {
    if (id === 'all') return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    removeCategoryFromDb(id);
    showToast('Categoría eliminada', 'info');
    broadcastSync();
  };

  const addCollection = (newCol) => {
    const col = {
      id: newCol.id || newCol.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: sanitizeInput(newCol.name, 100),
      subtitle: sanitizeInput(newCol.subtitle || '', 220),
      itemCount: 'Nuevos Diseños',
      image: newCol.image || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
      primaryProductId: newCol.primaryProductId || null,
      isPrimaryFeatured: !!newCol.isPrimaryFeatured,
      ...newCol
    };
    setCollections((prev) => {
      const base = col.isPrimaryFeatured
        ? prev.map((c) => {
            if (c.isPrimaryFeatured) {
              const demoted = { ...c, isPrimaryFeatured: false };
              syncCollectionToDb(demoted);
              return demoted;
            }
            return c;
          })
        : prev;
      return [...base, col];
    });
    syncCollectionToDb(col);

    // Notificación automática a suscritas cuando se publica una nueva colección
    const bConf = siteSettings?.benefitsConfig || DEFAULT_BENEFITS_CONFIG;
    if (bConf.notifyOnNewCollection !== false) {
      dispatchSubscriberNotification({
        type: 'new_collection',
        title: `Nueva Colección: ${col.name}`,
        message: `Acabamos de lanzar la colección "${col.name}"${col.subtitle ? ` — ${col.subtitle}` : ''}. ¡Descúbrela en la tienda!`,
        collectionId: col.id,
        image: col.image
      });
    }

    showToast(`Colección "${col.name}" publicada en el sitio web ✦`);
    broadcastSync();
    return col;
  };

  const updateCollection = (id, updatedFields) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (updatedFields.isPrimaryFeatured && c.id !== id) {
          if (c.isPrimaryFeatured) {
            const demoted = { ...c, isPrimaryFeatured: false };
            syncCollectionToDb(demoted);
            return demoted;
          }
          return c;
        }
        if (c.id === id) {
          const merged = { ...c, ...updatedFields };
          syncCollectionToDb(merged);
          return merged;
        }
        return c;
      })
    );
    showToast('Colección actualizada en tiempo real ✦');
    broadcastSync();
  };

  const deleteCollection = (id) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    removeCollectionFromDb(id);
    showToast('Colección eliminada', 'info');
    broadcastSync();
  };

  const updateHeroSlide = (id, updatedFields) => {
    setHeroSlides((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updatedFields } : s));
      syncHeroSlidesToDb(next);
      return next;
    });
    showToast('Carrusel actualizado ✦');
    broadcastSync();
  };

  const resetStoreToDefaults = () => {
    const defaultProds = PRODUCTS.map((p) => normalizeStoreProduct(p, CATEGORIES));
    setProducts(defaultProds);
    setCategories(CATEGORIES);
    setCollections(COLLECTIONS);
    setHeroSlides(HERO_SLIDES);
    if (!isSupabaseConfigured()) {
      setOrders(INITIAL_ORDERS);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
    }
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.COLLECTIONS);
    localStorage.removeItem(STORAGE_KEYS.HERO_SLIDES);

    if (isSupabaseConfigured()) {
      CATEGORIES.filter((c) => c.id !== 'all').forEach((cat, idx) =>
        syncCategoryToDb({ ...cat, display_order: idx + 1 })
      );
      COLLECTIONS.forEach((col, idx) =>
        syncCollectionToDb({ ...col, display_order: idx + 1 })
      );
      syncMultipleProductsToDb(defaultProds);
      syncHeroSlidesToDb(HERO_SLIDES);
    }

    showToast('Catálogo y tienda restablecidos a los diseños originales ✦');
    broadcastSync();
  };

  // --- AUTHENTICATION & SANITIZED USER ACCOUNTS ---

  const adminEmailSet = useMemo(
    () => new Set(adminEmails.map((a) => normalizeEmail(a.email))),
    [adminEmails]
  );

  const isAdmin = useMemo(() => {
    if (!currentUser?.email) return false;
    const clean = normalizeEmail(currentUser.email);
    return currentUser.role === 'admin' || adminEmailSet.has(clean);
  }, [currentUser, adminEmailSet]);

  // Cargar datos protegidos por RLS (Pedidos propios/globales, Suscriptoras, Correos Admin y Alertas de Stock) cuando cambia la sesión
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser?.email) return;
    let active = true;

    (async () => {
      try {
        // 1. Cargar órdenes permitidas por RLS (propias para clientas, todas para Jazz/Admin)
        const { data: cloudOrders } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (active && Array.isArray(cloudOrders)) {
          setOrders(cloudOrders.map(mapDbOrderToStoreOrder));
        }

        // 2. Verificar si el correo autenticado está suscrito en la nube (para validar cupones como antonella10)
        const { data: isSubbed } = await supabase.rpc('check_subscription_status', {
          p_email: normalizeEmail(currentUser.email)
        });
        if (active && isSubbed) {
          const clean = normalizeEmail(currentUser.email);
          setSubscribers((prev) => {
            if (prev.some((s) => s.email === clean)) return prev;
            return sanitizeSubscribersList([
              {
                email: clean,
                notifyPriceDrop: true,
                notifyNewCollection: true,
                notifyLowStock: true,
                isActive: true,
                subscribedAt: new Date().toISOString()
              },
              ...prev
            ]);
          });
        }

        // 3. Si es Administradora (Jazz), cargar correos autorizados, lista de suscriptoras y alertas de reposición
        if (isAdmin) {
          const [{ data: cloudAdmins }, { data: cloudSubs }, { data: cloudAlerts }] =
            await Promise.all([
              supabase
                .from('admin_authorized_emails')
                .select('email, display_name, is_primary, added_by, created_at'),
              supabase.from('newsletter_subscribers').select('*'),
              supabase
                .from('stock_alerts')
                .select('*')
                .eq('resolved', false)
                .order('created_at', { ascending: false })
            ]);

          if (!active) return;

          if (Array.isArray(cloudAdmins) && cloudAdmins.length > 0) {
            setAdminEmails(
              sanitizeAdminEmailsList(
                cloudAdmins.map((row) => ({
                  email: row.email,
                  name: row.display_name || (row.email === PRIMARY_ADMIN_EMAIL ? 'Jazz' : 'Acceso Admin'),
                  addedBy: row.added_by || 'Supabase',
                  addedAt: row.created_at,
                  isPrimary: Boolean(row.is_primary) || row.email === PRIMARY_ADMIN_EMAIL
                }))
              )
            );
          }

          if (Array.isArray(cloudSubs)) {
            setSubscribers(
              sanitizeSubscribersList(
                cloudSubs.map((row) => ({
                  email: row.email,
                  notifyPriceDrop: row.notify_price_drop,
                  notifyNewCollection: row.notify_new_collection,
                  notifyLowStock: row.notify_low_stock,
                  isActive: row.is_active,
                  subscribedAt: row.subscribed_at
                }))
              )
            );
          }

          if (Array.isArray(cloudAlerts)) {
            const formattedAlerts = cloudAlerts.map((a) => ({
              id: a.id,
              email: a.email,
              productId: a.product_id,
              productName: a.product_name,
              color: a.color,
              size: a.size,
              createdAt: a.created_at
            }));
            localStorage.setItem('jazyalon_stock_alerts', JSON.stringify(formattedAlerts));
            window.dispatchEvent(new Event('jazyalon-alerts-updated'));
          }
        }
      } catch {
        // Fallback silencioso si la red falla temporalmente
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.email, isAdmin]);

  const loginUser = async (email, password) => {
    const cleanEmail = normalizeEmail(email);
    if (!validateEmail(cleanEmail)) {
      return { success: false, message: 'Por favor ingresa un correo electrónico válido.' };
    }

    // Modo Nube (Supabase Auth + RLS)
    if (isSupabaseConfigured()) {
      const cloudRes = await signInWithCloud({ email: cleanEmail, password });
      if (!cloudRes.success || !cloudRes.user) {
        return {
          success: false,
          message:
            cloudRes.message ||
            'Correo o contraseña incorrectos. Verifica tus datos e inténtalo nuevamente.'
        };
      }

      const resolvedRole =
        cloudRes.user.role === 'admin' || adminEmailSet.has(cleanEmail) ? 'admin' : 'customer';
      const safeUser = stripSensitiveUserFields({ ...cloudRes.user, role: resolvedRole });

      setCurrentUser(safeUser);
      showToast(
        resolvedRole === 'admin'
          ? `Hola, ${safeUser.name} — Bienvenida al Panel de Administración ✦`
          : `Bienvenida a tu cuenta JAZYALON, ${safeUser.name}`
      );
      broadcastSync();
      return { success: true, user: safeUser };
    }

    // Modo Local (Respaldo con digest criptográfico)
    const expectedDigest = computePasswordDigest(password, cleanEmail);
    const found = users.find(
      (u) => normalizeEmail(u.email) === cleanEmail && u.passwordDigest === expectedDigest
    );

    if (!found) {
      logSecurityEvent('AUTH_LOGIN_FAILED', { email: cleanEmail });
      return {
        success: false,
        message: 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo nuevamente.'
      };
    }

    const resolvedRole = adminEmailSet.has(cleanEmail) || found.role === 'admin' ? 'admin' : 'customer';
    const safeUser = stripSensitiveUserFields({ ...found, role: resolvedRole });

    setCurrentUser(safeUser);
    showToast(
      resolvedRole === 'admin'
        ? `Hola, ${safeUser.name} — Bienvenida al Panel de Administración ✦`
        : `Bienvenida a tu cuenta JAZYALON, ${safeUser.name}`
    );
    broadcastSync();
    return { success: true, user: safeUser };
  };

  const registerUser = async ({ name, email, password, phone = '', rut = '' }) => {
    const cleanEmail = normalizeEmail(email);
    const cleanName = sanitizeName(name);
    const cleanPhone = sanitizePhone(phone);
    const cleanRut = rut ? formatLegalRUT(rut) : '';

    if (!validateEmail(cleanEmail)) {
      return { success: false, message: 'Por favor ingresa un correo electrónico válido.' };
    }
    if (cleanName.length < 3) {
      return { success: false, message: 'Ingresa tu nombre y apellido válidos (mínimo 3 letras).' };
    }
    if (!password || String(password).length < 6) {
      return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    if (cleanRut && !validateRUT(cleanRut)) {
      return { success: false, message: 'El RUT ingresado no es válido.' };
    }

    if (isSupabaseConfigured()) {
      const cloudReg = await registerUserInCloud({
        name: cleanName,
        email: cleanEmail,
        password,
        phone: cleanPhone,
        rut: cleanRut
      });

      if (!cloudReg.synced) {
        return {
          success: false,
          message:
            cloudReg.message ||
            'No se pudo registrar la cuenta. Verifica si el correo ya existe.'
        };
      }

      const assignedRole =
        cloudReg.cloudUser?.role === 'admin' || adminEmailSet.has(cleanEmail)
          ? 'admin'
          : 'customer';

      const safeCloudUser = stripSensitiveUserFields(
        cloudReg.cloudUser || {
          id: cloudReg.authUser?.id || `usr-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          role: assignedRole,
          phone: cleanPhone,
          rut: cleanRut,
          address: '',
          comuna: '',
          createdAt: new Date().toISOString()
        }
      );

      if (cloudReg.hasSession) {
        setCurrentUser(safeCloudUser);
        showToast(
          assignedRole === 'admin'
            ? `Cuenta creada con acceso Administrador para ${safeCloudUser.name} ✦`
            : `Cuenta creada con éxito. Bienvenida, ${safeCloudUser.name}`
        );
      } else {
        showToast(
          'Cuenta registrada con éxito. Revisa tu correo para confirmar o inicia sesión.',
          'info'
        );
      }

      broadcastSync();
      return { success: true, user: safeCloudUser, requiresEmailConfirm: !cloudReg.hasSession };
    }

    const exists = users.some((u) => normalizeEmail(u.email) === cleanEmail);
    if (exists) {
      return {
        success: false,
        message: 'Este correo ya está registrado. Inicia sesión con tu cuenta.'
      };
    }

    const assignedRole = adminEmailSet.has(cleanEmail) ? 'admin' : 'customer';

    const newUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      passwordDigest: computePasswordDigest(password, cleanEmail),
      role: assignedRole,
      phone: cleanPhone,
      rut: cleanRut,
      address: '',
      comuna: '',
      createdAt: new Date().toISOString()
    };

    setUsers((prev) => [...prev, newUser]);

    const safeUser = stripSensitiveUserFields(newUser);
    setCurrentUser(safeUser);
    showToast(
      assignedRole === 'admin'
        ? `Cuenta creada con acceso Administrador para ${safeUser.name} ✦`
        : `Cuenta creada con éxito. Bienvenida, ${safeUser.name}`
    );
    broadcastSync();
    return { success: true, user: safeUser };
  };

  const updateUserProfile = (updates = {}) => {
    if (!currentUser?.email) {
      return { success: false, message: 'Debes iniciar sesión para editar tus datos.' };
    }
    const cleanEmail = normalizeEmail(currentUser.email);
    const nextName = updates.name !== undefined ? sanitizeName(updates.name) : currentUser.name;
    const nextPhone = updates.phone !== undefined ? sanitizePhone(updates.phone) : currentUser.phone || '';
    const nextRut = updates.rut ? formatLegalRUT(updates.rut) : '';
    const nextAddress =
      updates.address !== undefined ? sanitizeInput(updates.address, 220) : currentUser.address || '';
    const nextComuna =
      updates.comuna !== undefined ? sanitizeInput(updates.comuna, 100) : currentUser.comuna || '';

    if (nextName.length < 3) {
      return { success: false, message: 'El nombre debe tener al menos 3 letras.' };
    }
    if (nextRut && !validateRUT(nextRut)) {
      return { success: false, message: 'El RUT ingresado no es válido.' };
    }

    const updatedSafeUser = stripSensitiveUserFields({
      ...currentUser,
      name: nextName,
      phone: nextPhone,
      rut: nextRut,
      address: nextAddress,
      comuna: nextComuna
    });

    setUsers((prev) =>
      prev.map((u) => {
        if (normalizeEmail(u.email) !== cleanEmail) return u;
        return {
          ...u,
          name: nextName,
          phone: nextPhone,
          rut: nextRut,
          address: nextAddress,
          comuna: nextComuna
        };
      })
    );

    setCurrentUser(updatedSafeUser);
    syncProfileUpdateToDb(updatedSafeUser);

    showToast('Datos de tu cuenta guardados correctamente ✦');
    broadcastSync();
    return { success: true, user: updatedSafeUser };
  };

  const quickAdminLogin = async () => {
    if (isSupabaseConfigured()) {
      const res = await loginUser(PRIMARY_ADMIN_EMAIL, 'Jazyalon2026!Admin');
      if (res?.success) return res.user;
    }
    const adminUser = users.find((u) => u.role === 'admin') || DEFAULT_USERS[0];
    const resolvedAdminName =
      !adminUser.name || adminUser.name.toLowerCase().includes('administrador')
        ? 'Jazz'
        : adminUser.name;
    const safeAdmin = stripSensitiveUserFields({
      ...adminUser,
      email: adminUser.email || PRIMARY_ADMIN_EMAIL,
      name: resolvedAdminName,
      role: 'admin'
    });
    setCurrentUser(safeAdmin);
    showToast(`Hola, ${resolvedAdminName} — Panel activo ✦`);
    broadcastSync();
    return safeAdmin;
  };

  const logoutUser = () => {
    signOutFromCloud();
    setCurrentUser(null);
    setAdminPreviewMaintenance(false);
    if (isSupabaseConfigured()) {
      setOrders([]);
    }
    showToast('Has cerrado tu sesión correctamente', 'info');
    broadcastSync();
  };

  // --- ORDERS & REAL-TIME ORDER TRACKING ---

  const currentRegion =
    CHILE_REGIONS.find((r) => r.id === selectedRegionId) || CHILE_REGIONS[0];

  const createOrder = (orderInput) => {
    const nowStr = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const resolvedCouponCode = orderInput.couponCode || appliedCoupon || null;
    const resolvedDiscountAmount = Number(orderInput.discountAmount ?? discountAmount) || 0;
    const resolvedShippingCost = Number(orderInput.shippingCost ?? shippingCost) || 0;

    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber:
        orderInput.orderNumber || `JAZY-CL-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: sanitizeName(orderInput.name || currentUser?.name || 'Clienta JAZYALON'),
      customerEmail: normalizeEmail(orderInput.email || currentUser?.email || ''),
      customerPhone: sanitizePhone(orderInput.phone || currentUser?.phone || ''),
      customerRut: orderInput.rut
        ? formatLegalRUT(orderInput.rut)
        : currentUser?.rut || '',
      address: sanitizeInput(orderInput.address || currentUser?.address || '', 220),
      comuna: sanitizeInput(orderInput.comuna || currentUser?.comuna || '', 100),
      regionName: sanitizeInput(orderInput.regionName || currentRegion.name, 100),
      carrier: sanitizeInput(orderInput.shippingCarrier || 'starken', 40),
      shippingCost: resolvedShippingCost,
      couponCode: resolvedCouponCode,
      discountAmount: resolvedDiscountAmount,
      trackingCode: `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      paymentMethod: sanitizeInput(orderInput.paymentMethod || 'webpay', 40),
      status: 'recibido',
      autoMode: false,
      total: Number(orderInput.total || cartTotal) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: (orderInput.items || cart).map((item) => ({
        id: item.id,
        name: sanitizeInput(item.name, 160),
        sku: item.sku || 'JAZ-COR',
        selectedColor: item.selectedColor || 'Negro',
        selectedSize: item.selectedSize || 'S',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        image:
          item.images?.[0] ||
          item.image_url ||
          '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      })),
      history: [
        {
          status: 'recibido',
          label: 'Pedido Recibido',
          timestamp: `Hoy, ${nowStr}`,
          note: 'Tu compra fue confirmada y registrada exitosamente.'
        }
      ]
    };

    setOrders((prev) => [newOrder, ...prev]);
    createOrderInDb(newOrder);

    // Descontar unidades compradas localmente (en Supabase lo ejecuta de forma atómica el trigger trg_deduct_stock_on_order_item)
    if (!orderInput.skipStockDeduction) {
      const bConf = siteSettings?.benefitsConfig || DEFAULT_BENEFITS_CONFIG;
      const lowThreshold = Number(bConf.lowStockThreshold || 3);

      newOrder.items.forEach((soldItem) => {
        const currentProd = products.find((p) => p.id === soldItem.id);
        if (!currentProd) return;
        const prevStock = Number(currentProd.stock ?? 10);
        const nextStock = Math.max(0, prevStock - (Number(soldItem.quantity) || 1));
        if (nextStock !== prevStock) {
          setProducts((prevProds) =>
            prevProds.map((p) => (p.id === currentProd.id ? { ...p, stock: nextStock } : p))
          );
          if (
            bConf.notifyOnLowStock !== false &&
            nextStock > 0 &&
            nextStock <= lowThreshold &&
            prevStock > lowThreshold
          ) {
            dispatchSubscriberNotification({
              type: 'low_stock',
              title: `¡Últimas ${nextStock} ${nextStock === 1 ? 'unidad' : 'unidades'}!`,
              message: `Quedan muy pocas unidades de "${currentProd.name}" en la tienda.`,
              productId: currentProd.id,
              image: currentProd.images?.[0] || currentProd.image_url
            });
          }
        }
      });
    }

    // Si se utilizó un cupón promocional, contabilizar uso en estado local (en Supabase lo incrementa trg_increment_coupon_usage)
    if (appliedCoupon) {
      setCoupons((prev) =>
        prev.map((c) => {
          if (c.code !== appliedCoupon) return c;
          return { ...c, usedCount: (Number(c.usedCount) || 0) + 1 };
        })
      );
      setDiscountPercent(0);
      setAppliedCoupon(null);
    }

    broadcastSync();
    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus, customNote = '', newTrackingCode = null) => {
    const stageInfo = ORDER_STAGES.find((s) => s.id === newStatus) || ORDER_STAGES[0];
    const nowStr = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId && o.orderNumber !== orderId) return o;
        const updatedTracking =
          newTrackingCode !== null ? sanitizeInput(newTrackingCode, 80) : o.trackingCode;
        const noteText = sanitizeInput(customNote, 240) || stageInfo.description;
        const updatedOrder = {
          ...o,
          status: newStatus,
          trackingCode: updatedTracking,
          updatedAt: new Date().toISOString(),
          history: [
            ...(o.history || []),
            {
              status: newStatus,
              label: stageInfo.label,
              timestamp: `Hoy, ${nowStr}`,
              note: noteText
            }
          ]
        };
        updateOrderInDb(updatedOrder);
        return updatedOrder;
      })
    );

    showToast(`Estado del pedido actualizado a: ${stageInfo.label} ✦`);
    broadcastSync();
  };

  const advanceOrderStep = (orderId) => {
    const target = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!target) return;
    const idx = ORDER_STAGES.findIndex((s) => s.id === target.status);
    if (idx < ORDER_STAGES.length - 1) {
      const nextStage = ORDER_STAGES[idx + 1];
      updateOrderStatus(orderId, nextStage.id, `Avance de etapa: ${nextStage.description}`);
    } else {
      showToast('El pedido ya se encuentra en estado Entregado', 'info');
    }
  };

  const toggleOrderAutoMode = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId && o.orderNumber !== orderId) return o;
        const nextAuto = !o.autoMode;
        const updated = { ...o, autoMode: nextAuto };
        updateOrderInDb(updated);
        showToast(
          nextAuto
            ? `Seguimiento automático activado para ${o.orderNumber} ✦`
            : `Seguimiento cambiado a modo manual para ${o.orderNumber}`,
          'info'
        );
        return updated;
      })
    );
    broadcastSync();
  };

  const trackOrderByCode = useCallback(async (lookupCode) => {
    const clean = String(lookupCode || '').trim();
    if (!clean) return null;
    if (isSupabaseConfigured()) {
      return await trackOrderInCloud(clean);
    }
    return null;
  }, []);

  // Cart operations (with exact chosen size & color tracking)
  const addToCart = (product, size = null, color = null, quantity = 1) => {
    const chosenSize = size || product.sizes?.[0] || 'S';
    const chosenColor = color || product.colors?.[0]?.name || 'Estándar';
    const cartItemId = `${product.id}-${chosenSize}-${chosenColor}`;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prevCart.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prevCart,
        {
          ...product,
          cartItemId,
          selectedSize: chosenSize,
          selectedColor: chosenColor,
          quantity
        }
      ];
    });

    showToast(`"${product.name}" (${chosenColor} / ${chosenSize}) añadido al carrito`);
  };

  const removeFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateCartQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Wishlist operations
  const toggleWishlist = (product) => {
    const exists = wishlist.some((item) => item.id === product.id);
    if (exists) {
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      showToast('Eliminado de favoritos', 'info');
    } else {
      setWishlist((prev) => [...prev, product]);
      showToast('Añadido a tus favoritos', 'success');
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const discountAmount = Math.round((cartSubtotal * discountPercent) / 100);
  const isFreeShipping = cartSubtotal >= BRAND_INFO.freeShippingThreshold;
  const shippingCost =
    cartSubtotal === 0 ? 0 : isFreeShipping ? 0 : currentRegion.shippingCost;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingCost);

  const freeShippingProgress = Math.min(
    100,
    Math.round((cartSubtotal / BRAND_INFO.freeShippingThreshold) * 100)
  );
  const remainingForFreeShipping = Math.max(
    0,
    BRAND_INFO.freeShippingThreshold - cartSubtotal
  );

  // --- CUPONES Y BENEFICIOS CONFIGURABLES ---

  const saveCoupon = (couponInput) => {
    const cleanCode = sanitizeInput(String(couponInput?.code || ''), 40)
      .toLowerCase()
      .replace(/\s+/g, '');

    if (!cleanCode) {
      showToast('Ingresa un código válido para el cupón.', 'error');
      return { success: false };
    }

    const normalizedCoupon = {
      code: cleanCode,
      discountPercent: Math.max(1, Math.min(95, Number(couponInput.discountPercent) || 10)),
      description: sanitizeInput(couponInput.description || '', 220),
      requireSubscription: Boolean(couponInput.requireSubscription),
      firstPurchaseOnly: Boolean(couponInput.firstPurchaseOnly),
      minPurchase: Math.max(0, Number(couponInput.minPurchase) || 0),
      maxUses: Math.max(0, Number(couponInput.maxUses) || 0),
      usedCount: Math.max(0, Number(couponInput.usedCount) || 0),
      expiresAt: couponInput.expiresAt || '',
      isActive: couponInput.isActive !== false
    };

    setCoupons((prev) => {
      const exists = prev.some((c) => c.code === cleanCode);
      const next = exists
        ? prev.map((c) => (c.code === cleanCode ? { ...c, ...normalizedCoupon } : c))
        : [normalizedCoupon, ...prev];
      return sanitizeCouponsList(next);
    });

    syncCouponToDb(normalizedCoupon);
    showToast(`Cupón "${cleanCode}" guardado con éxito ✦`);
    broadcastSync();
    return { success: true, coupon: normalizedCoupon };
  };

  const toggleCouponActive = (code) => {
    const cleanCode = String(code || '').trim().toLowerCase();
    setCoupons((prev) =>
      prev.map((c) => {
        if (c.code !== cleanCode) return c;
        const updated = { ...c, isActive: !c.isActive };
        syncCouponToDb(updated);
        return updated;
      })
    );
    showToast('Estado del cupón actualizado ✦');
    broadcastSync();
  };

  const deleteCoupon = (code) => {
    const cleanCode = String(code || '').trim().toLowerCase();
    if (cleanCode === 'antonella10') {
      showToast('El cupón principal antonella10 no se elimina; puedes pausarlo o editar sus condiciones.', 'info');
      return;
    }
    setCoupons((prev) => prev.filter((c) => c.code !== cleanCode));
    removeCouponFromDb(cleanCode);
    if (appliedCoupon === cleanCode) {
      setDiscountPercent(0);
      setAppliedCoupon(null);
    }
    showToast(`Cupón "${cleanCode}" eliminado`, 'info');
    broadcastSync();
  };

  // Validador de condiciones de cupón (en carrito y en checkout)
  const evaluateCouponConditions = useCallback(
    (code, emailCandidate = null) => {
      const clean = sanitizeInput(String(code || ''), 40)
        .toLowerCase()
        .replace(/\s+/g, '');
      const found = coupons.find((c) => c.code === clean);

      if (!found) {
        return { valid: false, message: 'El código de cupón ingresado no existe.' };
      }

      if (found.isActive === false) {
        return { valid: false, message: `El cupón ${found.code} se encuentra pausado temporalmente.` };
      }

      if (found.expiresAt) {
        const expMs = new Date(`${found.expiresAt}T23:59:59`).getTime();
        if (!Number.isNaN(expMs) && Date.now() > expMs) {
          return { valid: false, message: `El cupón ${found.code} ha expirado.` };
        }
      }

      if (found.maxUses > 0 && Number(found.usedCount || 0) >= Number(found.maxUses)) {
        return { valid: false, message: `El cupón ${found.code} alcanzó su límite máximo de usos.` };
      }

      if (found.minPurchase > 0 && cartSubtotal < found.minPurchase) {
        return {
          valid: false,
          message: `El cupón ${found.code} requiere una compra mínima de $${Number(found.minPurchase).toLocaleString('es-CL')}.`
        };
      }

      const effectiveEmail = normalizeEmail(
        emailCandidate || currentUser?.email || lastSubscribedEmail || ''
      );

      if (found.requireSubscription) {
        if (!effectiveEmail || !isEmailSubscribed(effectiveEmail)) {
          return {
            valid: false,
            needsSubscription: true,
            message: `Para usar el cupón ${found.code}, primero suscríbete con tu correo en la sección Beneficios.`
          };
        }
      }

      if (found.firstPurchaseOnly && effectiveEmail) {
        const hasPreviousOrder = orders.some(
          (o) => normalizeEmail(o.customerEmail) === effectiveEmail
        );
        if (hasPreviousOrder) {
          return {
            valid: false,
            message: `El cupón ${found.code} es válido únicamente en tu primera compra.`
          };
        }
      }

      return { valid: true, coupon: found };
    },
    [coupons, cartSubtotal, currentUser, lastSubscribedEmail, isEmailSubscribed, orders]
  );

  // Apply promo code
  const applyCoupon = (code, emailOverride = null) => {
    const evaluation = evaluateCouponConditions(code, emailOverride);
    if (!evaluation.valid) {
      showToast(evaluation.message, 'error');
      return false;
    }

    setDiscountPercent(evaluation.coupon.discountPercent);
    setAppliedCoupon(evaluation.coupon.code);
    showToast(
      `¡Cupón ${evaluation.coupon.code} (${evaluation.coupon.discountPercent}% OFF) aplicado con éxito!`
    );
    return true;
  };

  const removeCoupon = () => {
    setDiscountPercent(0);
    setAppliedCoupon(null);
    showToast('Cupón removido', 'info');
  };

  return (
    <ShopContext.Provider
      value={{
        // Real-time Catalog Data & Dynamic Collections
        products,
        setProducts,
        categories: computedCategories,
        rawCategories: categories,
        collections,
        heroSlides,
        brandInfo: BRAND_INFO,
        brandPolicies: BRAND_POLICIES,
        sizeChart: SIZE_CHART,
        regions: CHILE_REGIONS,
        shippingTableData: SHIPPING_TABLE_DATA,
        orderStages: ORDER_STAGES,

        // Web Settings, Top Bar Announcements & Maintenance Mode
        siteSettings,
        saveMaintenanceSettings,
        saveAnnouncementMessages,
        saveBenefitsConfig,
        adminPreviewMaintenance,
        setAdminPreviewMaintenance,

        // Coupons, Subscribers & Automatic Notifications
        coupons,
        saveCoupon,
        toggleCouponActive,
        deleteCoupon,
        evaluateCouponConditions,
        subscribers,
        lastSubscribedEmail,
        isEmailSubscribed,
        subscribeNewsletter,
        removeSubscriber,
        subscriberNotifications,
        unreadNotificationsCount,
        markNotificationsRead,
        dispatchSubscriberNotification,

        // Admin & Store Mutations
        addProduct,
        addMultipleProducts,
        updateProduct,
        deleteProduct,
        saveFeaturedDropsChanges,
        saveHeroSlidesChanges,
        setPrimaryCorsetForCollection,
        addCategory,
        updateCategory,
        deleteCategory,
        addCollection,
        updateCollection,
        deleteCollection,
        updateHeroSlide,
        setHeroSlides,
        resetStoreToDefaults,
        normalizeStoreProduct,

        // Auth, Users & Admin Access Control
        users: users.map(stripSensitiveUserFields),
        currentUser,
        isAdmin,
        adminEmails,
        authorizeAdminEmail,
        revokeAdminEmail,
        loginUser,
        registerUser,
        updateUserProfile,
        quickAdminLogin,
        logoutUser,
        isCloudDatabaseActive: isSupabaseConfigured(),

        // Orders & Real-Time Tracking
        orders,
        createOrder,
        updateOrderStatus,
        advanceOrderStep,
        toggleOrderAutoMode,
        trackOrderByCode,

        // Cart
        cart,
        cartCount,
        cartSubtotal,
        cartTotal,
        shippingCost,
        isFreeShipping,
        freeShippingProgress,
        remainingForFreeShipping,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,

        // Wishlist
        wishlist,
        toggleWishlist,
        isInWishlist,

        // Coupons
        couponCode,
        setCouponCode,
        appliedCoupon,
        discountPercent,
        discountAmount,
        applyCoupon,
        removeCoupon,

        // Shipping
        selectedRegionId,
        setSelectedRegionId,
        currentRegion,

        // UI States
        isCartOpen,
        setIsCartOpen,
        isSearchOpen,
        setIsSearchOpen,
        isSizeGuideOpen,
        setIsSizeGuideOpen,
        isAuthOpen,
        setIsAuthOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        selectedProduct,
        setSelectedProduct,

        // Filtering
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedCollection,
        setSelectedCollection,
        priceRange,
        setPriceRange,
        selectedSizeFilter,
        setSelectedSizeFilter,
        sortBy,
        setSortBy,

        // Toast
        toast,
        showToast
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
