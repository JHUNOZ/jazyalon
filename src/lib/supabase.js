import { createClient } from '@supabase/supabase-js';
import { logSecurityEvent, normalizeEmail, sanitizeInput } from '../utils/security';

/**
 * Cliente Único y Endurecido de Supabase para JAZYALON
 * - Instancia singleton reutilizada en toda la aplicación (Tienda + Admin + HONE Catalog)
 * - Cumple principio de mínimo privilegio (OWASP) con políticas RLS Zero-Trust en PostgreSQL
 * - Sincronización en la nube cuando VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están activas,
 *   con respaldo local instantáneo cuando corre sin credenciales cloud.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-jazyalon.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !String(import.meta.env.VITE_SUPABASE_URL).includes('placeholder') &&
      !String(import.meta.env.VITE_SUPABASE_ANON_KEY).includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'jazyalon_auth_token'
  },
  global: {
    headers: {
      'x-application-name': 'jazyalon-ecommerce-secure'
    }
  }
});

/**
 * Ejecutor seguro de consultas hacia Supabase
 */
export const executeSafeQuery = async (queryFn, context = 'Query') => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null, skipped: true };
  }
  try {
    const { data, error } = await queryFn();
    if (error) {
      logSecurityEvent('DATABASE_QUERY_ERROR', {
        context,
        message: error.message,
        code: error.code
      });
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    logSecurityEvent('DATABASE_UNEXPECTED_EXCEPTION', { context, message: err?.message });
    return { data: null, error: err };
  }
};

// ============================================================================
// 1. AUTENTICACIÓN SEGURA EN SUPABASE AUTH + TABLA PROFILES
// ============================================================================

const buildNormalizedCloudUser = async (authUser) => {
  if (!authUser?.id || !authUser?.email) return null;
  const cleanEmail = normalizeEmail(authUser.email);

  const [{ data: profile }, { data: adminCheck }] = await Promise.all([
    executeSafeQuery(
      () => supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
      'fetchUserProfile'
    ),
    executeSafeQuery(() => supabase.rpc('is_admin'), 'checkIsAdminRpc')
  ]);

  const isUserAdmin =
    Boolean(adminCheck) ||
    profile?.role === 'admin' ||
    authUser.app_metadata?.role === 'admin';

  const rawName =
    profile?.full_name ||
    authUser.user_metadata?.full_name ||
    (isUserAdmin ? 'Jazz' : cleanEmail.split('@')[0]);

  const resolvedName =
    isUserAdmin && (!rawName || rawName.toLowerCase().includes('administrador'))
      ? 'Jazz'
      : rawName;

  return {
    id: authUser.id,
    name: resolvedName,
    email: cleanEmail,
    role: isUserAdmin ? 'admin' : 'customer',
    phone: profile?.phone || authUser.user_metadata?.phone || '',
    rut: profile?.rut || authUser.user_metadata?.rut || '',
    address: profile?.shipping_address || '',
    comuna: profile?.shipping_comuna || '',
    regionName: profile?.shipping_region || '',
    createdAt: profile?.created_at || authUser.created_at || new Date().toISOString()
  };
};

export const signInWithCloud = async ({ email, password }) => {
  if (!isSupabaseConfigured()) return { configured: false };
  const cleanEmail = normalizeEmail(email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });
    if (error || !data?.user) {
      logSecurityEvent('CLOUD_LOGIN_FAILED', { email: cleanEmail, reason: error?.message });
      return {
        configured: true,
        success: false,
        message: 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo nuevamente.'
      };
    }
    const cloudUser = await buildNormalizedCloudUser(data.user);
    return { configured: true, success: true, user: cloudUser };
  } catch (err) {
    return {
      configured: true,
      success: false,
      message: err?.message || 'Error de conexión al iniciar sesión.'
    };
  }
};

export const fetchCurrentCloudSessionUser = async () => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user) return null;
    return await buildNormalizedCloudUser(data.session.user);
  } catch {
    return null;
  }
};

export const signOutFromCloud = async () => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore signout network errors
  }
};

