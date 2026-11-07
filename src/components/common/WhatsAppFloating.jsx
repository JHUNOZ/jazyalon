import React from 'react';
import { MessageCircle } from 'lucide-react';
import { BRAND_INFO } from '../../data/mockData';

export default function WhatsAppFloating() {
  const defaultMsg = encodeURIComponent("¡Hola JAZYALON! Quisiera recibir asesoría sobre las tallas y modelos de corsets victorianos de importación.");
  const waUrl = `https://wa.me/56940187563?text=${defaultMsg}`;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-xl transition-transform hover:scale-110"
      >
        <MessageCircle className="w-6 h-6 fill-white text-transparent" />
      </a>
    </div>
  );
}
