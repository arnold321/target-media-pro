import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-crema flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-brand-negro mb-4">404</h1>
        <h2 className="text-2xl font-bold text-brand-negro mb-2">Trabajo no encontrado</h2>
        <p className="text-brand-gris mb-6">
          El trabajo que buscas no existe o fue eliminado.
        </p>
        <Link
          href="/"
          className="tm-btn-rojo inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al Tablero
        </Link>
      </div>
    </div>
  );
}