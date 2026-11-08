-- =========================================================================================
-- JAZYALON — CORSETERÍA VICTORIANA & ALTA COSTURA (CHILE)
-- ESQUEMA MAESTRO DE PRODUCCIÓN PARA SUPABASE (PostgreSQL 15/17)
-- =========================================================================================
-- Arquitectura:
--   • 3ra Forma Normal Estricta (3NF): Cero tablas muertas, cero duplicidad de datos o PII.
--   • Seguridad Zero-Trust: RLS forzado en el 100% de tablas + Storage Bucket endurecido.
--   • Funciones SECURITY DEFINER blindadas con SET search_path fijo (OWASP / Supabase Advisor).
--   • Cumplimiento Ley N° 19.628 (Protección de Datos Personales) y Ley N° 19.496 (Consumidor).
--   • Cuenta Administradora "Jazz" pre-creada en Supabase Auth lista para iniciar sesión.
--   • Semilla completa del catálogo JAZYALON (categorías, colecciones, 9 corsets, slides y cupón).
-- =========================================================================================

BEGIN;

-- -----------------------------------------------------------------------------------------
-- 1. EXTENSIONES REQUERIDAS
-- -----------------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Eliminar tabla obsoleta/redundante si existía de versiones previas
DROP TABLE IF EXISTS public.legal_consents CASCADE;

-- -----------------------------------------------------------------------------------------
-- 2. FUNCIONES UTILITARIAS DE INTEGRIDAD Y TIMESTAMPS
-- -----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------------------
-- 3. LISTA AUTORIZADA DE CORREOS DE ADMINISTRACIÓN (Fuente única de permisos Admin)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_authorized_emails (
  email VARCHAR(254) PRIMARY KEY CHECK (
    email = LOWER(TRIM(email))
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  display_name VARCHAR(120) NOT NULL DEFAULT 'Jazz',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  added_by VARCHAR(254) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blindaje anti-bloqueo: Impide eliminar el correo administrador principal a nivel motor SQL
CREATE OR REPLACE FUNCTION public.prevent_primary_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_primary = TRUE OR OLD.email = 'jazz@jazyalon.cl' THEN
    RAISE EXCEPTION 'Operación bloqueada: No se puede eliminar la cuenta administradora principal de JAZYALON.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_primary_admin ON public.admin_authorized_emails;
CREATE TRIGGER trg_protect_primary_admin
  BEFORE DELETE ON public.admin_authorized_emails
  FOR EACH ROW EXECUTE FUNCTION public.prevent_primary_admin_deletion();

-- Semilla de correos administradores autorizados
INSERT INTO public.admin_authorized_emails (email, display_name, is_primary, added_by)
VALUES
  ('jazz@jazyalon.cl', 'Jazz', TRUE, 'system'),
  ('junomaemaul@gmail.com', 'Jazz Admin', FALSE, 'system')
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_primary = public.admin_authorized_emails.is_primary OR EXCLUDED.is_primary;

-- -----------------------------------------------------------------------------------------
-- 4. PERFILES DE USUARIO (1:1 con auth.users — Cero contraseñas en tablas públicas)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(254) UNIQUE NOT NULL CHECK (
    email = LOWER(TRIM(email))
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  rut VARCHAR(15),
  full_name VARCHAR(150) NOT NULL CHECK (char_length(TRIM(full_name)) >= 2),
  phone VARCHAR(25),
  shipping_address VARCHAR(250),
  shipping_comuna VARCHAR(100),
  shipping_region VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_rut_unique
  ON public.profiles(rut)
  WHERE rut IS NOT NULL AND TRIM(rut) <> '';

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Verificador centralizado de privilegios Admin (Blindado contra search_path hijacking)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT LOWER(TRIM(u.email)) INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_uid AND p.role = 'admin'
    )
    OR (
      v_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_authorized_emails a
        WHERE a.email = v_email
      )
    )
  );
END;
$$;

-- Guardia anti-escalamiento de privilegios: Ningún cliente puede autoproclamarse 'admin' ni cambiar su email/id
CREATE OR REPLACE FUNCTION public.guard_profile_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email := LOWER(TRIM(NEW.email));
  NEW.rut := NULLIF(TRIM(COALESCE(NEW.rut, '')), '');
  NEW.phone := NULLIF(TRIM(COALESCE(NEW.phone, '')), '');

  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin')
     AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Acceso denegado: No tienes permisos para modificar el rol de seguridad.';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Acceso denegado: Identificadores de cuenta inmutables.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_security ON public.profiles;
CREATE TRIGGER trg_guard_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_security();

-- Sincronización automática al crear usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT;
  v_role VARCHAR(20);
  v_name VARCHAR(150);
BEGIN
  v_clean_email := LOWER(TRIM(NEW.email));

  IF EXISTS (SELECT 1 FROM public.admin_authorized_emails WHERE email = v_clean_email) THEN
    v_role := 'admin';
  ELSE
    v_role := 'customer';
  END IF;

  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    (SELECT display_name FROM public.admin_authorized_emails WHERE email = v_clean_email LIMIT 1),
    split_part(v_clean_email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, phone, rut, role)
  VALUES (
    NEW.id,
    v_clean_email,
    v_name,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'rut', '')), ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    role = CASE
      WHEN EXISTS (SELECT 1 FROM public.admin_authorized_emails WHERE email = EXCLUDED.email) THEN 'admin'
      ELSE public.profiles.role
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Cuando se agrega/elimina un correo en admin_authorized_emails, sincroniza el rol en profiles automáticamente
CREATE OR REPLACE FUNCTION public.sync_admin_role_from_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET role = 'admin',
        full_name = COALESCE(NULLIF(TRIM(NEW.display_name), ''), full_name),
        updated_at = NOW()
    WHERE email = NEW.email;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET role = 'customer',
        updated_at = NOW()
    WHERE email = OLD.email;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_whitelist ON public.admin_authorized_emails;
CREATE TRIGGER trg_sync_admin_whitelist
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_authorized_emails
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role_from_whitelist();