export const registerUserInCloud = async ({ name, email, password, phone = '', rut = '' }) => {
  if (!isSupabaseConfigured()) return { synced: false };
  const cleanEmail = normalizeEmail(email);
  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone || null,
          rut: rut || null
        }
      }
    });
    if (error) {
      const msg = error.message?.toLowerCase().includes('already registered')
        ? 'Este correo ya está registrado. Inicia sesión con tu cuenta.'
        : error.message;
      return { synced: false, error, message: msg };
    }
    const cloudUser = data?.user ? await buildNormalizedCloudUser(data.user) : null;
    return {
      synced: true,
      authUser: data?.user || null,
      cloudUser,
      hasSession: Boolean(data?.session)
    };
  } catch (err) {
    return { synced: false, error: err, message: err?.message };
  }
};

/**
 * Crea una cuenta secundaria de administración sin cerrar ni reemplazar la sesión activa de Jazz
 */
export const createSecondaryAdminAccountInCloud = async ({ name, email, password }) => {
  if (!isSupabaseConfigured() || !password) return { synced: false };
  const cleanEmail = normalizeEmail(email);
  try {
    const ephemeralClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    const { data, error } = await ephemeralClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name || 'Admin JAZYALON'
        }
      }
    });
    if (error) return { synced: false, error };
    return { synced: true, authUser: data?.user || null };
  } catch (err) {
    return { synced: false, error: err };
  }
};

