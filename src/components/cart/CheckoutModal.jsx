import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  Check, 
  AlertCircle,
  Truck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useShop } from '../../context/ShopContext';
import { formatCLP } from '../../utils/formatters';
import { 
  sanitizeInput, 
  validateRUT, 
  formatLegalRUT, 
  validateEmail, 
  validateChileanPhone, 
  checkRateLimit, 
  logSecurityEvent 
} from '../../utils/security';
import LegalModal from '../common/LegalModal';

export default function CheckoutModal({ setCurrentView }) {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    cart,
    cartTotal, 
    isFreeShipping,
    clearCart,
    regions,
    selectedRegionId,
    setSelectedRegionId,
    currentRegion,
    currentUser,
    appliedCoupon,
    evaluateCouponConditions,
    removeCoupon,
    createOrder,
    showToast
  } = useShop();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    email: '',
    phone: '',
    address: '',
    comuna: '',
    shippingCarrier: 'starken',
    paymentMethod: 'webpay',
    acceptTerms: false
  });

  useEffect(() => {
    if (currentUser && isCheckoutOpen) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        email: prev.email || currentUser.email || '',
        phone: prev.phone || currentUser.phone || '',
        rut: prev.rut || currentUser.rut || '',
        address: prev.address || currentUser.address || '',
        comuna: prev.comuna || currentUser.comuna || ''
      }));
    }
  }, [currentUser, isCheckoutOpen]);

  const [errors, setErrors] = useState({});
  const [orderNumber, setOrderNumber] = useState(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('terminos');

  if (!isCheckoutOpen) return null;

  const handleInputChange = (field, val) => {
    setErrors(prev => ({ ...prev, [field]: null }));

    if (field === 'rut') {
      const formatted = formatLegalRUT(val);
      setFormData(prev => ({ ...prev, rut: formatted }));
    } else if (field === 'acceptTerms') {
      setFormData(prev => ({ ...prev, acceptTerms: val }));
    } else {
      setFormData(prev => ({ ...prev, [field]: sanitizeInput(val) }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = 'Ingresa tu nombre y apellido completos';
    }

    if (!formData.rut || !validateRUT(formData.rut)) {
      newErrors.rut = 'RUT inválido. Verifica el dígito verificador (ej: 12.345.678-9)';
    }

    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!formData.phone || !validateChileanPhone(formData.phone)) {
      newErrors.phone = 'Ingresa un teléfono chileno válido (9 dígitos, ej: 912345678)';
    }

    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = 'Ingresa tu dirección exacta para el despacho';
    }

    if (!formData.comuna || formData.comuna.trim().length < 2) {
      newErrors.comuna = 'Indica la comuna de destino';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToStep2 = () => {
    if (validateStep1()) {
      if (appliedCoupon && typeof evaluateCouponConditions === 'function') {
        const couponCheck = evaluateCouponConditions(appliedCoupon, formData.email);
        if (!couponCheck.valid) {
          removeCoupon();
          showToast(couponCheck.message, 'error');
          return;
        }
      }
      setStep(2);
    } else {
      showToast('Por favor corrige los datos marcados en rojo', 'error');
    }
  };

  const handleCompleteOrder = (e) => {
    e.preventDefault();

    if (!formData.acceptTerms) {
      setErrors(prev => ({ ...prev, acceptTerms: 'Debes aceptar los Términos y la Política de Privacidad de Datos' }));
      showToast('Acepta los Términos Legales para continuar', 'error');
      return;
    }

    // Rate-limiting check: Prevent checkout floods (OWASP A04)
    const rateCheck = checkRateLimit('checkout_submission', 4, 60000);
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'error');
      logSecurityEvent('RATE_LIMIT_CHECKOUT_BLOCKED', { rut: formData.rut, email: formData.email });
      return;
    }

    const newOrderNum = `JAZY-CL-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(newOrderNum);

    createOrder({
      orderNumber: newOrderNum,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      rut: formData.rut,
      address: formData.address,
      comuna: formData.comuna,
      regionName: currentRegion.name,
      shippingCarrier: formData.shippingCarrier,
      paymentMethod: formData.paymentMethod,
      total: cartTotal,
      items: cart
    });

    setStep(4);
    clearCart();

    logSecurityEvent('ORDER_COMPLETED', {
      orderNumber: newOrderNum,
      paymentMethod: formData.paymentMethod,
      carrier: formData.shippingCarrier,
      total: cartTotal
    });

    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C8A96B', '#F3EEE4', '#9C907E']
      });
    } catch {}
  };

  const openLegal = (tab) => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  const waOrderReceipt = encodeURIComponent(
    `¡Hola JAZYALON! Realicé el pedido ${orderNumber} por ${formatCLP(cartTotal)} a nombre de ${formData.name} (RUT: ${formData.rut}).`
  );

  return (
    <>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      >
        <div 
          className="bg-[#FAF8F5] rounded-2xl border border-[#D6CEBF] shadow-2xl w-full max-w-2xl overflow-hidden relative my-auto text-[#181514]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#D6CEBF] flex items-center justify-between bg-[#F0ECE4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#9E7B3B]/15 border border-[#9E7B3B]/40 flex items-center justify-center text-[#9E7B3B]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 id="checkout-modal-title" className="jz-display text-lg sm:text-xl font-normal text-[#181514] uppercase tracking-wider">
                  {step === 4 ? 'Pedido Confirmado' : 'Finalizar Compra'}
                </h3>
                <span className="text-[10px] text-[#8A8178] block">
                  Despachos a todo Chile
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(false)} 
              aria-label="Cerrar modal de pago"
              className="p-1 text-[#8A8178] hover:text-[#181514] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          {step < 4 && (
            <div className="bg-[#EAE4D8] px-6 py-3 border-b border-[#D6CEBF] flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold">
              <span className={step >= 1 ? 'text-[#9E7B3B] font-bold' : 'text-[#8A8178]'}>1. Datos de Envío</span>
              <span className="text-[#D6CEBF]">—</span>
              <span className={step >= 2 ? 'text-[#9E7B3B] font-bold' : 'text-[#8A8178]'}>2. Courier</span>
              <span className="text-[#D6CEBF]">—</span>
              <span className={step >= 3 ? 'text-[#9E7B3B] font-bold' : 'text-[#8A8178]'}>3. Método de Pago</span>
            </div>
          )}

          <div className="p-5 sm:p-7 max-h-[72vh] overflow-y-auto">
            {/* STEP 1: DATOS DE ENVÍO Y VALIDACIÓN */}
            {step === 1 && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-[#EDE8DE] border border-[#D6CEBF] rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-[#5E564F]">Total de la orden:</span>
                  <span className="font-mono font-bold text-sm text-[#181514]">{formatCLP(cartTotal)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Nombre */}
                  <div>
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Javiera Morales"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-lg p-2.5 text-[#181514] placeholder-[#8A8178] focus:outline-none ${
                        errors.name ? 'border-red-500 ring-1 ring-red-400' : 'border-[#D6CEBF] focus:border-[#9E7B3B]'
                      }`}
                    />
                    {errors.name && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
                  </div>

                  {/* RUT Chileno */}
                  <div>
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      RUT Chileno *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 18.423.891-4"
                      value={formData.rut}
                      onChange={(e) => handleInputChange('rut', e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-lg p-2.5 text-[#181514] placeholder-[#8A8178] focus:outline-none ${
                        errors.rut ? 'border-red-500 ring-1 ring-red-400' : 'border-[#D6CEBF] focus:border-[#9E7B3B]'
                      }`}
                    />
                    {errors.rut && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.rut}</p>}
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      Correo Electrónico (Para boleta y tracking) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="nombre@correo.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-lg p-2.5 text-[#181514] placeholder-[#8A8178] focus:outline-none ${
                        errors.email ? 'border-red-500 ring-1 ring-red-400' : 'border-[#D6CEBF] focus:border-[#9E7B3B]'
                      }`}
                    />
                    {errors.email && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      Teléfono Móvil (WhatsApp de Despacho) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9XXXXXXXX o +56 9 XXXX XXXX"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-lg p-2.5 text-[#181514] placeholder-[#8A8178] focus:outline-none ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-400' : 'border-[#D6CEBF] focus:border-[#9E7B3B]'
                      }`}
                    />
                    {errors.phone && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.phone}</p>}
                  </div>

                  {/* Dirección */}
                  <div className="sm:col-span-2">
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      Dirección Completa (Calle, Número, Depto) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Av. Providencia 1420, Depto 604"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-lg p-2.5 text-[#181514] placeholder-[#8A8178] focus:outline-none ${
                        errors.address ? 'border-red-500 ring-1 ring-red-400' : 'border-[#D6CEBF] focus:border-[#9E7B3B]'
                      }`}
                    />
                    {errors.address && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.address}</p>}
                  </div>

                  {/* Región */}
                  <div>
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      Región de Destino *
                    </label>
                    <select
                      value={selectedRegionId}
                      onChange={(e) => setSelectedRegionId(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#D6CEBF] rounded-lg p-2.5 text-[#181514] focus:border-[#9E7B3B] focus:outline-none"
                    >
                      {regions.map(r => (
                        <option key={r.id} value={r.id} className="bg-[#FFFFFF] text-[#181514]">{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Comuna */}
                  <div>
                    <label className="block text-[#181514] mb-1 font-semibold uppercase tracking-wider text-[10px]">
                      Comuna *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Providencia / Viña del Mar / Concepción"
                      value={formData.comuna}
                      onChange={(e) => handleInputChange('comuna', e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-lg p-2.5 text-[#181514] placeholder-[#8A8178] focus:outline-none ${
                        errors.comuna ? 'border-red-500 ring-1 ring-red-400' : 'border-[#D6CEBF] focus:border-[#9E7B3B]'
                      }`}
                    />
                    {errors.comuna && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.comuna}</p>}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="px-6 py-3 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-lg text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors shadow-md"
                  >
                    <span>Continuar a Courier</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: COURIERS */}
            {step === 2 && (
              <div className="space-y-3">
                {[
                  { id: 'starken', name: 'Starken a Domicilio', time: '1 a 3 días hábiles', cost: isFreeShipping ? 0 : currentRegion.shippingCost },
                  { id: 'chilexpress', name: 'Chilexpress Express', time: '24 a 48 hrs', cost: isFreeShipping ? 0 : (currentRegion.shippingCost + 1500) },
                  { id: 'blueexpress', name: 'Blue Express a Domicilio', time: '2 a 4 días hábiles', cost: isFreeShipping ? 0 : currentRegion.shippingCost }
                ].map((carrier) => (
                  <label
                    key={carrier.id}
                    onClick={() => handleInputChange('shippingCarrier', carrier.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.shippingCarrier === carrier.id 
                        ? 'border-[#9E7B3B] bg-[#9E7B3B]/10 text-[#181514] shadow-sm' 
                        : 'border-[#D6CEBF] bg-[#FFFFFF] text-[#181514] hover:border-[#9E7B3B]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#181514]">{carrier.name}</div>
                      <div className="text-[11px] text-[#5E564F] mt-0.5">{carrier.time}</div>
                    </div>
                    <span className="font-bold text-xs text-[#9E7B3B]">{carrier.cost === 0 ? 'Gratis' : formatCLP(carrier.cost)}</span>
                  </label>
                ))}

                <div className="pt-4 flex justify-between items-center">
                  <button 
                    type="button"
                    onClick={() => setStep(1)} 
                    className="text-xs text-[#5E564F] hover:text-[#181514] flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver a Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-3 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-lg text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors shadow-md cursor-pointer"
                  >
                    <span>Continuar al Pago</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: MÉTODO DE PAGO */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {[
                    { id: 'webpay', name: 'Webpay Plus (Transbank)', desc: 'Débito, Redcompra y Crédito en cuotas sin interés', badge: 'Recomendado' },
                    { id: 'mercadopago', name: 'Mercado Pago Chile', desc: 'Tarjetas bancarias y saldo en cuenta' },
                    { id: 'flow', name: 'Flow Pagos Online', desc: 'Webpay, Servipag, Mach, Chek' },
                    { id: 'transferencia', name: 'Transferencia Bancaria Directa', desc: 'Banco de Chile / Santander con confirmación instantánea' }
                  ].map((pay) => (
                    <label
                      key={pay.id}
                      onClick={() => handleInputChange('paymentMethod', pay.id)}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === pay.id 
                          ? 'border-[#9E7B3B] bg-[#9E7B3B]/10 text-[#181514] shadow-sm' 
                          : 'border-[#D6CEBF] bg-[#FFFFFF] text-[#181514] hover:border-[#9E7B3B]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        formData.paymentMethod === pay.id 
                          ? 'bg-[#9E7B3B] border-[#9E7B3B]' 
                          : 'border-[#D6CEBF]'
                      }`}>
                        {formData.paymentMethod === pay.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#181514]">{pay.name}</span>
                          {pay.badge && <span className="text-[9px] bg-[#9E7B3B] text-white px-2 py-0.2 rounded font-bold">{pay.badge}</span>}
                        </div>
                        <div className="text-[11px] text-[#5E564F] mt-0.5">{pay.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* TERMS CHECKBOX */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                      className="mt-0.5 rounded border-[#D6CEBF] text-[#9E7B3B] focus:ring-[#9E7B3B]"
                    />
                    <span className="text-[#5E564F] leading-tight text-[11px]">
                      He leído y acepto los{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); openLegal('terminos'); }}
                        className="text-[#9E7B3B] underline font-bold"
                      >
                        Términos y Condiciones
                      </button>{' '}
                      y las{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); openLegal('privacidad'); }}
                        className="text-[#9E7B3B] underline font-bold"
                      >
                        Políticas de Privacidad
                      </button>
                      .
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.acceptTerms}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button 
                    type="button"
                    onClick={() => setStep(2)} 
                    className="text-xs text-[#5E564F] hover:text-[#181514] flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    className="px-6 py-3.5 bg-[#9E7B3B] hover:bg-[#181514] text-white font-bold uppercase tracking-widest text-xs rounded-lg transition-colors flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Pagar • {formatCLP(cartTotal)}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMACIÓN Y COMPROBANTE */}
            {step === 4 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>

                <h4 className="jz-display text-2xl sm:text-3xl font-normal text-[#181514]">
                  ¡Gracias por tu compra, {formData.name}!
                </h4>
                <p className="text-xs text-[#5E564F]">
                  N° de Orden: <strong className="text-[#9E7B3B] font-mono text-sm">{orderNumber}</strong> • Confirmación enviada a {formData.email}
                </p>

                <div className="p-4 bg-[#EDE8DE] border border-[#D6CEBF] rounded-xl max-w-md mx-auto text-xs text-[#5E564F] text-left space-y-1">
                  <p><strong>RUT:</strong> {formData.rut}</p>
                  <p><strong>Destino:</strong> {formData.address}, {formData.comuna}</p>
                  <p><strong>Courier:</strong> {formData.shippingCarrier.toUpperCase()}</p>
                  <p><strong>Estado:</strong> En preparación en taller (Santiago)</p>
                </div>

                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  {setCurrentView && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setStep(1);
                        setCurrentView('account');
                      }}
                      className="px-6 py-3 bg-[#9E7B3B] hover:bg-[#181514] text-white rounded-lg text-xs uppercase tracking-wider font-bold transition-colors shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Ver Seguimiento en Vivo</span>
                    </button>
                  )}
                  <a
                    href={`https://wa.me/56940187563?text=${waOrderReceipt}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg text-xs uppercase tracking-wider font-bold transition-colors shadow-lg flex items-center gap-2"
                  >
                    <span>Enviar Comprobante por WhatsApp</span>
                  </a>
                  <button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setStep(1);
                    }}
                    className="px-6 py-3 bg-[#EAE4D8] hover:bg-[#181514] hover:text-white text-[#181514] rounded-lg text-xs uppercase tracking-wider font-semibold transition-colors border border-[#D6CEBF]"
                  >
                    Volver a la Tienda
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Legal Modal */}
      <LegalModal 
        isOpen={isLegalModalOpen} 
        onClose={() => setIsLegalModalOpen(false)} 
        initialTab={legalModalTab} 
      />
    </>
  );
}
