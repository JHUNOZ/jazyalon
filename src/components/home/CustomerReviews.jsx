import React, { useState } from 'react';
import { Star, ShieldCheck, X, MessageSquarePlus } from 'lucide-react';
import { CLIENT_REVIEWS } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';
import SectionHeading from '../motion/SectionHeading';
import Reveal from '../motion/Reveal';

const Stars = ({ count, size = 'h-3.5 w-3.5' }) => (
  <div className="flex items-center gap-0.5" aria-label={`${count} de 5 estrellas`}>
    {[...Array(count)].map((_, i) => (
      <Star key={i} className={`${size} fill-[var(--jz-champagne)] text-[var(--jz-champagne)]`} aria-hidden="true" />
    ))}
  </div>
);

export default function CustomerReviews() {
  const { showToast } = useShop();
  const [selectedReview, setSelectedReview] = useState(null);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewName, setNewReviewName] = useState('');

  const handleSendReview = (e) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewText.trim()) return;
    setIsWriteReviewOpen(false);
    setNewReviewName('');
    setNewReviewText('');
    showToast('¡Gracias por tu testimonio! Será publicado tras verificación 🌹', 'success');
  };

  return (
    <section id="resenas" className="jz-section bg-[var(--jz-bg)]">
      <div className="jz-wrap">
        <SectionHeading
          index="04"
          label="TESTIMONIOS REALES EN CHILE"
          title="*Reseñas*"
        />

        {/* Barra superior de calificación compacta */}
        <Reveal y={10} className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--jz-line)] bg-[var(--jz-bg-2)] p-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Stars count={5} size="h-3.5 w-3.5" />
            <span className="font-mono text-xs font-bold text-[var(--jz-ivory)]">4.9 / 5.0</span>
            <span className="jz-body text-xs text-[var(--jz-sand)] hidden sm:inline">• Más de 450 clientas satisfechas en Chile</span>
          </div>

          <button
            type="button"
            onClick={() => setIsWriteReviewOpen(true)}
            className="jz-label text-xs text-[var(--jz-champagne)] hover:text-[var(--jz-ivory)] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Escribir Reseña</span>
          </button>
        </Reveal>

        {/* Cuadrícula de reseñas compacta */}
        <Reveal selector="[data-review-card]" stagger={0.05} y={10} className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {CLIENT_REVIEWS.map((review) => (
            <article
              key={review.id}
              data-review-card
              onClick={() => setSelectedReview(review)}
              className="bg-white border border-[#D6CEBF] hover:border-[var(--jz-champagne)] p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-sm hover:shadow-md group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Stars count={review.rating} size="h-3 w-3" />
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 font-bold border border-emerald-200">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Verificada</span>
                  </span>
                </div>

                <p className="jz-label text-[9px] text-[var(--jz-champagne)] mb-2 line-clamp-1 font-semibold">
                  Compró: {review.productName || review.product}
                </p>

                <p className="jz-body text-xs sm:text-sm text-[var(--jz-ivory)] font-light leading-relaxed line-clamp-3 mb-3">
                  "{review.comment}"
                </p>

                <span className="jz-label text-[9px] text-[var(--jz-sand-dim)] group-hover:text-[var(--jz-champagne)] transition-colors">
                  Ver reseña completa →
                </span>
              </div>

              <div className="pt-3 border-t border-[var(--jz-line)] mt-4 flex items-center gap-3">
                <img
                  src={review.avatar}
                  alt={review.name}
                  className="w-7 h-7 object-cover grayscale group-hover:grayscale-0 transition-all rounded-full"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <h4 className="jz-label text-[10px] text-[var(--jz-ivory)] font-bold truncate">{review.name}</h4>
                  <span className="jz-body text-[10px] text-[var(--jz-sand)] block truncate">{review.city || review.location}</span>
                </div>
              </div>
            </article>
          ))}
        </Reveal>
      </div>

      {/* Modal detalle de reseña */}
      {selectedReview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedReview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg border border-[#D6CEBF] bg-[#FAF8F5] p-6 sm:p-8 text-[var(--jz-ivory)] rounded-xl shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedReview(null)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 p-1 text-[var(--jz-sand)] hover:text-[var(--jz-ivory)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <Stars count={selectedReview.rating} size="h-4 w-4" />
            <p className="jz-label mt-4 text-[10px] text-[var(--jz-champagne)] font-semibold">Prenda: {selectedReview.productName || selectedReview.product}</p>
            <p className="jz-body mt-4 text-sm sm:text-base text-[var(--jz-ivory)] font-light leading-relaxed">
              “{selectedReview.comment}”
            </p>
            <div className="mt-6 flex items-center gap-3 border-t border-[var(--jz-line)] pt-4">
              <img src={selectedReview.avatar} alt="" className="h-9 w-9 object-cover rounded-full" />
              <div>
                <p className="jz-label text-xs text-[var(--jz-ivory)] font-bold">{selectedReview.name}</p>
                <p className="jz-body text-[11px] text-[var(--jz-sand)]">{selectedReview.city || selectedReview.location} • Compra verificada</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal escribir reseña */}
      {isWriteReviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsWriteReviewOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md border border-[#D6CEBF] bg-[#FAF8F5] p-6 sm:p-8 text-[var(--jz-ivory)] rounded-xl shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setIsWriteReviewOpen(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 p-1 text-[var(--jz-sand)] hover:text-[var(--jz-ivory)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="jz-display text-2xl text-[var(--jz-ivory)] mb-1">Tu Testimonio en JAZYALON</h3>
            <p className="text-xs text-[var(--jz-sand)] mb-6">
              Comparte tu experiencia con la calidad y el calce de tus corsets.
            </p>
            <form onSubmit={handleSendReview} className="space-y-4">
              <div>
                <span className="jz-label text-[10px] text-[var(--jz-sand)] block mb-1 font-semibold">Tu Nombre o Alias</span>
                <input
                  type="text"
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  placeholder="Ej: Valentina M."
                  required
                  className="w-full border-b border-[var(--jz-line)] bg-transparent py-2 text-xs text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:border-[var(--jz-champagne)] focus:outline-none"
                />
              </div>
              <div>
                <span className="jz-label text-[10px] text-[var(--jz-sand)] block mb-1 font-semibold">Tu Opinión</span>
                <textarea
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="Cuéntanos sobre tu experiencia..."
                  rows={4}
                  required
                  className="w-full resize-none border-b border-[var(--jz-line)] bg-transparent py-2 text-xs text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:border-[var(--jz-champagne)] focus:outline-none"
                />
              </div>
              <button type="submit" className="jz-btn jz-btn--solid w-full mt-2">
                Enviar Testimonio
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
