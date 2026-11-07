import { createClient } from '@supabase/supabase-js';
import { logSecurityEvent, normalizeEmail } from '../utils/security';

/**
 * Cliente Único y Endurecido de Supabase para JAZYALON
 * - Instancia singleton reutilizada en toda la aplicación (incluyendo HONE Catalog)
 * - Cumple principio de mínimo privilegio (OWASP) con políticas RLS en PostgreSQL
 * - Sincronización silenciosa con respaldo local seguro cuando corre en localhost sin llaves cloud
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-jazyalon.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
      !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder')
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
      logSecurityEvent('DATABASE_QUERY_ERROR', { context, message: error.message, code: error.code });
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err) {
    logSecurityEvent('DATABASE_UNEXPECTED_EXCEPTION', { context, message: err?.message });
    return { data: null, error: err };
  }
};

/**
 * Persiste configuración global (Modo Mantenimiento, Barra Superior y Beneficios) en Supabase
 */
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

/**
 * Autoriza o revoca correos con acceso al Panel de Administración en Supabase
 */
export const syncAdminEmailToDb = async ({ email, displayName = '', addedBy = 'admin' }) => {
  if (!isSupabaseConfigured()) return;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;

  await executeSafeQuery(
    () =>
      supabase.from('admin_authorized_emails').upsert(
        {
          email: cleanEmail,
          display_name: displayName || null,
          added_by: addedBy,
          created_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      ),
    'syncAdminEmailToDb'
  );

  // Si el correo ya existe en profiles, promover inmediatamente a 'admin'
  await executeSafeQuery(
    () => supabase.from('profiles').update({ role: 'admin', updated_at: new Date().toISOString() }).eq('email', cleanEmail),
    'promoteProfileToAdmin'
  );
};

export const removeAdminEmailFromDb = async (email) => {
  if (!isSupabaseConfigured()) return;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;

  await executeSafeQuery(
    () => supabase.from('admin_authorized_emails').delete().eq('email', cleanEmail),
    'removeAdminEmailFromDb'
  );

  await executeSafeQuery(
    () => supabase.from('profiles').update({ role: 'customer', updated_at: new Date().toISOString() }).eq('email', cleanEmail),
    'demoteProfileToCustomer'
  );
};

/**
 * Registro e inicio de sesión sincronizados con Supabase Auth + tabla public.profiles
 */
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
    if (error) return { synced: false, error };
    return { synced: true, authUser: data?.user || null };
  } catch (err) {
    return { synced: false, error: err };
  }
};

export const syncProfileUpdateToDb = async (userObj) => {
  if (!isSupabaseConfigured() || !userObj?.email) return;
  const cleanEmail = normalizeEmail(userObj.email);
  await executeSafeQuery(
    () =>
      supabase
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
        .eq('email', cleanEmail),
    'syncProfileUpdateToDb'
  );
};

/**
 * Sincroniza pedidos e ítems en 3NF hacia Supabase
 */
export const syncOrderToDb = async (order) => {
  if (!isSupabaseConfigured() || !order) return;
  const { data: insertedOrder } = await executeSafeQuery(
    () =>
      supabase
        .from('orders')
        .upsert(
          {
            order_number: order.orderNumber,
            customer_name: order.customerName,
            customer_rut: order.customerRut || null,
            customer_email: normalizeEmail(order.customerEmail),
            customer_phone: order.customerPhone || null,
            shipping_address: order.address || null,
            shipping_region: order.regionName || null,
            shipping_comuna: order.comuna || null,
            shipping_carrier: order.carrier || 'starken',
            total_amount: Number(order.total) || 0,
            payment_method: order.paymentMethod || 'webpay',
            order_status: order.status || 'recibido',
            tracking_code: order.trackingCode || null,
            history: order.history || [],
            updated_at: new Date().toISOString()
          },
          { onConflict: 'order_number' }
        )
        .select('id')
        .single(),
    'syncOrderToDb'
  );

  if (insertedOrder?.id && Array.isArray(order.items) && order.items.length > 0) {
    const itemsPayload = order.items.map((item) => ({
      order_id: insertedOrder.id,
      sku: item.sku || null,
      product_name: item.name,
      color_name: item.selectedColor || 'Negro',
      size: item.selectedSize || 'S',
      unit_price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      image_url: item.image || null
    }));
    await executeSafeQuery(() => supabase.from('order_items').insert(itemsPayload), 'syncOrderItemsToDb');
  }
};

/**
 * Sincroniza los slides del carrusel Hero hacia Supabase
 */
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

/**
 * Sincroniza cupones promocionales y sus condiciones configurables
 */
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

/**
 * Sincroniza suscriptoras del boletín y alertas automáticas
 */
export const syncSubscriberToDb = async (subscriber) => {
  if (!isSupabaseConfigured() || !subscriber?.email) return;
  const cleanEmail = normalizeEmail(subscriber.email);
  if (!cleanEmail) return;
  await executeSafeQuery(
    () =>
      supabase.from('newsletter_subscribers').upsert(
        {
          email: cleanEmail,
          notify_price_drop: subscriber.notifyPriceDrop !== false,
          notify_new_collection: subscriber.notifyNewCollection !== false,
          notify_low_stock: subscriber.notifyLowStock !== false,
          is_active: subscriber.isActive !== false,
          subscribed_at: subscriber.subscribedAt || new Date().toISOString()
        },
        { onConflict: 'email' }
      ),
    'syncSubscriberToDb'
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

/**
 * Registra notificaciones enviadas a suscriptoras (Baja de precio, Nueva colección, Pocas unidades)
 */
export const syncNotificationToDb = async (notif) => {
  if (!isSupabaseConfigured() || !notif) return;
  await executeSafeQuery(
    () =>
      supabase.from('subscriber_notifications').insert({
        event_type: notif.type || 'custom',
        title: notif.title || 'Novedad JAZYALON',
        message: notif.message || '',
        product_id: notif.productId || null,
        collection_id: notif.collectionId || null,
        recipients_count: Number(notif.recipientsCount) || 0,
        recipients: Array.isArray(notif.recipientEmails) ? notif.recipientEmails : [],
        created_at: notif.createdAt || new Date().toISOString()
      }),
    'syncNotificationToDb'
  );
};
