import React from 'react';
import { Instagram, Lock } from 'lucide-react';
import { BRAND_INFO, CATEGORIES } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';

export default function Footer({ setCurrentView, onOpenLegal }) {
  const { setIsSizeGuideOpen, setSelectedCategory, categories } = useShop();
  const displayCategories = (categories && categories.length > 0 ? categories : CATEGORIES).filter(c => c.id !== 'all').slice(0, 5);

  const handleCategoryClick = (catId) => {
    setSelectedCategory(catId);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (sectionId) => {
    setCurrentView('home');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <footer id="site-footer" className="bg-[#0B0B0B] text-white pt-10 pb-8 border-t border-[#242122] mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top: LOGO_PR.png GRANDE & Minimal Slogan */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
          <img 
            src="/images/logos/LOGO_PR.png" 
            alt="JAZYALON Corsets Victorianos" 
            className="h-16 sm:h-20 md:h-24 w-auto object-contain mb-2 filter drop-shadow-md cursor-pointer hover:scale-105 transition-transform"
            onClick={() => { setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
          <p className="text-[11px] uppercase tracking-[0.25em] text-luxury-gold font-light">
            Corsetería Victoriana & Alta Costura Exclusiva en Chile
          </p>
        </div>

        {/* 4 Clean Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-white/10 text-xs font-light">
          
          {/* Col 1: Colección */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white mb-2">
              Colección
            </h4>
            <ul className="space-y-1.5 text-white/70">
              <li>
                <button 
                  onClick={() => handleNavClick('nuevos-ingresos')}
                  className="hover:text-luxury-gold text-luxury-gold transition-colors text-left font-medium"
                >
                  ✦ Nuevos Ingresos
                </button>
              </li>
              {displayCategories.map(cat => (
                <li key={cat.id}>
                  <button 
                    onClick={() => handleCategoryClick(cat.id)}
                    className="hover:text-luxury-gold transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Información */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white mb-2">
              Información (QA)
            </h4>
            <ul className="space-y-1.5 text-white/70">
              <li>
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="hover:text-luxury-gold text-luxury-gold transition-colors"
                >
                  Guía de Tallas
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleNavClick('faq')}
                  className="hover:text-luxury-gold transition-colors"
                >
                  Preguntas Frecuentes (QA)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleNavClick('tabla-envios')}
                  className="hover:text-luxury-gold transition-colors text-left"
                >
                  Tabla de Envíos en Chile
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onOpenLegal && onOpenLegal('terminos')}
                  className="hover:text-luxury-gold transition-colors text-left"
                >
                  Términos y Condiciones
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contacto */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white mb-2">
              Contacto
            </h4>
            <div className="space-y-1.5 text-white/70">
              <p>
                <a 
                  href="https://wa.me/56940187563" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-luxury-gold text-luxury-gold font-medium"
                >
                  +56 9 4018 7563 (WhatsApp)
                </a>
              </p>
              <p>contacto@jazyalon.cl</p>
            </div>
          </div>

          {/* Col 4: Redes Sociales */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white mb-2">
              Síguenos
            </h4>
            <div className="flex items-center gap-2.5">
              <a 
                href="https://instagram.com/jazyalon.cl" 
                target="_blank" 
                rel="noreferrer" 
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-luxury-gold hover:text-black transition-colors"
                aria-label="Instagram @jazyalon.cl"
                title="Instagram @jazyalon.cl"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] text-white/60 font-mono">@jazyalon.cl</span>
            </div>
          </div>

        </div>

        {/* Bottom Simple Copyright + Discreet Admin Gate Access */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-[10px] text-white/40 tracking-wider">
          <span>
            © {new Date().getFullYear()} JAZYALON • Alta Costura Victoriana & Corsetería en Chile. Todos los derechos reservados.
          </span>
          <button
            type="button"
            onClick={() => {
              setCurrentView('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 text-[10px] text-white/35 hover:text-luxury-gold transition-colors cursor-pointer"
            title="Acceso al Panel de Administración"
          >
            <Lock className="w-3 h-3" />
            <span>Acceso Administración</span>
          </button>
        </div>

      </div>
    </footer>
  );
}
