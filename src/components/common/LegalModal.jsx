import React, { useState } from 'react';
import { X, ShieldCheck, Scale, FileText, Lock, CheckCircle2 } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'terminos' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] border border-[#D6CEBF] shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl relative my-auto text-[#181514] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#D6CEBF] bg-[#F0ECE4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-[#9E7B3B]" />
            <div>
              <h2 id="legal-modal-title" className="jz-display text-lg sm:text-xl font-normal text-[#181514] uppercase tracking-wider">
                Marco Legal & Seguridad JAZYALON
              </h2>
              <span className="text-[10px] text-[#8A8178] block">
                Cumplimiento normativo Ley N° 19.496 y Ley N° 19.628 (República de Chile)
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Cerrar modal legal"
            className="p-1.5 rounded-full hover:bg-black/10 text-[#8A8178] hover:text-[#181514] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 border-b border-[#D6CEBF] bg-[#EDE8DE] text-xs uppercase tracking-wider font-bold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('terminos')}
            className={`py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'terminos'
                ? 'bg-[#FAF8F5] text-[#9E7B3B] border-b-2 border-[#9E7B3B]'
                : 'text-[#5E564F] hover:text-[#181514]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Términos y Condiciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacidad')}
            className={`py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'privacidad'
                ? 'bg-[#FAF8F5] text-[#9E7B3B] border-b-2 border-[#9E7B3B]'
                : 'text-[#5E564F] hover:text-[#181514]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacidad de Datos (Ley 19.628)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-xs text-[#5E564F] leading-relaxed max-h-[60vh]">
          {activeTab === 'terminos' ? (
            <div className="space-y-4">
              <div className="p-3 bg-white border border-[#D6CEBF] rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#9E7B3B] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#181514]">
                  Las presentes cláusulas regulan la compraventa electrónica de corsetería de época y vestuario de alta costura a través de <strong>JAZYALON</strong>, en estricto cumplimiento con la <strong>Ley N° 19.496 sobre Protección de los Derechos de los Consumidores</strong> y sus modificaciones de la <strong>Ley Pro-Consumidor N° 21.398</strong> de la República de Chile.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  1. Precios y Medios de Pago Seguros
                </h4>
                <p>
                  Todos los precios publicados en el catálogo están expresados en Pesos Chilenos (CLP) e incluyen el Impuesto al Valor Agregado (IVA). El procesamiento de pagos se realiza a través de pasarelas debidamente certificadas y encriptadas (Webpay Plus de Transbank, Mercado Pago y Transferencia Electrónica). JAZYALON no almacena datos sensibles bancarios ni claves de acceso.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  2. Garantía Legal de 6 Meses (Ley N° 19.496)
                </h4>
                <p>
                  Conforme a la normativa vigente en Chile, todo producto nuevo cuenta con una <strong>Garantía Legal de 6 meses</strong> corridos desde su recepción ante fallas de fábrica o defectos estructurales. En tales circunstancias, el consumidor podrá optar entre:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>La reparación gratuita del producto.</li>
                  <li>La reposición o cambio por una nueva prenda idéntica o de igual valor.</li>
                  <li>La devolución íntegra del dinero pagado.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  3. Derecho a Retracto y Cambios de Talla
                </h4>
                <p>
                  Para compras electrónicas no presenciales, el cliente dispone de <strong>10 días corridos</strong> contados desde la recepción del producto para solicitar cambio de talla o modelo. Para ser aceptado, la prenda debe encontrarse sin uso, sin perfumes, sin lavado y con todas sus etiquetas y empaques originales intactos.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  4. Despachos y Cobertura Nacional
                </h4>
                <p>
                  Los envíos se gestionan con couriers regulados (Starken, Chilexpress, Blue Express y mensajería express en Santiago). Los plazos de entrega ordinarios son de 24 a 48 horas en la Región Metropolitana y de 1 a 4 días hábiles en regiones. Cada despacho incluye número de seguimiento oficial.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-white border border-[#D6CEBF] rounded-xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#9E7B3B] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#181514]">
                  En JAZYALON garantizamos la absoluta privacidad y resguardo de la información de nuestros usuarios, bajo las directrices de la <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong> y las mejores prácticas internacionales de seguridad de la información (OWASP y RGPD).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  1. Principio de Minimización de Datos
                </h4>
                <p>
                  Únicamente solicitamos los datos estrictamente indispensables para:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Validación de identidad legal y facturación tributaria (Nombre y RUT).</li>
                  <li>Coordinación de despacho y entrega a domicilio (Dirección, Comuna, Región y Teléfono).</li>
                  <li>Emisión de comprobante de compra y código de rastreo (Correo Electrónico).</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  2. No Comercialización ni Cesión a Terceros
                </h4>
                <p>
                  JAZYALON jamás venderá, arrendará, intercambiará ni cederá las bases de datos de sus clientes a entidades terceras para fines comerciales o publicitarios ajenos a la prestación del servicio.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  3. Medidas de Seguridad Técnica & Criptográfica
                </h4>
                <p>
                  El sitio web implementa protocolos de cifrado SSL/TLS de 256 bits, políticas de seguridad de contenido (CSP), sanitización estricta de entradas contra ataques de inyección (XSS / SQLi) y almacenamiento seguro con privilegios restringidos (Row Level Security).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#181514] text-sm uppercase tracking-wide mb-1">
                  4. Derechos ARCO del Titular
                </h4>
                <p>
                  El titular de los datos podrá ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición</strong> enviando una solicitud formal a <strong>contacto@jazyalon.cl</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D6CEBF] bg-[#F0ECE4] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-[#8A8178]">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Documento actualizado conforme a legislación vigente en Chile</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-[#9E7B3B] hover:bg-[#181514] text-white text-xs uppercase tracking-wider font-bold rounded-lg transition-colors shadow-sm"
          >
            Entendido y Conforme
          </button>
        </div>
      </div>
    </div>
  );
}
