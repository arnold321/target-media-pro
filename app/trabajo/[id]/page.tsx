import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { ArrowLeft, DollarSign, Clock, Share2, Briefcase, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/app/components/ui';
import type { Metadata } from 'next';

interface JobDetailProps {
  params: Promise<{
    id: string;
  }>;
}

async function getJob(id: string) {
  console.log(' Buscando trabajo con ID:', id);
  
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Error de Supabase:', error.message, error.details);
    return null;
  }

  if (!data) {
    console.warn('⚠️ No se encontró el trabajo con ID:', id);
    return null;
  }

  console.log('✅ Trabajo encontrado:', data.title);
  return data;
}

export async function generateMetadata({ params }: JobDetailProps): Promise<Metadata> {
  const { id } = await params; // ✅ Await a params
  const job = await getJob(id);

  if (!job) {
    return {
      title: 'Trabajo no encontrado - Target Media Connect',
    };
  }

  return {
    title: `${job.title} - Target Media Connect`,
    description: job.description.slice(0, 160),
    openGraph: {
      title: job.title,
      description: job.description.slice(0, 160),
      type: 'website',
      url: `https://targetdcorp.targetmediaconnect.com/trabajo/${id}`,
      siteName: 'Target Media Connect',
    },
    twitter: {
      card: 'summary_large_image',
      title: job.title,
      description: job.description.slice(0, 160),
    },
  };
}

export default async function JobDetailPage({ params }: JobDetailProps) {
  const { id } = await params; // ✅ Await a params
  const job = await getJob(id);

  if (!job) {
    console.log('🚫 Mostrando página 404');
    notFound();
  }

  const shareUrl = `https://targetdcorp.targetmediaconnect.com/trabajo/${id}`;
  const shareText = `¡Mira esta oferta de trabajo!\n\n${job.title}\n💵 Presupuesto: $${Number(job.budget).toLocaleString()}\n📂 Categoría: ${job.category}\n\nVer detalles:`;

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-white font-bold text-lg">Target Media</div>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Volver al tablero</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-xl border border-brand-borde p-8 mb-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge estado={job.status} />
            <span className="text-sm font-semibold text-brand-vino bg-brand-crema px-3 py-1 rounded-full">
              {job.category}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-brand-negro mb-4">
            {job.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-brand-borde">
            <div>
              <p className="text-xs text-brand-gris uppercase font-semibold mb-2">Presupuesto</p>
              <p className="text-3xl font-extrabold text-green-600">
                ${Number(job.budget).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-gris uppercase font-semibold mb-2">Publicado</p>
              <p className="text-lg font-bold text-brand-negro flex items-center gap-2">
                <Clock size={18} className="text-brand-gris" />
                {new Date(job.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-brand-borde p-8 mb-6">
          <h2 className="text-xl font-bold text-brand-negro mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-brand-rojo" />
            Descripción del Proyecto
          </h2>
          <div className="text-brand-texto leading-relaxed whitespace-pre-wrap">
            {job.description}
          </div>
        </div>

        {job.entregables && (
          <div className="bg-white rounded-xl border border-brand-borde p-8 mb-6">
            <h2 className="text-xl font-bold text-brand-negro mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-brand-rojo" />
              Entregables Esperados
            </h2>
            <div className="text-brand-texto leading-relaxed whitespace-pre-wrap">
              {job.entregables}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-brand-borde p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 tm-btn-rojo text-center flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Postularme a este Trabajo
            </Link>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 tm-btn-outline flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              Compartir en WhatsApp
            </a>
          </div>
          <p className="text-xs text-brand-gris text-center mt-4">
            Necesitas estar registrado para postularte. ¡Es gratis!
          </p>
        </div>
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Conectamos Talento Freelance con Oportunidades
      </footer>
    </div>
  );
}