-- -----------------------------------------------------------------------------------------
-- 5. CONFIGURACIÓN WEB GLOBAL (Fila única id = 'main': Mantenimiento, Barra Superior, Beneficios)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id VARCHAR(20) PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  maintenance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_mode VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (maintenance_mode IN ('standard', 'drop')),
  maintenance_message VARCHAR(300) NOT NULL DEFAULT 'Estamos en mantenimiento. Volvemos pronto.',
  drop_name VARCHAR(150) NOT NULL DEFAULT 'Drop 02 — Edición Limitada',
  drop_target_date TIMESTAMPTZ,
  announcement_messages JSONB NOT NULL DEFAULT '["🇨🇱 Corsetería Victoriana & Alta Costura en Chile","🌹 10% OFF en tu primera compra con el cupón: antonella10","✨ Envíos gratis a todo Chile por compras sobre $60.000","📦 Despachos rápidos vía Starken, Chilexpress y Blue Express","💳 Hasta 6 cuotas sin interés con Webpay Plus y Transferencia"]'::jsonb
    CHECK (jsonb_typeof(announcement_messages) = 'array'),
  benefits_config JSONB NOT NULL DEFAULT '{"badgeText":"10% DE DESCUENTO EN TU PRIMERA COMPRA","title":"Únete a Nuestra Comunidad","subtitle":"Suscríbete para recibir novedades de nuevos ingresos y activa tu descuento con el código","featuredCouponCode":"antonella10","footerNote":"Cero spam. Solo invitaciones a nuevos lanzamientos.","notifyOnPriceDrop":true,"notifyOnNewCollection":true,"notifyOnLowStock":true,"lowStockThreshold":3}'::jsonb
    CHECK (jsonb_typeof(benefits_config) = 'object'),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------------------
-- 6. CATEGORÍAS Y COLECCIONES (3NF — Sincronizadas en tiempo real con HONE Catalog)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id VARCHAR(60) PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$' AND id <> 'all'),
  name VARCHAR(100) NOT NULL CHECK (char_length(TRIM(name)) >= 2),
  description TEXT DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.collections (
  id VARCHAR(60) PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),
  name VARCHAR(100) NOT NULL CHECK (char_length(TRIM(name)) >= 2),
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  primary_product_id VARCHAR(80),
  is_primary_featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_collections_updated_at ON public.collections;
CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------------------
-- 7. CATÁLOGO MAESTRO DE PRODUCTOS Y PROMOS (Compatible 100% con Tienda y HONE Catalog)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(80) PRIMARY KEY DEFAULT ('prod-' || encode(extensions.gen_random_bytes(6), 'hex')),
  sku VARCHAR(60) UNIQUE NOT NULL CHECK (char_length(TRIM(sku)) >= 3),
  name VARCHAR(160) NOT NULL CHECK (char_length(TRIM(name)) >= 2),
  description TEXT NOT NULL DEFAULT '',
  specifications TEXT,
  category VARCHAR(60) REFERENCES public.categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  collection VARCHAR(60) REFERENCES public.collections(id) ON DELETE SET NULL ON UPDATE CASCADE,
  price INT NOT NULL CHECK (price >= 0),
  old_price INT CHECK (old_price IS NULL OR old_price >= price),
  discount INT NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 95),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge VARCHAR(60) NOT NULL DEFAULT '',
  origin VARCHAR(80) NOT NULL DEFAULT 'Importación Directa',
  image_url TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
  sizes JSONB NOT NULL DEFAULT '["XS","S","M","L","XL"]'::jsonb CHECK (jsonb_typeof(sizes) = 'array'),
  colors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(colors) = 'array'),
  is_collection_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT TRUE,
  drop_order INT NOT NULL DEFAULT 99,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products(is_active, is_featured, drop_order);

-- Llave foránea diferida desde collections.primary_product_id hacia products.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_collections_primary_product'
  ) THEN
    ALTER TABLE public.collections
      ADD CONSTRAINT fk_collections_primary_product
      FOREIGN KEY (primary_product_id)
      REFERENCES public.products(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Normalizador automático de integridad aritmética en productos (evita incoherencias de descuentos)
CREATE OR REPLACE FUNCTION public.normalize_product_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.sku := UPPER(TRIM(NEW.sku));
  NEW.name := TRIM(NEW.name);

  IF NEW.old_price IS NOT NULL AND NEW.old_price <= NEW.price THEN
    NEW.old_price := NULL;
  END IF;

  IF NEW.old_price IS NOT NULL AND NEW.old_price > NEW.price AND NEW.price > 0 THEN
    NEW.discount := LEAST(95, GREATEST(0, ROUND(((NEW.old_price - NEW.price)::NUMERIC / NEW.old_price::NUMERIC) * 100)::INT));
  ELSE
    NEW.discount := 0;
  END IF;

  IF NEW.images IS NULL OR jsonb_array_length(NEW.images) = 0 THEN
    NEW.images := jsonb_build_array(NEW.image_url);
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_product ON public.products;
CREATE TRIGGER trg_normalize_product
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.normalize_product_before_write();

-- -----------------------------------------------------------------------------------------
-- 8. CARRUSEL HERO PRINCIPAL (Portada editorial)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id INT PRIMARY KEY CHECK (id >= 1 AND id <= 10),
  tag VARCHAR(60) NOT NULL DEFAULT 'Drop 01',
  title VARCHAR(160) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  cta VARCHAR(90) NOT NULL DEFAULT 'Explorar Colección',
  category VARCHAR(60) NOT NULL DEFAULT 'all',
  image TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_hero_slides_updated_at ON public.hero_slides;
CREATE TRIGGER trg_hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------------------
-- 9. CUPONES Y BENEFICIOS CONFIGURABLES
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  code VARCHAR(40) PRIMARY KEY CHECK (
    code = LOWER(TRIM(code))
    AND code ~ '^[a-z0-9_-]+$'
  ),
  discount_percent INT NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 95),
  description VARCHAR(240) NOT NULL DEFAULT '',
  require_subscription BOOLEAN NOT NULL DEFAULT TRUE,
  first_purchase_only BOOLEAN NOT NULL DEFAULT TRUE,
  min_purchase INT NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  max_uses INT NOT NULL DEFAULT 0 CHECK (max_uses >= 0),
  used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------------------
