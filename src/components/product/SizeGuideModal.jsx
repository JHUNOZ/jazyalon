import React from 'react';
import { X, Ruler } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { SIZE_CHART } from '../../data/mockData';

export default function SizeGuideModal() {
  const { isSizeGuideOpen, setIsSizeGuideOpen } = useShop();

  if (!isSizeGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-[#FAF8F5] rounded-2xl border border-[#D6CEBF] shadow-2xl w-full max-w-2xl overflow-hidden relative my-auto text-[#181514]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#D6CEBF] flex items-center justify-between bg-[#F0ECE4]">
          <div className="flex items-center gap-2.5">
            <Ruler className="w-5 h-5 text-[#9E7B3B]" />
            <h3 className="jz-display text-xl sm:text-2xl font-normal text-[#181514] uppercase tracking-wider">
              Guía de Tallas para Corsets
            </h3>
          </div>
          <button 
            onClick={() => setIsSizeGuideOpen(false)}
            className="p-1 text-[#8A8178] hover:text-[#181514] transition-colors"
            aria-label="Cerrar guía de tallas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
          {/* Instructions Box */}
          <div className="bg-[#EDE8DE] p-4 rounded-xl border border-[#D6CEBF] space-y-1.5 text-[#5E564F] leading-relaxed">
            <p><strong className="text-[#9E7B3B]">Cintura (Medida Clave):</strong> Mide 2 a 3 cm sobre tu ombligo sin apretar la cinta métrica.</p>
            <p><strong className="text-[#9E7B3B]">Busto:</strong> Pasa la cinta en la parte más prominente de tu busto.</p>
            <p><strong className="text-[#9E7B3B]">Cadera:</strong> Mide la zona más ancha de tus caderas.</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#D6CEBF] bg-[#FFFFFF]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EDE8DE] uppercase tracking-widest text-[10px] text-[#9E7B3B] border-b border-[#D6CEBF] font-bold">
                <tr>
                  <th className="p-3.5">Talla</th>
                  <th className="p-3.5">Cintura</th>
                  <th className="p-3.5">Busto</th>
                  <th className="p-3.5">Cadera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6CEBF]">
                {SIZE_CHART.map((row) => (
                  <tr key={row.size} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="p-3.5 font-bold text-[#9E7B3B] font-mono text-sm">{row.size}</td>
                    <td className="p-3.5 font-semibold text-[#181514]">{row.cintura}</td>
                    <td className="p-3.5 text-[#5E564F]">{row.busto}</td>
                    <td className="p-3.5 text-[#5E564F]">{row.cadera}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D6CEBF] bg-[#F0ECE4] text-center">
          <button
            onClick={() => setIsSizeGuideOpen(false)}
            className="px-8 py-2.5 bg-[#9E7B3B] hover:bg-[#181514] text-white text-xs uppercase tracking-widest font-bold rounded-lg transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
