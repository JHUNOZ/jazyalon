-- ====================================================================
-- JAZYALON VICTORIAN HAUTE COUTURE - ESQUEMA ÚNICO DE BASE DE DATOS (3NF)
-- Sin redundancias + Row Level Security (RLS) + Triggers Automáticos
-- Cumplimiento OWASP Top 10 y Leyes Chilenas (Ley N° 19.496 y Ley N° 19.628)
-- ====================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. LISTA AUTORIZADA DE CORREOS DE ADMINISTRACIÓN (Sin duplicados, correo normalizado)
CREATE TABLE IF NOT EXISTS public.admin_authorized_emails (
  email VARCHAR(254) PRIMARY KEY CHECK (email = LOWER(TRIM(email))),
  display_name VARCHAR(150),
  added_by VARCHAR(254),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Semilla inicial segura para el correo principal de administración
INSERT INTO public.admin_authorized_emails (email, display_name, added_by)
VALUES ('admin@jazyalon.cl', 'Jazz', 'system')
ON CONFLICT (email) DO NOTHING;

-- 3. PERFILES DE USUARIO Y ROLES (Vinculado 1:1 con auth.users, sin contraseñas en texto plano)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(254) UNIQUE NOT NULL CHECK (email = LOWER(TRIM(email))),
  rut VARCHAR(15) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(25),
  shipping_address TEXT,
  shipping_comuna VARCHAR(100),
  shipping_region VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Función segura para verificar privilegios de administración (JWT, perfil o lista autorizada)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT LOWER(TRIM(email)) INTO current_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_authorized_emails
      WHERE email = current_email
    )
    OR COALESCE(
      (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'customer'
    ) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger automático: Al registrarse en auth.users, crea su perfil limpio y asigna rol 'admin' si su correo fue autorizado
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  clean_email TEXT;
  assigned_role VARCHAR(20);
BEGIN
  clean_email := LOWER(TRIM(NEW.email));

  IF EXISTS (SELECT 1 FROM public.admin_authorized_emails WHERE email = clean_email) THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, rut, role)
  VALUES (
    NEW.id,
    clean_email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(clean_email, '@', 1)),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'rut'), ''),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE
      WHEN EXISTS (SELECT 1 FROM public.admin_authorized_emails WHERE email = EXCLUDED.email) THEN 'admin'
      ELSE public.profiles.role
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. CONFIGURACIÓN WEB GLOBAL (Modo Mantenimiento, Barra Superior y Beneficios - Fila única id = 'main')
CREATE TABLE IF NOT EXISTS public.site_settings (
  id VARCHAR(20) PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  maintenance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_mode VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (maintenance_mode IN ('standard', 'drop')),
  maintenance_message VARCHAR(300) NOT NULL DEFAULT 'Estamos en mantenimiento. Volvemos pronto.',
  drop_name VARCHAR(150) DEFAULT 'Próximo Drop Exclusivo',
  drop_target_date TIMESTAMPTZ,
  announcement_messages JSONB NOT NULL DEFAULT '["🇨🇱 Corsetería Victoriana & Alta Costura en Chile","🌹 10% OFF en tu primera compra con el cupón: antonella10","✨ Envíos gratis a todo Chile por compras sobre $85.000","📦 Despachos rápidos vía Starken, Chilexpress y Blue Express","💳 Hasta 6 cuotas sin interés con Webpay Plus y Transferencia"]'::jsonb,
  benefits_config JSONB NOT NULL DEFAULT '{"badgeText":"10% DE DESCUENTO EN TU PRIMERA COMPRA","title":"Únete a Nuestra Comunidad","subtitle":"Suscríbete para recibir novedades de nuevos ingresos y activa tu descuento con el código","featuredCouponCode":"antonella10","footerNote":"Cero spam. Solo invitaciones a nuevos lanzamientos.","notifyOnPriceDrop":true,"notifyOnNewCollection":true,"notifyOnLowStock":true,"lowStockThreshold":3}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.site_settings (id, maintenance_enabled, maintenance_mode, maintenance_message, drop_name)
VALUES ('main', FALSE, 'standard', 'Estamos en mantenimiento. Volvemos pronto.', 'Drop 02 — Edición Limitada')
ON CONFLICT (id) DO NOTHING;

-- 5. CATEGORÍAS (Normalizadas)
CREATE TABLE IF NOT EXISTS public.categories (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COLECCIONES (Normalizadas y sincronizadas con el catálogo)
CREATE TABLE IF NOT EXISTS public.collections (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subtitle VARCHAR(255),
  image_url TEXT NOT NULL,
  primary_product_id UUID,
  is_primary_featured BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRODUCTOS MAESTROS (Compatible con HONE Catalog & Tienda JAZYALON)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT DEFAULT '',
  specifications TEXT DEFAULT '',
  category VARCHAR(60) REFERENCES public.categories(id) ON DELETE SET NULL,
  collection VARCHAR(60) REFERENCES public.collections(id) ON DELETE SET NULL,
  price INT NOT NULL CHECK (price >= 0),
  old_price INT CHECK (old_price IS NULL OR old_price >= price),
  discount INT DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge VARCHAR(60),
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '["XS","S","M","L","XL"]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  is_collection_primary BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT TRUE,
  drop_order INT DEFAULT 99,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 8. CARRUSEL HERO DE PORTADA (Slides 01, 02, 03)
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id INT PRIMARY KEY,
  tag VARCHAR(60) DEFAULT 'Drop 01',
  title VARCHAR(160) NOT NULL,
  subtitle VARCHAR(255),
  cta VARCHAR(90) DEFAULT 'Descubrir Colección',
  category VARCHAR(60) DEFAULT 'all',
  image TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PEDIDOS Y SEGUIMIENTO EN TIEMPO REAL (Ley 19.496 / 19.628)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_rut VARCHAR(15),
  customer_email VARCHAR(254) NOT NULL CHECK (customer_email = LOWER(TRIM(customer_email))),
  customer_phone VARCHAR(25),
  shipping_address TEXT,
  shipping_region VARCHAR(100),
  shipping_comuna VARCHAR(100),
  shipping_carrier VARCHAR(50) DEFAULT 'starken',
  shipping_cost INT DEFAULT 0 CHECK (shipping_cost >= 0),
  discount_amount INT DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount INT NOT NULL CHECK (total_amount >= 0),
  payment_method VARCHAR(50) NOT NULL,
  order_status VARCHAR(30) DEFAULT 'recibido' CHECK (order_status IN ('recibido', 'preparacion', 'empacado', 'en_camino', 'entregado', 'cancelado')),
  tracking_code VARCHAR(100),
  history JSONB DEFAULT '[]'::jsonb,
  accepted_terms BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);

-- 10. ÍTEMS DE PEDIDO (3NF sin duplicación de orden)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sku VARCHAR(60),
  product_name VARCHAR(160) NOT NULL,
  color_name VARCHAR(60) NOT NULL,
  size VARCHAR(20) NOT NULL,
  unit_price INT NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  image_url TEXT
);

-- 11. SOLICITUDES DE REPOSICIÓN DE TALLA
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  color VARCHAR(60),
  size VARCHAR(20) NOT NULL,
  email VARCHAR(254) NOT NULL CHECK (email = LOWER(TRIM(email))),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CUPONES PROMOCIONALES Y CONDICIONES CONFIGURABLES (Ej: antonella10)
CREATE TABLE IF NOT EXISTS public.coupons (
  code VARCHAR(40) PRIMARY KEY CHECK (code = LOWER(TRIM(code))),
  discount_percent INT NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 95),
  description VARCHAR(240) DEFAULT '',
  require_subscription BOOLEAN NOT NULL DEFAULT TRUE,
  first_purchase_only BOOLEAN NOT NULL DEFAULT TRUE,
  min_purchase INT NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  max_uses INT NOT NULL DEFAULT 0 CHECK (max_uses >= 0),
  used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.coupons (code, discount_percent, description, require_subscription, first_purchase_only, min_purchase, is_active)
VALUES ('antonella10', 10, '10% de descuento de bienvenida al suscribirse', TRUE, TRUE, 0, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 13. SUSCRIPTORAS Y NOTIFICACIONES AUTOMÁTICAS (Bajas de precio, Nuevas colecciones, Pocas unidades)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  email VARCHAR(254) PRIMARY KEY CHECK (email = LOWER(TRIM(email))),
  notify_price_drop BOOLEAN NOT NULL DEFAULT TRUE,
  notify_new_collection BOOLEAN NOT NULL DEFAULT TRUE,
  notify_low_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriber_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('price_drop', 'new_collection', 'low_stock', 'custom')),
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  product_id VARCHAR(100),
  collection_id VARCHAR(100),
  recipients_count INT NOT NULL DEFAULT 0,
  recipients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. CONSENTIMIENTOS LEGALES Y AUDITORÍA DE SEGURIDAD
CREATE TABLE IF NOT EXISTS public.legal_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_rut VARCHAR(15),
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('terms_and_conditions', 'privacy_policy', 'cookie_banner')),
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  version VARCHAR(20) DEFAULT '1.0'
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(60) NOT NULL,
  table_name VARCHAR(60) NOT NULL,
  record_id VARCHAR(100),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS) - ZERO TRUST