-- 10. SUSCRIPTORAS Y NOTIFICACIONES (Sin filtración de correos personales — Ley 19.628)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  email VARCHAR(254) PRIMARY KEY CHECK (
    email = LOWER(TRIM(email))
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  notify_price_drop BOOLEAN NOT NULL DEFAULT TRUE,
  notify_new_collection BOOLEAN NOT NULL DEFAULT TRUE,
  notify_low_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriber_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(40) NOT NULL CHECK (
    event_type IN ('price_drop', 'new_collection', 'low_stock', 'manual', 'custom')
  ),
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  product_id VARCHAR(80) REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE CASCADE,
  collection_id VARCHAR(60) REFERENCES public.collections(id) ON DELETE SET NULL ON UPDATE CASCADE,
  recipients_count INT NOT NULL DEFAULT 0 CHECK (recipients_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_notifications_created ON public.subscriber_notifications(created_at DESC);

-- -----------------------------------------------------------------------------------------
-- 11. PEDIDOS E ÍTEMS DE PEDIDO (3NF — Transaccional con descuento automático de stock)
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(150) NOT NULL CHECK (char_length(TRIM(customer_name)) >= 2),
  customer_rut VARCHAR(15),
  customer_email VARCHAR(254) NOT NULL CHECK (
    customer_email = LOWER(TRIM(customer_email))
    AND customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  customer_phone VARCHAR(25),
  shipping_address VARCHAR(250),
  shipping_region VARCHAR(100),
  shipping_comuna VARCHAR(100),
  shipping_carrier VARCHAR(50) NOT NULL DEFAULT 'starken',
  shipping_cost INT NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  coupon_code VARCHAR(40) REFERENCES public.coupons(code) ON DELETE SET NULL ON UPDATE CASCADE,
  discount_amount INT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount INT NOT NULL CHECK (total_amount >= 0),
  payment_method VARCHAR(50) NOT NULL,
  order_status VARCHAR(30) NOT NULL DEFAULT 'recibido'
    CHECK (order_status IN ('recibido', 'preparacion', 'empacado', 'en_camino', 'entregado', 'cancelado')),
  auto_mode BOOLEAN NOT NULL DEFAULT FALSE,
  tracking_code VARCHAR(100),
  history JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(history) = 'array'),
  accepted_terms BOOLEAN NOT NULL DEFAULT TRUE CHECK (accepted_terms = TRUE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id VARCHAR(80) REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE CASCADE,
  sku VARCHAR(60),
  product_name VARCHAR(160) NOT NULL,
  color_name VARCHAR(60) NOT NULL DEFAULT 'Negro',
  size VARCHAR(20) NOT NULL DEFAULT 'S',
  unit_price INT NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Trigger: Al registrar orden con cupón, incrementa su contador de forma segura en el servidor
CREATE OR REPLACE FUNCTION public.handle_order_coupon_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1,
        updated_at = NOW()
    WHERE code = LOWER(TRIM(NEW.coupon_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_coupon_usage ON public.orders;
CREATE TRIGGER trg_order_coupon_usage
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_coupon_usage();

-- Trigger: Al insertar ítem vendido, descuenta stock automáticamente en el servidor
CREATE OR REPLACE FUNCTION public.handle_order_item_stock_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock = GREATEST(0, stock - NEW.quantity),
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_item_stock_deduction ON public.order_items;
CREATE TRIGGER trg_order_item_stock_deduction
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_item_stock_deduction();

-- -----------------------------------------------------------------------------------------
-- 12. ALERTAS DE REPOSICIÓN DE TALLA, MENSAJES DE CONTACTO Y AUDITORÍA DE SEGURIDAD
-- -----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(80) REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  product_name VARCHAR(160) NOT NULL,
  color VARCHAR(60) NOT NULL DEFAULT 'Negro',
  size VARCHAR(20) NOT NULL,
  email VARCHAR(254) NOT NULL CHECK (
    email = LOWER(TRIM(email))
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON public.stock_alerts(resolved, created_at DESC);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name VARCHAR(150) NOT NULL CHECK (char_length(TRIM(sender_name)) >= 2),
  sender_email VARCHAR(254) NOT NULL CHECK (
    sender_email = LOWER(TRIM(sender_email))
    AND sender_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  sender_phone VARCHAR(25),
  subject VARCHAR(160) NOT NULL DEFAULT 'Consulta sobre Corsets / Tallas',
  message TEXT NOT NULL CHECK (char_length(TRIM(message)) >= 5 AND char_length(message) <= 3000),
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email VARCHAR(254),
  action VARCHAR(30) NOT NULL,
  table_name VARCHAR(60) NOT NULL,
  record_id VARCHAR(120),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Trigger de auditoría inmutable para operaciones sensibles de administración
CREATE OR REPLACE FUNCTION public.record_security_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_record_id TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_record_id := COALESCE(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'email', to_jsonb(OLD)->>'code');
  ELSE
    v_record_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'email', to_jsonb(NEW)->>'code');
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, table_name, record_id)
  VALUES (v_uid, v_email, TG_OP, TG_TABLE_NAME, v_record_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_admin_emails ON public.admin_authorized_emails;
CREATE TRIGGER trg_audit_admin_emails
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_authorized_emails
  FOR EACH ROW EXECUTE FUNCTION public.record_security_audit();

DROP TRIGGER IF EXISTS trg_audit_site_settings ON public.site_settings;
CREATE TRIGGER trg_audit_site_settings
  AFTER UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.record_security_audit();

DROP TRIGGER IF EXISTS trg_audit_coupons ON public.coupons;
CREATE TRIGGER trg_audit_coupons
  AFTER INSERT OR UPDATE OR DELETE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.record_security_audit();

-- -----------------------------------------------------------------------------------------
-- 13. FUNCIONES RPC SEGURAS PARA EL FRONTEND (Sin exponer tablas privadas al público)
-- -----------------------------------------------------------------------------------------

-- A) Suscripción idempotente al boletín sin revelar lista de suscriptoras
CREATE OR REPLACE FUNCTION public.subscribe_newsletter_public(
  p_email TEXT,
  p_price_drop BOOLEAN DEFAULT TRUE,
  p_new_collection BOOLEAN DEFAULT TRUE,
  p_low_stock BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Correo electrónico inválido.');
  END IF;

  INSERT INTO public.newsletter_subscribers (
    email,
    notify_price_drop,
    notify_new_collection,
    notify_low_stock,
    is_active,
    subscribed_at
  )
  VALUES (
    v_clean,
    COALESCE(p_price_drop, TRUE),
    COALESCE(p_new_collection, TRUE),
    COALESCE(p_low_stock, TRUE),
    TRUE,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    notify_price_drop = EXCLUDED.notify_price_drop,
    notify_new_collection = EXCLUDED.notify_new_collection,
    notify_low_stock = EXCLUDED.notify_low_stock,
    is_active = TRUE;

  RETURN jsonb_build_object('success', TRUE, 'email', v_clean);
END;
$$;

-- B) Verificación booleana de suscripción para validar cupones sin exponer correos ajenos
CREATE OR REPLACE FUNCTION public.check_subscription_status(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean = '' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.newsletter_subscribers
    WHERE email = v_clean AND is_active = TRUE
  );
END;
$$;

-- C) Verificación booleana de primera compra sin exponer el historial de pedidos
CREATE OR REPLACE FUNCTION public.check_first_purchase_eligibility(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean = '' THEN
    RETURN TRUE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_email = v_clean
      AND order_status <> 'cancelado'
  );
END;
$$;

-- D) Creación transaccional segura de pedidos (Invitadas, Clientas autenticadas y Admin)
--    Valida precios reales del catálogo (FOR UPDATE), stock disponible y reglas de cupones en el servidor
--    para impedir manipulación de montos desde el navegador (Anti-Price Tampering OWASP A04).
CREATE OR REPLACE FUNCTION public.create_store_order(
  p_order JSONB,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order_id UUID;
  v_is_admin BOOLEAN;
  v_email TEXT;
  v_coupon VARCHAR(40);
  v_coupon_row public.coupons%ROWTYPE;
  v_order_number VARCHAR(50);
  v_tracking VARCHAR(100);
  v_item JSONB;
  v_prod_id VARCHAR(80);
  v_db_price INT;
  v_db_stock INT;
  v_qty INT;
  v_unit_price INT;
  v_subtotal INT := 0;
  v_discount_amount INT := 0;
  v_shipping_cost INT := 0;
  v_total_amount INT := 0;
  v_sanitized_items JSONB := '[]'::jsonb;
BEGIN
  v_is_admin := public.is_admin();

  v_email := LOWER(TRIM(COALESCE(p_order->>'customer_email', '')));
  IF v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Correo electrónico inválido para el pedido.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener al menos una prenda.';
  END IF;

  -- 1. Validar ítems, bloquear filas en products (FOR UPDATE) y calcular subtotal real en servidor
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := NULLIF(TRIM(COALESCE(v_item->>'product_id', '')), '');
    v_qty := LEAST(100, GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1)));

    IF v_prod_id IS NOT NULL THEN
      SELECT price, stock
        INTO v_db_price, v_db_stock
        FROM public.products
       WHERE id = v_prod_id
       FOR UPDATE;

      IF FOUND THEN
        IF v_db_stock < v_qty THEN
          RAISE EXCEPTION 'Stock insuficiente para la prenda seleccionada (disponibles: %).', v_db_stock;
        END IF;
        v_unit_price := CASE
          WHEN v_is_admin AND COALESCE((v_item->>'unit_price')::INT, 0) > 0
            THEN (v_item->>'unit_price')::INT
          ELSE v_db_price
        END;
      ELSE
        IF NOT v_is_admin THEN
          RAISE EXCEPTION 'Una de las prendas seleccionadas ya no está disponible en el catálogo.';
        END IF;
        v_prod_id := NULL;
        v_unit_price := GREATEST(0, COALESCE((v_item->>'unit_price')::INT, 0));
      END IF;
    ELSE
      IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Identificador de producto requerido para procesar la compra.';
      END IF;
      v_unit_price := GREATEST(0, COALESCE((v_item->>'unit_price')::INT, 0));
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    v_sanitized_items := v_sanitized_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod_id,
        'sku', NULLIF(TRIM(COALESCE(v_item->>'sku', '')), ''),
        'product_name', COALESCE(NULLIF(TRIM(v_item->>'product_name'), ''), 'Corset JAZYALON'),
        'color_name', COALESCE(NULLIF(TRIM(v_item->>'color_name'), ''), 'Negro'),
        'size', COALESCE(NULLIF(TRIM(v_item->>'size'), ''), 'S'),
        'unit_price', v_unit_price,
        'quantity', v_qty,
        'image_url', NULLIF(TRIM(COALESCE(v_item->>'image_url', '')), '')
      )
    );
  END LOOP;

  -- 2. Validar cupón promocional y condiciones en el servidor
  v_coupon := NULLIF(LOWER(TRIM(COALESCE(p_order->>'coupon_code', ''))), '');
  IF v_coupon IS NOT NULL THEN
    SELECT * INTO v_coupon_row
      FROM public.coupons
     WHERE code = v_coupon
       AND is_active = TRUE
     FOR UPDATE;

    IF FOUND
       AND (v_coupon_row.expires_at IS NULL OR v_coupon_row.expires_at > NOW())
       AND (v_coupon_row.max_uses = 0 OR v_coupon_row.used_count < v_coupon_row.max_uses)
       AND v_subtotal >= v_coupon_row.min_purchase
       AND (
         NOT v_coupon_row.require_subscription
         OR EXISTS (
           SELECT 1 FROM public.newsletter_subscribers
            WHERE email = v_email AND is_active = TRUE
         )
       )
       AND (
         NOT v_coupon_row.first_purchase_only
         OR NOT EXISTS (
           SELECT 1 FROM public.orders
            WHERE customer_email = v_email AND order_status <> 'cancelado'
         )
       )
    THEN
      v_discount_amount := ROUND((v_subtotal::NUMERIC * v_coupon_row.discount_percent::NUMERIC) / 100.0)::INT;
    ELSE
      v_coupon := NULL;
      v_discount_amount := 0;
    END IF;
  END IF;

  -- 3. Calcular despacho y total final verificado
  IF v_is_admin THEN
    v_shipping_cost := GREATEST(0, COALESCE((p_order->>'shipping_cost')::INT, 0));
  ELSE
    IF v_subtotal >= 60000 THEN
      v_shipping_cost := 0;
    ELSE
      v_shipping_cost := LEAST(15000, GREATEST(3990, COALESCE((p_order->>'shipping_cost')::INT, 5490)));
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_amount + v_shipping_cost);

  v_order_number := COALESCE(
    NULLIF(TRIM(p_order->>'order_number'), ''),
    'JAZY-CL-' || FLOOR(100000 + RANDOM() * 900000)::INT::TEXT
  );

  v_tracking := COALESCE(
    NULLIF(TRIM(p_order->>'tracking_code'), ''),
    'TRK-' || FLOOR(10000000 + RANDOM() * 90000000)::BIGINT::TEXT
  );

  -- 4. Insertar orden verificada (dispara trg_order_coupon_usage si aplica)
  INSERT INTO public.orders (
    order_number,
    user_id,
    customer_name,
    customer_rut,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_region,
    shipping_comuna,
    shipping_carrier,
    shipping_cost,
    coupon_code,
    discount_amount,
    total_amount,
    payment_method,
    order_status,
    auto_mode,
    tracking_code,
    history,
    accepted_terms
  )
  VALUES (
    v_order_number,
    auth.uid(),
    TRIM(COALESCE(p_order->>'customer_name', 'Clienta JAZYALON')),
    NULLIF(TRIM(COALESCE(p_order->>'customer_rut', '')), ''),
    v_email,
    NULLIF(TRIM(COALESCE(p_order->>'customer_phone', '')), ''),
    NULLIF(TRIM(COALESCE(p_order->>'shipping_address', '')), ''),
    NULLIF(TRIM(COALESCE(p_order->>'shipping_region', '')), ''),
    NULLIF(TRIM(COALESCE(p_order->>'shipping_comuna', '')), ''),
    COALESCE(NULLIF(TRIM(p_order->>'shipping_carrier'), ''), 'starken'),
    v_shipping_cost,
    v_coupon,
    v_discount_amount,
    v_total_amount,
    COALESCE(NULLIF(TRIM(p_order->>'payment_method'), ''), 'webpay'),
    'recibido',
    FALSE,
    v_tracking,
    COALESCE(p_order->'history', '[]'::jsonb),
    TRUE
  )
  RETURNING id INTO v_order_id;

  -- 5. Insertar detalle de prendas (dispara trg_order_item_stock_deduction atómicamente)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sanitized_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      sku,
      product_name,
      color_name,
      size,
      unit_price,
      quantity,
      image_url
    )
    VALUES (
      v_order_id,
      NULLIF(v_item->>'product_id', ''),
      NULLIF(v_item->>'sku', ''),
      v_item->>'product_name',
      v_item->>'color_name',
      v_item->>'size',
      (v_item->>'unit_price')::INT,
      (v_item->>'quantity')::INT,
      NULLIF(v_item->>'image_url', '')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'tracking_code', v_tracking,
    'total_amount', v_total_amount
  );
