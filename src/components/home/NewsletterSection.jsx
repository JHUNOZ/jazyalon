import React, { useState, useEffect } from 'react';
import { Check, Copy, Bell } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useShop } from '../../context/ShopContext';
import { sanitizeInput, validateEmail, checkRateLimit } from '../../utils/security';
import SectionHeading from '../motion/SectionHeading';
import Reveal from '../motion/Reveal';
import Magnetic from '../motion/Magnetic';

export default function NewsletterSection() {
  const {
    showToast,
    siteSettings,
    coupons,
    subscribeNewsletter,
    lastSubscribedEmail,
    isEmailSubscribed
  } = useShop();

  const benefitsConfig = siteSettings?.benefitsConfig || {
    badgeText: '10% DE DESCUENTO EN TU PRIMERA COMPRA',
    title: 'Únete a Nuestra Comunidad',
    subtitle:
      'Suscríbete para recibir novedades de nuevos ingresos y activa tu descuento con el código',
    featuredCouponCode: 'antonella10',
    footerNote: 'Cero spam. Solo invitaciones a nuevos lanzamientos.'
  };

  const featuredCode = (benefitsConfig.featuredCouponCode || 'antonella10').toLowerCase();
  const matchedCoupon =
    (coupons || []).find((c) => c.code === featuredCode && c.isActive !== false) ||
    (coupons || []).find((c) => c.code === 'antonella10');
  const activeCouponCode = matchedCoupon ? matchedCoupon.code : featuredCode;

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(() =>
    Boolean(lastSubscribedEmail && isEmailSubscribed(lastSubscribedEmail))
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (lastSubscribedEmail && isEmailSubscribed(lastSubscribedEmail)) {
      setSubscribed(true);
    }
  }, [lastSubscribedEmail, isEmailSubscribed]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email);

    if (!validateEmail(cleanEmail)) {
      showToast('Por favor ingresa un correo electrónico válido', 'error');
      return;
    }

    const rateCheck = checkRateLimit('newsletter_sub', 4, 60000);
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'error');
      return;
    }

    const res = subscribeNewsletter(cleanEmail, {
      notifyPriceDrop: true,
      notifyNewCollection: true,
      notifyLowStock: true
    });

    if (!res?.success) {
      showToast(res?.message || 'No se pudo completar la suscripción', 'error');
      return;
    }

    setSubscribed(true);
    setEmail('');
    showToast(
      `¡Suscripción activa! Tu cupón es ${activeCouponCode} y recibirás avisos exclusivos 🌹`,
      'success'
    );

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#C8A96B', '#F3EEE4', '#14110F']
      });
    } catch {}
  };

  const copyCoupon = () => {
    navigator.clipboard.writeText(activeCouponCode);
    setCopied(true);
    showToast(`¡Cupón ${activeCouponCode} copiado al portapapeles!`);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <section id="newsletter" data-cursor-zone className="jz-section">
      <div className="jz-wrap">
        <SectionHeading
          index="07"
          label="DESCUENTO DE BIENVENIDA"
          title="*Beneficios*"
        />

        <Reveal
          y={15}
          className="mt-4 sm:mt-6 border border-[var(--jz-line)] bg-[var(--jz-bg-2)] p-6 sm:p-10 lg:p-12 relative overflow-hidden text-center"
        >
          {/* Subtle Ambient Grain/Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--jz-champagne)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto relative z-10">
            <p className="jz-label text-[var(--jz-champagne)] mb-2 sm:mb-3">
              {benefitsConfig.badgeText}
            </p>

            <h3 className="jz-display text-[clamp(2rem,4.5vw,3.5rem)] text-[var(--jz-ivory)] leading-tight mb-3">
              {benefitsConfig.title}
            </h3>

            <p className="jz-body text-xs sm:text-sm text-[var(--jz-sand)] font-light leading-relaxed mb-6 max-w-lg mx-auto">
              {benefitsConfig.subtitle}{' '}
              <strong className="text-[var(--jz-ivory)] font-semibold">
                {activeCouponCode}
              </strong>
              .
            </p>

            {!subscribed ? (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col sm:flex-row items-stretch gap-4 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu correo electrónico..."
                    required
                    className="flex-1 bg-transparent border-b border-[var(--jz-line)] py-3.5 px-2 text-sm text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:outline-none focus:border-[var(--jz-champagne)] transition-colors font-body"
                  />
                  <Magnetic>
                    <button type="submit" className="jz-btn jz-btn--solid shrink-0">
                      Suscribirme
                    </button>
                  </Magnetic>
                </form>
                <p className="text-[10px] text-[var(--jz-sand-dim)] mt-2.5">
                  {benefitsConfig.footerNote}
                </p>
              </>
            ) : (
              <div className="border border-[var(--jz-champagne)] bg-white p-6 sm:p-8 max-w-md mx-auto shadow-md animate-fadeIn">
                <p className="jz-label text-[var(--jz-champagne)] mb-3 font-semibold flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Suscripción y alertas activas</span>
                </p>
                <div className="flex items-center justify-between border border-dashed border-[var(--jz-champagne)]/60 bg-[#FAF8F5] p-4">
                  <span className="jz-display text-2xl tracking-widest text-[#181514] uppercase font-semibold">
                    {activeCouponCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCoupon}
                    className="jz-label text-xs border border-[#181514] px-4 py-2 text-[#181514] hover:bg-[#181514] hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#575049] mt-3 flex items-center justify-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#9E7B3B]" />
                  <span>Recibirás avisos de bajas de precio, nuevas colecciones y últimas unidades.</span>
                </p>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
