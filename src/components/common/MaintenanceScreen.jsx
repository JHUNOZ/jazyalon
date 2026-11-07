import React, { useState, useEffect } from 'react';
import { Crown, Clock, Sparkles, MessageCircle, Lock } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

function computeRemainingTime(targetDateStr) {
  if (!targetDateStr) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const targetMs = new Date(targetDateStr).getTime();
  if (Number.isNaN(targetMs)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const diff = Math.max(0, targetMs - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { totalMs: diff, days, hours, minutes, seconds };
}

export default function MaintenanceScreen({ onOpenAdmin }) {
  const {
    siteSettings,
    brandInfo,
    isAdmin,
    setIsAuthOpen,
    setAdminPreviewMaintenance
  } = useShop();

  const maintenance = siteSettings?.maintenance || {
    enabled: false,
    mode: 'standard',
    message: 'Estamos en mantenimiento. Volvemos pronto.',
    dropName: 'Próximo Drop Exclusivo',
    dropDate: ''
  };

  const isDropMode = maintenance.mode === 'drop';
  const [timeLeft, setTimeLeft] = useState(() => computeRemainingTime(maintenance.dropDate));

  useEffect(() => {
    if (!isDropMode) return undefined;
    setTimeLeft(computeRemainingTime(maintenance.dropDate));
    const interval = setInterval(() => {
      setTimeLeft(computeRemainingTime(maintenance.dropDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [isDropMode, maintenance.dropDate]);

  const formattedTargetDate = (() => {
    if (!maintenance.dropDate) return '';
    const d = new Date(maintenance.dropDate);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  })();

  const pad2 = (n) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-[#0D0B0A] text-[#FAF8F5] flex flex-col justify-between relative overflow-hidden px-4 py-8 sm:px-8">
      {/* Subtle Ambient Gold Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(200, 169, 107, 0.16) 0%, transparent 56%), radial-gradient(circle at 80% 90%, rgba(158, 123, 59, 0.08) 0%, transparent 45%)'
        }}
      />

      {/* Top Admin Preview Notice if logged in as Admin */}
      <div className="relative z-10 flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#C8A96B] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#C8A96B] animate-pulse" />
          <span>JAZYALON CHILE</span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setAdminPreviewMaintenance(false)}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Ver Tienda Normal (Modo Admin)
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-3.5 py-1.5 rounded-full bg-[#C8A96B] hover:bg-[#DEC38E] text-[#0D0B0A] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Panel Admin</span>
            </button>
          </div>
        )}
      </div>

      {/* Center Editorial Content */}
      <main className="relative z-10 max-w-2xl w-full mx-auto my-auto py-12 text-center">
        <div className="bg-[#151210]/90 border border-[#C8A96B]/30 rounded-3xl p-8 sm:p-12 shadow-[0_28px_80px_rgba(0,0,0,0.75)] backdrop-blur-md">
          <img
            src="/images/logos/LOGO_PR.png"
            alt="JAZYALON"
            className="h-14 sm:h-16 w-auto object-contain mx-auto mb-6 brightness-0 invert opacity-95"
          />

          {isDropMode ? (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C8A96B]/15 border border-[#C8A96B]/40 text-[#E5C98B] text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Próximo Drop en Cuenta Regresiva</span>
              </div>

              <h1 className="jz-display text-3xl sm:text-5xl text-[#FAF8F5] font-normal tracking-wide leading-tight mb-3">
                {maintenance.dropName || 'Próximo Drop Exclusivo'}
              </h1>

              <p className="text-sm text-[#C8C1B6] max-w-md mx-auto mb-8 leading-relaxed">
                Estamos preparando las nuevas piezas de corsetería estructurada. El catálogo abrirá automáticamente al finalizar la cuenta regresiva.
              </p>

              {/* Reverse Countdown Boxes */}
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-lg mx-auto mb-6">
                {[
                  { value: pad2(timeLeft.days), label: 'Días' },
                  { value: pad2(timeLeft.hours), label: 'Horas' },
                  { value: pad2(timeLeft.minutes), label: 'Minutos' },
                  { value: pad2(timeLeft.seconds), label: 'Segundos' }
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="bg-[#0D0B0A] border border-[#C8A96B]/35 rounded-2xl py-4 px-2 shadow-inner"
                  >
                    <div className="font-mono text-2xl sm:text-4xl font-bold text-[#FAF8F5] tabular-nums">
                      {unit.value}
                    </div>
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#C8A96B] font-semibold mt-1">
                      {unit.label}
                    </div>
                  </div>
                ))}
              </div>

              {formattedTargetDate && (
                <p className="text-xs text-[#A39B8F] flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Apertura programada: <strong className="text-[#FAF8F5]">{formattedTargetDate}</strong></span>
                </p>
              )}
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C8A96B]/15 border border-[#C8A96B]/40 text-[#E5C98B] text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
                <Clock className="w-3.5 h-3.5" />
                <span>Sitio en Actualización</span>
              </div>

              <h1 className="jz-display text-3xl sm:text-5xl text-[#FAF8F5] font-normal tracking-wide leading-tight mb-4">
                Estamos en mantenimiento
              </h1>

              <p className="text-base sm:text-lg text-[#E5C98B] font-medium mb-3">
                Volvemos pronto.
              </p>

              {maintenance.message &&
                maintenance.message.trim().toLowerCase() !==
                  'estamos en mantenimiento. volvemos pronto.' && (
                  <p className="text-sm text-[#C8C1B6] max-w-md mx-auto mb-6 leading-relaxed">
                    {maintenance.message}
                  </p>
                )}
            </>
          )}

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
            {brandInfo?.whatsappUrl && (
              <a
                href={brandInfo.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8A96B] hover:bg-[#DEC38E] text-[#0D0B0A] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Consultar por WhatsApp</span>
              </a>
            )}
            {brandInfo?.instagramUrl && (
              <a
                href={brandInfo.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                <span>Instagram {brandInfo.instagram || '@jazyalon'}</span>
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Discrete Bottom Footer with Admin Login Trigger */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#7D7468]">
        <span>© {new Date().getFullYear()} JAZYALON Corsetería — Chile</span>
        <button
          type="button"
          onClick={() => {
            if (isAdmin) {
              onOpenAdmin();
            } else {
              setIsAuthOpen(true);
            }
          }}
          className="inline-flex items-center gap-1.5 text-[#9E9589] hover:text-[#C8A96B] transition-colors cursor-pointer"
        >
          <Lock className="w-3 h-3" />
          <span>{isAdmin ? 'Ir al Panel de Administración' : 'Acceso Administración'}</span>
        </button>
      </footer>
    </div>
  );
}
