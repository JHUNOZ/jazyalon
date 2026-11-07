import React from 'react';

export default function VictorianDivider({ title, subtitle, className = "" }) {
  return (
    <div className={`text-center my-8 sm:my-12 relative flex flex-col items-center justify-center ${className}`}>
      {subtitle && (
        <span className="jz-label text-[#8A8178] mb-2 flex items-center gap-3 font-bold">
          <span className="w-6 h-px bg-[#D6CEBF]"></span>
          <span>{subtitle}</span>
          <span className="w-6 h-px bg-[#D6CEBF]"></span>
        </span>
      )}
      
      {title && (
        <h2 className="jz-display text-4xl sm:text-5xl lg:text-6xl text-[#181514] font-normal tracking-tight">
          {title}
        </h2>
      )}

      {/* Single Refined Editorial Accent Line */}
      <div className="flex items-center gap-2 mt-4">
        <div className="w-12 h-px bg-[#D6CEBF]"></div>
        <div className="w-1.5 h-1.5 rotate-45 bg-[#9E7B3B]"></div>
        <div className="w-12 h-px bg-[#D6CEBF]"></div>
      </div>
    </div>
  );
}
