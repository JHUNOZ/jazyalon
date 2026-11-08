import React, { useState, useEffect } from 'react';
import { Crown, ArrowRight, Eye } from 'lucide-react';
import { ShopProvider, useShop } from './context/ShopContext';
import AnnouncementBar from './components/common/AnnouncementBar';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import HeroSection from './components/home/HeroSection';
import NewArrivals from './components/home/NewArrivals';
import SpotlightFeature from './components/home/SpotlightFeature';
import CollectionsMosaic from './components/home/CollectionsMosaic';
import CustomerReviews from './components/home/CustomerReviews';
import FaqSection from './components/home/FaqSection';
import ShippingTableSection from './components/home/ShippingTableSection';
import NewsletterSection from './components/home/NewsletterSection';
import ContactView from './components/home/ContactView';
import CatalogView from './components/catalog/CatalogView';
import WishlistView from './components/catalog/WishlistView';
import CartDrawer from './components/cart/CartDrawer';
import ProductDetailModal from './components/product/ProductDetailModal';
import SizeGuideModal from './components/product/SizeGuideModal';
import CheckoutModal from './components/cart/CheckoutModal';
import SearchModal from './components/common/SearchModal';
import AuthModal from './components/account/AuthModal';
import AccountView from './components/account/AccountView';
import AdminPanelView from './components/admin/AdminPanelView';
import MaintenanceScreen from './components/common/MaintenanceScreen';
import WhatsAppFloating from './components/common/WhatsAppFloating';
import Toast from './components/common/Toast';
import LegalModal from './components/common/LegalModal';
import CookieConsentBanner from './components/common/CookieConsentBanner';

/* Motion & Editorial Components */
import SmoothScroll from './components/motion/SmoothScroll';
import Preloader from './components/motion/Preloader';
import { usePageTransition, Curtain } from './components/motion/PageTransition';

function AdminLivePreviewBar({ currentView, onOpenAdmin }) {
  const {
    isAdmin,
    siteSettings,
    adminPreviewMaintenance,
    setAdminPreviewMaintenance
  } = useShop();

  if (!isAdmin || currentView === 'admin') return null;

  const maintenanceActive = Boolean(siteSettings?.maintenance?.enabled);

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onOpenAdmin}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#12100E]/95 hover:bg-[#181514] text-[#FAF8F5] border border-[#C8A96B]/60 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-300 hover:scale-105 group cursor-pointer"
        title="Volver al Panel de Administración"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Crown className="w-3.5 h-3.5 text-[#C8A96B]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FAF8F5]">
          Volver al Panel Admin
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[#C8A96B] transition-transform group-hover:translate-x-0.5" />
      </button>

      {maintenanceActive && (
        <button
          type="button"
          onClick={() => setAdminPreviewMaintenance(!adminPreviewMaintenance)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-amber-950/95 hover:bg-amber-900 text-amber-100 border border-amber-400/50 shadow-lg text-[11px] font-semibold tracking-wide transition-colors cursor-pointer"
          title="Alternar vista de mantenimiento para administradora"
        >
          <Eye className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {adminPreviewMaintenance
              ? 'Salir de Vista Mantenimiento'
              : 'Mantenimiento ON (Ver Pantalla)'}
          </span>
        </button>
      )}
    </div>
  );
}

function AppShell({ currentView, navigate, curtainRef, isLegalOpen, setIsLegalOpen, legalTab, handleOpenLegal }) {
  const { siteSettings, isAdmin, adminPreviewMaintenance } = useShop();

  const maintenanceEnabled = Boolean(siteSettings?.maintenance?.enabled);
  const shouldShowMaintenanceScreen =
    currentView !== 'admin' &&
    maintenanceEnabled &&
    (!isAdmin || adminPreviewMaintenance);

  if (shouldShowMaintenanceScreen) {
    return (
      <>
        <MaintenanceScreen onOpenAdmin={() => navigate('admin')} />
        <AuthModal setCurrentView={navigate} />
        <Toast />
      </>
    );
  }

  return (
    <>
      <Preloader />
      {currentView !== 'admin' && <SmoothScroll />}

      <div className="min-h-screen bg-[var(--jz-bg)] text-[var(--jz-ivory)] font-sans flex flex-col justify-between selection:bg-[var(--jz-champagne)] selection:text-[var(--jz-ink)]">
        {/* Top Announcement Bar & Storefront Header (Hidden in dedicated Admin Panel layout) */}
        {currentView !== 'admin' && (
          <>
            <AnnouncementBar />
            <Header currentView={currentView} setCurrentView={navigate} />
          </>
        )}

        {/* Fluid Page Transition Curtain */}
        <Curtain ref={curtainRef} />

        {/* Main Content Area */}
        <main className={currentView === 'admin' ? 'flex-1 relative' : 'flex-1 overflow-hidden relative'}>
          {currentView === 'home' && (
            <div>
              <HeroSection setCurrentView={navigate} />
              <NewArrivals setCurrentView={navigate} />
              <SpotlightFeature setCurrentView={navigate} />
              <CollectionsMosaic setCurrentView={navigate} />
              <CustomerReviews />
              <FaqSection />
              <ShippingTableSection />
              <NewsletterSection />
            </div>
          )}

          {currentView === 'catalog' && <CatalogView />}

          {currentView === 'wishlist' && <WishlistView setCurrentView={navigate} />}

          {currentView === 'contact' && <ContactView />}

          {currentView === 'account' && <AccountView setCurrentView={navigate} />}

          {currentView === 'admin' && (
            <AdminPanelView setCurrentView={navigate} onClose={() => navigate('home')} />
          )}
        </main>

        {/* Footer with legal modal connector (Hidden in Admin Panel) */}
        {currentView !== 'admin' && (
          <Footer setCurrentView={navigate} onOpenLegal={handleOpenLegal} />
        )}

        {/* Drawers & Modals */}
        <CartDrawer setCurrentView={navigate} />
        <ProductDetailModal />
        <SizeGuideModal />
        <CheckoutModal setCurrentView={navigate} />
        <SearchModal setCurrentView={navigate} />
        <AuthModal setCurrentView={navigate} />
        <LegalModal
          isOpen={isLegalOpen}
          onClose={() => setIsLegalOpen(false)}
          initialTab={legalTab}
        />
        {currentView !== 'admin' && <CookieConsentBanner onOpenLegal={handleOpenLegal} />}
        {currentView !== 'admin' && <WhatsAppFloating />}
        <AdminLivePreviewBar currentView={currentView} onOpenAdmin={() => navigate('admin')} />
        <Toast />
      </div>
    </>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
      if (path === '/admin') return 'admin';
    }
    return 'home';
  }); // 'home' | 'catalog' | 'wishlist' | 'contact' | 'account' | 'admin'
  const { navigate, curtainRef } = usePageTransition(currentView, setCurrentView);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    if (currentView === 'admin' && currentPath !== '/admin') {
      window.history.replaceState(null, '', '/admin');
    } else if (currentView !== 'admin' && currentPath === '/admin') {
      window.history.replaceState(null, '', '/');
    }
  }, [currentView]);

  // Legal & Privacy Compliance State (Ley 19.496 / Ley 19.628)
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('terminos');

  const handleOpenLegal = (tab = 'terminos') => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  return (
    <ShopProvider>
      <AppShell
        currentView={currentView}
        navigate={navigate}
        curtainRef={curtainRef}
        isLegalOpen={isLegalOpen}
        setIsLegalOpen={setIsLegalOpen}
        legalTab={legalTab}
        handleOpenLegal={handleOpenLegal}
      />
    </ShopProvider>
  );
}