END;
$$;

-- E) Seguimiento público seguro por código exacto (Enmascara RUT, dirección, correo y teléfono)
CREATE OR REPLACE FUNCTION public.track_order_public(p_lookup TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_order public.orders%ROWTYPE;
  v_items JSONB;
BEGIN
  v_clean := UPPER(TRIM(COALESCE(p_lookup, '')));
  IF char_length(v_clean) < 5 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE UPPER(order_number) = v_clean
     OR (tracking_code IS NOT NULL AND UPPER(tracking_code) = v_clean)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.product_id,
        'name', oi.product_name,
        'sku', oi.sku,
        'selectedColor', oi.color_name,
        'selectedSize', oi.size,
        'quantity', oi.quantity,
        'price', oi.unit_price,
        'image', oi.image_url
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'orderNumber', v_order.order_number,
    'customerName', split_part(v_order.customer_name, ' ', 1),
    'comuna', v_order.shipping_comuna,
    'regionName', v_order.shipping_region,
    'carrier', v_order.shipping_carrier,
    'trackingCode', v_order.tracking_code,
    'paymentMethod', v_order.payment_method,
    'status', v_order.order_status,
    'autoMode', v_order.auto_mode,
    'total', v_order.total_amount,
    'createdAt', v_order.created_at,
    'updatedAt', v_order.updated_at,
    'history', v_order.history,
    'items', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter_public(TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_first_purchase_eligibility(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_order(JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order_public(TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------------------
-- 14. POLÍTICAS ROW LEVEL SECURITY (RLS) — ZERO TRUST EN TODAS LAS TABLAS
-- -----------------------------------------------------------------------------------------
ALTER TABLE public.admin_authorized_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Limpieza previa de políticas para que el script sea 100% re-ejecutable sin errores
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 14.1 Lectura pública controlada del escaparate (solo ítems publicados para visitantes; todo para Admin)
CREATE POLICY "jazyalon_read_site_settings"
  ON public.site_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "jazyalon_read_categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "jazyalon_read_collections"
  ON public.collections FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "jazyalon_read_products"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "jazyalon_read_hero_slides"
  ON public.hero_slides FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "jazyalon_read_coupons"
  ON public.coupons FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "jazyalon_read_notifications"
  ON public.subscriber_notifications FOR SELECT
  USING (TRUE);

-- 14.2 Aislamiento estricto de Perfiles (Ley 19.628)
CREATE POLICY "jazyalon_profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "jazyalon_profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND (role = 'customer' OR public.is_admin())
  );

CREATE POLICY "jazyalon_profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 14.3 Aislamiento estricto de Pedidos e Ítems (Solo la clienta dueña autenticada o Admin)
CREATE POLICY "jazyalon_orders_select_own_or_admin"
  ON public.orders FOR SELECT
  USING (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND (
        user_id = auth.uid()
        OR customer_email = LOWER(COALESCE(auth.jwt()->>'email', ''))
      )
    )
  );

CREATE POLICY "jazyalon_order_items_select_own_or_admin"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (
          public.is_admin()
          OR (
            auth.uid() IS NOT NULL
            AND (
              o.user_id = auth.uid()
              OR o.customer_email = LOWER(COALESCE(auth.jwt()->>'email', ''))
            )
          )
        )
    )
  );

-- 14.4 Formularios públicos acotados (Alertas de reposición y Contacto con validaciones CHECK)
CREATE POLICY "jazyalon_public_insert_stock_alert"
  ON public.stock_alerts FOR INSERT
  WITH CHECK (
    resolved = FALSE
    AND email = LOWER(TRIM(email))
    AND char_length(TRIM(product_name)) >= 2
  );

CREATE POLICY "jazyalon_public_insert_contact_message"
  ON public.contact_messages FOR INSERT
  WITH CHECK (
    is_resolved = FALSE
    AND sender_email = LOWER(TRIM(sender_email))
    AND char_length(TRIM(message)) >= 5
  );

-- 14.5 Control exclusivo de Administración (public.is_admin())
CREATE POLICY "jazyalon_admin_all_authorized_emails"
  ON public.admin_authorized_emails FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_site_settings"
  ON public.site_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_collections"
  ON public.collections FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_hero_slides"
  ON public.hero_slides FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_subscribers"
  ON public.newsletter_subscribers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_notifications"
  ON public.subscriber_notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_orders"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_order_items"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_stock_alerts"
  ON public.stock_alerts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_all_contact_messages"
  ON public.contact_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jazyalon_admin_read_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- -----------------------------------------------------------------------------------------
-- 15. SUPABASE STORAGE ENDURECIDO (Bucket 'admin_uploads' — Bloquea SVG/HTML/JS maliciosos)
-- -----------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin_uploads',
  'admin_uploads',
  TRUE,
  8388608, -- Límite estricto de 8 MB por imagen
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/avif'];

DROP POLICY IF EXISTS "jazyalon_storage_public_read" ON storage.objects;
DROP POLICY IF EXISTS "jazyalon_storage_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "jazyalon_storage_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "jazyalon_storage_admin_delete" ON storage.objects;

CREATE POLICY "jazyalon_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin_uploads');

CREATE POLICY "jazyalon_storage_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'admin_uploads' AND public.is_admin());

CREATE POLICY "jazyalon_storage_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'admin_uploads' AND public.is_admin())
  WITH CHECK (bucket_id = 'admin_uploads' AND public.is_admin());

CREATE POLICY "jazyalon_storage_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'admin_uploads' AND public.is_admin());

-- -----------------------------------------------------------------------------------------
-- 16. CREACIÓN AUTOMÁTICA DEL ACCESO ADMINISTRADOR EN SUPABASE AUTH ("Jazz")
--     Correo:     jazz@jazyalon.cl
--     Contraseña: Jazyalon2026!Admin
-- -----------------------------------------------------------------------------------------
DO $$
DECLARE
  v_admin_id UUID;
  v_admin_email CONSTANT TEXT := 'jazz@jazyalon.cl';
  v_admin_pass CONSTANT TEXT := 'Jazyalon2026!Admin';
  col_rec RECORD;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE LOWER(email) = v_admin_email
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    v_admin_id := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID;

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      extensions.crypt(v_admin_pass, extensions.gen_salt('bf', 10)),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"full_name":"Jazz","email_verified":true}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_admin_id,
      jsonb_build_object(
        'sub', v_admin_id::text,
        'email', v_admin_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_admin_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    -- Asegurar contraseña válida, email confirmado y metadatos admin si ya existía
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(v_admin_pass, extensions.gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"Jazz"}'::jsonb,
        confirmation_token = COALESCE(confirmation_token, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        recovery_token = COALESCE(recovery_token, ''),
        updated_at = NOW()
    WHERE id = v_admin_id;

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = v_admin_id AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        v_admin_id,
        jsonb_build_object(
          'sub', v_admin_id::text,
          'email', v_admin_email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        v_admin_id::text,
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- Evitar error GoTrue de columnas token NULL según versión de Supabase Auth (respetando phone = NULL)
  FOR col_rec IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name IN (
        'email_change_token_current',
        'reauthentication_token',
        'phone_change',
        'phone_change_token'
      )
  LOOP
    EXECUTE format(
      'UPDATE auth.users SET %I = COALESCE(%I, '''') WHERE id = $1',
      col_rec.column_name,
      col_rec.column_name
    ) USING v_admin_id;
  END LOOP;

  -- Garantizar perfil sincronizado con nombre "Jazz" y rol "admin"
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (v_admin_id, v_admin_email, 'Jazz', '+56 9 4018 7563', 'admin')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = 'Jazz',
    role = 'admin',
    updated_at = NOW();
END $$;

-- -----------------------------------------------------------------------------------------
-- 17. SEMILLA INICIAL COMPLETA DEL SITIO WEB JAZYALON (Idempotente — ON CONFLICT DO NOTHING)
-- -----------------------------------------------------------------------------------------

-- 17.1 Configuración global
INSERT INTO public.site_settings (id, maintenance_enabled, maintenance_mode, maintenance_message, drop_name)
VALUES ('main', FALSE, 'standard', 'Estamos en mantenimiento. Volvemos pronto.', 'Drop 02 — Edición Limitada')
ON CONFLICT (id) DO NOTHING;

-- 17.2 Cupón de bienvenida antonella10
INSERT INTO public.coupons (
  code,
  discount_percent,
  description,
  require_subscription,
  first_purchase_only,
  min_purchase,
  max_uses,
  is_active
)
VALUES (
  'antonella10',
  10,
  '10% de descuento en tu primera compra al suscribirte',
  TRUE,
  TRUE,
  0,
  0,
  TRUE
)
ON CONFLICT (code) DO NOTHING;

-- 17.3 Categorías base de Corsetería
INSERT INTO public.categories (id, name, description, display_order, is_active)
VALUES
  ('corsets-brocado', 'Corsets Brocado & Satén', 'Corsetería estructurada en brocado damasco y satén plisado.', 1, TRUE),
  ('corsets-encaje', 'Corsets de Encaje', 'Diseños románticos en encaje floral con lazos de satén.', 2, TRUE),
  ('corsets-mangas', 'Corsets con Mangas', 'Corsets estructurados con mangas largas de encaje traslúcido.', 3, TRUE),
  ('corsets-denim', 'Corsets Denim & Lúrex', 'Texturas en mezclilla estructurada y destellos lúrex.', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 17.4 Colecciones base
INSERT INTO public.collections (id, name, subtitle, image_url, is_primary_featured, display_order, is_active)
VALUES
  ('destacados-principal', 'Nuevos Drops & Destacados', 'Selección principal de corsets estructurados con ballenas de acero.', '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg', TRUE, 1, TRUE),
  ('brocado-imperial', 'Brocado & Satén', 'Corsetería clásica en brocado damasco y satén plisado.', '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg', FALSE, 2, TRUE),
  ('encaje-romantico', 'Encaje Floral', 'Detalles en encaje fino, lazos de satén y terminaciones románticas.', '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg', FALSE, 3, TRUE),
  ('mangas-encaje', 'Mangas de Encaje', 'Corsets estructurados con mangas largas de encaje floral.', '/catalogo/IMG_8375.jpeg', FALSE, 4, TRUE),
  ('denim-lurex', 'Denim & Lúrex', 'Texturas metalizadas, lúrex brillante y mezclilla estructurada.', '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg', FALSE, 5, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 17.5 Catálogo inicial de 9 Corsets JAZYALON
INSERT INTO public.products (
  id, sku, name, description, specifications, category, collection,
  price, old_price, stock, badge, image_url, images, sizes, colors,
  is_collection_primary, is_new, drop_order, is_featured, is_active
)
VALUES
  (
    'prod-001', 'JAZ-COR-001', 'Corset Overbust Brocado Victoriano',
    'Corset overbust en tejido brocado floral con lazo frontal y estructura de ballenas para modelar la cintura con ajuste anatómico.',
    '{"Estructura":"Ballenas flexibles y soporte anatómico","Escote":"Corazón con lazo de satén","Espalda":"Ajustable con lazada trasera"}',
    'corsets-brocado', 'brocado-imperial',
    44990, 54990, 16, 'NUEVO DROP',
    '/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg',
    '["/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Café Moca","hex":"#4B362A","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg"},{"name":"Burdeos","hex":"#581828","availableSizes":["XS","S","M","L","XL"],"outOfStockSizes":[],"image":"/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg"},{"name":"Negro","hex":"#111111","availableSizes":["S","M","L"],"outOfStockSizes":["XS","XL"],"image":"/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg"},{"name":"Blanco Marfil","hex":"#F4F4F4","availableSizes":["XS","S","M"],"outOfStockSizes":["L","XL"],"image":"/catalogo/1be329e9-5577-451a-8927-91f459ede608.jpeg"}]'::jsonb,
    TRUE, TRUE, 1, TRUE, TRUE
  ),
  (
    'prod-002', 'JAZ-COR-002', 'Corset Overbust Satén Plisado & Encaje',
    'Corset overbust en satén plisado diagonal con borde superior de encaje delicado y corte en punta que estiliza el torso.',
    '{"Material":"Satén plisado con ribete de encaje","Corte":"Overbust en V estilizador","Ajuste":"Lazada posterior regulable"}',
    'corsets-brocado', 'brocado-imperial',
    42990, 52990, 12, 'NUEVO DROP',
    '/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg',
    '["/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Burdeos","hex":"#4D192B","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg"},{"name":"Negro","hex":"#111111","availableSizes":["XS","S","M","L","XL"],"outOfStockSizes":[],"image":"/catalogo/222b59b1-88c4-4298-8408-ce74779f0339.jpeg"}]'::jsonb,
    FALSE, TRUE, 2, TRUE, TRUE
  ),
  (
    'prod-003', 'JAZ-COR-003', 'Corset Overbust Lúrex Brillante',
    'Corset de noche con destellos sutiles en tejido lúrex, terminación de encaje en el escote y estructura moldeadora.',
    '{"Acabado":"Tejido con destellos lúrex y encaje","Estructura":"Varillas moldeadoras de silueta"}',
    'corsets-denim', 'denim-lurex',
    43990, 53990, 14, 'DESTACADO',
    '/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg',
    '["/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Negro Brillante","hex":"#141414","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg"},{"name":"Burdeos","hex":"#541628","availableSizes":["S","M","L","XL"],"outOfStockSizes":["XS"],"image":"/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg"},{"name":"Chocolate","hex":"#3B2427","availableSizes":["XS","S","M"],"outOfStockSizes":["L","XL"],"image":"/catalogo/27b96c49-3f9d-4bf1-b737-a15ca61524cc.jpeg"}]'::jsonb,
    FALSE, FALSE, 5, TRUE, TRUE
  ),
  (
    'prod-004', 'JAZ-COR-004', 'Corset Overbust Texturizado con Lazo',
    'Corset estructurado en tela texturizada con acabado satinado y lazo central en el busto.',
    '{"Material":"Tejido texturizado de alta densidad","Corte":"Overbust con copas preformadas"}',
    'corsets-brocado', 'brocado-imperial',
    44990, NULL, 11, 'COLECCIÓN',
    '/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg',
    '["/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Plata Oscura","hex":"#4A4A4A","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg"},{"name":"Rojo Carmesí","hex":"#8C1D2E","availableSizes":["S","M","L"],"outOfStockSizes":["XS","XL"],"image":"/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg"},{"name":"Negro","hex":"#141414","availableSizes":["XS","S","M","L","XL"],"outOfStockSizes":[],"image":"/catalogo/b38dc1e3-b343-4ac4-8264-043e6000bc86.jpeg"}]'::jsonb,
    FALSE, FALSE, 6, TRUE, TRUE
  ),
  (
    'prod-005', 'JAZ-COR-005', 'Corset Overbust Encaje Floral & Lazo Satén',
    'Corset romántico confeccionado en encaje floral con varillas marcadas, ribete fruncido superior y lazo de satén en el centro.',
    '{"Material":"Encaje floral sobre base estructurada","Detalle":"Lazo de satén y escote corazón"}',
    'corsets-encaje', 'encaje-romantico',
    45990, 56990, 18, 'NUEVO DROP',
    '/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg',
    '["/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Champagne","hex":"#DECBB3","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg"},{"name":"Burdeos","hex":"#5E1929","availableSizes":["XS","S","M","L","XL"],"outOfStockSizes":[],"image":"/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg"},{"name":"Negro","hex":"#141414","availableSizes":["S","M","L"],"outOfStockSizes":["XS","XL"],"image":"/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg"},{"name":"Blanco","hex":"#F5F5F5","availableSizes":["XS","S","M"],"outOfStockSizes":["L","XL"],"image":"/catalogo/c68b063a-35a8-444a-ad53-cc40d3331a26.jpeg"}]'::jsonb,
    TRUE, TRUE, 3, TRUE, TRUE
  ),
  (
    'prod-006', 'JAZ-COR-006', 'Corset Overbust Denim Estructurado',
    'Corset overbust en mezclilla denim estructurada con costuras verticales definidas y lazo satinado al tono.',
    '{"Material":"Denim estructurado de alto gramaje","Corte":"Overbust con soporte de busto"}',
    'corsets-denim', 'denim-lurex',
    41990, 49990, 15, 'OFERTA',
    '/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg',
    '["/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Azul Índigo","hex":"#222F5B","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg"},{"name":"Azul Noche","hex":"#161E3B","availableSizes":["S","M","L","XL"],"outOfStockSizes":["XS"],"image":"/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg"},{"name":"Celeste Denim","hex":"#4E6E9E","availableSizes":["XS","S","M"],"outOfStockSizes":["L","XL"],"image":"/catalogo/cc4a877c-6997-45f9-90a2-a6965aa6e018.jpeg"}]'::jsonb,
    TRUE, FALSE, 7, TRUE, TRUE
  ),
  (
    'prod-007', 'JAZ-COR-007', 'Corset Overbust Encaje & Lazos Laterales',
    'Corset en encaje floral con delicados lazos de satén en las caderas y el escote.',
    '{"Material":"Encaje floral bordado","Terminación":"Lazos laterales en cadera y busto"}',
    'corsets-encaje', 'encaje-romantico',
    45990, NULL, 10, 'DESTACADO',
    '/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg',
    '["/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Negro","hex":"#141414","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg"},{"name":"Blanco","hex":"#F5F5F5","availableSizes":["XS","S","M"],"outOfStockSizes":["L","XL"],"image":"/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg"},{"name":"Rojo & Encaje Negro","hex":"#6B1522","availableSizes":["S","M","L","XL"],"outOfStockSizes":["XS"],"image":"/catalogo/f53a315f-c4ce-4b4d-94e2-f7685be30ad1.jpeg"}]'::jsonb,
    FALSE, FALSE, 8, TRUE, TRUE
  ),
  (
    'prod-008', 'JAZ-COR-008', 'Corset Manga Larga de Encaje Floral',
    'Corset estructurado con mangas largas de encaje traslúcido, escote corazón con lazo central y varillas estilizadas.',
    '{"Mangas":"Manga larga en encaje floral","Estructura":"Corpiño estructurado con varillas"}',
    'corsets-mangas', 'mangas-encaje',
    49990, 59990, 12, 'NUEVO DROP',
    '/catalogo/IMG_8375.jpeg',
    '["/catalogo/IMG_8375.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Negro","hex":"#111111","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/IMG_8375.jpeg"},{"name":"Blanco","hex":"#F5F5F5","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/IMG_8375.jpeg"},{"name":"Burdeos","hex":"#6E141E","availableSizes":["S","M","L"],"outOfStockSizes":["XS","XL"],"image":"/catalogo/IMG_8375.jpeg"}]'::jsonb,
    TRUE, TRUE, 4, TRUE, TRUE
  ),
  (
    'prod-009', 'JAZ-COR-009', 'Corset Manga Larga de Encaje Romántico',
    'Corset con mangas largas de encaje fino en tonos suaves y clásicos, diseñado para estilizar la figura con elegancia.',
    '{"Mangas":"Manga larga en encaje romántico","Estructura":"Corpiño moldeador en V"}',
    'corsets-mangas', 'mangas-encaje',
    49990, 59990, 9, 'COLECCIÓN',
    '/catalogo/IMG_8376.jpeg',
    '["/catalogo/IMG_8376.jpeg"]'::jsonb,
    '["XS","S","M","L","XL"]'::jsonb,
    '[{"name":"Negro","hex":"#111111","availableSizes":["XS","S","M","L"],"outOfStockSizes":["XL"],"image":"/catalogo/IMG_8376.jpeg"},{"name":"Blanco","hex":"#F5F5F5","availableSizes":["XS","S","M"],"outOfStockSizes":["L","XL"],"image":"/catalogo/IMG_8376.jpeg"},{"name":"Champagne","hex":"#DFCBB5","availableSizes":["S","M","L"],"outOfStockSizes":["XS","XL"],"image":"/catalogo/IMG_8376.jpeg"}]'::jsonb,
    FALSE, FALSE, 9, TRUE, TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- Vincular corsets principales en las colecciones base
UPDATE public.collections SET primary_product_id = 'prod-001' WHERE id = 'destacados-principal' AND primary_product_id IS NULL;
UPDATE public.collections SET primary_product_id = 'prod-002' WHERE id = 'brocado-imperial' AND primary_product_id IS NULL;
UPDATE public.collections SET primary_product_id = 'prod-005' WHERE id = 'encaje-romantico' AND primary_product_id IS NULL;
UPDATE public.collections SET primary_product_id = 'prod-008' WHERE id = 'mangas-encaje' AND primary_product_id IS NULL;
UPDATE public.collections SET primary_product_id = 'prod-006' WHERE id = 'denim-lurex' AND primary_product_id IS NULL;

-- 17.6 Carrusel Hero inicial (Slides 01, 02 y 03)
INSERT INTO public.hero_slides (id, tag, title, subtitle, cta, category, image, display_order, is_active)
VALUES
  (1, 'Drop 01', 'Corsets Victorianos', 'Ballenas de acero espiralado y reducción de cintura de 5 a 10 cm.', 'Explorar Corsetería', 'corsets-brocado', '/fotos/01.png', 0, TRUE),
  (2, 'Drop 02', 'Corsetería de Encaje', 'Siluetas estructuradas en encaje floral y satén de alta costura.', 'Ver Encaje', 'corsets-encaje', '/fotos/02.jpg', 1, TRUE),
  (3, 'Drop 03', 'Corsets Manga Larga', 'Encaje romántico con mangas estructuradas y escote corazón.', 'Descubrir Diseños', 'corsets-mangas', '/fotos/03.jpg', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