export const syncProfileUpdateToDb = async (userObj) => {
  if (!isSupabaseConfigured() || !userObj?.email) return;
  const cleanEmail = normalizeEmail(userObj.email);
  const query = userObj.id
    ? supabase
        .from('profiles')
        .update({
          full_name: userObj.name,
          phone: userObj.phone || null,
          rut: userObj.rut || null,
          shipping_address: userObj.address || null,
          shipping_comuna: userObj.comuna || null,
          shipping_region: userObj.regionName || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userObj.id)
    : supabase
        .from('profiles')
        .update({
          full_name: userObj.name,
          phone: userObj.phone || null,
          rut: userObj.rut || null,
          shipping_address: userObj.address || null,
          shipping_comuna: userObj.comuna || null,
          shipping_region: userObj.regionName || null,
          updated_at: new Date().toISOString()
        })
        .eq('email', cleanEmail);

  await executeSafeQuery(() => query, 'syncProfileUpdateToDb');
};

// ============================================================================
// 2. SUBIDA SEGURA DE IMÁGENES AL BUCKET 'admin_uploads' (SUPABASE STORAGE)
// ============================================================================

export const uploadOptimizedImageToCloud = async (
  fileOrBlob,
  folder = 'products',
  fileNameHint = 'imagen.webp',
  fallbackDataUrl = ''
) => {
  if (!isSupabaseConfigured() || !fileOrBlob) {
    return fallbackDataUrl;
  }
  try {
    const safeName = String(fileNameHint || 'imagen.webp')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;

    const { error } = await supabase.storage.from('admin_uploads').upload(filePath, fileOrBlob, {
      contentType: fileOrBlob.type || 'image/webp',
      cacheControl: '31536000',
      upsert: true
    });

    if (error) {
      logSecurityEvent('STORAGE_UPLOAD_FALLBACK', { message: error.message });
      return fallbackDataUrl;
    }

    const { data } = supabase.storage.from('admin_uploads').getPublicUrl(filePath);
    return data?.publicUrl || fallbackDataUrl;
  } catch {
    return fallbackDataUrl;
  }
};

// ============================================================================
// 3. MAPEO LIMPIO Y SIN REDUNDANCIAS PARA CATÁLOGO, CATEGORÍAS Y COLECCIONES
// ============================================================================

export const mapProductToDbRow = (p) => {
  const price = Math.max(0, Math.round(Number(p.price) || 0));
  const rawOld = p.old_price ?? p.oldPrice ?? null;
  const oldPrice = rawOld && Number(rawOld) > price ? Math.round(Number(rawOld)) : null;
  const discount =
    oldPrice && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  const images =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : p.image_url
      ? [p.image_url]
      : ['/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'];
  const primaryImg = p.image_url || images[0];

  let specifications = p.specifications || null;
  if (!specifications && p.specs && typeof p.specs === 'object') {
    specifications = JSON.stringify(p.specs);
  }

  const cleanCategory =
    p.category && p.category !== 'all'
      ? String(p.category).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
      : null;
  const cleanCollection = p.collection
    ? String(p.collection).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    : null;

  const row = {
    sku: String(p.sku || `JAZ-COR-${Date.now().toString().slice(-4)}`)
      .trim()
      .toUpperCase(),
    name: sanitizeInput(p.name || 'Corset JAZYALON', 160),
    description: p.description || '',
    specifications,
    category: cleanCategory,
    collection: cleanCollection,
    price,
    old_price: oldPrice,
    discount,
    stock: Math.max(0, Math.round(Number(p.stock ?? 10))),
    badge: sanitizeInput(p.badge || '', 60),
    origin: sanitizeInput(p.origin || 'Importación Directa', 80),
    image_url: primaryImg,
    images,
    sizes: Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ['XS', 'S', 'M', 'L', 'XL'],
    colors: Array.isArray(p.colors) ? p.colors : [],
    is_collection_primary: Boolean(p.isCollectionPrimary ?? p.is_collection_primary),
    is_new: Boolean(p.isNew ?? p.is_new),
    drop_order: Number(p.dropOrder ?? p.drop_order ?? 99) || 99,
    is_featured: Boolean(p.isFeatured ?? p.is_featured),
    is_active: p.is_active !== false,
    updated_at: new Date().toISOString()
  };

  if (p.id) {
    row.id = String(p.id);
  }

  return row;
};

export const mapDbRowToProduct = (row) => {
  let specsObj = {
    estructura: 'Corsetería estructurada con varillas',
    ajuste: 'Lazada trasera regulable'
  };

  if (row.specifications) {
    try {
      const parsed =
        typeof row.specifications === 'string'
          ? JSON.parse(row.specifications)
          : row.specifications;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const filteredEntries = Object.entries(parsed).filter(
          ([k]) => !k.startsWith('__hone_')
        );
        if (filteredEntries.length > 0) {
          specsObj = Object.fromEntries(filteredEntries);
        }
      }
    } catch {
      // keep default specsObj
    }
  }

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description || '',
    specifications: row.specifications || '',
    specs: specsObj,
    category: row.category || 'corsets-brocado',
    collection: row.collection || 'brocado-imperial',
    isCollectionPrimary: Boolean(row.is_collection_primary),
    dropOrder: row.drop_order ?? 99,
    price: Number(row.price) || 0,
    oldPrice: row.old_price ? Number(row.old_price) : null,
    old_price: row.old_price ? Number(row.old_price) : null,
    discount: Number(row.discount) || 0,
    stock: Number(row.stock ?? 0),
    badge: row.badge || '',
    origin: row.origin || 'Importación Directa',
    image_url: row.image_url,
    images: Array.isArray(row.images) && row.images.length > 0 ? row.images : [row.image_url],
    sizes: Array.isArray(row.sizes) ? row.sizes : ['XS', 'S', 'M', 'L', 'XL'],
    colors: Array.isArray(row.colors) ? row.colors : [],
    isNew: Boolean(row.is_new),
    isFeatured: Boolean(row.is_featured),
    is_featured: Boolean(row.is_featured),
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

export const syncCategoryToDb = async (cat) => {
  if (!isSupabaseConfigured() || !cat?.id || cat.id === 'all') return;
  const cleanId = String(cat.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  await executeSafeQuery(
    () =>
      supabase.from('categories').upsert(
        {
          id: cleanId,
          name: sanitizeInput(cat.name || cleanId, 100),
          description: sanitizeInput(cat.description || '', 300),
          display_order: Number(cat.display_order ?? 0) || 0,
          is_active: cat.is_active !== false,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      ),
    'syncCategoryToDb'
  );
};

export const removeCategoryFromDb = async (id) => {
  if (!isSupabaseConfigured() || !id || id === 'all') return;
  await executeSafeQuery(
    () => supabase.from('categories').delete().eq('id', id),
    'removeCategoryFromDb'
  );
};

export const syncCollectionToDb = async (col) => {
  if (!isSupabaseConfigured() || !col?.id) return;
  const cleanId = String(col.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  await executeSafeQuery(
    () =>
      supabase.from('collections').upsert(
        {
          id: cleanId,
          name: sanitizeInput(col.name || col.title || cleanId, 100),
          subtitle: sanitizeInput(col.subtitle || '', 255),
          image_url:
            col.image ||
            col.image_url ||
            '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
          primary_product_id: col.primaryProductId || col.primary_product_id || null,
          is_primary_featured: Boolean(col.isPrimaryFeatured ?? col.is_primary_featured),
          display_order: Number(col.display_order ?? 0) || 0,
          is_active: col.is_active !== false,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      ),
    'syncCollectionToDb'
  );
};

export const removeCollectionFromDb = async (id) => {
  if (!isSupabaseConfigured() || !id) return;
  await executeSafeQuery(
    () => supabase.from('collections').delete().eq('id', id),
    'removeCollectionFromDb'
  );
};

export const syncProductToDb = async (product) => {
  if (!isSupabaseConfigured() || !product) return;
  const row = mapProductToDbRow(product);
  await executeSafeQuery(
    () => supabase.from('products').upsert(row, { onConflict: 'id' }),
    'syncProductToDb'
  );
};

export const syncMultipleProductsToDb = async (productsList) => {
  if (!isSupabaseConfigured() || !Array.isArray(productsList) || productsList.length === 0) return;
  const rows = productsList.map(mapProductToDbRow);
  await executeSafeQuery(
    () => supabase.from('products').upsert(rows, { onConflict: 'id' }),
    'syncMultipleProductsToDb'
  );
};

export const removeProductFromDb = async (id) => {
  if (!isSupabaseConfigured() || !id) return;
  await executeSafeQuery(
    () => supabase.from('products').delete().eq('id', String(id)),
    'removeProductFromDb'
  );
};

// ============================================================================
// 4. CONFIGURACIÓN WEB, CARRUSEL HERO, ACCESOS ADMIN Y CUPONES
// ============================================================================

export const syncSiteSettingsToDb = async (fullSettings) => {
  if (!isSupabaseConfigured() || !fullSettings) return;
  const maintenanceConfig = fullSettings.maintenance || fullSettings;
  const payload = {
    id: 'main',
    maintenance_enabled: Boolean(maintenanceConfig.enabled),
    maintenance_mode: maintenanceConfig.mode === 'drop' ? 'drop' : 'standard',
    maintenance_message:
      maintenanceConfig.message || 'Estamos en mantenimiento. Volvemos pronto.',
    drop_name: maintenanceConfig.dropName || 'Próximo Drop Exclusivo',
    drop_target_date: maintenanceConfig.dropDate
      ? new Date(maintenanceConfig.dropDate).toISOString()
      : null,
    updated_at: new Date().toISOString()
  };

  if (Array.isArray(fullSettings.announcementMessages)) {
    payload.announcement_messages = fullSettings.announcementMessages;
  }
  if (fullSettings.benefitsConfig && typeof fullSettings.benefitsConfig === 'object') {
    payload.benefits_config = fullSettings.benefitsConfig;
  }

  await executeSafeQuery(
    () => supabase.from('site_settings').upsert(payload, { onConflict: 'id' }),
    'syncSiteSettingsToDb'
  );
};

export const syncAdminEmailToDb = async ({ email, displayName = '', addedBy = 'admin' }) => {
  if (!isSupabaseConfigured()) return;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;

  await executeSafeQuery(
    () =>
      supabase.from('admin_authorized_emails').upsert(
        {
          email: cleanEmail,
          display_name: displayName || 'Admin JAZYALON',
          is_primary: cleanEmail === 'jazz@jazyalon.cl',
          added_by: addedBy,
          created_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      ),
    'syncAdminEmailToDb'
  );
};

export const removeAdminEmailFromDb = async (email) => {
  if (!isSupabaseConfigured()) return;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || cleanEmail === 'jazz@jazyalon.cl') return;

  await executeSafeQuery(
    () => supabase.from('admin_authorized_emails').delete().eq('email', cleanEmail),
    'removeAdminEmailFromDb'
  );
};

export const syncHeroSlidesToDb = async (slides) => {
  if (!isSupabaseConfigured() || !Array.isArray(slides)) return;
  const rows = slides.map((s, idx) => ({
    id: Number(s.id) || idx + 1,
    tag: s.tag || `Drop 0${idx + 1}`,
    title: s.title || '',
    subtitle: s.subtitle || '',
    cta: s.cta || 'Explorar',
    category: s.category || 'all',
    image: s.image || '',
    display_order: idx,
    is_active: true,
    updated_at: new Date().toISOString()
  }));
  await executeSafeQuery(
    () => supabase.from('hero_slides').upsert(rows, { onConflict: 'id' }),
    'syncHeroSlidesToDb'
  );
};

export const syncCouponToDb = async (coupon) => {
  if (!isSupabaseConfigured() || !coupon?.code) return;
  const cleanCode = String(coupon.code).trim().toLowerCase();
  await executeSafeQuery(
    () =>
      supabase.from('coupons').upsert(
        {
          code: cleanCode,
          discount_percent: Number(coupon.discountPercent) || 10,
          description: coupon.description || '',
          require_subscription: Boolean(coupon.requireSubscription),
          first_purchase_only: Boolean(coupon.firstPurchaseOnly),
          min_purchase: Number(coupon.minPurchase) || 0,
          max_uses: Number(coupon.maxUses) || 0,
          used_count: Number(coupon.usedCount) || 0,
          expires_at: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString() : null,
          is_active: coupon.isActive !== false,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'code' }
      ),
    'syncCouponToDb'
  );
};

export const removeCouponFromDb = async (code) => {
  if (!isSupabaseConfigured() || !code) return;
  const cleanCode = String(code).trim().toLowerCase();
  await executeSafeQuery(
    () => supabase.from('coupons').delete().eq('code', cleanCode),
    'removeCouponFromDb'
  );
};

// ============================================================================
// 5. SUSCRIPTORAS, NOTIFICACIONES, PEDIDOS TRANSACCIONALES, STOCK ALERTS & CONTACTO
// ============================================================================

export const syncSubscriberToDb = async (subscriber) => {
  if (!isSupabaseConfigured() || !subscriber?.email) return;
  const cleanEmail = normalizeEmail(subscriber.email);
  if (!cleanEmail) return;
  await executeSafeQuery(
    () =>
      supabase.rpc('subscribe_newsletter_public', {
        p_email: cleanEmail,
        p_price_drop: subscriber.notifyPriceDrop !== false,
        p_new_collection: subscriber.notifyNewCollection !== false,
        p_low_stock: subscriber.notifyLowStock !== false
      }),
    'subscribeNewsletterRpc'
  );
};

export const removeSubscriberFromDb = async (email) => {
  if (!isSupabaseConfigured() || !email) return;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;
  await executeSafeQuery(
    () => supabase.from('newsletter_subscribers').delete().eq('email', cleanEmail),
    'removeSubscriberFromDb'
  );
};

export const syncNotificationToDb = async (notif) => {
  if (!isSupabaseConfigured() || !notif) return;
  const eventType = ['price_drop', 'new_collection', 'low_stock', 'manual', 'custom'].includes(
    notif.type
  )
    ? notif.type
    : 'custom';

  await executeSafeQuery(
    () =>
      supabase.from('subscriber_notifications').insert({
        event_type: eventType,
        title: notif.title || 'Novedad JAZYALON',
        message: notif.message || '',
        image_url: notif.image || '',
        product_id: notif.productId || null,
        collection_id: notif.collectionId || null,
        recipients_count: Number(notif.recipientsCount) || 0,
        created_at: notif.createdAt || new Date().toISOString()
      }),
    'syncNotificationToDb'
  );
};

/**
 * Crea un pedido e ítems de forma atómica mediante RPC segura (invitadas, clientas o admin)
 */
export const createOrderInDb = async (order) => {
  if (!isSupabaseConfigured() || !order) return null;

  const orderPayload = {
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_rut: order.customerRut || null,
    customer_email: normalizeEmail(order.customerEmail),
    customer_phone: order.customerPhone || null,
    shipping_address: order.address || null,
    shipping_region: order.regionName || null,
    shipping_comuna: order.comuna || null,
    shipping_carrier: order.carrier || 'starken',
    shipping_cost: Number(order.shippingCost) || 0,
    coupon_code: order.couponCode || null,
    discount_amount: Number(order.discountAmount) || 0,
    total_amount: Number(order.total) || 0,
    payment_method: order.paymentMethod || 'webpay',
    tracking_code: order.trackingCode || null,
    history: order.history || []
  };

  const itemsPayload = (order.items || []).map((item) => ({
    product_id: item.id || null,
    sku: item.sku || null,
    product_name: item.name,
    color_name: item.selectedColor || 'Negro',
    size: item.selectedSize || 'S',
    unit_price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    image_url: item.image || null
  }));

  const { data } = await executeSafeQuery(
    () =>
      supabase.rpc('create_store_order', {
        p_order: orderPayload,
        p_items: itemsPayload
      }),
    'createOrderInDb'
  );

  return data;
};

/**
 * Actualiza el estado, guía de seguimiento o historial de un pedido existente (solo Admin)
 */
export const updateOrderInDb = async (order) => {
  if (!isSupabaseConfigured() || !order?.orderNumber) return;
  await executeSafeQuery(
    () =>
      supabase
        .from('orders')
        .update({
          order_status: order.status || 'recibido',
          auto_mode: Boolean(order.autoMode),
          tracking_code: order.trackingCode || null,
          history: order.history || [],
          updated_at: new Date().toISOString()
        })
        .eq('order_number', order.orderNumber),
    'updateOrderInDb'
  );
};

export const trackOrderInCloud = async (lookupCode) => {
  if (!isSupabaseConfigured() || !lookupCode) return null;
  const { data } = await executeSafeQuery(
    () => supabase.rpc('track_order_public', { p_lookup: String(lookupCode).trim() }),
    'trackOrderInCloud'
  );
  return data || null;
};

export const syncStockAlertToDb = async (alert) => {
  if (!isSupabaseConfigured() || !alert?.email) return;
  await executeSafeQuery(
    () =>
      supabase.from('stock_alerts').insert({
        product_id: alert.productId || null,
        product_name: sanitizeInput(alert.productName || 'Corset JAZYALON', 160),
        color: sanitizeInput(alert.color || 'Negro', 60),
        size: sanitizeInput(alert.size || 'S', 20),
        email: normalizeEmail(alert.email),
        resolved: false
      }),
    'syncStockAlertToDb'
  );
};

export const resolveStockAlertInDb = async (alertId) => {
  if (!isSupabaseConfigured() || !alertId) return;
  await executeSafeQuery(
    () => supabase.from('stock_alerts').update({ resolved: true }).eq('id', alertId),
    'resolveStockAlertInDb'
  );
};

export const syncContactMessageToDb = async ({ name, email, phone = '', subject = '', message }) => {
  if (!isSupabaseConfigured() || !email || !message) return;
  await executeSafeQuery(
    () =>
      supabase.from('contact_messages').insert({
        sender_name: sanitizeInput(name || 'Clienta', 150),
        sender_email: normalizeEmail(email),
        sender_phone: sanitizeInput(phone || '', 25) || null,
        subject: sanitizeInput(subject || 'Consulta sobre Corsets / Tallas', 160),
        message: sanitizeInput(message, 3000)
      }),
    'syncContactMessageToDb'
  );
};

export const mapDbOrderToStoreOrder = (row) => {
  const items = Array.isArray(row.order_items)
    ? row.order_items.map((oi) => ({
        id: oi.product_id || oi.id,
        name: oi.product_name,
        sku: oi.sku || 'JAZ-COR',
        selectedColor: oi.color_name || 'Negro',
        selectedSize: oi.size || 'S',
        quantity: Number(oi.quantity) || 1,
        price: Number(oi.unit_price) || 0,
        image: oi.image_url || '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg'
      }))
    : [];

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone || '',
    customerRut: row.customer_rut || '',
    address: row.shipping_address || '',
    comuna: row.shipping_comuna || '',
    regionName: row.shipping_region || 'Región Metropolitana de Santiago',
    carrier: row.shipping_carrier || 'starken',
    shippingCost: Number(row.shipping_cost) || 0,
    couponCode: row.coupon_code || null,
    discountAmount: Number(row.discount_amount) || 0,
    trackingCode: row.tracking_code || '',
    paymentMethod: row.payment_method || 'webpay',
    status: row.order_status || 'recibido',
    autoMode: Boolean(row.auto_mode),
    total: Number(row.total_amount) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    history: Array.isArray(row.history) ? row.history : []
  };
};
