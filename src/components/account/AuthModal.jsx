import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  Eye,
  EyeOff,
  Crown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import {
  sanitizeName,
  normalizeEmail,
  sanitizePhone,
  validateEmail,
  validateChileanPhone,
  evaluatePasswordStrength,
  checkRateLimit,
  logSecurityEvent
} from '../../utils/security';

export default function AuthModal({ setCurrentView }) {
  const {
    isAuthOpen,
    setIsAuthOpen,
    loginUser,
    registerUser,
    quickAdminLogin
  } = useShop();

  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthOpen) return null;

  const passwordEvaluation = evaluatePasswordStrength(password);
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setPhone('');
    setErrorMsg('');
  };

  const handleQuickAdmin = () => {
    quickAdminLogin();
    resetFields();
    setIsAuthOpen(false);
    if (setCurrentView) setCurrentView('admin');
  };

  const handleQuickCustomer = () => {
    const res = loginUser('valentina@correo.cl', 'cliente1234');
    if (res.success) {
      resetFields();
      setIsAuthOpen(false);
      if (setCurrentView) setCurrentView('account');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = normalizeEmail(email);
    if (!validateEmail(cleanEmail)) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    const rateCheck = checkRateLimit(`auth_${tab}_${cleanEmail}`, 7, 60000);
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.message);
      logSecurityEvent('RATE_LIMIT_AUTH_BLOCKED', { email: cleanEmail, tab });
      return;
    }

    if (tab === 'register') {
      const cleanName = sanitizeName(name);
      if (cleanName.length < 3) {
        setErrorMsg('Ingresa tu nombre y apellido válidos (mínimo 3 letras).');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas ingresadas no coinciden.');
        return;
      }

      const cleanPhone = sanitizePhone(phone);
      if (cleanPhone && !validateChileanPhone(cleanPhone)) {
        setErrorMsg('Ingresa un teléfono móvil chileno válido (ej: +56 9 1234 5678) o déjalo opcional.');
        return;
      }

      const regRes = registerUser({
        name: cleanName,
        email: cleanEmail,
        password,
        phone: cleanPhone
      });

      if (!regRes.success) {
        setErrorMsg(regRes.message);
        return;
      }

      logSecurityEvent('USER_REGISTER_SUCCESS', { email: cleanEmail, role: regRes.user?.role });
      resetFields();
      setIsAuthOpen(false);
      if (setCurrentView) {
        setCurrentView(regRes.user?.role === 'admin' ? 'admin' : 'account');
      }
    } else {
      const loginRes = loginUser(cleanEmail, password);
      if (!loginRes.success) {
        setErrorMsg(loginRes.message);
        return;
      }

      logSecurityEvent('USER_LOGIN_SUCCESS', { email: cleanEmail, role: loginRes.user?.role });
      resetFields();
      setIsAuthOpen(false);
      if (setCurrentView) {
        setCurrentView(loginRes.user?.role === 'admin' ? 'admin' : 'account');
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={() => setIsAuthOpen(false)}
    >
      <div
        className="bg-white rounded-2xl border border-[#E5E0D8] shadow-2xl w-full max-w-md overflow-hidden relative my-auto text-[#181514]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsAuthOpen(false)}
          className="absolute top-4 right-4 text-[#7A7167] hover:text-[#181514] p-1.5 rounded-lg hover:bg-[#F5F3EF] transition-colors cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center border-b border-[#E5E0D8] bg-[#FAF9F6]">
          <img
            src="/images/logos/LOGO_PR.png"
            alt="JAZYALON"
            className="h-11 w-auto object-contain mx-auto mb-2.5"
          />
          <h3 id="auth-modal-title" className="text-xl font-bold text-[#181514] tracking-tight">
            {tab === 'login' ? 'Iniciar Sesión' : 'Crear tu Cuenta'}
          </h3>
          <p className="text-xs text-[#575049] mt-1">
            {tab === 'login'
              ? 'Accede a tus pedidos, favoritos o panel de administración'
              : 'Registro protegido para guardar tus compras y seguimiento en vivo'}
          </p>
        </div>

        <div className="grid grid-cols-2 border-b border-[#E5E0D8] text-xs font-semibold text-center bg-[#F4F1EC]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`py-3 transition-colors cursor-pointer ${
              tab === 'login'
                ? 'border-b-2 border-[#181514] text-[#181514] bg-white font-bold'
                : 'text-[#575049] hover:text-[#181514]'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`py-3 transition-colors cursor-pointer ${
              tab === 'register'
                ? 'border-b-2 border-[#181514] text-[#181514] bg-white font-bold'
                : 'text-[#575049] hover:text-[#181514]'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-[#181514] mb-1 font-semibold text-[11px]">
                Nombre y Apellido *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7167]" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ej: Constanza Morales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D8D1C5] rounded-lg text-[#181514] placeholder-[#8C8379] focus:border-[#181514] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#181514] mb-1 font-semibold text-[11px]">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7167]" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nombre@correo.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D8D1C5] rounded-lg text-[#181514] placeholder-[#8C8379] focus:border-[#181514] focus:outline-none"
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[#181514] mb-1 font-semibold text-[11px]">
                WhatsApp / Teléfono <span className="text-[#7A7167] font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7167]" />
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+56 9 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D8D1C5] rounded-lg text-[#181514] placeholder-[#8C8379] focus:border-[#181514] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#181514] mb-1 font-semibold text-[11px]">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7167]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#D8D1C5] rounded-lg text-[#181514] placeholder-[#8C8379] focus:border-[#181514] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7167] hover:text-[#181514] cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {tab === 'register' && password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#575049]">Seguridad de contraseña:</span>
                  <span className="font-bold" style={{ color: passwordEvaluation.color }}>
                    {passwordEvaluation.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#ECE8E1] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(passwordEvaluation.score / 3) * 100}%`,
                      backgroundColor: passwordEvaluation.color
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[#181514] mb-1 font-semibold text-[11px]">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7167]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D8D1C5] rounded-lg text-[#181514] placeholder-[#8C8379] focus:border-[#181514] focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#181514] hover:bg-[#9E7B3B] text-white font-semibold tracking-wide text-xs rounded-lg transition-colors mt-2 shadow-sm cursor-pointer"
          >
            {tab === 'login' ? 'Entrar a mi Cuenta' : 'Crear Cuenta Segura'}
          </button>

          {isLocalhost && (
            <div className="pt-3.5 mt-3.5 border-t border-[#E5E0D8] space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-[#7A7167] font-bold text-center">
                Acceso Rápido Localhost
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleQuickAdmin}
                  className="py-2 px-3 rounded-lg bg-[#181514] hover:bg-[#9E7B3B] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-[#C8A96B]" />
                  <span>Panel Admin</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickCustomer}
                  className="py-2 px-3 rounded-lg bg-[#F5F3EF] hover:bg-[#EAE5DC] text-[#181514] border border-[#D8D1C5] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#9E7B3B]" />
                  <span>Clienta Demo</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
