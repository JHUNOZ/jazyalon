import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, Package, Layers, ShoppingBag, Truck,
  Plus, Trash2, Edit3, Crown, RefreshCw, LogOut,
  Users, Bell, Upload, ArrowUp, ArrowDown, ShieldCheck, Zap,
  FolderPlus, ExternalLink, Image as ImageIcon, Menu, X,
  Star, Camera, Database, Home, BarChart3, DollarSign,
  Search, Check, MessageCircle, PlusCircle, Settings,
  Power, Clock, Mail, Lock, Eye, Save, UserPlus,
  Gift, Tag, Percent, AlertTriangle
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { supabase } from '../../lib/supabase';
import HoneCatalog from './HoneCatalog';
import { convertFileToWebP } from '../../utils/webpConverter';
import styles from './AdminPanelView.module.css';

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

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

function computeCountdownParts(targetDateStr) {
  if (!targetDateStr) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', expired: false };
  }
  const targetMs = new Date(targetDateStr).getTime();
  if (Number.isNaN(targetMs)) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', expired: false };
  }
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', expired: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    expired: false
  };
}

export default function AdminPanelView({ onClose, setCurrentView }) {
  const {
    products = [],
    categories = [],
    collections = [],
    heroSlides = [],
    orders = [],
    orderStages = [],
    users = [],
    currentUser,
    isAdmin,
    adminEmails = [],
    authorizeAdminEmail,
    revokeAdminEmail,
    loginUser,
    quickAdminLogin,
    siteSettings,
    saveMaintenanceSettings,
    saveAnnouncementMessages,
    saveBenefitsConfig,
    setAdminPreviewMaintenance,
    coupons = [],
    saveCoupon,
    toggleCouponActive,
    deleteCoupon,
    subscribers = [],
    subscribeNewsletter,
    removeSubscriber,
    subscriberNotifications = [],
    dispatchSubscriberNotification,
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
    createOrder,
    updateOrderStatus,
    toggleOrderAutoMode,
    logoutUser,
    resetStoreToDefaults,
    showToast
  } = useShop();

  const rawAdminName = (currentUser?.name || '').trim();
  const adminDisplayName =
    !rawAdminName || rawAdminName.toLowerCase().includes('administrador')
      ? 'Jazz'
      : rawAdminName;

  const handleExitAdmin = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof setCurrentView === 'function') {
      setCurrentView('home');
    }
  };

  // ============================================================================
  // ACCESO DE SEGURIDAD PARA ADMINISTRADORES
  // ============================================================================
  const [gateEmail, setGateEmail] = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateSubmitting, setGateSubmitting] = useState(false);

  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handleAdminGateLogin = async (e) => {
    e.preventDefault();
    setGateError('');
    setGateSubmitting(true);
    try {
      const res = await Promise.resolve(loginUser(gateEmail, gatePassword));
      if (!res?.success) {
        setGateError(res?.message || 'Credenciales inválidas o sin permisos de administración.');
      } else if (res?.user?.role !== 'admin') {
        const normalized = gateEmail.trim().toLowerCase();
        const isAuthorized = adminEmails.some((a) => a.email.toLowerCase() === normalized);
        if (!isAuthorized) {
          setGateError('Esta cuenta no tiene permisos para acceder al Panel de Administración.');
        }
      }
    } finally {
      setGateSubmitting(false);
    }
  };

  // ============================================================================
  // ALERTAS DE STOCK EN TIEMPO REAL
  // ============================================================================
  const [stockAlerts, setStockAlerts] = useState(() => {
    try {
      const raw = localStorage.getItem('jazyalon_stock_alerts');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncAlerts = () => {
      try {
        const raw = localStorage.getItem('jazyalon_stock_alerts');
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setStockAlerts(parsed);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', syncAlerts);
    window.addEventListener('jazyalon-alerts-updated', syncAlerts);
    return () => {
      window.removeEventListener('storage', syncAlerts);
      window.removeEventListener('jazyalon-alerts-updated', syncAlerts);
    };
  }, []);

  const handleResolveStockAlert = (alertId) => {
    const updated = stockAlerts.filter((a, idx) => (a.id || idx) !== alertId);
    setStockAlerts(updated);
    localStorage.setItem('jazyalon_stock_alerts', JSON.stringify(updated));
    if (showToast) showToast('Aviso de reposición marcado como atendido ✦');
  };

  // ============================================================================
  // LAS 5 PESTAÑAS DEL PANEL
  // 1. 'inicio'        -> Inicio (Accesos rápidos, Modo Mantenimiento, Destacados y Carrusel)
  // 2. 'resumen'       -> Resumen (Ventas, últimos productos vendidos y pedidos)
  // 3. 'colecciones'   -> COLECCIONES (Categorías y productos sincronizados)
  // 4. 'hone-catalog'  -> HONE CATALOG (Catálogo maestro)
  // 5. 'configuracion' -> Configuración web (Modo Mantenimiento, Accesos Admin y Seguridad)
  // ============================================================================
  const [activeTab, setActiveTab] = useState('inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');

  // Puente hacia HONE CATALOG
  const [honeInitialCategory, setHoneInitialCategory] = useState('all');
  const [honeInitialViewMode, setHoneInitialViewMode] = useState('table');
  const [honeAutoOpenNewModal, setHoneAutoOpenNewModal] = useState(false);
  const [honeAutoEditProduct, setHoneAutoEditProduct] = useState(null);

  // ============================================================================
  // ESTADO BORRADOR SINCRONIZADO: MODO MANTENIMIENTO & CONTADOR PRÓXIMO DROP
  // ============================================================================
  const currentMaintenance = siteSettings?.maintenance || {
    enabled: false,
    mode: 'standard',
    message: 'Estamos en mantenimiento. Volvemos pronto.',
    dropName: 'NUEVO DROP EXCLUSIVO',
    dropDate: ''
  };

  const [maintenanceDraft, setMaintenanceDraft] = useState(currentMaintenance);
  const [maintenanceDirty, setMaintenanceDirty] = useState(false);
  const [showMaintenanceConfigWhenOff, setShowMaintenanceConfigWhenOff] = useState(false);
  const [countdownPreview, setCountdownPreview] = useState(() =>
    computeCountdownParts(currentMaintenance.dropDate)
  );

  useEffect(() => {
    if (!maintenanceDirty && siteSettings?.maintenance) {
      setMaintenanceDraft(siteSettings.maintenance);
    }
  }, [siteSettings, maintenanceDirty]);

  useEffect(() => {
    setCountdownPreview(computeCountdownParts(maintenanceDraft.dropDate));
    if (maintenanceDraft.mode !== 'drop') return undefined;
    const interval = setInterval(() => {
      setCountdownPreview(computeCountdownParts(maintenanceDraft.dropDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [maintenanceDraft.dropDate, maintenanceDraft.mode]);

  const handleToggleMaintenanceSwitch = () => {
    const nextEnabled = !maintenanceDraft.enabled;
    const nextState = { ...maintenanceDraft, enabled: nextEnabled };
    setMaintenanceDraft(nextState);
    setMaintenanceDirty(false);
    if (typeof saveMaintenanceSettings === 'function') {
      saveMaintenanceSettings(nextState, { silent: true });
    }
    if (showToast) {
      showToast(
        nextEnabled
          ? 'Modo Mantenimiento ACTIVADO en la tienda ✦'
          : 'Modo Mantenimiento DESACTIVADO — Tienda abierta al público ✦'
      );
    }
  };

  const handleMaintenanceFieldChange = (patch) => {
    setMaintenanceDraft((prev) => ({ ...prev, ...patch }));
    setMaintenanceDirty(true);
  };

  const handleSaveMaintenanceChanges = () => {
    if (maintenanceDraft.mode === 'drop' && !maintenanceDraft.dropName?.trim()) {
      if (showToast) showToast('Ingresa el nombre del próximo drop antes de guardar.', 'info');
      return;
    }
    if (typeof saveMaintenanceSettings === 'function') {
      saveMaintenanceSettings(maintenanceDraft);
    }
    setMaintenanceDirty(false);
  };

  const handlePreviewMaintenanceLive = () => {
    if (maintenanceDirty && typeof saveMaintenanceSettings === 'function') {
      saveMaintenanceSettings(maintenanceDraft, { silent: true });
      setMaintenanceDirty(false);
    }
    if (typeof setAdminPreviewMaintenance === 'function') {
      setAdminPreviewMaintenance(true);
    }
    handleExitAdmin();
  };

  // ============================================================================
  // ESTADO BORRADOR CON BOTÓN "GUARDAR CAMBIOS": DESTACADOS Y CARRUSEL
  // ============================================================================
  const savedDropIds = useMemo(() => {
    return (products || [])
      .filter((p) => p.isNew || p.is_new_drop)
      .sort((a, b) => (a.dropOrder ?? 99) - (b.dropOrder ?? 99))
      .map((p) => p.id);
  }, [products]);

  const [draftDropIds, setDraftDropIds] = useState(savedDropIds);
  const [dropsDirty, setDropsDirty] = useState(false);
  const [quickAddDropProdId, setQuickAddDropProdId] = useState('');

  useEffect(() => {
    if (!dropsDirty) {
      setDraftDropIds(savedDropIds);
    }
  }, [savedDropIds, dropsDirty]);

  const draftNewDropsList = useMemo(() => {
    return draftDropIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);
  }, [draftDropIds, products]);

  const nonDropProducts = useMemo(() => {
    return (products || []).filter((p) => !draftDropIds.includes(p.id) && p.is_active !== false);
  }, [products, draftDropIds]);

  const moveDraftDrop = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draftDropIds.length) return;
    const nextIds = [...draftDropIds];
    const [moved] = nextIds.splice(index, 1);
    nextIds.splice(targetIndex, 0, moved);
    setDraftDropIds(nextIds);
    setDropsDirty(true);
  };

  const handleAddDraftDrop = () => {
    if (!quickAddDropProdId) return;
    if (!draftDropIds.includes(quickAddDropProdId)) {
      setDraftDropIds((prev) => [...prev, quickAddDropProdId]);
      setDropsDirty(true);
    }
    setQuickAddDropProdId('');
  };

  const handleRemoveDraftDrop = (prodId) => {
    setDraftDropIds((prev) => prev.filter((id) => id !== prodId));
    setDropsDirty(true);
  };

  const handleSaveFeaturedDrops = () => {
    if (typeof saveFeaturedDropsChanges === 'function') {
      saveFeaturedDropsChanges(draftDropIds);
    }
    setDropsDirty(false);
  };

  // Borrador del Carrusel Hero (Slides 01, 02 y 03)
  const [draftSlides, setDraftSlides] = useState(heroSlides);
  const [slidesDirty, setSlidesDirty] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState(null);

  useEffect(() => {
    if (!slidesDirty) {
      setDraftSlides(heroSlides);
    }
  }, [heroSlides, slidesDirty]);

  const handleDraftSlideField = (slideId, patch) => {
    setDraftSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, ...patch } : s))
    );
    setSlidesDirty(true);
  };

  const handleSlideImageUpload = async (slideId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlideId(slideId);
    try {
      const converted = await convertFileToWebP(file, { quality: 0.86, maxWidth: 1800 });
      handleDraftSlideField(slideId, { image: converted.dataUrl });
      if (showToast) showToast('Imagen cargada en el carrusel. Presiona "Guardar cambios" para publicar.');
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingSlideId(null);
    }
  };

  const handleSaveHeroSlides = () => {
    if (typeof saveHeroSlidesChanges === 'function') {
      saveHeroSlidesChanges(draftSlides);
    }
    setSlidesDirty(false);
  };

  // ============================================================================
  // ESTADO EN CONFIGURACIÓN WEB: TEXTOS DE BARRA SUPERIOR Y ACCESOS ADMIN
  // ============================================================================
  const defaultAnnouncements = [
    'CORSETERÍA VICTORIANA & ALTA COSTURA EN CHILE',
    'CONFECCIÓN DE PRECISIÓN — VARILLADO METÁLICO DE ACERO FLEXIBLE',
    'DESPACHOS A TODO CHILE — ENVÍO GRATIS DESDE $70.000 CLP'
  ];
  const savedAnnouncements =
    Array.isArray(siteSettings?.announcementMessages) && siteSettings.announcementMessages.length > 0
      ? siteSettings.announcementMessages
      : defaultAnnouncements;

  const [announcementDraft, setAnnouncementDraft] = useState(savedAnnouncements);
  const [announcementDirty, setAnnouncementDirty] = useState(false);
  const [newAnnouncementText, setNewAnnouncementText] = useState('');

  useEffect(() => {
    if (!announcementDirty && Array.isArray(siteSettings?.announcementMessages) && siteSettings.announcementMessages.length > 0) {
      setAnnouncementDraft(siteSettings.announcementMessages);
    }
  }, [siteSettings?.announcementMessages, announcementDirty]);

  const handleUpdateAnnouncementLine = (idx, val) => {
    setAnnouncementDraft((prev) => prev.map((line, i) => (i === idx ? val : line)));
    setAnnouncementDirty(true);
  };

  const handleAddAnnouncementLine = () => {
    const clean = newAnnouncementText.trim();
    if (!clean) return;
    setAnnouncementDraft((prev) => [...prev, clean]);
    setNewAnnouncementText('');
    setAnnouncementDirty(true);
  };

  const handleMoveAnnouncementLine = (idx, dir) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= announcementDraft.length) return;
    const copy = [...announcementDraft];
    const [moved] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, moved);
    setAnnouncementDraft(copy);
    setAnnouncementDirty(true);
  };

  const handleRemoveAnnouncementLine = (idx) => {
    if (announcementDraft.length <= 1) {
      if (showToast) showToast('Debe existir al menos un texto en la barra superior.', 'info');
      return;
    }
    setAnnouncementDraft((prev) => prev.filter((_, i) => i !== idx));
    setAnnouncementDirty(true);
  };

  const handleSaveAnnouncements = () => {
    const cleaned = announcementDraft.map((t) => String(t || '').trim()).filter(Boolean);
    if (cleaned.length === 0) {
      if (showToast) showToast('Escribe al menos un texto para la barra superior.', 'info');
      return;
    }
    if (typeof saveAnnouncementMessages === 'function') {
      saveAnnouncementMessages(cleaned);
    }
    setAnnouncementDraft(cleaned);
    setAnnouncementDirty(false);
  };

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminFormFeedback, setAdminFormFeedback] = useState(null);

  const handleAddAdminEmailSubmit = (e) => {
    e.preventDefault();
    setAdminFormFeedback(null);
    if (typeof authorizeAdminEmail !== 'function') return;
    const res = authorizeAdminEmail({
      email: newAdminEmail,
      name: newAdminName,
      initialPassword: newAdminPassword
    });
    if (!res?.success) {
      setAdminFormFeedback({ type: 'error', text: res?.message || 'No se pudo autorizar el correo.' });
      return;
    }
    setNewAdminEmail('');
    setNewAdminName('');
    setNewAdminPassword('');
    setAdminFormFeedback({
      type: 'success',
      text: 'Acceso de administración guardado y sincronizado correctamente.'
    });
  };

  // ============================================================================
  // ESTADO EN BENEFICIOS & OTROS: CUPONES, CONDICIONES Y NOTIFICACIONES A SUSCRITAS
  // ============================================================================
  const defaultBenefits = {
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

  const [benefitsDraft, setBenefitsDraft] = useState(() => ({
    ...defaultBenefits,
    ...(siteSettings?.benefitsConfig || {})
  }));
  const [benefitsDirty, setBenefitsDirty] = useState(false);

  useEffect(() => {
    if (!benefitsDirty && siteSettings?.benefitsConfig) {
      setBenefitsDraft((prev) => ({ ...prev, ...siteSettings.benefitsConfig }));
    }
  }, [siteSettings?.benefitsConfig, benefitsDirty]);

  const handleBenefitsField = (patch) => {
    setBenefitsDraft((prev) => ({ ...prev, ...patch }));
    setBenefitsDirty(true);
  };

  const handleSaveBenefitsSettings = () => {
    if (typeof saveBenefitsConfig === 'function') {
      saveBenefitsConfig({
        ...benefitsDraft,
        lowStockThreshold: Math.max(1, Math.min(25, parseInt(benefitsDraft.lowStockThreshold, 10) || 3))
      });
    }
    setBenefitsDirty(false);
  };

  const initialAntonellaCoupon = useMemo(() => {
    return (
      coupons.find((c) => c.code === 'antonella10') ||
      coupons[0] || {
        code: 'antonella10',
        discountPercent: 10,
        description: '10% de descuento de bienvenida en tu primera compra',
        requireSubscription: true,
        firstPurchaseOnly: true,
        minPurchase: 0,
        maxUses: '',
        expiresAt: '',
        isActive: true
      }
    );
  }, [coupons]);

  const [editingCouponCode, setEditingCouponCode] = useState('antonella10');
  const [couponForm, setCouponForm] = useState(() => ({
    code: initialAntonellaCoupon.code || 'antonella10',
    discountPercent: initialAntonellaCoupon.discountPercent || 10,
    description: initialAntonellaCoupon.description || '10% de descuento de bienvenida',
    requireSubscription: !!initialAntonellaCoupon.requireSubscription,
    firstPurchaseOnly: !!initialAntonellaCoupon.firstPurchaseOnly,
    minPurchase: initialAntonellaCoupon.minPurchase || 0,
    maxUses: initialAntonellaCoupon.maxUses ?? '',
    expiresAt: initialAntonellaCoupon.expiresAt
      ? String(initialAntonellaCoupon.expiresAt).slice(0, 10)
      : '',
    isActive: initialAntonellaCoupon.isActive !== false
  }));

  const handleSelectCouponToEdit = (c) => {
    setEditingCouponCode(c.code);
    setCouponForm({
      code: c.code,
      discountPercent: c.discountPercent || 10,
      description: c.description || '',
      requireSubscription: !!c.requireSubscription,
      firstPurchaseOnly: !!c.firstPurchaseOnly,
      minPurchase: c.minPurchase || 0,
      maxUses: c.maxUses ?? '',
      expiresAt: c.expiresAt ? String(c.expiresAt).slice(0, 10) : '',
      isActive: c.isActive !== false
    });
  };

  const handlePrepareNewCoupon = () => {
    setEditingCouponCode(null);
    setCouponForm({
      code: '',
      discountPercent: 15,
      description: 'Descuento exclusivo JAZYALON',
      requireSubscription: true,
      firstPurchaseOnly: false,
      minPurchase: 0,
      maxUses: '',
      expiresAt: '',
      isActive: true
    });
  };

  const handleSaveCouponSubmit = (e) => {
    e.preventDefault();
    if (typeof saveCoupon !== 'function') return;
    const res = saveCoupon({
      ...couponForm,
      code: couponForm.code.trim().toLowerCase(),
      discountPercent: Math.max(1, Math.min(90, parseInt(couponForm.discountPercent, 10) || 10)),
      minPurchase: Math.max(0, parseInt(couponForm.minPurchase, 10) || 0),
      maxUses: couponForm.maxUses === '' ? null : Math.max(1, parseInt(couponForm.maxUses, 10) || 1),
      expiresAt: couponForm.expiresAt ? couponForm.expiresAt : null
    });
    if (res?.success && res?.coupon) {
      setEditingCouponCode(res.coupon.code);
    }
  };

  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
  const [manualNotifTitle, setManualNotifTitle] = useState('');
  const [manualNotifMsg, setManualNotifMsg] = useState('');

  const handleManualAddSubscriber = (e) => {
    e.preventDefault();
    if (!newSubscriberEmail.trim() || typeof subscribeNewsletter !== 'function') return;
    const res = subscribeNewsletter(newSubscriberEmail.trim());
    if (!res?.success) {
      if (showToast) showToast(res?.message || 'Correo inválido', 'error');
      return;
    }
    setNewSubscriberEmail('');
    if (showToast) showToast(`Correo ${res.email} añadido a suscritas ✦`);
  };

  const handleSendManualNotification = (e) => {
    e.preventDefault();
    if (!manualNotifTitle.trim() || !manualNotifMsg.trim()) return;
    if (typeof dispatchSubscriberNotification === 'function') {
      dispatchSubscriberNotification({
        eventType: 'manual',
        title: manualNotifTitle.trim(),
        message: manualNotifMsg.trim()
      });
    }
    setManualNotifTitle('');
    setManualNotifMsg('');
    if (showToast) {
      showToast(`Notificación enviada a ${subscribers.length} persona(s) suscrita(s) ✦`);
    }
  };

  // ============================================================================
  // ESTADO EN COLECCIONES Y RESUMEN (MODALES SIMPLES DE COLECCIÓN Y PRENDA)
  // ============================================================================
  const [selectedGroupKey, setSelectedGroupKey] = useState('ALL');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [assignExistingProdId, setAssignExistingProdId] = useState('');
  const [quickColName, setQuickColName] = useState('');
  const [quickColSubtitle, setQuickColSubtitle] = useState('');
  const [quickColImage, setQuickColImage] = useState('');
  const [uploadingQuickColImg, setUploadingQuickColImg] = useState(false);

  // Modal simple para Editar Colección
  const [colEditModalGroup, setColEditModalGroup] = useState(null);
  const [colEditForm, setColEditForm] = useState({
    name: '',
    subtitle: '',
    coverImage: '',
    primaryProductId: '',
    isPrimaryFeatured: false
  });
  const [uploadingColModalImg, setUploadingColModalImg] = useState(false);

  // Modal simple para Crear / Editar Prenda desde COLECCIONES
  const [colProdModalOpen, setColProdModalOpen] = useState(false);
  const [colProdEditingId, setColProdEditingId] = useState(null);
  const [colProdColorIdx, setColProdColorIdx] = useState(0);
  const [newColProdColorName, setNewColProdColorName] = useState('');
  const [newColProdColorHex, setNewColProdColorHex] = useState('#581828');
  const [uploadingColProdImg, setUploadingColProdImg] = useState(false);
  const [colProdForm, setColProdForm] = useState({
    name: '',
    sku: '',
    groupKey: 'corsets-brocado',
    price: '44990',
    oldPrice: '',
    discount: 0,
    stock: '12',
    description: '',
    images: [],
    imageUrl: '',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      {
        name: 'Negro',
        hex: '#111111',
        availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
        outOfStockSizes: []
      }
    ],
    isNew: true,
    isCollectionPrimary: false,
    isActive: true
  });

  const [orderFilter, setOrderFilter] = useState('all');
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [manualOrderForm, setManualOrderForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '+56 9 ',
    comuna: 'Providencia',
    carrier: 'starken',
    paymentMethod: 'transferencia',
    productId: '',
    selectedColor: '',
    selectedSize: 'S',
    quantity: 1
  });

  const realCategories = useMemo(
    () => (categories || []).filter((c) => c.id !== 'all'),
    [categories]
  );

  // Unificación en tiempo real de Categorías y Colecciones
  const unifiedCategoryCollections = useMemo(() => {
    const groups = [];
    const visitedColIds = new Set();

    realCategories.forEach((cat) => {
      const mappedColId = CATEGORY_TO_COLLECTION_MAP[cat.id] || cat.id;
      const colObj =
        collections.find((c) => c.id === mappedColId || c.id === cat.id) ||
        collections.find((c) => (c.name || '').toLowerCase() === (cat.name || '').toLowerCase());

      if (colObj) visitedColIds.add(colObj.id);

      const groupProducts = products
        .filter(
          (p) =>
            p.category === cat.id ||
            p.collection === cat.id ||
            (colObj && (p.collection === colObj.id || p.category === colObj.id))
        )
        .sort((a, b) => {
          const aPri = colObj?.primaryProductId === a.id || a.isCollectionPrimary ? 1 : 0;
          const bPri = colObj?.primaryProductId === b.id || b.isCollectionPrimary ? 1 : 0;
          return bPri - aPri;
        });

      const primaryProduct =
        (colObj?.primaryProductId && groupProducts.find((p) => p.id === colObj.primaryProductId)) ||
        groupProducts.find((p) => p.isCollectionPrimary) ||
        groupProducts[0] ||
        null;

      const coverImage =
        colObj?.image ||
        primaryProduct?.images?.[0] ||
        primaryProduct?.image_url ||
        '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';

      groups.push({
        key: cat.id,
        categoryId: cat.id,
        collectionId: colObj ? colObj.id : cat.id,
        name: cat.name || colObj?.name || cat.id,
        collectionName: colObj?.name || cat.name,
        subtitle: colObj?.subtitle || 'Categoría y colección sincronizada con el catálogo',
        coverImage,
        products: groupProducts,
        primaryProduct,
        isPrimaryFeatured: !!colObj?.isPrimaryFeatured
      });
    });

    collections.forEach((col) => {
      if (visitedColIds.has(col.id)) return;
      const mappedCatId = COLLECTION_TO_CATEGORY_MAP[col.id] || col.id;
      const isDestacados = col.id === 'destacados-principal';

      const groupProducts = (isDestacados
        ? products.filter((p) => p.isNew || p.isFeatured || p.is_featured)
        : products.filter(
            (p) => p.collection === col.id || p.category === col.id || p.category === mappedCatId
          )
      ).sort((a, b) => {
        const aPri = col.primaryProductId === a.id || a.isCollectionPrimary ? 1 : 0;
        const bPri = col.primaryProductId === b.id || b.isCollectionPrimary ? 1 : 0;
        return bPri - aPri;
      });

      const primaryProduct =
        (col.primaryProductId && groupProducts.find((p) => p.id === col.primaryProductId)) ||
        groupProducts.find((p) => p.isCollectionPrimary) ||
        groupProducts[0] ||
        null;

      const coverImage =
        col.image ||
        primaryProduct?.images?.[0] ||
        primaryProduct?.image_url ||
        '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';

      groups.push({
        key: col.id,
        categoryId: mappedCatId,
        collectionId: col.id,
        name: col.name || col.title || col.id,
        collectionName: col.name || col.title || col.id,
        subtitle: col.subtitle || 'Colección activa en el sitio web',
        coverImage,
        products: groupProducts,
        primaryProduct,
        isPrimaryFeatured: !!col.isPrimaryFeatured,
        isSpecialDestacados: isDestacados
      });
    });

    return groups;
  }, [realCategories, collections, products]);

  const activeGroup = useMemo(() => {
    if (selectedGroupKey === 'ALL') return null;
    return unifiedCategoryCollections.find((g) => g.key === selectedGroupKey) || null;
  }, [unifiedCategoryCollections, selectedGroupKey]);

  const displayedCollectionProducts = useMemo(() => {
    const base = activeGroup ? activeGroup.products : products;
    if (!collectionSearch.trim()) return base;
    const q = collectionSearch.toLowerCase();
    return base.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q)
    );
  }, [activeGroup, products, collectionSearch]);

  // Métricas comerciales
  const activeProductsCount = useMemo(
    () => products.filter((p) => p.is_active !== false).length,
    [products]
  );

  const lowStockProductsCount = useMemo(
    () => products.filter((p) => Number(p.stock ?? 10) <= 5).length,
    [products]
  );

  const pendingOrdersCount = useMemo(
    () => (orders || []).filter((o) => o.status !== 'entregado').length,
    [orders]
  );

  const totalRevenue = useMemo(
    () => (orders || []).reduce((acc, o) => acc + (Number(o.total) || 0), 0),
    [orders]
  );

  const recentlySoldItems = useMemo(() => {
    const soldList = [];
    (orders || []).forEach((order) => {
      (order.items || []).forEach((item, idx) => {
        const matchedProd = products.find((p) => p.id === item.id || p.sku === item.sku);
        soldList.push({
          uniqueKey: `${order.id}-${item.id || idx}`,
          orderId: order.id,
          orderNumber: order.orderNumber || order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: order.status,
          createdAt: order.createdAt,
          productId: item.id,
          categoryName: matchedProd?.categoryName || 'Corsetería JAZYALON',
          productName: item.name,
          sku: item.sku || 'JAZ-COR',
          selectedSize: item.selectedSize || 'S',
          selectedColor: item.selectedColor || 'Negro',
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
          image:
            item.image ||
            matchedProd?.images?.[0] ||
            '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
        });
      });
    });
    return soldList;
  }, [orders, products]);

  const salesByCategory = useMemo(() => {
    const map = {};
    recentlySoldItems.forEach((item) => {
      const cat = item.categoryName || 'Corsetería';
      if (!map[cat]) map[cat] = { name: cat, revenue: 0, units: 0 };
      map[cat].revenue += item.subtotal;
      map[cat].units += item.quantity;
    });
    const arr = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    const maxRev = arr[0]?.revenue || 1;
    return arr.map((row) => ({
      ...row,
      pct: Math.max(8, Math.round((row.revenue / maxRev) * 100))
    }));
  }, [recentlySoldItems]);

  const totalUnitsSold = useMemo(
    () => recentlySoldItems.reduce((sum, item) => sum + item.quantity, 0),
    [recentlySoldItems]
  );

  const avgOrderTicket = useMemo(
    () => (orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0),
    [totalRevenue, orders]
  );

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'pending') return orders.filter((o) => o.status !== 'entregado');
    if (orderFilter === 'delivered') return orders.filter((o) => o.status === 'entregado');
    return orders;
  }, [orders, orderFilter]);

  const globalSearchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return { products: [], collections: [], orders: [] };
    return {
      products: products
        .filter(
          (p) =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.categoryName || '').toLowerCase().includes(q)
        )
        .slice(0, 4),
      collections: unifiedCategoryCollections
        .filter((g) => (g.name || '').toLowerCase().includes(q))
        .slice(0, 3),
      orders: orders
        .filter(
          (o) =>
            (o.orderNumber || '').toLowerCase().includes(q) ||
            (o.customerName || '').toLowerCase().includes(q) ||
            (o.trackingCode || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
    };
  }, [globalQuery, products, unifiedCategoryCollections, orders]);

  const hasGlobalResults =
    globalSearchResults.products.length > 0 ||
    globalSearchResults.collections.length > 0 ||
    globalSearchResults.orders.length > 0;

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openHoneCatalogWithAction = ({
    category = 'all',
    viewMode = 'table',
    openNewModal = false,
    editProduct = null
  } = {}) => {
    setHoneInitialCategory(category || 'all');
    setHoneInitialViewMode(viewMode || 'table');
    setHoneAutoOpenNewModal(!!openNewModal);
    setHoneAutoEditProduct(editProduct || null);
    setActiveTab('hone-catalog');
    setIsMobileMenuOpen(false);
    setGlobalQuery('');
  };

  // Acciones de Colecciones
  const handleQuickCreateCategoryAndCollection = (e) => {
    e.preventDefault();
    const cleanName = quickColName.trim();
    if (!cleanName) {
      if (showToast) showToast('Escribe un nombre para la categoría o colección', 'info');
      return;
    }

    const slugId = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (!categories.some((c) => c.id === slugId)) {
      addCategory({ id: slugId, name: cleanName });
    }

    if (!collections.some((c) => c.id === slugId)) {
      addCollection({
        id: slugId,
        name: cleanName,
        title: cleanName,
        subtitle: quickColSubtitle.trim() || 'Colección Exclusiva JAZYALON',
        image:
          quickColImage ||
          products[0]?.images?.[0] ||
          '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
        primaryProductId: null,
        isPrimaryFeatured: false
      });
    }

    setQuickColName('');
    setQuickColSubtitle('');
    setQuickColImage('');
    setSelectedGroupKey(slugId);
    if (showToast) {
      showToast(`Colección "${cleanName}" creada y sincronizada con el catálogo ✦`);
    }
  };

  const handleQuickColImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQuickColImg(true);
    try {
      const converted = await convertFileToWebP(file, { quality: 0.86, maxWidth: 1600 });
      setQuickColImage(converted.dataUrl);
      if (showToast) showToast('Imagen de portada cargada y optimizada ✦');
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingQuickColImg(false);
    }
  };

  // ============================================================================
  // MODAL EDITAR COLECCIÓN (DESDE TARJETA DE COLECCIÓN)
  // ============================================================================
  const openCollectionEditModal = (group, e) => {
    if (e) e.stopPropagation();
    setColEditModalGroup(group);
    setColEditForm({
      name: group.name || '',
      subtitle: group.subtitle || '',
      coverImage: group.coverImage || '',
      primaryProductId: group.primaryProduct?.id || '',
      isPrimaryFeatured: !!group.isPrimaryFeatured
    });
  };

  const handleColEditCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingColModalImg(true);
    try {
      const converted = await convertFileToWebP(file, { quality: 0.86, maxWidth: 1600 });
      setColEditForm((prev) => ({ ...prev, coverImage: converted.dataUrl }));
      if (showToast) showToast('Nueva foto de portada lista para guardar ✦');
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingColModalImg(false);
    }
  };

  const handleSaveCollectionModal = (e) => {
    e.preventDefault();
    if (!colEditModalGroup || !colEditForm.name.trim()) return;
    const cleanName = colEditForm.name.trim();
    const cleanSubtitle = colEditForm.subtitle.trim();

    if (categories.some((c) => c.id === colEditModalGroup.categoryId)) {
      updateCategory(colEditModalGroup.categoryId, { name: cleanName });
    }

    const colPayload = {
      name: cleanName,
      title: cleanName,
      subtitle: cleanSubtitle,
      image: colEditForm.coverImage || colEditModalGroup.coverImage,
      isPrimaryFeatured: !!colEditForm.isPrimaryFeatured
    };

    if (collections.some((c) => c.id === colEditModalGroup.collectionId)) {
      updateCollection(colEditModalGroup.collectionId, colPayload);
    } else {
      addCollection({
        id: colEditModalGroup.collectionId,
        ...colPayload
      });
    }

    if (colEditForm.primaryProductId && typeof setPrimaryCorsetForCollection === 'function') {
      setPrimaryCorsetForCollection(colEditModalGroup.collectionId, colEditForm.primaryProductId);
    }

    setColEditModalGroup(null);
    if (showToast) showToast(`Colección "${cleanName}" actualizada ✦`);
  };

  const handleDeleteGroup = (group) => {
    if (!group || group.isSpecialDestacados) return;
    if (!window.confirm(`¿Eliminar la categoría/colección "${group.name}"?`)) return;
    if (collections.some((c) => c.id === group.collectionId)) {
      deleteCollection(group.collectionId);
    }
    if (categories.some((c) => c.id === group.categoryId)) {
      deleteCategory(group.categoryId);
    }
    if (selectedGroupKey === group.key) {
      setSelectedGroupKey('ALL');
    }
    setColEditModalGroup(null);
  };

  // ============================================================================
  // MODAL SIMPLE PARA CREAR / EDITAR PRENDA EN "COLECCIONES"
  // ============================================================================
  const openSimpleCollectionProductModal = (product = null, defaultGroup = null, e = null) => {
    if (e) e.stopPropagation();
    setColProdColorIdx(0);
    setNewColProdColorName('');

    const fallbackGroup =
      (defaultGroup && !defaultGroup.isSpecialDestacados ? defaultGroup : null) ||
      (activeGroup && !activeGroup.isSpecialDestacados ? activeGroup : null) ||
      unifiedCategoryCollections.find((g) => !g.isSpecialDestacados) ||
      unifiedCategoryCollections[0];

    if (product) {
      setColProdEditingId(product.id);
      const matchedGroup =
        unifiedCategoryCollections.find(
          (g) =>
            !g.isSpecialDestacados &&
            (g.categoryId === product.category || g.collectionId === product.collection)
        ) || fallbackGroup;

      const prodSizes =
        Array.isArray(product.sizes) && product.sizes.length > 0
          ? product.sizes
          : ['XS', 'S', 'M', 'L', 'XL'];

      const prodColors =
        Array.isArray(product.colors) && product.colors.length > 0
          ? product.colors.map((c) => ({
              name: c.name || 'Negro',
              hex: c.hex || '#111111',
              availableSizes: Array.isArray(c.availableSizes) ? c.availableSizes : prodSizes,
              outOfStockSizes: Array.isArray(c.outOfStockSizes) ? c.outOfStockSizes : [],
              image: c.image || product.images?.[0] || product.image_url || ''
            }))
          : [
              {
                name: 'Negro',
                hex: '#111111',
                availableSizes: prodSizes,
                outOfStockSizes: [],
                image: product.images?.[0] || product.image_url || ''
              }
            ];

      const gallery = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image_url
        ? [product.image_url]
        : [];

      const oldP = product.old_price || product.oldPrice || '';
      const pct =
        product.discount ||
        (oldP && Number(oldP) > Number(product.price)
          ? Math.round(((Number(oldP) - Number(product.price)) / Number(oldP)) * 100)
          : 0);

      setColProdForm({
        name: product.name || '',
        sku: product.sku || `JAZ-${Math.floor(1000 + Math.random() * 9000)}`,
        groupKey: matchedGroup?.key || product.category || 'corsets-brocado',
        price: String(product.price || ''),
        oldPrice: oldP ? String(oldP) : '',
        discount: pct,
        stock: String(product.stock ?? 12),
        description: product.description || '',
        images: gallery,
        imageUrl: product.image_url || gallery[0] || '',
        sizes: prodSizes,
        colors: prodColors,
        isNew: product.isNew !== undefined ? !!product.isNew : false,
        isCollectionPrimary: !!product.isCollectionPrimary,
        isActive: product.is_active !== false
      });
    } else {
      setColProdEditingId(null);
      const randSku = `JAZ-${(fallbackGroup?.categoryId || 'COR')
        .slice(0, 3)
        .toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      setColProdForm({
        name: '',
        sku: randSku,
        groupKey: fallbackGroup?.key || 'corsets-brocado',
        price: '44990',
        oldPrice: '',
        discount: 0,
        stock: '12',
        description: '',
        images: [],
        imageUrl: '',
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          {
            name: 'Negro',
            hex: '#111111',
            availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
            outOfStockSizes: [],
            image: ''
          }
        ],
        isNew: true,
        isCollectionPrimary: false,
        isActive: true
      });
    }

    setColProdModalOpen(true);
  };

  const handleSimpleProdDiscountPct = (pctVal) => {
    const pct = Math.max(0, Math.min(90, parseInt(pctVal, 10) || 0));
    setColProdForm((prev) => {
      const curOld = parseFloat(prev.oldPrice) || 0;
      const curPrice = parseFloat(prev.price) || 0;
      const base = curOld > curPrice ? curOld : curOld || curPrice;
      if (base <= 0) return { ...prev, discount: pct };
      if (pct <= 0) {
        return { ...prev, price: String(base), oldPrice: '', discount: 0 };
      }
      return {
        ...prev,
        price: String(Math.round(base * (1 - pct / 100))),
        oldPrice: String(base),
        discount: pct
      };
    });
  };

  const handleToggleSimpleProdSize = (sizeKey) => {
    setColProdForm((prev) => {
      const idx = colProdColorIdx < prev.colors.length ? colProdColorIdx : 0;
      const nextColors = prev.colors.map((c, i) => {
        if (i !== idx) return c;
        const avail = Array.isArray(c.availableSizes) ? c.availableSizes : [];
        const out = Array.isArray(c.outOfStockSizes) ? c.outOfStockSizes : [];
        if (avail.includes(sizeKey)) {
          return {
            ...c,
            availableSizes: avail.filter((s) => s !== sizeKey),
            outOfStockSizes: Array.from(new Set([...out, sizeKey]))
          };
        }
        return {
          ...c,
          availableSizes: Array.from(new Set([...avail, sizeKey])),
          outOfStockSizes: out.filter((s) => s !== sizeKey)
        };
      });

      const activeSizes = ALL_SIZES.filter((sz) =>
        nextColors.some((c) => (c.availableSizes || []).includes(sz))
      );

      return {
        ...prev,
        colors: nextColors,
        sizes: activeSizes.length > 0 ? activeSizes : ['S', 'M', 'L']
      };
    });
  };

  const handleAddSimpleProdColor = () => {
    const clean = newColProdColorName.trim();
    if (!clean) return;
    setColProdForm((prev) => {
      const nextColors = [
        ...prev.colors,
        {
          name: clean,
          hex: newColProdColorHex || '#581828',
          availableSizes: [...ALL_SIZES.slice(0, 5)],
          outOfStockSizes: [],
          image: prev.imageUrl || prev.images[0] || ''
        }
      ];
      setColProdColorIdx(nextColors.length - 1);
      return { ...prev, colors: nextColors };
    });
    setNewColProdColorName('');
  };

  const handleRemoveSimpleProdColor = (idxToRemove) => {
    setColProdForm((prev) => {
      if (prev.colors.length <= 1) return prev;
      const nextColors = prev.colors.filter((_, i) => i !== idxToRemove);
      setColProdColorIdx(0);
      return { ...prev, colors: nextColors };
    });
  };

  const handleSimpleProdImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingColProdImg(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const converted = await convertFileToWebP(file, { quality: 0.86, maxWidth: 1500 });
        uploaded.push(converted.dataUrl);
      }
      setColProdForm((prev) => {
        const nextImages = [...prev.images, ...uploaded];
        return {
          ...prev,
          images: nextImages,
          imageUrl: prev.imageUrl || nextImages[0] || ''
        };
      });
      if (showToast) showToast(`${uploaded.length} foto(s) cargadas ✦`);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingColProdImg(false);
    }
  };

  const handleSaveSimpleCollectionProduct = (e) => {
    e.preventDefault();
    if (!colProdForm.name.trim()) return;

    const targetGroup =
      unifiedCategoryCollections.find(
        (g) =>
          g.key === colProdForm.groupKey ||
          g.categoryId === colProdForm.groupKey ||
          g.collectionId === colProdForm.groupKey
      ) || unifiedCategoryCollections.find((g) => !g.isSpecialDestacados);

    const categoryId = targetGroup?.categoryId || 'corsets-brocado';
    const collectionId = targetGroup?.collectionId || 'brocado-imperial';
    const categoryName = targetGroup?.name || 'Corsets';

    const priceNum = Math.max(0, parseFloat(colProdForm.price) || 0);
    const oldNum = parseFloat(colProdForm.oldPrice) || 0;
    const validOld = oldNum > priceNum ? oldNum : null;
    const discountPct =
      validOld && priceNum > 0 ? Math.round(((validOld - priceNum) / validOld) * 100) : 0;

    const primaryImg =
      colProdForm.imageUrl ||
      colProdForm.images[0] ||
      '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';
    const gallery = colProdForm.images.length > 0 ? colProdForm.images : [primaryImg];

    const payload = {
      name: colProdForm.name.trim(),
      sku: colProdForm.sku.trim() || `JAZ-${Date.now().toString().slice(-4)}`,
      category: categoryId,
      categoryName,
      collection: collectionId,
      price: priceNum,
      old_price: validOld,
      oldPrice: validOld,
      discount: discountPct,
      stock: Math.max(0, parseInt(colProdForm.stock, 10) || 0),
      description: colProdForm.description.trim(),
      image_url: primaryImg,
      images: gallery,
      sizes: colProdForm.sizes,
      colors: colProdForm.colors.map((c) => ({
        ...c,
        image: c.image || primaryImg
      })),
      isNew: !!colProdForm.isNew,
      isFeatured: !!colProdForm.isNew,
      is_featured: !!colProdForm.isNew,
      isCollectionPrimary: !!colProdForm.isCollectionPrimary,
      is_active: colProdForm.isActive !== false,
      badge: discountPct > 0 ? `-${discountPct}% OFF` : colProdForm.isNew ? 'NUEVO DROP' : ''
    };

    if (colProdEditingId) {
      updateProduct(colProdEditingId, payload);
      if (colProdForm.isCollectionPrimary && typeof setPrimaryCorsetForCollection === 'function') {
        setPrimaryCorsetForCollection(collectionId, colProdEditingId);
      }
    } else {
      const created = addProduct(payload);
      if (colProdForm.isCollectionPrimary && created?.id && typeof setPrimaryCorsetForCollection === 'function') {
        setPrimaryCorsetForCollection(collectionId, created.id);
      }
    }

    setColProdModalOpen(false);
  };

  const handleMoveProductToGroup = (product, targetGroupKey) => {
    const targetGroup = unifiedCategoryCollections.find(
      (g) =>
        g.key === targetGroupKey ||
        g.categoryId === targetGroupKey ||
        g.collectionId === targetGroupKey
    );
    if (!targetGroup) return;
    if (targetGroup.isSpecialDestacados) {
      updateProduct(product.id, {
        isNew: true,
        isFeatured: true,
        is_featured: true,
        badge: 'NUEVO DROP'
      });
      return;
    }
    updateProduct(product.id, {
      category: targetGroup.categoryId,
      categoryName: targetGroup.name,
      collection: targetGroup.collectionId
    });
  };

  const handleAssignExistingCorsetToActiveGroup = () => {
    if (!assignExistingProdId || !activeGroup) return;
    const prod = products.find((p) => p.id === assignExistingProdId);
    if (!prod) return;
    handleMoveProductToGroup(prod, activeGroup.key);
    setAssignExistingProdId('');
  };

  const openManualOrderModal = () => {
    const defaultProd = products[0];
    setManualOrderForm({
      customerName: '',
      customerEmail: '',
      customerPhone: '+56 9 ',
      comuna: 'Las Condes',
      carrier: 'starken',
      paymentMethod: 'transferencia',
      productId: defaultProd?.id || '',
      selectedColor: defaultProd?.colors?.[0]?.name || 'Negro',
      selectedSize: defaultProd?.sizes?.[0] || 'S',
      quantity: 1
    });
    setManualOrderOpen(true);
  };

  const handleCreateManualOrder = (e) => {
    e.preventDefault();
    const chosenProd = products.find((p) => p.id === manualOrderForm.productId) || products[0];
    if (!chosenProd || !manualOrderForm.customerName.trim()) return;
    const qty = Math.max(1, Number(manualOrderForm.quantity) || 1);
    const total = Number(chosenProd.price || 0) * qty;

    createOrder({
      name: manualOrderForm.customerName.trim(),
      email: manualOrderForm.customerEmail.trim() || 'venta.directa@jazyalon.cl',
      phone: manualOrderForm.customerPhone.trim(),
      comuna: manualOrderForm.comuna.trim(),
      shippingCarrier: manualOrderForm.carrier,
      paymentMethod: manualOrderForm.paymentMethod,
      total,
      items: [
        {
          id: chosenProd.id,
          name: chosenProd.name,
          sku: chosenProd.sku,
          selectedColor: manualOrderForm.selectedColor || chosenProd.colors?.[0]?.name || 'Negro',
          selectedSize: manualOrderForm.selectedSize || 'S',
          quantity: qty,
          price: chosenProd.price,
          images: chosenProd.images,
          image_url: chosenProd.image_url
        }
      ]
    });

    setManualOrderOpen(false);
    setActiveTab('resumen');
    if (showToast) showToast('Venta registrada y sincronizada con seguimiento en vivo ✦');
  };

  const handleSaveOrderTracking = (order) => {
    const nextCode = trackingDrafts[order.id];
    if (nextCode === undefined || nextCode.trim() === order.trackingCode) return;
    updateOrderStatus(
      order.id,
      order.status,
      `Guía de despacho actualizada a: ${nextCode.trim()}`,
      nextCode.trim()
    );
  };

  // ============================================================================
  // COMPONENTE REUTILIZABLE: PANEL DE MODO MANTENIMIENTO (INICIO Y CONFIGURACIÓN WEB)
  // ============================================================================
  const renderMaintenanceControlPanel = ({ isFullPage = false } = {}) => {
    const showDetails =
      isFullPage || maintenanceDraft.enabled || showMaintenanceConfigWhenOff || maintenanceDirty;

    return (
      <section
        className={`${styles.maintenanceCard} ${
          maintenanceDraft.enabled ? styles.maintenanceCardActive : ''
        }`}
      >
        <div className={styles.maintenanceTopRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: maintenanceDraft.enabled ? '#FEF3C7' : '#F3F1EC',
                border: maintenanceDraft.enabled ? '1px solid #FCD34D' : '1px solid #E2DDD4',
                color: maintenanceDraft.enabled ? '#B45309' : '#575049',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Power size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 className={styles.sectionTitle} style={{ fontSize: '0.94rem' }}>
                  Modo Mantenimiento y Próximo Drop
                </h2>
                <span
                  className={`${styles.toggleStatusPill} ${
                    maintenanceDraft.enabled ? styles.toggleStatusOn : styles.toggleStatusOff
                  }`}
                >
                  {maintenanceDraft.enabled ? 'ON • ACTIVO EN WEB' : 'OFF • TIENDA ABIERTA'}
                </span>
              </div>
              <p className={styles.sectionDesc}>
                Activa una portada de pausa temporal o un contador en reversa frente a un próximo lanzamiento.
              </p>
            </div>
          </div>

          <div className={styles.toggleWrap}>
            {!isFullPage && !maintenanceDraft.enabled && (
              <button
                type="button"
                onClick={() => setShowMaintenanceConfigWhenOff((v) => !v)}
                className={styles.btnGhost}
                style={{ height: '30px', fontSize: '0.73rem', padding: '0 10px' }}
              >
                <Settings size={13} />
                <span>{showMaintenanceConfigWhenOff ? 'Ocultar opciones' : 'Configurar'}</span>
              </button>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={maintenanceDraft.enabled}
              onClick={handleToggleMaintenanceSwitch}
              className={`${styles.toggleSwitch} ${
                maintenanceDraft.enabled ? styles.toggleSwitchOn : ''
              }`}
              title={
                maintenanceDraft.enabled
                  ? 'Desactivar Modo Mantenimiento'
                  : 'Activar Modo Mantenimiento'
              }
            >
              <span className={styles.toggleKnob} />
            </button>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#181514', minWidth: '28px' }}>
              {maintenanceDraft.enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className={styles.maintenanceOptionsBox}>
            <div className={styles.modeSelectorGrid}>
              <button
                type="button"
                onClick={() =>
                  handleMaintenanceFieldChange({
                    mode: 'standard',
                    message:
                      maintenanceDraft.message?.trim() ||
                      'Estamos en mantenimiento. Volvemos pronto.'
                  })
                }
                className={`${styles.modeOptionBtn} ${
                  maintenanceDraft.mode !== 'drop' ? styles.modeOptionBtnSelected : ''
                }`}
              >
                <span className={styles.radioDot}>
                  {maintenanceDraft.mode !== 'drop' && <span className={styles.radioDotInner} />}
                </span>
                <div>
                  <div style={{ fontSize: '0.81rem', fontWeight: 700, color: '#181514' }}>
                    Solo mensaje de mantenimiento
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#575049', marginTop: '2px' }}>
                    Muestra "Estamos en mantenimiento. Volvemos pronto." sin reloj.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMaintenanceFieldChange({ mode: 'drop' })}
                className={`${styles.modeOptionBtn} ${
                  maintenanceDraft.mode === 'drop' ? styles.modeOptionBtnSelected : ''
                }`}
              >
                <span className={styles.radioDot}>
                  {maintenanceDraft.mode === 'drop' && <span className={styles.radioDotInner} />}
                </span>
                <div>
                  <div style={{ fontSize: '0.81rem', fontWeight: 700, color: '#181514' }}>
                    Próximo Drop con contador en reversa
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#575049', marginTop: '2px' }}>
                    Muestra el nombre del Drop y la cuenta regresiva en vivo hasta la fecha elegida.
                  </div>
                </div>
              </button>
            </div>

            {maintenanceDraft.mode !== 'drop' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#575049' }}>
                  Mensaje visible para las clientas
                </label>
                <input
                  type="text"
                  value={maintenanceDraft.message || ''}
                  onChange={(e) => handleMaintenanceFieldChange({ message: e.target.value })}
                  placeholder="Estamos en mantenimiento. Volvemos pronto."
                  className={styles.adminInput}
                  style={{ width: '100%' }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '10px',
                  alignItems: 'end'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#575049' }}>
                    Nombre del Próximo Drop *
                  </label>
                  <input
                    type="text"
                    value={maintenanceDraft.dropName || ''}
                    onChange={(e) => handleMaintenanceFieldChange({ dropName: e.target.value })}
                    placeholder="Ej: DROP CORSETERÍA IMPERIAL"
                    className={styles.adminInput}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#575049' }}>
                    Fecha y hora de apertura (contador en reversa) *
                  </label>
                  <input
                    type="datetime-local"
                    value={maintenanceDraft.dropDate || ''}
                    onChange={(e) => handleMaintenanceFieldChange({ dropDate: e.target.value })}
                    className={styles.adminInput}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#575049' }}>
                    Mensaje secundario (opcional)
                  </label>
                  <input
                    type="text"
                    value={maintenanceDraft.message || ''}
                    onChange={(e) => handleMaintenanceFieldChange({ message: e.target.value })}
                    placeholder="Estamos preparando el próximo lanzamiento."
                    className={styles.adminInput}
                  />
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
                paddingTop: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {maintenanceDraft.mode === 'drop' && (
                  <div className={styles.countdownPreviewBar}>
                    <Clock size={13} color="#C8A96B" />
                    <span>
                      {countdownPreview.days}d : {countdownPreview.hours}h :{' '}
                      {countdownPreview.minutes}m : {countdownPreview.seconds}s
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePreviewMaintenanceLive}
                  className={styles.btnGhost}
                  style={{ height: '32px', fontSize: '0.74rem' }}
                >
                  <Eye size={13} />
                  <span>Previsualizar pantalla</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveMaintenanceChanges}
                className={`${styles.btnSave} ${maintenanceDirty ? styles.btnSaveDirty : ''}`}
              >
                <Save size={13} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>
        )}
      </section>
    );
  };

  // ============================================================================
  // SI NO TIENE ACCESO ADMIN: PANTALLA DE ACCESO PROTEGIDO
  // ============================================================================
  if (!isAdmin) {
    return (
      <div className={styles.authGateWrapper}>
        <div className={styles.authGateCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#181514',
                color: '#C8A96B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8C6A2E', letterSpacing: '1.4px', textTransform: 'uppercase' }}>
                JAZYALON • ACCESO RESTRINGIDO
              </span>
              <h1 style={{ margin: '2px 0 0', fontSize: '1.22rem', fontWeight: 800, color: '#181514' }}>
                Panel de Administración
              </h1>
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#575049', margin: '0 0 16px', lineHeight: 1.5 }}>
            Ingresa con un correo electrónico autorizado en Configuración Web para gestionar el catálogo, pedidos y portada.
          </p>

          {gateError && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#BE123C',
                fontSize: '0.77rem',
                fontWeight: 600,
                marginBottom: '12px'
              }}
            >
              {gateError}
            </div>
          )}

          <form onSubmit={handleAdminGateLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                Correo autorizado
              </label>
              <input
                type="email"
                required
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="admin@jazyalon.cl"
                className={styles.adminInput}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                Contraseña
              </label>
              <input
                type="password"
                required
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="••••••••"
                className={styles.adminInput}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              disabled={gateSubmitting}
              className={styles.btnPrimary}
              style={{ width: '100%', height: '38px', marginTop: '4px' }}
            >
              <Lock size={14} />
              <span>{gateSubmitting ? 'Verificando acceso...' : 'Entrar al Panel'}</span>
            </button>
          </form>

          <div
            style={{
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px solid #E5E0D8',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            {isLocalDev && typeof quickAdminLogin === 'function' && (
              <button
                type="button"
                onClick={() => quickAdminLogin()}
                className={styles.btnGhost}
                style={{ flex: 1 }}
              >
                <Zap size={13} color="#8C6A2E" />
                <span>Acceso Rápido Local</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExitAdmin}
              className={styles.btnGhost}
              style={{ flex: 1 }}
            >
              <span>Volver a la tienda</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer} data-lenis-prevent>
      {/* Botón Menú Móvil */}
      <button
        type="button"
        className={styles.mobileMenuBtn}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Abrir menú de administración"
      >
        {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      {/* Overlay Móvil */}
      <div
        className={`${styles.overlay} ${isMobileMenuOpen ? styles.overlayActive : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* ==================== BARRA LATERAL IZQUIERDA (5 PESTAÑAS) ==================== */}
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <button type="button" onClick={handleExitAdmin} className={styles.logoLink} title="Volver a la tienda">
            <div className={styles.logoBrandWrap}>
              <span className={styles.logoText}>
                JAZY<span className={styles.logoAccent}>ALON</span>
              </span>
              <span className={styles.logoSub}>Admin & HONE Suite</span>
            </div>
            <span
              className={currentMaintenance.enabled ? styles.dotAmber : styles.dot}
              title={
                currentMaintenance.enabled
                  ? 'Modo Mantenimiento Activo'
                  : 'Tienda sincronizada en tiempo real'
              }
            />
          </button>
          <button type="button" className={styles.closeBtn} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSectionLabel}>PANEL PRINCIPAL</div>

          {/* PESTAÑA 1: INICIO */}
          <button
            type="button"
            onClick={() => handleTabSelect('inicio')}
            className={`${styles.navItem} ${activeTab === 'inicio' ? styles.navItemActive : ''}`}
          >
            {activeTab === 'inicio' && <div className={styles.activeGlowBar} />}
            <div className={styles.navIconWrapper}>
              <Home size={17} />
            </div>
            <div className={styles.navTextWrap}>
              <span className={styles.navLabel}>Inicio</span>
              <span className={styles.navHint}>Accesos rápidos y portada</span>
            </div>
          </button>

          {/* PESTAÑA 2: RESUMEN */}
          <button
            type="button"
            onClick={() => handleTabSelect('resumen')}
            className={`${styles.navItem} ${activeTab === 'resumen' ? styles.navItemActive : ''}`}
          >
            {activeTab === 'resumen' && <div className={styles.activeGlowBar} />}
            <div className={styles.navIconWrapper}>
              <BarChart3 size={17} />
            </div>
            <div className={styles.navTextWrap}>
              <span className={styles.navLabel}>Resumen</span>
              <span className={styles.navHint}>Ventas, vendidos y pedidos</span>
            </div>
            <span className={styles.navBadge}>{orders.length}</span>
          </button>

          {/* PESTAÑA 3: COLECCIONES */}
          <button
            type="button"
            onClick={() => handleTabSelect('colecciones')}
            className={`${styles.navItem} ${activeTab === 'colecciones' ? styles.navItemActive : ''}`}
          >
            {activeTab === 'colecciones' && <div className={styles.activeGlowBar} />}
            <div className={styles.navIconWrapper}>
              <Layers size={17} />
            </div>
            <div className={styles.navTextWrap}>
              <span className={styles.navLabel}>COLECCIONES</span>
              <span className={styles.navHint}>Categorías y sus productos</span>
            </div>
            <span className={styles.navBadge}>{unifiedCategoryCollections.length}</span>
          </button>

          {/* PESTAÑA 4: HONE CATALOG */}
          <button
            type="button"
            onClick={() => handleTabSelect('hone-catalog')}
            className={`${styles.navItem} ${activeTab === 'hone-catalog' ? styles.navItemActive : ''}`}
          >
            {activeTab === 'hone-catalog' && <div className={styles.activeGlowBar} />}
            <div className={styles.navIconWrapper}>
              <Database size={17} />
            </div>
            <div className={styles.navTextWrap}>
              <span className={styles.navLabel}>HONE CATALOG</span>
              <span className={styles.navHint}>Catálogo maestro completo</span>
            </div>
            <span className={styles.navBadge}>{products.length}</span>
          </button>

          {/* PESTAÑA 5: BENEFICIOS & OTROS */}
          <button
            type="button"
            onClick={() => handleTabSelect('beneficios')}
            className={`${styles.navItem} ${activeTab === 'beneficios' ? styles.navItemActive : ''}`}
          >
            {activeTab === 'beneficios' && <div className={styles.activeGlowBar} />}
            <div className={styles.navIconWrapper}>
              <Gift size={17} />
            </div>
            <div className={styles.navTextWrap}>
              <span className={styles.navLabel}>Beneficios & Otros</span>
              <span className={styles.navHint}>Cupones y avisos suscritas</span>
            </div>
            <span className={styles.navBadge}>{coupons.length}</span>
          </button>

          {/* PESTAÑA 6: CONFIGURACIÓN WEB */}
          <button
            type="button"
            onClick={() => handleTabSelect('configuracion')}
            className={`${styles.navItem} ${activeTab === 'configuracion' ? styles.navItemActive : ''}`}
          >
            {activeTab === 'configuracion' && <div className={styles.activeGlowBar} />}
            <div className={styles.navIconWrapper}>
              <Settings size={17} />
            </div>
            <div className={styles.navTextWrap}>
              <span className={styles.navLabel}>Configuración web</span>
              <span className={styles.navHint}>Mantenimiento, barra y accesos</span>
            </div>
            {currentMaintenance.enabled && <span className={styles.navBadgeWarn}>ON</span>}
          </button>

          <div className={styles.navDivider} />

          <div className={styles.navSectionLabel}>ACCIONES DE TIENDA</div>

          <button
            type="button"
            onClick={() =>
              openHoneCatalogWithAction({
                category: 'all',
                viewMode: 'table',
                openNewModal: true
              })
            }
            className={styles.navItemExternal}
          >
            <PlusCircle size={15} color="#C8A96B" />
            <span>+ Subir Corset</span>
          </button>

          <button type="button" onClick={openManualOrderModal} className={styles.navItemExternal}>
            <ShoppingBag size={15} color="#C8A96B" />
            <span>+ Registrar Venta Manual</span>
          </button>

          <button type="button" onClick={handleExitAdmin} className={styles.navItemExternal}>
            <ExternalLink size={15} />
            <span>Ver Sitio Web en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Restablecer el catálogo a las prendas originales de fábrica?')) {
                resetStoreToDefaults();
              }
            }}
            className={styles.navItemExternal}
          >
            <RefreshCw size={15} />
            <span>Restaurar Catálogo Base</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminProfileRow}>
            <div className={styles.adminAvatar}>
              <ShieldCheck size={15} />
            </div>
            <div className={styles.adminInfo}>
              <span className={styles.adminName}>Hola, {adminDisplayName.split(' ')[0]}</span>
              <span className={styles.adminEmail}>{currentUser?.email || 'admin@jazyalon.cl'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logoutUser();
              handleExitAdmin();
            }}
            className={styles.logoutBtn}
          >
            <LogOut size={13} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ==================== CONTENIDO PRINCIPAL DERECHO (BLANCO EJECUTIVO) ==================== */}
      <main className={styles.mainContent}>
        {/* BARRA SUPERIOR FIJA */}
        <div className={styles.topCommandBar}>
          {currentMaintenance.enabled ? (
            <div className={styles.liveStatusPillWarn}>
              <span className={styles.dotAmber} />
              <span>
                Modo Mantenimiento ACTIVO
                {currentMaintenance.mode === 'drop' && currentMaintenance.dropName
                  ? ` • ${currentMaintenance.dropName}`
                  : ''}
              </span>
            </div>
          ) : (
            <div className={styles.liveStatusPill}>
              <span className={styles.dot} />
              <span>Tienda Activa • {activeProductsCount} prendas publicadas</span>
            </div>
          )}

          {/* Buscador Global */}
          <div className={styles.globalSearchWrap}>
            <Search size={14} className={styles.globalSearchIcon} />
            <input
              type="text"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Buscar corset, SKU, colección o #pedido..."
              className={styles.globalSearchInput}
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => setGlobalQuery('')}
                className={styles.globalSearchClear}
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}

            {globalQuery.trim() !== '' && (
              <div className={styles.globalSearchDropdown}>
                {!hasGlobalResults ? (
                  <div style={{ padding: '10px', fontSize: '0.78rem', color: '#787067', textAlign: 'center' }}>
                    Sin resultados para "{globalQuery}"
                  </div>
                ) : (
                  <>
                    {globalSearchResults.products.length > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8C6A2E', padding: '4px 8px', textTransform: 'uppercase' }}>
                          Corsets y Prendas
                        </div>
                        {globalSearchResults.products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              openHoneCatalogWithAction({
                                category: p.category || 'all',
                                viewMode: 'table',
                                editProduct: p
                              })
                            }
                            className={styles.searchResultItem}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <img
                                src={p.images?.[0] || p.image_url}
                                alt=""
                                style={{ width: '28px', height: '34px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #E5E0D8' }}
                              />
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#181514', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#575049' }}>
                                  {p.sku} • ${Number(p.price || 0).toLocaleString('es-CL')}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#8C6A2E', fontWeight: 700 }}>Editar →</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {globalSearchResults.collections.length > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8C6A2E', padding: '4px 8px', textTransform: 'uppercase' }}>
                          Colecciones
                        </div>
                        {globalSearchResults.collections.map((col) => (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => {
                              setSelectedGroupKey(col.key);
                              setActiveTab('colecciones');
                              setGlobalQuery('');
                            }}
                            className={styles.searchResultItem}
                          >
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#181514' }}>{col.name}</span>
                            <span style={{ fontSize: '0.69rem', color: '#8C6A2E', fontWeight: 600 }}>{col.products.length} prendas →</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {globalSearchResults.orders.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8C6A2E', padding: '4px 8px', textTransform: 'uppercase' }}>
                          Pedidos
                        </div>
                        {globalSearchResults.orders.map((ord) => (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => {
                              setOrderFilter('all');
                              setActiveTab('resumen');
                              setGlobalQuery('');
                            }}
                            className={styles.searchResultItem}
                          >
                            <div>
                              <span style={{ fontSize: '0.77rem', fontWeight: 700, color: '#8C6A2E', fontFamily: 'monospace' }}>
                                #{ord.orderNumber}
                              </span>
                              <span style={{ fontSize: '0.76rem', color: '#181514', marginLeft: '6px', fontWeight: 600 }}>
                                {ord.customerName}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.73rem', color: '#065F46', fontWeight: 700 }}>
                              ${Number(ord.total || 0).toLocaleString('es-CL')} →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className={styles.topCommandActions}>
            <button
              type="button"
              onClick={() =>
                openHoneCatalogWithAction({
                  category: activeTab === 'colecciones' && activeGroup ? activeGroup.categoryId : 'all',
                  viewMode: 'table',
                  openNewModal: true
                })
              }
              className={styles.btnPrimary}
            >
              <Plus size={14} />
              <span>Subir Corset</span>
            </button>

            <button type="button" onClick={handleExitAdmin} className={styles.btnGhost}>
              <ExternalLink size={13} />
              <span>Ver Tienda</span>
            </button>
          </div>
        </div>

        <div className={styles.pageBody}>
          {/* =====================================================================
              PESTAÑA 1: INICIO (ACCESOS COMPACTOS + PORTADA)
             ===================================================================== */}
          {activeTab === 'inicio' && (
            <>
              <header className={styles.pageHeader}>
                <div>
                  <div className={styles.greetingTag}>
                    <Sparkles size={12} /> PANEL EJECUTIVO • JAZYALON CHILE
                  </div>
                  <h1 className={styles.pageTitle}>Hola, {adminDisplayName.split(' ')[0]}</h1>
                  <p className={styles.pageSubtitle}>
                    Accesos rápidos, métricas de tienda y edición directa de destacados y carrusel.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={openManualOrderModal} className={styles.btnGhost}>
                    <ShoppingBag size={14} color="#8C6A2E" />
                    <span>Registrar Venta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabSelect('beneficios')}
                    className={styles.btnGhost}
                  >
                    <Gift size={14} color="#8C6A2E" />
                    <span>Beneficios & Otros</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabSelect('configuracion')}
                    className={styles.btnGhost}
                  >
                    <Settings size={14} />
                    <span>Configuración web</span>
                  </button>
                </div>
              </header>

              {/* ACCESOS RÁPIDOS COMPACTOS, SIMPLES Y BONITOS */}
              <div className={styles.compactQuickGrid}>
                <button
                  type="button"
                  onClick={() =>
                    openHoneCatalogWithAction({
                      category: 'all',
                      viewMode: 'table',
                      openNewModal: true
                    })
                  }
                  className={`${styles.compactQuickBtn} ${styles.compactQuickBtnPrimary}`}
                >
                  <div className={styles.compactQuickIcon}>
                    <Plus size={17} />
                  </div>
                  <div className={styles.compactQuickText}>
                    <span className={styles.compactQuickTitle}>Subir Nuevo Corset</span>
                    <span className={styles.compactQuickSub}>Tallas, colores y fotos</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openHoneCatalogWithAction({
                      category: 'all',
                      viewMode: 'bulk',
                      openNewModal: false
                    })
                  }
                  className={styles.compactQuickBtn}
                >
                  <div className={styles.compactQuickIcon}>
                    <Upload size={16} />
                  </div>
                  <div className={styles.compactQuickText}>
                    <span className={styles.compactQuickTitle}>Carga Masiva</span>
                    <span className={styles.compactQuickSub}>Subir varias prendas a la vez</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('colecciones')}
                  className={styles.compactQuickBtn}
                >
                  <div className={styles.compactQuickIcon}>
                    <Layers size={16} />
                  </div>
                  <div className={styles.compactQuickText}>
                    <span className={styles.compactQuickTitle}>Colecciones</span>
                    <span className={styles.compactQuickSub}>{unifiedCategoryCollections.length} líneas activas</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('resumen')}
                  className={styles.compactQuickBtn}
                >
                  <div className={styles.compactQuickIcon}>
                    <Truck size={16} />
                  </div>
                  <div className={styles.compactQuickText}>
                    <span className={styles.compactQuickTitle}>Pedidos y Ventas</span>
                    <span className={styles.compactQuickSub}>{orders.length} pedidos registrados</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('beneficios')}
                  className={styles.compactQuickBtn}
                >
                  <div className={styles.compactQuickIcon}>
                    <Gift size={16} />
                  </div>
                  <div className={styles.compactQuickText}>
                    <span className={styles.compactQuickTitle}>Beneficios & Cupones</span>
                    <span className={styles.compactQuickSub}>{subscribers.length} suscrita(s) • {coupons.length} cupón(es)</span>
                  </div>
                </button>
              </div>

              {/* PULSO RÁPIDO (4 KPIs COMPACTOS) */}
              <div className={styles.kpiGrid}>
                <div
                  className={styles.kpiCard}
                  onClick={() => handleTabSelect('hone-catalog')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Catálogo Activo</span>
                    <div className={styles.kpiIcon}><Package size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>{activeProductsCount} prendas</p>
                  <span className={styles.kpiSub}>
                    {lowStockProductsCount > 0 ? (
                      <span style={{ color: '#B45309', fontWeight: 600 }}>⚠ {lowStockProductsCount} con stock bajo (≤5)</span>
                    ) : (
                      <span style={{ color: '#047857', fontWeight: 600 }}>✓ Stock saludable</span>
                    )}
                  </span>
                </div>

                <div
                  className={styles.kpiCard}
                  onClick={() => handleTabSelect('colecciones')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Colecciones Web</span>
                    <div className={styles.kpiIcon}><Layers size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>{unifiedCategoryCollections.length}</p>
                  <span className={styles.kpiSub}>Sincronizadas en tiempo real</span>
                </div>

                <div
                  className={styles.kpiCard}
                  onClick={() => handleTabSelect('resumen')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Ventas Acumuladas</span>
                    <div className={styles.kpiIcon}><DollarSign size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>${totalRevenue.toLocaleString('es-CL')}</p>
                  <span className={styles.kpiSub}>{pendingOrdersCount} pedido(s) en curso</span>
                </div>

                <div
                  className={styles.kpiCard}
                  onClick={() => handleTabSelect('resumen')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Avisos de Talla</span>
                    <div className={styles.kpiIcon}><Bell size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>{stockAlerts.length}</p>
                  <span className={styles.kpiSub}>Solicitudes de reposición</span>
                </div>
              </div>

              {/* BLOQUE DOBLE DE PORTADA: DESTACADOS + CARRUSEL CON BOTONES "GUARDAR CAMBIOS" */}
              <div className={styles.twoColGrid}>
                {/* 1. DESTACADOS EN PORTADA (NUEVOS INGRESOS) */}
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Sparkles size={15} color="#8C6A2E" />
                        <span>Destacados — Nuevos Ingresos ({draftNewDropsList.length})</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Ordena o elige los corsets destacados en la portada y presiona Guardar cambios.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveFeaturedDrops}
                      className={`${styles.btnSave} ${dropsDirty ? styles.btnSaveDirty : ''}`}
                    >
                      <Save size={13} />
                      <span>Guardar cambios</span>
                    </button>
                  </div>

                  {nonDropProducts.length > 0 && (
                    <div style={{ display: 'flex', gap: '7px', marginBottom: '12px' }}>
                      <select
                        value={quickAddDropProdId}
                        onChange={(e) => setQuickAddDropProdId(e.target.value)}
                        className={styles.adminSelect}
                        style={{ flex: 1 }}
                      >
                        <option value="">Seleccionar corset para añadir a destacados...</option>
                        {nonDropProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!quickAddDropProdId}
                        onClick={handleAddDraftDrop}
                        className={styles.btnGhost}
                      >
                        <Plus size={13} />
                        <span>Añadir</span>
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '340px', overflowY: 'auto' }}>
                    {draftNewDropsList.map((prod, idx) => (
                      <div
                        key={prod.id}
                        className={`${styles.listRowItem} ${idx === 0 ? styles.listRowItemHighlight : ''}`}
                      >
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: idx === 0 ? '#FFFFFF' : '#8C6A2E',
                            background: idx === 0 ? '#8C6A2E' : '#F3EDE0',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            minWidth: '28px',
                            textAlign: 'center'
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <img
                          src={prod.images?.[0] || prod.image_url}
                          alt={prod.name}
                          style={{
                            width: '36px',
                            height: '44px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            flexShrink: 0,
                            border: '1px solid #E5E0D8'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#181514',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '0.71rem', color: '#575049' }}>
                            ${Number(prod.price || 0).toLocaleString('es-CL')} •{' '}
                            <span style={{ fontFamily: 'monospace' }}>{prod.sku}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveDraftDrop(idx, -1)}
                            title="Subir posición"
                            className={styles.iconBtnSmall}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draftNewDropsList.length - 1}
                            onClick={() => moveDraftDrop(idx, 1)}
                            title="Bajar posición"
                            className={styles.iconBtnSmall}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftDrop(prod.id)}
                            title="Quitar de destacados"
                            className={styles.btnDangerSoft}
                            style={{ width: '28px', height: '28px', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 2. CARRUSEL PRINCIPAL HERO (SLIDES 01, 02 Y 03) */}
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <ImageIcon size={15} color="#8C6A2E" />
                        <span>Carrusel de Portada — Slides 01, 02 y 03</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Personaliza las imágenes, títulos y botones del carrusel principal.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveHeroSlides}
                      className={`${styles.btnSave} ${slidesDirty ? styles.btnSaveDirty : ''}`}
                    >
                      <Save size={13} />
                      <span>Guardar cambios</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {draftSlides.map((slide, idx) => (
                      <div
                        key={slide.id}
                        style={{
                          background: '#FAF9F6',
                          border: '1px solid #E5E0D8',
                          borderRadius: '10px',
                          padding: '10px',
                          display: 'flex',
                          gap: '11px',
                          alignItems: 'stretch'
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '80px',
                            minHeight: '94px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid #D4CCC0'
                          }}
                        >
                          <img
                            src={slide.image}
                            alt={slide.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <label
                            title="Cambiar fotografía del slide"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(18, 15, 13, 0.52)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              color: '#FFFFFF',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Camera size={14} color="#E5C98B" />
                            <span>
                              {uploadingSlideId === slide.id ? 'Cargando...' : `Foto 0${idx + 1}`}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSlideImageUpload(slide.id, e)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={slide.tag || ''}
                              onChange={(e) => handleDraftSlideField(slide.id, { tag: e.target.value })}
                              placeholder="Etiqueta (Ej: Drop 01)"
                              className={styles.adminInput}
                              style={{
                                width: '112px',
                                height: '30px',
                                padding: '0 8px',
                                fontSize: '0.73rem',
                                color: '#8C6A2E',
                                fontWeight: 700
                              }}
                            />
                            <input
                              type="text"
                              value={slide.title || ''}
                              onChange={(e) => handleDraftSlideField(slide.id, { title: e.target.value })}
                              placeholder="Título principal..."
                              className={styles.adminInput}
                              style={{
                                flex: 1,
                                minWidth: '135px',
                                height: '30px',
                                padding: '0 8px',
                                fontSize: '0.77rem',
                                fontWeight: 700
                              }}
                            />
                          </div>

                          <input
                            type="text"
                            value={slide.subtitle || ''}
                            onChange={(e) => handleDraftSlideField(slide.id, { subtitle: e.target.value })}
                            placeholder="Subtítulo descriptivo..."
                            className={styles.adminInput}
                            style={{ width: '100%', height: '30px', padding: '0 8px', fontSize: '0.74rem' }}
                          />

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={slide.cta || ''}
                              onChange={(e) => handleDraftSlideField(slide.id, { cta: e.target.value })}
                              placeholder="Texto botón (Ej: Explorar)"
                              className={styles.adminInput}
                              style={{ flex: 1, minWidth: '115px', height: '30px', padding: '0 8px', fontSize: '0.73rem' }}
                            />
                            <select
                              value={slide.category || 'all'}
                              onChange={(e) => handleDraftSlideField(slide.id, { category: e.target.value })}
                              className={styles.adminSelect}
                              style={{ flex: 1, minWidth: '135px', height: '30px', padding: '0 8px', fontSize: '0.73rem' }}
                              title="Categoría que abre el botón"
                            >
                              <option value="all">Destino: Todo el Catálogo</option>
                              {realCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Destino: {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* =====================================================================
              PESTAÑA 2: RESUMEN (VENTAS, ÚLTIMOS PRODUCTOS VENDIDOS Y PEDIDOS)
             ===================================================================== */}
          {activeTab === 'resumen' && (
            <>
              <header className={styles.pageHeader}>
                <div>
                  <div className={styles.greetingTag}>
                    <BarChart3 size={12} /> MÉTRICAS COMERCIALES Y LOGÍSTICA
                  </div>
                  <h1 className={styles.pageTitle}>Resumen de Ventas y Pedidos</h1>
                  <p className={styles.pageSubtitle}>
                    Controla tus ingresos, las últimas prendas vendidas y el seguimiento en vivo para cada clienta.
                  </p>
                </div>
                <button type="button" onClick={openManualOrderModal} className={styles.btnPrimary}>
                  <Plus size={14} />
                  <span>Registrar Venta Manual</span>
                </button>
              </header>

              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Ingresos Totales</span>
                    <div className={styles.kpiIcon}><DollarSign size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>${totalRevenue.toLocaleString('es-CL')}</p>
                  <span className={styles.kpiSub}>Ticket promedio: ${avgOrderTicket.toLocaleString('es-CL')}</span>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Pedidos Totales</span>
                    <div className={styles.kpiIcon}><Truck size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>{orders.length}</p>
                  <span className={styles.kpiSub}>
                    {pendingOrdersCount} en proceso • {orders.length - pendingOrdersCount} entregados
                  </span>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Corsets Vendidos</span>
                    <div className={styles.kpiIcon}><ShoppingBag size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>{totalUnitsSold} uds.</p>
                  <span className={styles.kpiSub}>{recentlySoldItems.length} líneas registradas</span>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Cuentas y Alertas</span>
                    <div className={styles.kpiIcon}><Users size={15} /></div>
                  </div>
                  <p className={styles.kpiValue}>{users.length}</p>
                  <span className={styles.kpiSub}>{stockAlerts.length} aviso(s) de reposición</span>
                </div>
              </div>

              <div className={styles.twoColGrid}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <BarChart3 size={15} color="#8C6A2E" />
                        <span>Ventas por Línea de Corsetería</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Participación de ingresos según las categorías vendidas.
                      </p>
                    </div>
                  </div>

                  {salesByCategory.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#787067', margin: 0 }}>
                      Aún no hay ventas registradas.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {salesByCategory.map((row) => (
                        <div key={row.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.79rem', marginBottom: '5px' }}>
                            <strong style={{ color: '#181514' }}>{row.name}</strong>
                            <span style={{ color: '#8C6A2E', fontWeight: 700 }}>
                              ${row.revenue.toLocaleString('es-CL')} ({row.units} {row.units === 1 ? 'ud.' : 'uds.'})
                            </span>
                          </div>
                          <div style={{ height: '8px', borderRadius: '999px', background: '#EDE9E1', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${row.pct}%`,
                                height: '100%',
                                borderRadius: '999px',
                                background: 'linear-gradient(90deg, #8C6A2E 0%, #C8A96B 100%)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <ShoppingBag size={15} color="#8C6A2E" />
                        <span>Últimos Productos Vendidos ({recentlySoldItems.length})</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Detalle en vivo de cada prenda vendida con talla, color y clienta.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                    {recentlySoldItems.map((sold) => (
                      <div key={sold.uniqueKey} className={styles.listRowItem} style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <img
                            src={sold.image}
                            alt={sold.productName}
                            style={{ width: '38px', height: '46px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid #E5E0D8' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.81rem', fontWeight: 700, color: '#181514', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sold.productName}
                            </div>
                            <div style={{ fontSize: '0.71rem', color: '#8C6A2E', fontWeight: 600, marginTop: '1px' }}>
                              Talla <strong>{sold.selectedSize}</strong> • {sold.selectedColor} • x{sold.quantity}
                            </div>
                            <div style={{ fontSize: '0.69rem', color: '#575049' }}>
                              {sold.customerName} (<span style={{ fontFamily: 'monospace' }}>#{sold.orderNumber}</span>)
                            </div>
                          </div>
                        </div>

                        <strong style={{ fontSize: '0.85rem', color: '#065F46', flexShrink: 0 }}>
                          ${sold.subtotal.toLocaleString('es-CL')}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>
                      <Truck size={15} color="#8C6A2E" />
                      <span>Pedidos y Seguimiento en Tiempo Real ({filteredOrders.length})</span>
                    </h2>
                    <p className={styles.sectionDesc}>
                      Cada cambio de etapa o guía se refleja al instante en la cuenta de la clienta.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: `Todos (${orders.length})` },
                      { id: 'pending', label: `En Proceso (${pendingOrdersCount})` },
                      { id: 'delivered', label: `Entregados (${orders.length - pendingOrdersCount})` }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOrderFilter(f.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: orderFilter === f.id ? '1px solid #181514' : '1px solid #D4CCC0',
                          background: orderFilter === f.id ? '#181514' : '#FFFFFF',
                          color: orderFilter === f.id ? '#FFFFFF' : '#575049'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredOrders.map((order) => {
                    const currentStageIdx = orderStages.findIndex((s) => s.id === order.status);
                    const currentStageLabel = orderStages[currentStageIdx]?.label || order.status;
                    const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
                    const waUrl = cleanPhone
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `¡Hola ${order.customerName}! Te escribimos de JAZYALON. Tu pedido #${order.orderNumber} está en etapa: "${currentStageLabel}". Código de seguimiento: ${order.trackingCode}`
                        )}`
                      : null;

                    return (
                      <div
                        key={order.id}
                        style={{
                          background: '#FAF9F6',
                          border: order.autoMode ? '1.5px solid #8C6A2E' : '1px solid #E5E0D8',
                          borderRadius: '12px',
                          padding: '14px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginBottom: '12px',
                            paddingBottom: '10px',
                            borderBottom: '1px solid #E5E0D8'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#8C6A2E', fontSize: '0.84rem' }}>
                              #{order.orderNumber || order.id}
                            </span>
                            <strong style={{ color: '#181514', fontSize: '0.88rem' }}>
                              {order.customerName}
                            </strong>
                            <span style={{ color: '#575049', fontSize: '0.75rem' }}>
                              ({order.customerEmail})
                            </span>
                            {order.comuna && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: '#FFFFFF',
                                  border: '1px solid #E5E0D8',
                                  color: '#575049',
                                  fontWeight: 600
                                }}
                              >
                                📍 {order.comuna} • {(order.carrier || 'starken').toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={
                                trackingDrafts[order.id] !== undefined
                                  ? trackingDrafts[order.id]
                                  : order.trackingCode || ''
                              }
                              onChange={(e) =>
                                setTrackingDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))
                              }
                              onBlur={() => handleSaveOrderTracking(order)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveOrderTracking(order)}
                              placeholder="Código guía..."
                              className={styles.adminInput}
                              style={{ width: '132px', height: '30px', padding: '0 8px', fontSize: '0.73rem', fontFamily: 'monospace' }}
                              title="Edita el número de seguimiento y presiona Enter"
                            />

                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.btnGhost}
                                style={{
                                  height: '30px',
                                  padding: '0 10px',
                                  fontSize: '0.72rem',
                                  textDecoration: 'none',
                                  color: '#065F46',
                                  borderColor: '#A7F3D0',
                                  background: '#ECFDF5'
                                }}
                              >
                                <MessageCircle size={13} />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleOrderAutoMode && toggleOrderAutoMode(order.id)}
                              className={order.autoMode ? styles.btnPrimary : styles.btnGhost}
                              style={{ height: '30px', padding: '0 10px', fontSize: '0.72rem' }}
                            >
                              <Zap size={12} />
                              <span>{order.autoMode ? 'Auto-Avance ON' : 'Auto-Avance'}</span>
                            </button>

                            <strong style={{ fontSize: '0.92rem', color: '#181514', marginLeft: '4px' }}>
                              ${Number(order.total || 0).toLocaleString('es-CL')}
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '7px' }}>
                          {orderStages.map((stage, idx) => {
                            const isCurrent = order.status === stage.id;
                            const isCompleted = idx <= currentStageIdx;
                            return (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => updateOrderStatus(order.id, stage.id)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.14s ease',
                                  border: isCurrent
                                    ? '1.5px solid #8C6A2E'
                                    : isCompleted
                                      ? '1px solid #A7F3D0'
                                      : '1px solid #E5E0D8',
                                  background: isCurrent
                                    ? '#FBF7EE'
                                    : isCompleted
                                      ? '#ECFDF5'
                                      : '#FFFFFF',
                                  color: isCurrent ? '#181514' : isCompleted ? '#065F46' : '#787067'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6rem', fontWeight: 800 }}>
                                  <span>ETAPA 0{idx + 1}</span>
                                  {isCompleted && <Check size={11} />}
                                </div>
                                <div style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '2px' }}>
                                  {stage.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className={styles.twoColGrid}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Bell size={15} color="#8C6A2E" />
                        <span>Solicitudes de Reposición ({stockAlerts.length})</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Clientas que dejaron su correo en una talla agotada.
                      </p>
                    </div>
                  </div>

                  {stockAlerts.length === 0 ? (
                    <p style={{ color: '#787067', fontSize: '0.8rem', margin: 0 }}>
                      No hay solicitudes pendientes en este momento.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stockAlerts.map((alert, i) => {
                        const targetProd = products.find((p) => p.id === alert.productId);
                        return (
                          <div
                            key={alert.id || i}
                            className={styles.listRowItem}
                            style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}
                          >
                            <div>
                              <strong style={{ color: '#181514', fontSize: '0.81rem' }}>{alert.productName}</strong>
                              <span style={{ color: '#8C6A2E', fontSize: '0.75rem', fontWeight: 700, marginLeft: '8px' }}>
                                Talla {alert.size} • {alert.color}
                              </span>
                              <div style={{ color: '#575049', fontSize: '0.72rem', marginTop: '2px' }}>
                                Correo: <strong>{alert.email}</strong>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              {targetProd && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openHoneCatalogWithAction({
                                      category: targetProd.category || 'all',
                                      viewMode: 'table',
                                      editProduct: targetProd
                                    })
                                  }
                                  className={styles.btnGhost}
                                  style={{ height: '28px', padding: '0 9px', fontSize: '0.71rem' }}
                                >
                                  Reponer
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResolveStockAlert(alert.id || i)}
                                className={styles.btnPrimary}
                                style={{ height: '28px', padding: '0 9px', fontSize: '0.71rem' }}
                              >
                                <Check size={12} />
                                <span>Atendida</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Users size={15} color="#8C6A2E" />
                        <span>Cuentas Registradas ({users.length})</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Usuarias registradas de forma segura en la tienda.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '240px', overflowY: 'auto' }}>
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className={styles.listRowItem}
                        style={{ justifyContent: 'space-between' }}
                      >
                        <div>
                          <strong style={{ color: '#181514', fontSize: '0.81rem' }}>{u.name}</strong>
                          <div style={{ color: '#575049', fontSize: '0.72rem' }}>
                            {u.email} {u.phone ? `• ${u.phone}` : ''}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: u.role === 'admin' ? '#181514' : '#EDE9E1',
                            color: u.role === 'admin' ? '#FFFFFF' : '#575049',
                            fontWeight: 800
                          }}
                        >
                          {u.role === 'admin' ? 'ADMIN' : 'CLIENTA'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* =====================================================================
              PESTAÑA 3: COLECCIONES (TARJETAS LIMPIAS + PRODUCTOS CUADRO POR CUADRO)
             ===================================================================== */}
          {activeTab === 'colecciones' && (
            <>
              <header className={styles.pageHeader}>
                <div>
                  <div className={styles.greetingTag}>
                    <Layers size={12} /> SINCRONIZADO EN TIEMPO REAL CON HONE CATALOG
                  </div>
                  <h1 className={styles.pageTitle}>Colecciones y Prendas</h1>
                  <p className={styles.pageSubtitle}>
                    Elige una colección para ver sus prendas cuadro por cuadro, subir un nuevo corset o editar tallas, precio y stock.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => openSimpleCollectionProductModal(null, activeGroup)}
                    className={styles.btnPrimary}
                  >
                    <Plus size={14} />
                    <span>{activeGroup ? `+ Corset en "${activeGroup.name}"` : '+ Corset'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openHoneCatalogWithAction({
                        category: activeGroup ? activeGroup.categoryId : 'all',
                        viewMode: 'table',
                        openNewModal: false
                      })
                    }
                    className={styles.btnGhost}
                  >
                    <Database size={14} />
                    <span>Abrir en HONE Catalog</span>
                  </button>
                </div>
              </header>

              {/* Barra compacta para crear nueva colección */}
              <form
                onSubmit={handleQuickCreateCategoryAndCollection}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E0D8',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  flexWrap: 'wrap',
                  boxShadow: '0 1px 4px rgba(24,21,20,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#181514', fontWeight: 700, fontSize: '0.8rem' }}>
                  <FolderPlus size={15} color="#8C6A2E" />
                  <span>Nueva Colección:</span>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Nombre (Ej: Corsets Novia)"
                  value={quickColName}
                  onChange={(e) => setQuickColName(e.target.value)}
                  className={styles.adminInput}
                  style={{ flex: '1 1 170px' }}
                />

                <input
                  type="text"
                  placeholder="Subtítulo opcional para la web"
                  value={quickColSubtitle}
                  onChange={(e) => setQuickColSubtitle(e.target.value)}
                  className={styles.adminInput}
                  style={{ flex: '1.4 1 200px' }}
                />

                <label className={styles.btnGhost} style={{ cursor: 'pointer' }}>
                  <Camera size={14} color="#8C6A2E" />
                  <span>
                    {uploadingQuickColImg
                      ? 'Cargando...'
                      : quickColImage
                        ? '✓ Portada lista'
                        : 'Subir portada'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQuickColImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <button type="submit" className={styles.btnPrimary}>
                  <Plus size={14} />
                  <span>Crear Colección</span>
                </button>
              </form>

              {/* Tarjetas Limpias de Colecciones: Imagen + Cantidad de diseños + Editar + (+ Corset) */}
              <div className={styles.collectionWebGrid}>
                {unifiedCategoryCollections.map((group) => {
                  const isSelected = selectedGroupKey === group.key;

                  return (
                    <div
                      key={group.key}
                      onClick={() => setSelectedGroupKey(isSelected ? 'ALL' : group.key)}
                      className={`${styles.collectionWebCard} ${
                        isSelected ? styles.collectionWebCardSelected : ''
                      }`}
                    >
                      <div className={styles.collectionWebCover}>
                        <img
                          src={group.coverImage}
                          alt={group.name}
                          className={styles.collectionWebCoverImg}
                        />
                        <div className={styles.collectionWebShade} />

                        {group.isPrimaryFeatured && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '10px',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              background: '#C8A96B',
                              color: '#181514',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Star size={10} fill="#181514" />
                            <span>PRINCIPAL</span>
                          </span>
                        )}

                        <div style={{ position: 'absolute', bottom: '11px', left: '12px', right: '12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              marginBottom: '4px',
                              background: isSelected ? '#C8A96B' : 'rgba(0,0,0,0.68)',
                              color: isSelected ? '#181514' : '#E5C98B',
                              border: '1px solid rgba(200,169,107,0.45)'
                            }}
                          >
                            {group.products.length} {group.products.length === 1 ? 'diseño' : 'diseños'}
                          </span>

                          <h3
                            style={{
                              margin: 0,
                              fontSize: '1rem',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px'
                            }}
                          >
                            {group.name}
                          </h3>
                        </div>
                      </div>

                      <div
                        className={styles.collectionCleanFooter}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => openCollectionEditModal(group, e)}
                          className={styles.btnGhost}
                          style={{ flex: 1, height: '31px', fontSize: '0.74rem' }}
                        >
                          <Edit3 size={13} />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => openSimpleCollectionProductModal(null, group, e)}
                          className={styles.btnPrimary}
                          style={{ flex: 1, height: '31px', fontSize: '0.74rem' }}
                        >
                          <Plus size={13} />
                          <span>+ Corset</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Prendas por Colección — Formato Cuadro por Cuadro */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8C6A2E', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                      VISTA CUADRO POR CUADRO • PRENDA POR PRENDA
                    </span>
                    <h2 style={{ margin: '3px 0 0', fontSize: '1.08rem', color: '#181514', fontWeight: 800 }}>
                      {activeGroup
                        ? `Colección "${activeGroup.name}" (${displayedCollectionProducts.length})`
                        : `Todas las Prendas (${displayedCollectionProducts.length})`}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      placeholder="Buscar prenda o SKU..."
                      className={styles.adminInput}
                      style={{ width: '185px', height: '32px', fontSize: '0.76rem' }}
                    />

                    {activeGroup && !activeGroup.isSpecialDestacados && (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <select
                          value={assignExistingProdId}
                          onChange={(e) => setAssignExistingProdId(e.target.value)}
                          className={styles.adminSelect}
                          style={{ maxWidth: '215px', height: '32px', fontSize: '0.74rem' }}
                        >
                          <option value="">+ Traer corset existente aquí...</option>
                          {products
                            .filter((p) => !activeGroup.products.some((gp) => gp.id === p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                        </select>
                        {assignExistingProdId && (
                          <button
                            type="button"
                            onClick={handleAssignExistingCorsetToActiveGroup}
                            className={styles.btnPrimary}
                            style={{ height: '32px', padding: '0 11px', fontSize: '0.73rem' }}
                          >
                            Incluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '15px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupKey('ALL')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: selectedGroupKey === 'ALL' ? '1px solid #181514' : '1px solid #D4CCC0',
                      background: selectedGroupKey === 'ALL' ? '#181514' : '#FFFFFF',
                      color: selectedGroupKey === 'ALL' ? '#FFFFFF' : '#575049'
                    }}
                  >
                    Todas ({products.length})
                  </button>
                  {unifiedCategoryCollections.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setSelectedGroupKey(g.key)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: selectedGroupKey === g.key ? '1px solid #181514' : '1px solid #D4CCC0',
                        background: selectedGroupKey === g.key ? '#181514' : '#FFFFFF',
                        color: selectedGroupKey === g.key ? '#FFFFFF' : '#575049'
                      }}
                    >
                      {g.name} ({g.products.length})
                    </button>
                  ))}
                </div>

                {displayedCollectionProducts.length === 0 ? (
                  <div
                    style={{
                      padding: '30px',
                      textAlign: 'center',
                      borderRadius: '12px',
                      border: '1px dashed #D4CCC0',
                      background: '#FAF9F6'
                    }}
                  >
                    <p style={{ color: '#575049', fontSize: '0.85rem', marginBottom: '12px' }}>
                      No hay corsets en esta colección todavía.
                    </p>
                    <button
                      type="button"
                      onClick={() => openSimpleCollectionProductModal(null, activeGroup)}
                      className={styles.btnPrimary}
                    >
                      <Plus size={14} />
                      <span>+ Corset en esta Colección</span>
                    </button>
                  </div>
                ) : (
                  <div className={styles.productsSyncGrid}>
                    {displayedCollectionProducts.map((product) => {
                      const isPrimaryHere =
                        (activeGroup && activeGroup.primaryProduct?.id === product.id) ||
                        (!activeGroup && product.isCollectionPrimary);
                      const mainImg =
                        product.images?.[0] ||
                        product.image_url ||
                        '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg';
                      const oldP = Number(product.old_price || product.oldPrice || 0);
                      const curP = Number(product.price || 0);
                      const hasDisc = oldP > curP && curP > 0;
                      const discPct =
                        product.discount ||
                        (hasDisc ? Math.round(((oldP - curP) / oldP) * 100) : 0);
                      const stockNum = Number(product.stock ?? 0);

                      return (
                        <div
                          key={product.id}
                          className={`${styles.productSquareCard} ${
                            isPrimaryHere ? styles.productSquareCardPrimary : ''
                          }`}
                        >
                          <div className={styles.productSquareMedia}>
                            <img
                              src={mainImg}
                              alt={product.name}
                              className={styles.productSquareImg}
                            />
                            <div className={styles.productSquareBadges}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {isPrimaryHere && (
                                  <span
                                    style={{
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      background: '#181514',
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    ♛ #1
                                  </span>
                                )}
                                {hasDisc && (
                                  <span
                                    style={{
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      background: '#059669',
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    -{discPct}%
                                  </span>
                                )}
                              </div>

                              {product.is_active === false && (
                                <span
                                  style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    background: '#FFF1F2',
                                    border: '1px solid #FECDD3',
                                    color: '#BE123C'
                                  }}
                                >
                                  OCULTO
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={styles.productSquareBody}>
                            <h3 className={styles.productSquareTitle} title={product.name}>
                              {product.name}
                            </h3>

                            <div className={styles.productSquareMetaRow}>
                              <div>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#181514' }}>
                                  ${curP.toLocaleString('es-CL')}
                                </span>
                                {hasDisc && (
                                  <span
                                    style={{
                                      fontSize: '0.71rem',
                                      color: '#8A8178',
                                      textDecoration: 'line-through',
                                      marginLeft: '5px'
                                    }}
                                  >
                                    ${oldP.toLocaleString('es-CL')}
                                  </span>
                                )}
                              </div>

                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background:
                                    stockNum <= 0
                                      ? '#FFF1F2'
                                      : stockNum <= 3
                                      ? '#FEF3C7'
                                      : '#ECFDF5',
                                  color:
                                    stockNum <= 0
                                      ? '#BE123C'
                                      : stockNum <= 3
                                      ? '#B45309'
                                      : '#065F46'
                                }}
                              >
                                {stockNum <= 0 ? 'Agotado' : `${stockNum} en stock`}
                              </span>
                            </div>

                            <div className={styles.productSquareActions}>
                              <button
                                type="button"
                                onClick={(e) =>
                                  openSimpleCollectionProductModal(product, activeGroup, e)
                                }
                                className={styles.btnGhost}
                                style={{ height: '30px', fontSize: '0.74rem', width: '100%' }}
                              >
                                <Edit3 size={12} />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar "${product.name}" del catálogo?`)) {
                                    deleteProduct(product.id);
                                  }
                                }}
                                className={styles.btnDangerSoft}
                                style={{ height: '30px', padding: '0 9px' }}
                                title="Eliminar prenda"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* =====================================================================
              PESTAÑA 4: HONE CATALOG (CATÁLOGO MAESTRO)
             ===================================================================== */}
          {activeTab === 'hone-catalog' && (
            <HoneCatalog
              customSupabaseClient={supabase}
              externalProducts={products}
              externalCategories={realCategories}
              externalCollections={collections.map((c) => ({ ...c, name: c.name || c.title }))}
              onAddProduct={addProduct}
              onAddMultipleProducts={addMultipleProducts}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onAddCategory={addCategory}
              onAddCollection={addCollection}
              onSetPrimaryCorset={setPrimaryCorsetForCollection}
              initialCategory={honeInitialCategory}
              initialViewMode={honeInitialViewMode}
              autoOpenNewModal={honeAutoOpenNewModal}
              autoEditProduct={honeAutoEditProduct}
              onConsumeAutoAction={() => {
                setHoneAutoOpenNewModal(false);
                setHoneAutoEditProduct(null);
              }}
            />
          )}

          {/* =====================================================================
              PESTAÑA 5: BENEFICIOS & OTROS (CUPONES, CONDICIONES Y NOTIFICACIONES)
             ===================================================================== */}
          {activeTab === 'beneficios' && (
            <>
              <header className={styles.pageHeader}>
                <div>
                  <div className={styles.greetingTag}>
                    <Gift size={12} /> FIDELIZACIÓN, CUPONES Y AVISOS A SUSCRITAS
                  </div>
                  <h1 className={styles.pageTitle}>Beneficios & Otros</h1>
                  <p className={styles.pageSubtitle}>
                    Configura el cupón de bienvenida y sus condiciones, además de las notificaciones automáticas para las personas suscritas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrepareNewCoupon}
                  className={styles.btnPrimary}
                >
                  <Plus size={14} />
                  <span>Nuevo Cupón</span>
                </button>
              </header>

              {/* BLOQUE 1: CUPONES Y CONDICIONES CONFIGURABLES */}
              <div className={styles.twoColGrid}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Tag size={15} color="#8C6A2E" />
                        <span>Cupones de la Tienda ({coupons.length})</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Selecciona un cupón como <strong>antonella10</strong> para editar sus reglas o actívalo/páusalo.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {coupons.map((c) => {
                      const isSelectedCoupon = editingCouponCode === c.code;
                      return (
                        <div
                          key={c.code}
                          className={styles.couponCard}
                          style={{
                            borderColor: isSelectedCoupon ? '#8C6A2E' : undefined,
                            background: isSelectedCoupon ? '#FBF7EE' : undefined
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className={styles.couponCodePill}>{c.code}</span>
                              <span
                                style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  color: '#065F46',
                                  background: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  padding: '2px 8px',
                                  borderRadius: '999px'
                                }}
                              >
                                -{c.discountPercent}% OFF
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#575049' }}>
                                Usos: <strong>{c.usedCount || 0}</strong>
                                {c.maxUses ? ` / ${c.maxUses}` : ''}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => toggleCouponActive && toggleCouponActive(c.code)}
                                style={{
                                  padding: '3px 9px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: c.isActive !== false ? '1px solid #86EFAC' : '1px solid #D4CCC0',
                                  background: c.isActive !== false ? '#ECFDF5' : '#F3F1EC',
                                  color: c.isActive !== false ? '#065F46' : '#575049'
                                }}
                              >
                                {c.isActive !== false ? '● Activo' : '○ Pausado'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectCouponToEdit(c)}
                                className={styles.btnGhost}
                                style={{ height: '28px', padding: '0 9px', fontSize: '0.72rem' }}
                              >
                                <Edit3 size={12} />
                                <span>Condiciones</span>
                              </button>

                              {c.code !== 'antonella10' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar el cupón "${c.code}"?`)) {
                                      deleteCoupon && deleteCoupon(c.code);
                                    }
                                  }}
                                  className={styles.btnDangerSoft}
                                  style={{ height: '28px', padding: '0 7px' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {c.description && (
                            <p style={{ margin: 0, fontSize: '0.76rem', color: '#575049' }}>
                              {c.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {c.requireSubscription && (
                              <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#EDE6D8', color: '#7A5B25' }}>
                                ✓ Requiere estar suscrita
                              </span>
                            )}
                            {c.firstPurchaseOnly && (
                              <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#EDE6D8', color: '#7A5B25' }}>
                                ✓ Solo 1ª compra
                              </span>
                            )}
                            {Number(c.minPurchase || 0) > 0 && (
                              <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#F3F1EC', color: '#575049' }}>
                                Compra mín. ${Number(c.minPurchase).toLocaleString('es-CL')}
                              </span>
                            )}
                            {c.expiresAt && (
                              <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#F3F1EC', color: '#575049' }}>
                                Vence: {String(c.expiresAt).slice(0, 10)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Percent size={15} color="#8C6A2E" />
                        <span>
                          {editingCouponCode
                            ? `Configurar Condiciones de "${editingCouponCode}"`
                            : 'Crear Nuevo Cupón de Descuento'}
                        </span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Define qué requisitos debe cumplir la clienta al pagar para usar este código.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveCouponSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          Código del cupón *
                        </label>
                        <input
                          type="text"
                          required
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                          placeholder="antonella10"
                          className={styles.adminInput}
                          style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          % de Descuento *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          required
                          value={couponForm.discountPercent}
                          onChange={(e) => setCouponForm({ ...couponForm, discountPercent: e.target.value })}
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                        Descripción interna o beneficio
                      </label>
                      <input
                        type="text"
                        value={couponForm.description}
                        onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                        placeholder="Ej: 10% de descuento en tu primera compra"
                        className={styles.adminInput}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Switches de Condiciones */}
                    <div
                      style={{
                        background: '#FAF9F6',
                        border: '1px solid #E5E0D8',
                        borderRadius: '10px',
                        padding: '11px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '9px'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#181514' }}>
                        <input
                          type="checkbox"
                          checked={couponForm.requireSubscription}
                          onChange={(e) => setCouponForm({ ...couponForm, requireSubscription: e.target.checked })}
                        />
                        <span>Exigir que la clienta esté suscrita con su correo</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#181514' }}>
                        <input
                          type="checkbox"
                          checked={couponForm.firstPurchaseOnly}
                          onChange={(e) => setCouponForm({ ...couponForm, firstPurchaseOnly: e.target.checked })}
                        />
                        <span>Válido únicamente en su primera compra</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#065F46' }}>
                        <input
                          type="checkbox"
                          checked={couponForm.isActive}
                          onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                        />
                        <span>Cupón habilitado y activo en el carrito</span>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          Compra mín. (CLP)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={couponForm.minPurchase}
                          onChange={(e) => setCouponForm({ ...couponForm, minPurchase: e.target.value })}
                          placeholder="0"
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          Límite de usos
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={couponForm.maxUses}
                          onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                          placeholder="Ilimitado"
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          Vence el
                        </label>
                        <input
                          type="date"
                          value={couponForm.expiresAt}
                          onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button type="submit" className={styles.btnPrimary}>
                        <Save size={14} />
                        <span>Guardar cupón y condiciones</span>
                      </button>
                    </div>
                  </form>
                </section>
              </div>

              {/* BLOQUE 2: REGLAS DE NOTIFICACIONES AUTOMÁTICAS + TEXTOS SECCIÓN BENEFICIOS */}
              <div className={styles.twoColGrid}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Bell size={15} color="#8C6A2E" />
                        <span>Notificaciones Automáticas a Suscritas</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        El sitio enviará alertas automáticas a las personas suscritas cuando ocurran estos eventos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveBenefitsSettings}
                      className={`${styles.btnSave} ${benefitsDirty ? styles.btnSaveDirty : ''}`}
                    >
                      <Save size={13} />
                      <span>Guardar cambios</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    <label className={styles.listRowItem} style={{ justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div>
                        <strong style={{ fontSize: '0.81rem', color: '#181514', display: 'block' }}>
                          1. Cuando un producto baje de precio
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#575049' }}>
                          Notifica automáticamente al aplicar un descuento o rebajar el precio de un corset.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={benefitsDraft.notifyOnPriceDrop !== false}
                        onChange={(e) => handleBenefitsField({ notifyOnPriceDrop: e.target.checked })}
                      />
                    </label>

                    <label className={styles.listRowItem} style={{ justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div>
                        <strong style={{ fontSize: '0.81rem', color: '#181514', display: 'block' }}>
                          2. Cuando se suba una nueva colección
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#575049' }}>
                          Envía invitación automática a las suscritas al publicar una colección nueva.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={benefitsDraft.notifyOnNewCollection !== false}
                        onChange={(e) => handleBenefitsField({ notifyOnNewCollection: e.target.checked })}
                      />
                    </label>

                    <div className={styles.listRowItem} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={benefitsDraft.notifyOnLowStock !== false}
                          onChange={(e) => handleBenefitsField({ notifyOnLowStock: e.target.checked })}
                          style={{ marginTop: '3px' }}
                        />
                        <div>
                          <strong style={{ fontSize: '0.81rem', color: '#181514', display: 'block' }}>
                            3. Cuando quede un producto con pocas unidades
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: '#575049' }}>
                            Avisa de últimas unidades cuando el stock baje al umbral configurado.
                          </span>
                        </div>
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8C6A2E' }}>≤</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={benefitsDraft.lowStockThreshold ?? 3}
                          onChange={(e) => handleBenefitsField({ lowStockThreshold: e.target.value })}
                          className={styles.adminInput}
                          style={{ width: '58px', height: '30px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#575049' }}>uds.</span>
                      </div>
                    </div>
                  </div>

                  {/* Edición de Textos del Bloque 07 Beneficios en la Web */}
                  <div style={{ borderTop: '1px solid #E5E0D8', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8C6A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Textos del Bloque &quot;Beneficios&quot; en la Tienda
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '3px' }}>
                          Encabezado superior
                        </label>
                        <input
                          type="text"
                          value={benefitsDraft.badgeText || ''}
                          onChange={(e) => handleBenefitsField({ badgeText: e.target.value })}
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '3px' }}>
                          Cupón mostrado
                        </label>
                        <select
                          value={benefitsDraft.featuredCouponCode || 'antonella10'}
                          onChange={(e) => handleBenefitsField({ featuredCouponCode: e.target.value })}
                          className={styles.adminSelect}
                          style={{ width: '100%' }}
                        >
                          {coupons.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code} (-{c.discountPercent}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '3px' }}>
                        Título principal
                      </label>
                      <input
                        type="text"
                        value={benefitsDraft.title || ''}
                        onChange={(e) => handleBenefitsField({ title: e.target.value })}
                        className={styles.adminInput}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#575049', marginBottom: '3px' }}>
                        Texto descriptivo antes del código
                      </label>
                      <input
                        type="text"
                        value={benefitsDraft.subtitle || ''}
                        onChange={(e) => handleBenefitsField({ subtitle: e.target.value })}
                        className={styles.adminInput}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </section>

                {/* SUSCRITAS + HISTORIAL DE NOTIFICACIONES ENVIADAS */}
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <Users size={15} color="#8C6A2E" />
                        <span>Personas Suscritas ({subscribers.length}) y Avisos Enviados</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Lista de correos suscritos y registro en vivo de notificaciones disparadas.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleManualAddSubscriber} style={{ display: 'flex', gap: '7px', marginBottom: '12px' }}>
                    <input
                      type="email"
                      required
                      value={newSubscriberEmail}
                      onChange={(e) => setNewSubscriberEmail(e.target.value)}
                      placeholder="Añadir correo suscrito manualmente..."
                      className={styles.adminInput}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className={styles.btnGhost}>
                      <Plus size={13} />
                      <span>Suscribir</span>
                    </button>
                  </form>

                  {subscribers.length === 0 ? (
                    <div style={{ padding: '12px', borderRadius: '9px', background: '#FAF9F6', border: '1px dashed #D4CCC0', fontSize: '0.76rem', color: '#575049', marginBottom: '14px' }}>
                      Aún no hay correos suscritos. Cuando una clienta se registre en &quot;Únete a Nuestra Comunidad&quot;, aparecerá aquí automáticamente.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', marginBottom: '14px' }}>
                      {subscribers.map((sub) => (
                        <div key={sub.email} className={styles.listRowItem} style={{ justifyContent: 'space-between', padding: '7px 10px' }}>
                          <div>
                            <strong style={{ fontSize: '0.78rem', color: '#181514' }}>{sub.email}</strong>
                            <span style={{ fontSize: '0.68rem', color: '#065F46', marginLeft: '8px', fontWeight: 700 }}>
                              ● Activa
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSubscriber && removeSubscriber(sub.email)}
                            className={styles.btnDangerSoft}
                            style={{ height: '24px', padding: '0 7px', fontSize: '0.68rem' }}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Enviar Aviso Manual Rápido */}
                  <form
                    onSubmit={handleSendManualNotification}
                    style={{
                      background: '#FAF9F6',
                      border: '1px solid #E5E0D8',
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                      marginBottom: '12px'
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8C6A2E', textTransform: 'uppercase' }}>
                      Enviar notificación directa a suscritas
                    </span>
                    <input
                      type="text"
                      required
                      value={manualNotifTitle}
                      onChange={(e) => setManualNotifTitle(e.target.value)}
                      placeholder="Título (Ej: Nuevo Drop Disponible Hoy)"
                      className={styles.adminInput}
                      style={{ height: '31px', fontSize: '0.76rem' }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        required
                        value={manualNotifMsg}
                        onChange={(e) => setManualNotifMsg(e.target.value)}
                        placeholder="Mensaje corto para las personas suscritas..."
                        className={styles.adminInput}
                        style={{ flex: 1, height: '31px', fontSize: '0.76rem' }}
                      />
                      <button type="submit" className={styles.btnPrimary} style={{ height: '31px', fontSize: '0.73rem' }}>
                        <Bell size={12} />
                        <span>Enviar</span>
                      </button>
                    </div>
                  </form>

                  {/* Historial de notificaciones */}
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#575049', textTransform: 'uppercase', marginBottom: '7px' }}>
                      Últimas notificaciones enviadas ({subscriberNotifications.length})
                    </span>
                    {subscriberNotifications.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#787067' }}>
                        Aún no se han disparado notificaciones. Prueba rebajando el precio de una prenda, dejando stock bajo o creando una colección.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '175px', overflowY: 'auto' }}>
                        {subscriberNotifications.slice(0, 12).map((n) => {
                          const tagLabel =
                            n.eventType === 'price_drop'
                              ? 'Baja de precio'
                              : n.eventType === 'new_collection'
                              ? 'Nueva colección'
                              : n.eventType === 'low_stock'
                              ? 'Pocas unidades'
                              : 'Aviso directo';
                          return (
                            <div key={n.id} className={styles.listRowItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '3px', padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8C6A2E', textTransform: 'uppercase' }}>
                                  {tagLabel} • {n.recipientCount ?? subscribers.length} suscrita(s)
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#8A8178' }}>
                                  {n.createdAt
                                    ? new Date(n.createdAt).toLocaleTimeString('es-CL', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : ''}
                                </span>
                              </div>
                              <strong style={{ fontSize: '0.78rem', color: '#181514' }}>{n.title}</strong>
                              <span style={{ fontSize: '0.72rem', color: '#575049' }}>{n.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* =====================================================================
              PESTAÑA 6: CONFIGURACIÓN WEB (MANTENIMIENTO, BARRA SUPERIOR Y ACCESOS)
             ===================================================================== */}
          {activeTab === 'configuracion' && (
            <>
              <header className={styles.pageHeader}>
                <div>
                  <div className={styles.greetingTag}>
                    <Settings size={12} /> AJUSTES GENERALES DEL SITIO WEB
                  </div>
                  <h1 className={styles.pageTitle}>Configuración web</h1>
                  <p className={styles.pageSubtitle}>
                    Configura el Modo Mantenimiento, edita los textos de la barra superior de la tienda y administra los accesos por correo.
                  </p>
                </div>
              </header>

              {/* 1. Panel Exclusivo de Modo Mantenimiento y Contador */}
              {renderMaintenanceControlPanel({ isFullPage: true })}

              {/* 2. Textos de la Barra Superior de la Web (Imagen 2) */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>
                      <Sparkles size={15} color="#8C6A2E" />
                      <span>Textos de la Barra Superior de la Tienda ({announcementDraft.length})</span>
                    </h2>
                    <p className={styles.sectionDesc}>
                      Modifica, ordena o añade los mensajes rotativos que aparecen arriba del encabezado negro en el sitio web.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAnnouncements}
                    className={`${styles.btnSave} ${announcementDirty ? styles.btnSaveDirty : ''}`}
                  >
                    <Save size={13} />
                    <span>Guardar cambios</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {announcementDraft.map((line, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#8C6A2E',
                          minWidth: '24px',
                          textAlign: 'center'
                        }}
                      >
                        0{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={line}
                        onChange={(e) => handleUpdateAnnouncementLine(idx, e.target.value)}
                        placeholder="Escribe el texto del anuncio superior..."
                        className={styles.adminInput}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveAnnouncementLine(idx, -1)}
                        className={styles.iconBtnSmall}
                        title="Subir"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === announcementDraft.length - 1}
                        onClick={() => handleMoveAnnouncementLine(idx, 1)}
                        className={styles.iconBtnSmall}
                        title="Bajar"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnnouncementLine(idx)}
                        className={styles.btnDangerSoft}
                        style={{ height: '28px', padding: '0 8px' }}
                        title="Quitar texto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newAnnouncementText}
                    onChange={(e) => setNewAnnouncementText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAnnouncementLine();
                      }
                    }}
                    placeholder="Añadir otra frase a la barra superior (Ej: NUEVO DROP DISPONIBLE ESTE VIERNES)..."
                    className={styles.adminInput}
                    style={{ flex: 1, minWidth: '240px' }}
                  />
                  <button type="button" onClick={handleAddAnnouncementLine} className={styles.btnGhost}>
                    <Plus size={14} />
                    <span>Añadir frase</span>
                  </button>
                </div>
              </section>

              {/* 3. Gestión de Accesos al Panel de Administración por Correo */}
              <div className={styles.twoColGrid}>
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <UserPlus size={15} color="#8C6A2E" />
                        <span>Añadir Acceso al Panel (por correo)</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Autoriza correos de tu equipo. Si defines una contraseña inicial, podrán ingresar de inmediato.
                      </p>
                    </div>
                  </div>

                  {adminFormFeedback && (
                    <div
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        background: adminFormFeedback.type === 'error' ? '#FFF1F2' : '#ECFDF5',
                        border:
                          adminFormFeedback.type === 'error'
                            ? '1px solid #FECDD3'
                            : '1px solid #A7F3D0',
                        color: adminFormFeedback.type === 'error' ? '#BE123C' : '#065F46'
                      }}
                    >
                      {adminFormFeedback.text}
                    </div>
                  )}

                  <form
                    onSubmit={handleAddAdminEmailSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                        Correo electrónico a autorizar *
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="ejemplo@jazyalon.cl"
                        className={styles.adminInput}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          Nombre (opcional)
                        </label>
                        <input
                          type="text"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          placeholder="Ej: Jazz"
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                          Contraseña inicial (opcional)
                        </label>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Mín. 6 caracteres"
                          className={styles.adminInput}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button type="submit" className={styles.btnPrimary}>
                        <Mail size={14} />
                        <span>Guardar y Autorizar Correo</span>
                      </button>
                    </div>
                  </form>
                </section>

                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        <ShieldCheck size={15} color="#8C6A2E" />
                        <span>Correos con Acceso Autorizado ({adminEmails.length})</span>
                      </h2>
                      <p className={styles.sectionDesc}>
                        Cuentas con permiso para ingresar al Panel de Administración.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {adminEmails.map((entry) => {
                      const isPrimary =
                        entry.isPrimary || entry.email.toLowerCase() === 'admin@jazyalon.cl';
                      const cleanEntryName =
                        isPrimary && (!entry.name || entry.name.toLowerCase().includes('administrador'))
                          ? 'Jazz'
                          : entry.name || 'Jazz';
                      return (
                        <div key={entry.email} className={styles.adminEmailRow}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.82rem', color: '#181514' }}>
                                {cleanEntryName}
                              </strong>
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '999px',
                                  background: isPrimary ? '#181514' : '#ECFDF5',
                                  color: isPrimary ? '#FFFFFF' : '#065F46',
                                  border: isPrimary ? 'none' : '1px solid #A7F3D0'
                                }}
                              >
                                {isPrimary ? 'PRINCIPAL' : 'AUTORIZADO'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#575049', marginTop: '2px' }}>
                              {entry.email}
                            </div>
                          </div>

                          {!isPrimary && typeof revokeAdminEmail === 'function' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `¿Revocar el acceso de administración para ${entry.email}?`
                                  )
                                ) {
                                  revokeAdminEmail(entry.email);
                                }
                              }}
                              className={styles.btnDangerSoft}
                            >
                              <Trash2 size={12} />
                              <span>Revocar</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ==================== MODAL SIMPLE: EDITAR COLECCIÓN ==================== */}
      {colEditModalGroup && (
        <div className={styles.modalBackdrop} onClick={() => setColEditModalGroup(null)}>
          <div className={styles.quickModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8C6A2E', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                  COLECCIÓN • {colEditModalGroup.products.length} DISEÑOS
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#181514' }}>
                  Editar Colección
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setColEditModalGroup(null)}
                className={styles.iconBtnSmall}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveCollectionModal} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FAF9F6', padding: '10px', borderRadius: '10px', border: '1px solid #E5E0D8' }}>
                <img
                  src={colEditForm.coverImage || colEditModalGroup.coverImage}
                  alt={colEditForm.name}
                  style={{ width: '64px', height: '74px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #D4CCC0' }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#181514', marginBottom: '5px' }}>
                    Imagen de portada
                  </span>
                  <label className={styles.btnGhost} style={{ cursor: 'pointer', height: '30px', fontSize: '0.73rem' }}>
                    <Camera size={13} color="#8C6A2E" />
                    <span>{uploadingColModalImg ? 'Subiendo...' : 'Cambiar imagen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleColEditCoverUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                  Nombre de la colección *
                </label>
                <input
                  type="text"
                  required
                  value={colEditForm.name}
                  onChange={(e) => setColEditForm({ ...colEditForm, name: e.target.value })}
                  className={styles.adminInput}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                  Subtítulo en la web
                </label>
                <input
                  type="text"
                  value={colEditForm.subtitle}
                  onChange={(e) => setColEditForm({ ...colEditForm, subtitle: e.target.value })}
                  placeholder="Descripción breve para la vitrina..."
                  className={styles.adminInput}
                  style={{ width: '100%' }}
                />
              </div>

              {colEditModalGroup.products.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                    Corset #1 destacado de esta colección
                  </label>
                  <select
                    value={colEditForm.primaryProductId}
                    onChange={(e) => setColEditForm({ ...colEditForm, primaryProductId: e.target.value })}
                    className={styles.adminSelect}
                    style={{ width: '100%' }}
                  >
                    {colEditModalGroup.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${Number(p.price || 0).toLocaleString('es-CL')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#181514' }}>
                <input
                  type="checkbox"
                  checked={colEditForm.isPrimaryFeatured}
                  onChange={(e) => setColEditForm({ ...colEditForm, isPrimaryFeatured: e.target.checked })}
                />
                <span>Destacar como colección principal en la portada web</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #E5E0D8' }}>
                {!colEditModalGroup.isSpecialDestacados && unifiedCategoryCollections.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(colEditModalGroup)}
                    className={styles.btnDangerSoft}
                  >
                    <Trash2 size={13} />
                    <span>Eliminar colección</span>
                  </button>
                ) : (
                  <span />
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setColEditModalGroup(null)} className={styles.btnGhost}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.btnPrimary}>
                    <Save size={14} />
                    <span>Guardar cambios</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SIMPLE: EDITAR / + CORSET EN COLECCIONES ==================== */}
      {colProdModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setColProdModalOpen(false)}>
          <div className={styles.wideModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8C6A2E', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                  EDICIÓN SIMPLE • SINCRONIZADO CON HONE CATALOG
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.18rem', fontWeight: 800, color: '#181514' }}>
                  {colProdEditingId ? 'Editar Prenda' : 'Añadir Nuevo Corset'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setColProdModalOpen(false)}
                className={styles.iconBtnSmall}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveSimpleCollectionProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Nombre, Línea y SKU */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 0.8fr', gap: '9px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                    Nombre de la prenda *
                  </label>
                  <input
                    type="text"
                    required
                    value={colProdForm.name}
                    onChange={(e) => setColProdForm({ ...colProdForm, name: e.target.value })}
                    placeholder="Ej: Corset Brocado Imperial"
                    className={styles.adminInput}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                    Línea / Colección *
                  </label>
                  <select
                    value={colProdForm.groupKey}
                    onChange={(e) => setColProdForm({ ...colProdForm, groupKey: e.target.value })}
                    className={styles.adminSelect}
                    style={{ width: '100%' }}
                  >
                    {unifiedCategoryCollections
                      .filter((g) => !g.isSpecialDestacados)
                      .map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                    Código SKU
                  </label>
                  <input
                    type="text"
                    value={colProdForm.sku}
                    onChange={(e) => setColProdForm({ ...colProdForm, sku: e.target.value })}
                    className={styles.adminInput}
                    style={{ width: '100%', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Precio, Descuento y Stock */}
              <div style={{ background: '#FAF9F6', border: '1px solid #E5E0D8', borderRadius: '11px', padding: '11px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 95px 95px', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                      Precio Venta (CLP) *
                    </label>
                    <input
                      type="number"
                      required
                      value={colProdForm.price}
                      onChange={(e) => setColProdForm({ ...colProdForm, price: e.target.value })}
                      className={styles.adminInput}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                      Precio Antes
                    </label>
                    <input
                      type="number"
                      value={colProdForm.oldPrice}
                      onChange={(e) => setColProdForm({ ...colProdForm, oldPrice: e.target.value })}
                      placeholder="Opcional"
                      className={styles.adminInput}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                      % Dcto
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={colProdForm.discount || ''}
                      onChange={(e) => handleSimpleProdDiscountPct(e.target.value)}
                      placeholder="0%"
                      className={styles.adminInput}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                      Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={colProdForm.stock}
                      onChange={(e) => setColProdForm({ ...colProdForm, stock: e.target.value })}
                      className={styles.adminInput}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.69rem', fontWeight: 700, color: '#575049' }}>Descuento rápido:</span>
                  {[0, 10, 15, 20, 25, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSimpleProdDiscountPct(pct)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.67rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: Number(colProdForm.discount || 0) === pct ? '1px solid #059669' : '1px solid #D4CCC0',
                        background: Number(colProdForm.discount || 0) === pct ? '#ECFDF5' : '#FFFFFF',
                        color: Number(colProdForm.discount || 0) === pct ? '#065F46' : '#575049'
                      }}
                    >
                      {pct === 0 ? 'Sin dcto' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tallas disponibles y Colores */}
              <div style={{ background: '#FAF9F6', border: '1px solid #E5E0D8', borderRadius: '11px', padding: '11px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '9px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#181514' }}>
                    Tallas Disponibles y Colores
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="color"
                      value={newColProdColorHex}
                      onChange={(e) => setNewColProdColorHex(e.target.value)}
                      style={{ width: '26px', height: '26px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      title="Elegir tono"
                    />
                    <input
                      type="text"
                      value={newColProdColorName}
                      onChange={(e) => setNewColProdColorName(e.target.value)}
                      placeholder="Nuevo color..."
                      className={styles.adminInput}
                      style={{ width: '120px', height: '28px', fontSize: '0.73rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSimpleProdColor}
                      className={styles.btnGhost}
                      style={{ height: '28px', padding: '0 9px', fontSize: '0.71rem' }}
                    >
                      + Color
                    </button>
                  </div>
                </div>

                {/* Selector de color activo */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '9px' }}>
                  {colProdForm.colors.map((c, idx) => {
                    const activeC = colProdColorIdx === idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 9px',
                          borderRadius: '999px',
                          border: activeC ? '1.5px solid #8C6A2E' : '1px solid #D4CCC0',
                          background: activeC ? '#FBF7EE' : '#FFFFFF',
                          cursor: 'pointer'
                        }}
                        onClick={() => setColProdColorIdx(idx)}
                      >
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: c.hex || '#111111',
                            border: '1px solid #C5BEB3'
                          }}
                        />
                        <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#181514' }}>{c.name}</span>
                        {colProdForm.colors.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSimpleProdColor(idx);
                            }}
                            style={{ border: 'none', background: 'transparent', color: '#BE123C', cursor: 'pointer', padding: 0, fontSize: '0.75rem', fontWeight: 800 }}
                            title="Quitar color"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tallas con 1 clic */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.71rem', color: '#575049', marginRight: '4px' }}>
                    Tallas en <strong>{colProdForm.colors[colProdColorIdx]?.name || 'Negro'}</strong>:
                  </span>
                  {ALL_SIZES.map((sz) => {
                    const currentC = colProdForm.colors[colProdColorIdx] || colProdForm.colors[0];
                    const isAvail = (currentC?.availableSizes || []).includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleToggleSimpleProdSize(sz)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '7px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: isAvail ? '1px solid #86EFAC' : '1px solid #FECDD3',
                          background: isAvail ? '#ECFDF5' : '#FFF1F2',
                          color: isAvail ? '#065F46' : '#BE123C',
                          textDecoration: isAvail ? 'none' : 'line-through'
                        }}
                      >
                        {isAvail ? '✓ ' : '✕ '}
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fotos y Descripción */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#FAF9F6', border: '1px solid #E5E0D8', borderRadius: '11px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#181514' }}>
                      Fotos ({colProdForm.images.length})
                    </span>
                    <label className={styles.btnGhost} style={{ height: '28px', padding: '0 9px', fontSize: '0.72rem', cursor: 'pointer' }}>
                      <Camera size={13} color="#8C6A2E" />
                      <span>{uploadingColProdImg ? 'Subiendo...' : 'Subir foto(s)'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleSimpleProdImagesUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {colProdForm.images.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {colProdForm.images.map((imgUrl, idx) => {
                        const isCover = colProdForm.imageUrl === imgUrl || (!colProdForm.imageUrl && idx === 0);
                        return (
                          <div
                            key={idx}
                            onClick={() => setColProdForm({ ...colProdForm, imageUrl: imgUrl })}
                            style={{
                              position: 'relative',
                              width: '52px',
                              height: '62px',
                              borderRadius: '7px',
                              overflow: 'hidden',
                              border: isCover ? '2px solid #8C6A2E' : '1px solid #D4CCC0',
                              cursor: 'pointer'
                            }}
                            title="Clic para usar como foto principal"
                          >
                            <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextImgs = colProdForm.images.filter((_, i) => i !== idx);
                                setColProdForm({
                                  ...colProdForm,
                                  images: nextImgs,
                                  imageUrl: colProdForm.imageUrl === imgUrl ? nextImgs[0] || '' : colProdForm.imageUrl
                                });
                              }}
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(0,0,0,0.7)',
                                color: '#FFFFFF',
                                fontSize: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#787067' }}>
                      Sube una o más fotografías del corset.
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#575049', marginBottom: '4px' }}>
                    Descripción de la prenda
                  </label>
                  <textarea
                    rows="3"
                    value={colProdForm.description}
                    onChange={(e) => setColProdForm({ ...colProdForm, description: e.target.value })}
                    placeholder="Detalles de confección, calce, varillado..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #D4CCC0',
                      fontSize: '0.77rem',
                      fontFamily: 'inherit',
                      color: '#181514',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Opciones rápidas */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '4px 2px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: '#181514' }}>
                  <input
                    type="checkbox"
                    checked={colProdForm.isNew}
                    onChange={(e) => setColProdForm({ ...colProdForm, isNew: e.target.checked })}
                  />
                  <span>✦ Destacar en Nuevos Ingresos</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: '#181514' }}>
                  <input
                    type="checkbox"
                    checked={colProdForm.isCollectionPrimary}
                    onChange={(e) => setColProdForm({ ...colProdForm, isCollectionPrimary: e.target.checked })}
                  />
                  <span>♛ Mostrar #1 en esta colección</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: '#065F46' }}>
                  <input
                    type="checkbox"
                    checked={colProdForm.isActive}
                    onChange={(e) => setColProdForm({ ...colProdForm, isActive: e.target.checked })}
                  />
                  <span>Visible en la tienda</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #E5E0D8' }}>
                <button type="button" onClick={() => setColProdModalOpen(false)} className={styles.btnGhost}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  <Save size={14} />
                  <span>{colProdEditingId ? 'Guardar cambios' : 'Publicar Corset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL RÁPIDO: REGISTRAR VENTA MANUAL ==================== */}
      {manualOrderOpen && (
        <div className={styles.modalBackdrop} onClick={() => setManualOrderOpen(false)}>
          <div className={styles.quickModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#8C6A2E', letterSpacing: '1.3px', textTransform: 'uppercase' }}>
                  VENTA DIRECTA • WHATSAPP / INSTAGRAM
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#181514' }}>
                  Registrar Nuevo Pedido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setManualOrderOpen(false)}
                className={styles.iconBtnSmall}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                  Corset Vendido *
                </label>
                <select
                  value={manualOrderForm.productId}
                  onChange={(e) => {
                    const p = products.find((item) => item.id === e.target.value);
                    setManualOrderForm({
                      ...manualOrderForm,
                      productId: e.target.value,
                      selectedColor: p?.colors?.[0]?.name || 'Negro',
                      selectedSize: p?.sizes?.[0] || 'S'
                    });
                  }}
                  className={styles.adminSelect}
                  style={{ width: '100%' }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.price || 0).toLocaleString('es-CL')} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const chosenP = products.find((p) => p.id === manualOrderForm.productId) || products[0];
                const pColors = chosenP?.colors || [{ name: 'Negro' }];
                const pSizes = chosenP?.sizes || ALL_SIZES;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                        Color
                      </label>
                      <select
                        value={manualOrderForm.selectedColor}
                        onChange={(e) => setManualOrderForm({ ...manualOrderForm, selectedColor: e.target.value })}
                        className={styles.adminSelect}
                        style={{ width: '100%' }}
                      >
                        {pColors.map((c, idx) => (
                          <option key={idx} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                        Talla
                      </label>
                      <select
                        value={manualOrderForm.selectedSize}
                        onChange={(e) => setManualOrderForm({ ...manualOrderForm, selectedSize: e.target.value })}
                        className={styles.adminSelect}
                        style={{ width: '100%' }}
                      >
                        {pSizes.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                        Cant.
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={manualOrderForm.quantity}
                        onChange={(e) => setManualOrderForm({ ...manualOrderForm, quantity: e.target.value })}
                        className={styles.adminInput}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                    Nombre Clienta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Constanza M."
                    value={manualOrderForm.customerName}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, customerName: e.target.value })}
                    className={styles.adminInput}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                    Correo Clienta
                  </label>
                  <input
                    type="email"
                    placeholder="clienta@correo.cl"
                    value={manualOrderForm.customerEmail}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, customerEmail: e.target.value })}
                    className={styles.adminInput}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={manualOrderForm.customerPhone}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, customerPhone: e.target.value })}
                    className={styles.adminInput}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                    Comuna
                  </label>
                  <input
                    type="text"
                    value={manualOrderForm.comuna}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, comuna: e.target.value })}
                    className={styles.adminInput}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#575049', marginBottom: '4px', fontWeight: 700 }}>
                    Courier
                  </label>
                  <select
                    value={manualOrderForm.carrier}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, carrier: e.target.value })}
                    className={styles.adminSelect}
                    style={{ width: '100%' }}
                  >
                    <option value="starken">Starken</option>
                    <option value="chilexpress">Chilexpress</option>
                    <option value="bluexpress">Blue Express</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setManualOrderOpen(false)} className={styles.btnGhost}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  <Check size={14} />
                  <span>Registrar Pedido</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
