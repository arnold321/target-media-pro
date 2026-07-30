'use client';

import React from 'react';

// Logo SVG de Target Media (réplica vectorial del logo oficial)
export function Logo({ height = 40 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center' }}>
      <svg
        viewBox="0 0 220 50"
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Target Media"
      >
        {/* Ícono geométrico rojo - Forma de T/Y estilizada */}
        {/* Pieza superior izquierda */}
        <path
          d="M 10 8 L 22 2 L 34 8 L 22 14 Z"
          fill="#E63946"
        />
        {/* Pieza superior derecha */}
        <path
          d="M 34 8 L 46 2 L 34 8 L 22 14 Z"
          fill="#E63946"
        />
        {/* Pieza central (brazo de la Y) */}
        <path
          d="M 22 14 L 34 8 L 34 20 L 28 26 Z"
          fill="#E63946"
        />
        {/* Brazo izquierdo inferior */}
        <path
          d="M 10 20 L 22 14 L 22 26 L 10 32 Z"
          fill="#E63946"
        />
        {/* Brazo derecho inferior */}
        <path
          d="M 34 20 L 46 14 L 46 26 L 34 32 Z"
          fill="#E63946"
        />
        {/* Centro de la Y */}
        <path
          d="M 22 26 L 28 20 L 34 26 L 28 32 Z"
          fill="#E63946"
        />

        {/* Texto "Target" en blanco bold */}
        <text
          x="58"
          y="22"
          fontFamily="var(--font-poppins), system-ui, sans-serif"
          fontWeight="800"
          fontSize="22"
          fill="#FFFFFF"
          letterSpacing="-0.5"
        >
          Target
        </text>
        
        {/* Texto "Media" en gris claro */}
        <text
          x="58"
          y="38"
          fontFamily="var(--font-poppins), system-ui, sans-serif"
          fontWeight="500"
          fontSize="14"
          fill="#9CA3AF"
          letterSpacing="0.5"
        >
          Media
        </text>
      </svg>
    </div>
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
      {children} <span aria-hidden="true" className="font-bold">↗</span>
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
      {/* Forma orgánica roja */}
      <svg 
        aria-hidden="true" 
        className="absolute -top-16 -left-20 opacity-95" 
        width="320" 
        height="300" 
        viewBox="0 0 320 300"
      >
        <path 
          d="M40,-10 C160,-40 260,40 220,130 C190,200 80,230 10,180 C-50,135 -40,20 40,-10 Z" 
          fill="#D9374A" 
        />
      </svg>
      
      {/* Forma orgánica vino */}
      <svg 
        aria-hidden="true" 
        className="absolute -bottom-24 -right-16" 
        width="340" 
        height="280" 
        viewBox="0 0 340 280"
      >
        <path 
          d="M300,20 C380,80 360,200 260,250 C170,295 60,260 40,180 C25,110 200,-40 300,20 Z" 
          fill="#6E1423" 
        />
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