-- ====================================================================
ALTER TABLE public.admin_authorized_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Lectura pública controlada para escaparate y estado de mantenimiento
CREATE POLICY "Public read site settings" ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Public read active collections" ON public.collections FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Public read hero slides" ON public.hero_slides FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Public subscribe newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public read subscriber notifications" ON public.subscriber_notifications FOR SELECT USING (TRUE);

-- Aislamiento estricto de perfiles y pedidos por clienta
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (
  public.is_admin()
  OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR customer_email = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))))
);
CREATE POLICY "Public create orders" ON public.orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public create order items" ON public.order_items FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_admin() OR o.user_id = auth.uid()))
);

-- Alertas de talla y consentimientos
CREATE POLICY "Public create stock alert" ON public.stock_alerts FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admin manage stock alerts" ON public.stock_alerts FOR ALL USING (public.is_admin());
CREATE POLICY "Public create legal consent" ON public.legal_consents FOR INSERT WITH CHECK (TRUE);

-- Control exclusivo de Administración (public.is_admin())
CREATE POLICY "Admin manage authorized emails" ON public.admin_authorized_emails FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage site settings" ON public.site_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage collections" ON public.collections FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage hero slides" ON public.hero_slides FOR ALL USING (public.is_admin());
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage subscribers" ON public.newsletter_subscribers FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage subscriber notifications" ON public.subscriber_notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Admin read audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
