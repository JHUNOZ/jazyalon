import React from 'react';
import { Sparkles, AlertCircle, Info } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export default function Toast() {
  const { toast } = useShop();

  if (!toast) return null;

  const icons = {
    success: <Sparkles className="w-4 h-4 text-luxury-gold shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-luxury-rose-dark shrink-0" />
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 z-50 animate-fadeIn">
      <div className="bg-black text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs font-medium tracking-wide border border-white/10">
        {icons[toast.type] || icons.success}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
