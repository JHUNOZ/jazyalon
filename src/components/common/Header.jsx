import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Heart, 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  ChevronDown,
  Sparkles,
  ArrowRight,
  Crown,
  Bell,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CATEGORIES } from '../../data/mockData';

export default function Header({ currentView, setCurrentView }) {
  const { 
    cartCount, 
    setIsCartOpen, 
    wishlist, 
    setIsAuthOpen,
    setIsSearchOpen,
    setSelectedCategory,
    setIsSizeGuideOpen,
    categories,
    currentUser,
    isAdmin,
    products,
    setSelectedProduct,
    lastSubscribedEmail,
    isEmailSubscribed,
    subscriberNotifications,
    unreadNotificationsCount,
    markNotificationsRead
  } = useShop();

  const navCategories = (categories && categories.length > 0 ? categories : CATEGORIES).filter(c => c.id !== 'all');

  const rawUserName = (currentUser?.name || '').trim();
  const displayFirstName =
    isAdmin && (!rawUserName || rawUserName.toLowerCase().includes('administrador'))
      ? 'Jazz'
      : rawUserName.split(' ')[0] || (isAdmin ? 'Jazz' : 'Clienta');

  const isVisitorSubscribed =
    Boolean(lastSubscribedEmail && isEmailSubscribed(lastSubscribedEmail)) ||
    Boolean(currentUser?.email && isEmailSubscribed(currentUser.email));
  const canViewSubscriberAlerts = isVisitorSubscribed || isAdmin;

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
  const [infoDropdownOpen, setInfoDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const navigateTo = (view, category = null, sectionId = null) => {
    setCurrentView(view);
    if (category) setSelectedCategory(category);
    setMobileMenuOpen(false);
    setCollectionDropdownOpen(false);
    setInfoDropdownOpen(false);
    setNotifDropdownOpen(false);

    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleNotifications = () => {
    const nextState = !notifDropdownOpen;
    setNotifDropdownOpen(nextState);
    if (nextState && canViewSubscriberAlerts && unreadNotificationsCount > 0) {
      markNotificationsRead();
    }
  };

  const handleNotificationItemClick = (notif) => {
    setNotifDropdownOpen(false);
    if (notif.productId && Array.isArray(products)) {
      const matchedProd = products.find((p) => p.id === notif.productId);
      if (matchedProd) {
        setSelectedProduct(matchedProd);
        return;
      }
    }
    if (notif.collectionId) {
      navigateTo('catalog', notif.collectionId);
      return;
    }
    navigateTo('catalog', 'all');
  };

  return (
    <>
      {/* 10/10 CINEMATIC FULL-WIDTH HEADER */}
      <header className={`sticky top-0 z-50 bg-black/95 backdrop-blur-md text-white transition-all duration-300 border-b border-white/10 ${
        isScrolled 
          ? 'py-2.5 sm:py-3 shadow-[0_10px_35px_rgba(0,0,0,0.8)]' 
          : 'py-3.5 sm:py-4 shadow-none'
      }`}>
        <div className="w-full px-4 sm:px-8 lg:px-12 flex items-center justify-between">
          
          {/* LEFT: LOGO_PR.png */}
          <div className="flex items-center gap-6 xl:gap-10">
            <button 
              onClick={() => navigateTo('home')}
              className="flex items-center focus:outline-none group transform hover:scale-105 transition-all duration-300"
              title="JAZYALON - Inicio"
            >
              <img 
                src="/images/logos/LOGO_PR.png" 
                alt="JAZYALON" 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)] group-hover:drop-shadow-[0_0_15px_rgba(184,151,90,0.4)] transition-all"
              />
            </button>

            {/* INLINE NAVIGATION TABS */}
            <nav className="hidden lg:flex items-center space-x-7 xl:space-x-9 text-[11px] xl:text-xs uppercase tracking-[0.22em] font-medium text-white">
              
              {/* TAB 1: INICIO */}
              <button 
                onClick={() => navigateTo('home')}
                className={`py-1 transition-all duration-300 transform hover:scale-105 active:scale-95 relative liquid-nav-link ${
                  currentView === 'home' 
                    ? 'text-luxury-gold font-bold scale-105' 
                    : 'text-white/85 hover:text-white'
                }`}
              >
                Inicio
              </button>

              {/* TAB 2: COLECCIÓN ▾ (100% SOLID OPAQUE DROPDOWN, HIGH CONTRAST) */}
              <div 
                className="relative"
                onMouseEnter={() => setCollectionDropdownOpen(true)}
                onMouseLeave={() => setCollectionDropdownOpen(false)}
              >
                <button 
                  onClick={() => navigateTo('catalog', 'all')}
                  className={`flex items-center gap-1.5 py-1 transition-all duration-300 transform hover:scale-105 active:scale-95 relative liquid-nav-link ${
                    currentView === 'catalog' 
                      ? 'text-luxury-gold font-bold scale-105' 
                      : 'text-white/85 hover:text-white'
                  }`}
                >
                  <span>Colección</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-300 ${collectionDropdownOpen ? 'rotate-180 text-luxury-gold' : ''}`} />
                </button>

                {collectionDropdownOpen && (
                  <div className="absolute top-full -left-4 w-72 pt-3 z-50 animate-fadeIn">
                    {/* LIGHT LUXURY CONTAINER WITH REFINED BORDER */}
                    <div className="bg-[#FAF8F5] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-4 border border-[#D6CEBF] text-[#181514]">
                      
                      {/* Nuevos Ingresos Option */}
                      <button
                        onClick={() => navigateTo('home', null, 'nuevos-ingresos')}
                        className="w-full text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-[#9E7B3B] hover:bg-[#EFEAE0] rounded-xl font-bold transition-all flex items-center justify-between mb-2 border-b border-[#D6CEBF] pb-2.5 group transform hover:translate-x-1"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 liquid-twinkle text-[#9E7B3B]" />
                          <span>✦ Nuevos Ingresos</span>
                        </span>
                        <span className="text-[9px] bg-[#9E7B3B] text-white px-2 py-0.5 rounded font-bold">Nuevo</span>
                      </button>

                      {/* Categories list */}
                      <div className="text-[9px] text-[#9E7B3B] font-extrabold uppercase tracking-widest px-3.5 py-1.5">
                        Categorías:
                      </div>
                      <div className="space-y-1">
                        {navCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => navigateTo('catalog', cat.id)}
                            className="w-full text-left px-3.5 py-2 text-xs tracking-wider text-[#181514] hover:text-[#9E7B3B] hover:bg-[#EFEAE0] rounded-lg transition-all flex items-center justify-between font-medium transform hover:translate-x-1"
                          >
                            <span className="text-[#181514] hover:text-[#9E7B3B]">{cat.name}</span>
                            <span className="text-[10px] text-[#9E7B3B] font-bold font-mono">({cat.count})</span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-[#D6CEBF] mt-3 pt-2.5">
                        <button 
                          onClick={() => navigateTo('catalog', 'all')}
                          className="w-full text-center text-[10px] tracking-widest text-[#9E7B3B] hover:text-[#181514] hover:underline py-1.5 uppercase font-bold flex items-center justify-center gap-1.5 transform hover:scale-105 transition-transform"
                        >
                          <span>Ver Toda la Colección</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* TAB 3: INFORMACIÓN ▾ (LIGHT LUXURY CONTAINER) */}
              <div 
                className="relative"
                onMouseEnter={() => setInfoDropdownOpen(true)}
                onMouseLeave={() => setInfoDropdownOpen(false)}
              >
                <button 
                  onClick={() => navigateTo('home', null, 'faq')}
                  className="flex items-center gap-1.5 py-1 transition-all duration-300 text-white/85 hover:text-white transform hover:scale-105 active:scale-95 relative liquid-nav-link"
                >
                  <span>Información</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-300 ${infoDropdownOpen ? 'rotate-180 text-luxury-gold' : ''}`} />
                </button>

                {infoDropdownOpen && (
                  <div className="absolute top-full -left-4 w-64 pt-3 z-50 animate-fadeIn">
                    {/* LIGHT LUXURY CONTAINER WITH REFINED BORDER */}
                    <div className="bg-[#FAF8F5] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-4 border border-[#D6CEBF] text-[#181514] text-xs space-y-1">
                      <button
                        onClick={() => navigateTo('home', null, 'faq')}
                        className="w-full text-left px-3.5 py-2.5 text-[#181514] hover:text-[#9E7B3B] hover:bg-[#EFEAE0] rounded-lg transition-all block font-medium transform hover:translate-x-1"
                      >
                        Preguntas Frecuentes
                      </button>
                      <button
                        onClick={() => { setIsSizeGuideOpen(true); setInfoDropdownOpen(false); }}
                        className="w-full text-left px-3.5 py-2.5 text-[#181514] hover:text-[#9E7B3B] hover:bg-[#EFEAE0] rounded-lg transition-all block font-medium transform hover:translate-x-1"
                      >
                        Guía de Tallas
                      </button>
                      <button
                        onClick={() => navigateTo('home', null, 'tabla-envios')}
                        className="w-full text-left px-3.5 py-2.5 text-[#181514] hover:text-[#9E7B3B] hover:bg-[#EFEAE0] rounded-lg transition-all block font-medium transform hover:translate-x-1"
                      >
                        Envíos a Todo Chile
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* TAB 4: CONTACTO */}
              <button 
                onClick={() => navigateTo('contact')}
                className={`py-1 transition-all duration-300 transform hover:scale-105 active:scale-95 relative liquid-nav-link ${
                  currentView === 'contact' 
                    ? 'text-luxury-gold font-bold scale-105' 
                    : 'text-white/85 hover:text-white'
                }`}
              >
                Contacto
              </button>

            </nav>
          </div>

          {/* RIGHT: SEARCH + ACCESO + FAVORITOS + CARRO */}
          <div className="flex items-center space-x-4 sm:space-x-6 text-[11px] sm:text-xs uppercase tracking-[0.2em] font-medium">
            
            {/* LUPA DE BÚSQUEDA */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buscar productos"
              className="p-2 text-white hover:text-luxury-gold rounded-full transition-all duration-300 transform hover:scale-125 active:scale-95"
              title="Buscar"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Acceso / Usuario Logeado + Panel Admin */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2.5">
                <button
                  onClick={() => navigateTo('account')}
                  className={`px-3 py-1.5 rounded-full border transition-all duration-300 flex items-center gap-2 font-semibold ${
                    currentView === 'account'
                      ? 'bg-luxury-gold text-black border-luxury-gold'
                      : 'border-luxury-gold/40 bg-white/5 text-white hover:border-luxury-gold'
                  }`}
                  title="Ver Mi Cuenta, Wishlist y Seguimiento de Compras en Vivo"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <User className="w-3.5 h-3.5 text-luxury-gold" />
                  <span className="tracking-wider normal-case text-xs">
                    Hola, {displayFirstName}
                  </span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => navigateTo('admin')}
                    className={`px-3 py-1.5 rounded-full border transition-all duration-300 flex items-center gap-1.5 font-bold ${
                      currentView === 'admin'
                        ? 'bg-[#C8A96B] text-black border-[#C8A96B] shadow-[0_0_15px_rgba(200,169,107,0.5)]'
                        : 'border-[#C8A96B]/60 bg-[#C8A96B]/15 text-[#C8A96B] hover:bg-[#C8A96B] hover:text-black'
                    }`}
                    title="Abrir Panel de Administración & HONE Catalog"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Panel Admin</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="text-white hover:text-luxury-gold transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                  title="Acceso / Mi Cuenta"
                >
                  <User className="w-3.5 h-3.5 text-luxury-gold/90" />
                  <span>Acceso</span>
                </button>
              </div>
            )}

            {/* Campana de Notificaciones para Suscritas */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={handleToggleNotifications}
                aria-label="Avisos de colección y descuentos"
                className="text-white hover:text-luxury-gold transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center relative p-1.5"
                title={
                  canViewSubscriberAlerts
                    ? 'Avisos exclusivos de bajas de precio, nuevas colecciones y pocas unidades'
                    : 'Suscríbete en Beneficios para activar alertas automáticas'
                }
              >
                <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${notifDropdownOpen ? 'text-luxury-gold' : ''}`} />
                {canViewSubscriberAlerts && unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#C8A96B] text-black text-[9px] font-extrabold flex items-center justify-center shadow">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 z-50 animate-fadeIn normal-case tracking-normal">
                  <div className="bg-[#FAF8F5] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.3)] border border-[#D6CEBF] text-[#181514] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E5DFD3] bg-[#F3EFE8] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9E7B3B] block">
                          Comunidad JAZYALON
                        </span>
                        <h4 className="text-sm font-bold text-[#181514]">
                          Avisos para Suscritas
                        </h4>
                      </div>
                      {isVisitorSubscribed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Suscrita
                        </span>
                      )}
                    </div>

                    {!canViewSubscriberAlerts ? (
                      <div className="p-4 text-left space-y-3">
                        <p className="text-xs text-[#575049] leading-relaxed">
                          Suscríbete con tu correo en la sección <strong>Beneficios</strong> para recibir avisos automáticos cuando un corset baje de precio, lancemos una nueva colección o queden pocas unidades.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigateTo('home', null, 'newsletter')}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#9E7B3B] hover:bg-[#86662D] text-white text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Ir a Suscribirme
                        </button>
                      </div>
                    ) : !subscriberNotifications || subscriberNotifications.length === 0 ? (
                      <div className="p-5 text-center space-y-1.5">
                        <Bell className="w-6 h-6 text-[#9E7B3B] mx-auto opacity-75" />
                        <p className="text-xs font-semibold text-[#181514]">
                          Aún no hay avisos recientes
                        </p>
                        <p className="text-[11px] text-[#6E655D]">
                          Te notificaremos apenas baje un precio, se publique una nueva colección o queden pocas unidades.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-[#EAE4D9]">
                        {subscriberNotifications.slice(0, 8).map((notif) => {
                          const badgeConfig =
                            notif.eventType === 'price_drop'
                              ? { label: 'Baja de Precio', bg: 'bg-emerald-100 text-emerald-800', Icon: Tag }
                              : notif.eventType === 'new_collection'
                              ? { label: 'Nueva Colección', bg: 'bg-amber-100 text-amber-900', Icon: Sparkles }
                              : notif.eventType === 'low_stock'
                              ? { label: 'Pocas Unidades', bg: 'bg-rose-100 text-rose-800', Icon: AlertTriangle }
                              : { label: 'Aviso VIP', bg: 'bg-[#EDE6D8] text-[#7A5B25]', Icon: Bell };
                          const BadgeIcon = badgeConfig.Icon;
                          return (
                            <button
                              key={notif.id}
                              type="button"
                              onClick={() => handleNotificationItemClick(notif)}
                              className="w-full text-left px-4 py-3 hover:bg-[#EFEAE0] transition-colors flex items-start gap-3"
                            >
                              <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${badgeConfig.bg}`}>
                                <BadgeIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeConfig.bg}`}>
                                    {badgeConfig.label}
                                  </span>
                                  <span className="text-[10px] text-[#8A8178] shrink-0">
                                    {notif.createdAt
                                      ? new Date(notif.createdAt).toLocaleDateString('es-CL', {
                                          day: '2-digit',
                                          month: 'short'
                                        })
                                      : 'Hoy'}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-[#181514] truncate">
                                  {notif.title}
                                </p>
                                <p className="text-[11px] text-[#575049] line-clamp-2 leading-snug mt-0.5">
                                  {notif.message}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Favoritos */}
            <button 
              onClick={() => setCurrentView('wishlist')}
              aria-label="Favoritos"
              className="text-white hover:text-luxury-rose transition-all duration-300 transform hover:scale-115 active:scale-95 flex items-center gap-1.5 relative p-1 group"
              title="Mis Favoritos (Guardados con persistencia)"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${wishlist.length > 0 ? 'fill-luxury-rose text-luxury-rose' : 'group-hover:text-luxury-rose'}`} />
              {wishlist.length > 0 && (
                <span className="text-[10px] text-luxury-rose font-bold font-mono">
                  ({wishlist.length})
                </span>
              )}
            </button>

            {/* Carro Pastilla Redondeada */}
            <button 
              onClick={() => setIsCartOpen(true)}
              aria-label="Carrito de compras"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/40 hover:border-luxury-gold text-white transition-all duration-300 hover:bg-white/10 transform hover:scale-105 active:scale-95 group shadow-lg"
              title="Carrito de Compras"
            >
              <ShoppingCart className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span className="tracking-wider">Carro</span>
              <span className="bg-white text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center group-hover:bg-luxury-gold transition-colors">
                {cartCount}
              </span>
            </button>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
              className="lg:hidden p-1.5 text-white hover:text-luxury-gold transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer (WARM LUXURY PALETTE) */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[65px] bg-[#FAF8F5] z-50 border-t border-[#D6CEBF] overflow-y-auto p-6 pb-24 animate-fadeIn shadow-2xl">
            <div className="max-w-sm mx-auto space-y-4 text-xs uppercase tracking-[0.2em] font-medium text-[#181514] text-left">
              
              <div className="pb-3 border-b border-[#D6CEBF]">
                <button 
                  onClick={() => navigateTo('home')} 
                  className="w-full py-2.5 flex items-center justify-between text-[#181514] hover:text-[#9E7B3B] font-bold transition-colors"
                >
                  <span>Inicio</span>
                  <span className="text-[10px] text-[#8A8178]">01</span>
                </button>
                <button 
                  onClick={() => navigateTo('catalog', 'all')} 
                  className="w-full py-2.5 flex items-center justify-between text-[#181514] hover:text-[#9E7B3B] font-bold transition-colors"
                >
                  <span>Ver Catálogo Completo</span>
                  <span className="text-[10px] text-[#9E7B3B]">✦</span>
                </button>
                <button 
                  onClick={() => navigateTo('home', null, 'nuevos-ingresos')} 
                  className="w-full py-2.5 flex items-center justify-between text-[#9E7B3B] font-bold transition-colors"
                >
                  <span>✦ Nuevos Ingresos</span>
                  <span className="text-[9px] bg-[#9E7B3B] text-white px-1.5 py-0.5 rounded font-bold">Nuevo</span>
                </button>
              </div>

              {/* Categorías Directas */}
              <div className="pb-3 border-b border-[#D6CEBF]">
                <span className="text-[10px] text-[#9E7B3B] font-bold uppercase tracking-widest block mb-2">
                  Categorías
                </span>
                <div className="space-y-1 pl-2">
                  {navCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => navigateTo('catalog', cat.id)}
                      className="w-full py-2 flex items-center justify-between text-[#5E564F] hover:text-[#9E7B3B] transition-colors text-[11px]"
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-mono text-[#9E7B3B] font-bold">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Información y Ayuda */}
              <div className="pb-3 border-b border-[#D6CEBF]">
                <span className="text-[10px] text-[#9E7B3B] font-bold uppercase tracking-widest block mb-2">
                  Información & Ayuda
                </span>
                <div className="space-y-1 pl-2">
                  <button 
                    onClick={() => navigateTo('home', null, 'faq')} 
                    className="w-full py-2 text-left text-[#5E564F] hover:text-[#9E7B3B] block transition-colors text-[11px]"
                  >
                    Preguntas Frecuentes
                  </button>
                  <button 
                    onClick={() => { setIsSizeGuideOpen(true); setMobileMenuOpen(false); }} 
                    className="w-full py-2 text-left text-[#5E564F] hover:text-[#9E7B3B] block transition-colors text-[11px]"
                  >
                    Guía de Tallas
                  </button>
                  <button 
                    onClick={() => navigateTo('home', null, 'tabla-envios')} 
                    className="w-full py-2 text-left text-[#5E564F] hover:text-[#9E7B3B] block transition-colors text-[11px]"
                  >
                    Garantía & Envíos
                  </button>
                  <button 
                    onClick={() => navigateTo('contact')} 
                    className="w-full py-2 text-left text-[#5E564F] hover:text-[#9E7B3B] block transition-colors text-[11px]"
                  >
                    Contacto
                  </button>
                </div>
              </div>

              {/* Botones de Cuenta y Panel Admin */}
              <div className="pt-2 space-y-2.5">
                {currentUser ? (
                  <button 
                    onClick={() => navigateTo('account')} 
                    className="w-full py-3 rounded-xl bg-[#181514] text-[#FAF8F5] font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm"
                  >
                    <User className="w-4 h-4 text-[#C8A96B]" />
                    <span>Mi Cuenta & Seguimiento ({displayFirstName})</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => { setIsAuthOpen(true); setMobileMenuOpen(false); }} 
                    className="w-full py-3 rounded-xl border border-[#9E7B3B] text-[#9E7B3B] hover:bg-[#9E7B3B] hover:text-white font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm"
                  >
                    <User className="w-4 h-4" />
                    <span>Acceso / Registro Mi Cuenta</span>
                  </button>
                )}

                {isAdmin && (
                  <button 
                    onClick={() => navigateTo('admin')} 
                    className="w-full py-3 rounded-xl bg-[#9E7B3B] text-white font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Panel de Administración (HONE)</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}
      </header>

      {/* FLOATING VERTICAL LOOKBOOK TAB "CATÁLOGO" */}
      <button
        onClick={() => navigateTo('catalog', 'all')}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#000000] hover:bg-luxury-gold text-white hover:text-black border-l border-t border-b border-luxury-gold/50 px-2 py-4 tracking-[0.28em] text-[9px] uppercase font-bold transition-all duration-300 shadow-2xl hidden sm:flex items-center justify-center [writing-mode:vertical-rl] rotate-180 hover:scale-105 active:scale-95 group"
        title="Abrir Catálogo"
      >
        <span className="group-hover:tracking-[0.32em] transition-all">Catálogo</span>
      </button>
    </>
  );
}
