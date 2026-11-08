import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Package,
  Heart,
  Truck,
  CheckCircle2,
  Clock,
  LogOut,
  Search,
  ShoppingBag,
  Sparkles,
  Crown,
  MapPin,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { formatCLP } from '../../utils/formatters';
import { normalizeEmail } from '../../utils/security';
import ProductCard from '../catalog/ProductCard';
import VictorianDivider from '../common/VictorianDivider';

export default function AccountView({ setCurrentView }) {
  const {
    currentUser,
    isAdmin,
    logoutUser,
    updateUserProfile,
    setIsAuthOpen,
    orders,
    orderStages,
    trackOrderByCode,
    wishlist,
    addToCart,
    showToast
  } = useShop();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'wishlist' | 'profile'
  const [trackingSearch, setTrackingSearch] = useState('');
  const [cloudTrackedOrder, setCloudTrackedOrder] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    rut: currentUser?.rut || '',
    address: currentUser?.address || '',
    comuna: currentUser?.comuna || ''
  });
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        rut: currentUser.rut || '',
        address: currentUser.address || '',
        comuna: currentUser.comuna || ''
      });
    }
  }, [currentUser]);

  // Consulta pública segura por código exacto en Supabase cuando la clienta busca sin sesión
  useEffect(() => {
    const q = trackingSearch.trim();
    if (q.length < 6 || typeof trackOrderByCode !== 'function') {
      setCloudTrackedOrder(null);
      return undefined;
    }

    const localHit = (orders || []).some(
      (o) =>
        o.orderNumber?.toLowerCase() === q.toLowerCase() ||
        o.trackingCode?.toLowerCase() === q.toLowerCase()
    );
    if (localHit) {
      setCloudTrackedOrder(null);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      const found = await trackOrderByCode(q);
      if (active) {
        setCloudTrackedOrder(found || null);
      }
    }, 320);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trackingSearch, orders, trackOrderByCode]);

  // Aislamiento real de pedidos: cada clienta ve únicamente sus propias órdenes (o búsqueda exacta por #orden / código)
  const visibleOrders = useMemo(() => {
    const q = trackingSearch.trim().toLowerCase();
    if (q !== '') {
      const localMatches = (orders || []).filter(
        (o) =>
          o.orderNumber?.toLowerCase() === q ||
          o.trackingCode?.toLowerCase() === q ||
          (isAdmin &&
            (o.orderNumber?.toLowerCase().includes(q) ||
              o.customerEmail?.toLowerCase().includes(q)))
      );
      if (localMatches.length > 0) return localMatches;
      return cloudTrackedOrder ? [cloudTrackedOrder] : [];
    }
    if (!currentUser) return [];
    if (isAdmin) return orders || [];
    const userEmail = normalizeEmail(currentUser.email);
    return (orders || []).filter((o) => normalizeEmail(o.customerEmail) === userEmail);
  }, [orders, currentUser, isAdmin, trackingSearch, cloudTrackedOrder]);

  const handleAddAllWishlistToCart = () => {
    wishlist.forEach((product) => {
      const defaultColor = product.colors?.[0]?.name || 'Negro';
      const defaultSize = product.colors?.[0]?.availableSizes?.[0] || product.sizes?.[0] || 'S';
      addToCart(product, defaultSize, defaultColor, 1);
    });
    showToast(`¡${wishlist.length} prendas añadidas a tu carrito!`);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileError('');
    const res = updateUserProfile(profileForm);
    if (!res.success) {
      setProfileError(res.message);
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto min-h-[75vh]">
      <VictorianDivider
        title={currentUser ? `Hola, ${currentUser.name}` : 'Mi Cuenta & Seguimiento'}
        subtitle="PANEL DE CLIENTA // SEGUIMIENTO EN TIEMPO REAL"
      />

      {/* TOP USER BAR */}
      <div className="bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl p-4 sm:p-6 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#181514] text-[#C8A96B] flex items-center justify-center font-bold text-lg border border-[#9E7B3B]">
            {currentUser ? currentUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="jz-display text-xl text-[#181514] font-normal">
                {currentUser ? currentUser.name : 'Visitante JAZYALON'}
              </h3>
              {currentUser ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Sesión Activa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAE4D8] text-[#5E564F] border border-[#D6CEBF] text-[10px] font-semibold uppercase tracking-wider">
                  Sin iniciar sesión
                </span>
              )}
            </div>
            <p className="text-xs text-[#5E564F] mt-0.5">
              {currentUser
                ? currentUser.email
                : 'Inicia sesión o consulta tu pedido ingresando tu número de orden.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCurrentView('admin')}
              className="px-4 py-2.5 rounded-xl bg-[#181514] hover:bg-[#9E7B3B] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Crown className="w-4 h-4 text-[#C8A96B]" />
              <span>Ir al Panel Admin</span>
            </button>
          )}
          {currentUser ? (
            <button
              type="button"
              onClick={() => {
                logoutUser();
                setCurrentView('home');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-red-50 text-[#5E564F] hover:text-red-700 border border-[#D6CEBF] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#9E7B3B] hover:bg-[#181514] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Iniciar Sesión / Registrarse</span>
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[#D6CEBF] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#181514] text-[#FAF8F5] shadow-md'
              : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
          }`}
        >
          <Truck className="w-4 h-4 text-[#C8A96B]" />
          <span>Mis Compras & Seguimiento ({visibleOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wishlist')}
          className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'wishlist'
              ? 'bg-[#181514] text-[#FAF8F5] shadow-md'
              : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
          }`}
        >
          <Heart className="w-4 h-4 text-[#C8A96B]" />
          <span>Mi Wishlist ({wishlist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#181514] text-[#FAF8F5] shadow-md'
              : 'bg-[#EDE8DE] text-[#5E564F] hover:text-[#181514]'
          }`}
        >
          <User className="w-4 h-4 text-[#C8A96B]" />
          <span>Datos de Cuenta</span>
        </button>
      </div>

      {/* TAB 1: MIS COMPRAS & SEGUIMIENTO EN VIVO */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-[#FAF8F5] border border-[#D6CEBF] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#5E564F]">
              <Sparkles className="w-4 h-4 text-[#9E7B3B] shrink-0" />
              <span>
                Consulta en <strong>tiempo real</strong> el estado de preparación y despacho ingresando tu número de orden o iniciando sesión.
              </span>
            </div>
            <div className="relative sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8178]" />
              <input
                type="text"
                placeholder="Número exacto (ej: JAZY-CL-849201)..."
                value={trackingSearch}
                onChange={(e) => setTrackingSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-[#D6CEBF] rounded-xl text-xs text-[#181514] placeholder-[#8A8178] focus:border-[#9E7B3B] focus:outline-none"
              />
            </div>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl p-12 text-center">
              <Package className="w-10 h-10 text-[#9E7B3B] mx-auto mb-3" />
              <h4 className="jz-display text-2xl text-[#181514] mb-1">
                {currentUser ? 'Aún no tienes compras registradas' : 'Busca tu pedido o inicia sesión'}
              </h4>
              <p className="text-xs text-[#5E564F] mb-5 max-w-md mx-auto">
                {currentUser
                  ? 'Cuando realices una compra en JAZYALON, verás aquí cada etapa de preparación y tu código de courier en vivo.'
                  : 'Ingresa tu código de orden en el buscador superior o entra a tu cuenta para ver tus pedidos.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="px-5 py-2.5 bg-[#181514] hover:bg-[#9E7B3B] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentView('catalog')}
                  className="px-6 py-2.5 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Explorar Catálogo
                </button>
              </div>
            </div>
          ) : (
            visibleOrders.map((order) => {
              const currentStageIdx = Math.max(
                0,
                orderStages.findIndex((s) => s.id === order.status)
              );
              const currentStageObj = orderStages[currentStageIdx] || orderStages[0];

              return (
                <div
                  key={order.id}
                  className="bg-[#FAF8F5] border border-[#D6CEBF] rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-[#181514] text-[#FAF8F5] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm sm:text-base font-bold text-[#C8A96B]">
                          Orden #{order.orderNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#9E7B3B]/25 border border-[#C8A96B]/40 text-[#C8A96B] text-[10px] font-bold uppercase tracking-wider">
                          {currentStageObj.label}
                        </span>
                        {order.autoMode && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-bold uppercase">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            Actualización Automática Activa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Clienta: <strong>{order.customerName}</strong></span>
                        <span>• Courier: <strong className="uppercase text-[#C8A96B]">{order.carrier}</strong></span>
                        <span>• Código Seguimiento: <strong className="font-mono text-white">{order.trackingCode}</strong></span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-widest text-white/60 block">Total Pagado</span>
                      <span className="font-mono text-base sm:text-lg font-bold text-[#C8A96B]">
                        {formatCLP(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* LIVE 5-STAGE TRACKING STEPPER */}
                  <div className="p-5 sm:p-6 border-b border-[#D6CEBF] bg-[#F4F0E8]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#9E7B3B] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Seguimiento en Tiempo Real</span>
                      </span>
                      <span className="text-[11px] text-[#5E564F] font-medium">
                        Etapa {currentStageIdx + 1} de {orderStages.length}
                      </span>
                    </div>

                    <div className="relative pt-2 pb-4">
                      <div className="h-2 w-full bg-[#DED6C6] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#9E7B3B] to-emerald-600 transition-all duration-700"
                          style={{
                            width: `${((currentStageIdx + 1) / orderStages.length) * 100}%`
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                        {orderStages.map((stage, idx) => {
                          const isCompleted = idx <= currentStageIdx;
                          const isCurrent = idx === currentStageIdx;
                          return (
                            <div
                              key={stage.id}
                              className={`p-3 rounded-xl border transition-all ${
                                isCurrent
                                  ? 'bg-[#FFFFFF] border-[#9E7B3B] shadow-sm ring-1 ring-[#9E7B3B]/40'
                                  : isCompleted
                                  ? 'bg-[#FAF8F5] border-emerald-600/30'
                                  : 'bg-[#EDE8DE]/60 border-[#D6CEBF] opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                    isCompleted
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#D6CEBF] text-[#5E564F]'
                                  }`}
                                >
                                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E7B3B]">
                                    Actual
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-[#181514] leading-snug">
                                {stage.shortLabel}
                              </div>
                              <p className="text-[10px] text-[#5E564F] mt-0.5 leading-tight">
                                {stage.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-3">
                      <h5 className="text-[11px] uppercase tracking-widest font-bold text-[#181514]">
                        Prendas Incluidas en el Pedido
                      </h5>
                      <div className="space-y-2.5">
                        {(order.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3.5 p-3 rounded-xl bg-white border border-[#D6CEBF]"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-16 object-cover rounded-lg border border-[#D6CEBF] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h6 className="text-xs font-bold text-[#181514] truncate">{item.name}</h6>
                              <p className="text-[11px] text-[#5E564F] mt-0.5">
                                Color: <strong>{item.selectedColor}</strong> • Talla: <strong>{item.selectedSize}</strong> • Cant: <strong>{item.quantity}</strong>
                              </p>
                              <span className="text-[10px] font-mono text-[#8A8178]">SKU: {item.sku}</span>
                            </div>
                            <div className="font-mono text-xs font-bold text-[#181514]">
                              {formatCLP(item.price * (item.quantity || 1))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.address && (
                        <div className="p-3.5 rounded-xl bg-[#EDE8DE] border border-[#D6CEBF] text-xs text-[#5E564F] flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-[#9E7B3B] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[#181514]">Dirección de Entrega:</strong> {order.address}, {order.comuna} ({order.regionName})
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 space-y-3">
                      <h5 className="text-[11px] uppercase tracking-widest font-bold text-[#181514] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#9E7B3B]" />
                        <span>Bitácora de Actualizaciones</span>
                      </h5>
                      <div className="bg-white border border-[#D6CEBF] rounded-xl p-4 space-y-3 max-h-60 overflow-y-auto">
                        {[...(order.history || [])].reverse().map((ev, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs border-b border-[#EFEAE0] last:border-0 pb-2.5 last:pb-0">
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${idx === 0 ? 'bg-emerald-600' : 'bg-[#9E7B3B]'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-[#181514]">{ev.label}</strong>
                                <span className="text-[10px] font-mono text-[#8A8178]">{ev.timestamp}</span>
                              </div>
                              <p className="text-[11px] text-[#5E564F] mt-0.5">{ev.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: MI WISHLIST */}
      {activeTab === 'wishlist' && (
        <div>
          {wishlist.length > 0 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#EDE8DE] border border-[#D6CEBF] p-4 rounded-xl">
                <span className="text-xs text-[#5E564F]">
                  Tienes <strong className="text-[#181514]">{wishlist.length}</strong> prendas guardadas en tu cuenta.
                </span>
                <button
                  type="button"
                  onClick={handleAddAllWishlistToCart}
                  className="px-5 py-2 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Añadir Todas al Carrito</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {wishlist.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#EDE8DE] border border-[#D6CEBF] rounded-2xl p-12 text-center">
              <Heart className="w-10 h-10 text-[#9E7B3B] mx-auto mb-3" />
              <h4 className="jz-display text-2xl text-[#181514] mb-1">Tu Wishlist está vacía</h4>
              <p className="text-xs text-[#5E564F] mb-5">
                Guarda tus corsets favoritos haciendo clic en el icono de corazón en cualquier prenda.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('catalog')}
                className="px-6 py-2.5 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Ir al Catálogo
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DATOS DE CUENTA EDITABLES Y SANITIZADOS */}
      {activeTab === 'profile' && (
        <div className="bg-[#FAF8F5] border border-[#D6CEBF] rounded-2xl p-6 max-w-2xl space-y-5">
          <div>
            <h4 className="jz-display text-2xl text-[#181514]">Información de tu Cuenta</h4>
            <p className="text-xs text-[#5E564F] mt-1">
              Mantén tus datos de contacto y despacho actualizados para agilizar tus futuras compras.
            </p>
          </div>

          {currentUser ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#181514] mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#D6CEBF] rounded-xl text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#181514] mb-1">
                    Correo Registrado
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full px-3 py-2.5 bg-[#EFECE6] border border-[#D6CEBF] rounded-xl text-[#5E564F] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#181514] mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#D6CEBF] rounded-xl text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#181514] mb-1">
                    RUT (Opcional para despacho)
                  </label>
                  <input
                    type="text"
                    placeholder="19.482.391-5"
                    value={profileForm.rut}
                    onChange={(e) => setProfileForm({ ...profileForm, rut: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#D6CEBF] rounded-xl text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#181514] mb-1">
                    Dirección de Entrega Predeterminada
                  </label>
                  <input
                    type="text"
                    placeholder="Calle, número, departamento..."
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#D6CEBF] rounded-xl text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#181514] mb-1">
                    Comuna
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Providencia"
                    value={profileForm.comuna}
                    onChange={(e) => setProfileForm({ ...profileForm, comuna: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#D6CEBF] rounded-xl text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-[#181514] hover:bg-[#9E7B3B] text-white font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-xs text-[#5E564F]">
              <p>Inicia sesión o crea tu cuenta para guardar tus datos de envío y revisar tus pedidos automáticamente.</p>
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="px-5 py-2.5 bg-[#9E7B3B] text-white rounded-xl font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Iniciar Sesión / Crear Cuenta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
