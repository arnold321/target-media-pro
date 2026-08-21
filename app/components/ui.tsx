'use client';

import React from 'react';

// Logo usando imagen PNG (solución simple y confiable)
export function Logo({ height = 40 }: { height?: number }) {
  return (
    <img 
      src="/logo.png" 
      alt="Target Media"
      style={{ 
        height: `${height}px`,
        width: 'auto',
        display: 'block'
      }}
    />
  );
}

export function Badge({ estado }: { estado: string }) {
  const estados: Record<string, { bg: string; fg: string; label: string }> = {
    pendiente: { bg: "bg-gray-100", fg: "text-gray-600", label: "Pendiente" },
    recibida: { bg: "bg-gray-100", fg: "text-gray-700", label: "Recibida" },
    revision: { bg: "bg-yellow-100", fg: "text-yellow-800", label: "En revisión" },
    aprobada: { bg: "bg-green-100", fg: "text-green-700", label: "Aprobada" },
    rechazada: { bg: "bg-red-100", fg: "text-brand-vino", label: "Rechazada" },
    abierto: { bg: "bg-green-100", fg: "text-green-700", label: "Abierto" },
    en_progreso: { bg: "bg-blue-100", fg: "text-blue-700", label: "En progreso" },
    en_revision: { bg: "bg-yellow-100", fg: "text-yellow-800", label: "En revisión" },
    completado: { bg: "bg-green-100", fg: "text-green-700", label: "Completado" },
    anulada: { bg: "bg-orange-100", fg: "text-orange-700", label: "Anulada" },
  };

  const e = estados[estado] || estados.pendiente;

  return (
    <span className={`${e.bg} ${e.fg} text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap`}>
      {e.label}
    </span>
  );
}

export function BotonRojo({ 
  children, 
  onClick, 
  disabled, 
  full, 
  type = "button" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean; 
  full?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled} 
      className={`tm-btn-rojo ${full ? "w-full" : ""}`}
    >
      {children} <span aria-hidden="true" className="font-bold"></span>
    </button>
  );
}

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold text-brand-texto mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Hero({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="relative overflow-hidden bg-brand-crema rounded-2xl p-8 md:p-16 my-6 max-w-5xl mx-auto">
      <svg aria-hidden="true" className="absolute -top-16 -left-20 opacity-95" width="320" height="300" viewBox="0 0 320 300">
        <path d="M40,-10 C160,-40 260,40 220,130 C190,200 80,230 10,180 C-50,135 -40,20 40,-10 Z" fill="#D9374A" />
      </svg>
      <svg aria-hidden="true" className="absolute -bottom-24 -right-16" width="340" height="280" viewBox="0 0 340 280">
        <path d="M300,20 C380,80 360,200 260,250 C170,295 60,260 40,180 C25,110 200,-40 300,20 Z" fill="#6E1423" />
      </svg>
      <div className="relative max-w-2xl">
        <h1 className="text-3xl md:text-5xl font-extrabold text-brand-negro tracking-tight m-0">
          {titulo}
        </h1>
        <p className="text-base text-gray-600 mt-3 max-w-xl">
          {sub}
        </p>
      </div>
    </div>
  );
}