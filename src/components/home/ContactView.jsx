import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Send, 
  Check, 
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BRAND_INFO } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';
import VictorianDivider from '../common/VictorianDivider';
import { sanitizeInput, validateEmail, checkRateLimit } from '../../utils/security';

export default function ContactView() {
  const { showToast } = useShop();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Consulta sobre Corsets / Tallas',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitizeInput(formData.name);
    const cleanEmail = sanitizeInput(formData.email);
    const cleanMessage = sanitizeInput(formData.message);

    if (!cleanName || !cleanEmail || !cleanMessage) {
      showToast('Por favor completa los campos obligatorios', 'error');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      showToast('Por favor ingresa un correo electrónico válido', 'error');
      return;
    }

    const rateCheck = checkRateLimit('contact_form', 3, 60000);
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'error');
      return;
    }

    setSubmitted(true);
    showToast('¡Mensaje enviado con éxito! Te responderemos a la brevedad 🌹');

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#C8A96B', '#F3EEE4', '#6B1E2E']
      });
    } catch {}
  };

  const waMessage = encodeURIComponent("¡Hola! Quisiera agendar una asesoría de tallas sobre sus corsets victorianos de importación.");

  return (
    <div className="py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto min-h-screen">
      
      <VictorianDivider 
        title="Atención & Contacto" 
        subtitle="ASESORÍA PERSONALIZADA • ATENCIÓN EN CHILE" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4 sm:mt-6">
        
        {/* LEFT COLUMN: Contact Details & WhatsApp (5 cols) */}
        <div className="lg:col-span-5 bg-[#EDE8DE] rounded-2xl border border-[#D6CEBF] p-6 sm:p-8 shadow-sm flex flex-col justify-between text-[var(--jz-ivory)]">
          
          <div className="pb-5 border-b border-[#D6CEBF]">
            <span className="jz-label text-[10px] text-[var(--jz-champagne)] font-bold flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Atención Personalizada</span>
            </span>
            <h3 className="jz-display text-2xl sm:text-3xl text-[var(--jz-ivory)] font-normal">
              Canales de Contacto
            </h3>
            <p className="jz-body text-xs text-[var(--jz-sand)] font-light mt-1.5 leading-relaxed">
              Te asesoramos con medidas exactas de cintura, selección de corsets y consultas sobre tu pedido.
            </p>
          </div>

          {/* Contact Details */}
          <div className="py-5 space-y-4 text-xs font-light">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#D6CEBF] flex items-center justify-center shrink-0 text-[var(--jz-champagne)]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-[var(--jz-ivory)] block font-medium">WhatsApp Directo:</strong>
                <a 
                  href={`https://wa.me/56940187563?text=${waMessage}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[var(--jz-champagne)] font-bold hover:underline font-mono"
                >
                  +56 9 4018 7563
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#D6CEBF] flex items-center justify-center shrink-0 text-[var(--jz-champagne)]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-[var(--jz-ivory)] block font-medium">Correo Electrónico:</strong>
                <span className="text-[var(--jz-sand)]">{BRAND_INFO.email}</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#D6CEBF] flex items-center justify-center shrink-0 text-[var(--jz-champagne)]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-[var(--jz-ivory)] block font-medium">Horario de Atención:</strong>
                <span className="text-[var(--jz-sand)]">Lunes a Sábado: 10:00 a 20:00 hrs</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#D6CEBF] flex items-center justify-center shrink-0 text-[var(--jz-champagne)]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-[var(--jz-ivory)] block font-medium">Showroom & Despachos:</strong>
                <span className="text-[var(--jz-sand)]">{BRAND_INFO.address}</span>
              </div>
            </div>
          </div>

          {/* Quick WA Button */}
          <div className="pt-4 border-t border-[#D6CEBF]">
            <a
              href={`https://wa.me/56940187563?text=${waMessage}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chatear al WhatsApp (+56 9 4018 7563)</span>
            </a>
          </div>

        </div>

        {/* RIGHT COLUMN: Contact Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D6CEBF] p-6 sm:p-8 shadow-sm text-[var(--jz-ivory)]">
          
          <h4 className="jz-display text-2xl sm:text-3xl text-[var(--jz-ivory)] font-normal mb-1">
            Envíanos tu Consulta
          </h4>
          <p className="text-xs text-[var(--jz-sand)] font-light mb-6">
            Te asesoramos con medidas exactas de cintura y disponibilidad de stock en Chile.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--jz-ivory)] font-medium mb-1.5 uppercase tracking-wider text-[10px]">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D6CEBF] rounded-xl p-3 text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:border-[var(--jz-champagne)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[var(--jz-ivory)] font-medium mb-1.5 uppercase tracking-wider text-[10px]">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.cl"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D6CEBF] rounded-xl p-3 text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:border-[var(--jz-champagne)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--jz-ivory)] font-medium mb-1.5 uppercase tracking-wider text-[10px]">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+56 9 ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D6CEBF] rounded-xl p-3 text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:border-[var(--jz-champagne)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[var(--jz-ivory)] font-medium mb-1.5 uppercase tracking-wider text-[10px]">Motivo de Contacto</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#D6CEBF] rounded-xl p-3 text-[var(--jz-ivory)] focus:border-[var(--jz-champagne)] focus:outline-none"
                  >
                    <option value="Consulta sobre Corsets / Tallas" className="bg-[#FAF8F5] text-[var(--jz-ivory)]">Consulta sobre Corsets / Tallas</option>
                    <option value="Estado de mi Envío" className="bg-[#FAF8F5] text-[var(--jz-ivory)]">Estado de mi Envío</option>
                    <option value="Duda sobre Medios de Pago" className="bg-[#FAF8F5] text-[var(--jz-ivory)]">Duda sobre Medios de Pago</option>
                    <option value="Otro" className="bg-[#FAF8F5] text-[var(--jz-ivory)]">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--jz-ivory)] font-medium mb-1.5 uppercase tracking-wider text-[10px]">Mensaje *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe tus dudas, medidas de cintura en cm o cualquier consulta..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-[#D6CEBF] rounded-xl p-3 text-[var(--jz-ivory)] placeholder-[var(--jz-sand-dim)] focus:border-[var(--jz-champagne)] focus:outline-none"
                />
              </div>

              {/* High Contrast Visible Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-[var(--jz-champagne)] hover:bg-[var(--jz-ivory)] text-white font-bold rounded-xl text-xs uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-2 shadow-md cursor-pointer border border-[var(--jz-champagne)]"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Mensaje</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-8 bg-[#FAF8F5] rounded-2xl border border-[#D6CEBF] animate-scale-in">
              <div className="w-12 h-12 bg-[var(--jz-champagne)] rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h5 className="jz-display text-2xl text-[var(--jz-ivory)] font-normal mb-1">
                ¡Mensaje Recibido!
              </h5>
              <p className="text-xs text-[var(--jz-sand)] max-w-sm mx-auto mb-4">
                Nos pondremos en contacto contigo dentro de las próximas horas hábiles.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-[var(--jz-champagne)] hover:underline font-semibold"
              >
                Enviar otro mensaje
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
