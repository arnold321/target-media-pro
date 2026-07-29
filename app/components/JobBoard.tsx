'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase } from 'lucide-react';
import ProposalModal from './ProposalModal';
import { Hero, BotonRojo } from './ui';

interface Job {
  id: string;
  title: string;
  category: string;
  budget: number;
  status: string;
  description: string;
  created_at: string;
}

interface JobBoardProps {
  userId: string;
}

export default function JobBoard({ userId }: JobBoardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'abierto')
        .order('created_at', { ascending: false });

      if (error) console.error('Error al cargar trabajos:', error);
      else setJobs(data || []);
      
      setLoading(false);
    }
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
          <p className="mt-4 text-brand-gris">Cargando trabajos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Hero con formas orgánicas */}
      <Hero 
        titulo="Trabajos disponibles" 
        sub="Target publica aquí sus necesidades de producción. Postúlate con tu precio, tu tiempo y tu propuesta." 
      />

      {jobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-brand-borde mt-6">
          <Briefcase className="mx-auto h-12 w-12 text-brand-gris opacity-50" />
          <h3 className="mt-4 text-lg font-bold text-brand-negro">No hay trabajos disponibles</h3>
          <p className="text-brand-gris text-sm mt-2">Vuelve pronto para ver nuevas oportunidades.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {jobs.map((job) => (
            <article 
              key={job.id} 
              className="bg-white border border-brand-borde rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Cabecera de la tarjeta */}
              <div className="flex justify-between items-center text-xs">
                <span className="bg-brand-crema text-brand-vino font-semibold px-2.5 py-1 rounded-full">
                  {job.category}
                </span>
                <span className="text-brand-gris">
                  {new Date(job.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Título */}
              <h3 className="m-0 text-lg font-bold text-brand-negro leading-tight group-hover:text-brand-rojo transition-colors">
                {job.title}
              </h3>

              {/* Descripción */}
              <p className="m-0 text-sm text-brand-gris leading-relaxed line-clamp-3 flex-grow">
                {job.description}
              </p>

              {/* Pie de la tarjeta */}
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-brand-borde/50">
                <div>
                  <span className="text-xs text-brand-gris block mb-1">Presupuesto</span>
                  <div className="font-extrabold text-xl text-brand-negro">
                    ${Number(job.budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <BotonRojo onClick={() => setSelectedJob(job)}>
                  Ver detalles
                </BotonRojo>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Postulación */}
      {selectedJob && (
        <ProposalModal 
          job={selectedJob} 
          freelancerId={userId} 
          onClose={() => setSelectedJob(null)} 
        />
      )}
    </div>
  );
}