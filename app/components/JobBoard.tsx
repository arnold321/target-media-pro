'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, DollarSign, Clock, Briefcase, Share2 } from 'lucide-react';
import { Badge } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  created_at: string;
}

interface JobBoardProps {
  userId: string;
  userRole: string | null;
}

export default function JobBoard({ userId, userRole }: JobBoardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteJobs, setFavoriteJobs] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadJobs();
    if (userRole === 'freelancer') {
      loadFavorites();
    }
  }, [userRole]);

  async function loadJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'abierto')
      .order('created_at', { ascending: false });

    if (!error) setJobs(data || []);
    setLoading(false);
  }

  async function loadFavorites() {
    const { data } = await supabase
      .from('favorites')
      .select('job_id')
      .eq('user_id', userId);
    
    setFavoriteJobs((data || []).map((f: any) => f.job_id));
  }

  async function toggleFavorite(jobId: string) {
    if (userRole !== 'freelancer') {
      toast.error('Solo los freelancers pueden guardar favoritos');
      return;
    }

    const isFavorite = favoriteJobs.includes(jobId);

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('job_id', jobId);
      setFavoriteJobs(prev => prev.filter(id => id !== jobId));
      toast.success('Trabajo removido de favoritos');
    } else {
      await supabase.from('favorites').insert({ user_id: userId, job_id: jobId });
      setFavoriteJobs(prev => [...prev, jobId]);
      toast.success('Trabajo agregado a favoritos ❤️');
    }
  }

  async function handleShare(job: Job) {
    const shareUrl = window.location.href;
    const shareText = `¡Hola! Vi esta oferta de trabajo y pensé en ti:\n\n🚀 *${job.title}*\n💵 Presupuesto: $${Number(job.budget).toLocaleString()}\n📂 Categoría: ${job.category}\n\nMira los detalles y postúlate aquí:`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Oferta: ${job.title}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success('¡Oferta compartida exitosamente!');
      } else {
        const textToCopy = `${shareText}\n${shareUrl}`;
        await navigator.clipboard.writeText(textToCopy);
        toast.success('Enlace copiado. ¡Pégalo (Ctrl+V) en WhatsApp o redes!');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error al compartir:', error);
        toast.error('No se pudo compartir la oferta');
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-rojo"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold text-brand-negro">Trabajos Disponibles</h2>
        <span className="text-sm text-brand-gris">{jobs.length} oportunidades activas</span>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-brand-borde">
          <Briefcase className="mx-auto h-12 w-12 text-brand-gris opacity-30 mb-4" />
          <p className="text-brand-gris">No hay trabajos disponibles en este momento.</p>
        </div>
      ) : (
        /* 🆕 GRID DE 3 COLUMNAS (Responsivo: 1 en móvil, 2 en tablet, 3 en PC) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-white rounded-xl border border-brand-borde p-5 hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full relative group"
            >
              
              {/* BOTÓN DE FAVORITOS */}
              {userRole === 'freelancer' && (
                <button
                  onClick={() => toggleFavorite(job.id)}
                  className={`absolute top-3 right-3 p-2 rounded-full transition-all z-10 ${
                    favoriteJobs.includes(job.id)
                      ? 'text-brand-rojo bg-brand-rojo/10'
                      : 'text-brand-gris hover:text-brand-rojo hover:bg-brand-rojo/5 opacity-0 group-hover:opacity-100'
                  }`}
                  title={favoriteJobs.includes(job.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart size={18} fill={favoriteJobs.includes(job.id) ? 'currentColor' : 'none'} />
                </button>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge estado={job.status} />
                <span className="text-xs font-semibold text-brand-vino bg-brand-crema px-2 py-1 rounded-full">
                  {job.category}
                </span>
              </div>
              
              {/* Título */}
              <h3 className="text-lg font-bold text-brand-negro mb-2 line-clamp-2 leading-tight min-h-[3rem]">
                {job.title}
              </h3>
              
              {/* Descripción */}
              <p className="text-brand-texto text-xs mb-4 line-clamp-3 flex-grow">
                {job.description}
              </p>
              
              {/* Info de presupuesto y fecha */}
              <div className="flex flex-col gap-2 text-xs text-brand-gris mb-4 pt-3 border-t border-brand-borde">
                <span className="flex items-center gap-1.5 font-semibold text-green-600">
                  <DollarSign size={14} />
                  ${Number(job.budget).toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {new Date(job.created_at).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => handleShare(job)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand-gris hover:text-brand-negro transition-colors px-3 py-2 rounded-lg hover:bg-brand-crema/50 border border-brand-borde"
                  title="Compartir esta oferta"
                >
                  <Share2 size={14} />
                  Compartir
                </button>
                
                <button className="flex-1 tm-btn-rojo text-xs py-2">
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}