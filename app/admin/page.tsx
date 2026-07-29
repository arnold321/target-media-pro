'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Briefcase, Users, DollarSign, Clock, Plus, ArrowLeft, Check, X, Eye, Trash2 } from 'lucide-react';
import { Logo, Badge } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';
import NewJobForm from '@/app/admin/NewJobForm';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  created_at: string;
  assigned_freelancer_id: string | null;
}

interface Proposal {
  id: string;
  job_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_budget: number;
  status: string;
  created_at: string;
  deliverable_url: string | null;
  profiles: {
    full_name: string;
    email: string;
    whatsapp_number: string;
  };
  jobs: {
    title: string;
    category: string;
    budget: number;
    status: string;
  };
}

export default function AdminPanel() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    openJobs: 0,
    totalProposals: 0,
    pendingProposals: 0,
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'proposals'>('jobs');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      toast.error('No tienes permisos de administrador');
      router.push('/');
      return;
    }

    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    const { count: openJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'abierto');
    const { count: totalProposals } = await supabase.from('proposals').select('*', { count: 'exact', head: true });
    const { count: pendingProposals } = await supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'pendiente');

    setStats({
      totalJobs: totalJobs || 0,
      openJobs: openJobs || 0,
      totalProposals: totalProposals || 0,
      pendingProposals: pendingProposals || 0,
    });

    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    setJobs(jobsData || []);

    const { data: proposalsData } = await supabase
      .from('proposals')
      .select(`
        *,
        profiles (full_name, email, whatsapp_number),
        jobs (title, category, budget, status)
      `)
      .order('created_at', { ascending: false });
    setProposals(proposalsData || []);
  }

  async function handleApproveProposal(proposalId: string, jobId: string, freelancerId: string) {
    if (!confirm('¿Aprobar esta propuesta? El trabajo pasará a estado "En progreso".')) return;

    try {
      await supabase
        .from('proposals')
        .update({ status: 'aprobada' })
        .eq('id', proposalId);

      await supabase
        .from('jobs')
        .update({ 
          status: 'en_progreso',
          assigned_freelancer_id: freelancerId
        })
        .eq('id', jobId);

      toast.success('Propuesta aprobada exitosamente');
      await loadData();
    } catch (error) {
      console.error('Error al aprobar:', error);
      toast.error('Error al aprobar la propuesta');
    }
  }

  async function handleRejectProposal(proposalId: string) {
    if (!confirm('¿Rechazar esta propuesta?')) return;

    try {
      await supabase
        .from('proposals')
        .update({ status: 'rechazada' })
        .eq('id', proposalId);

      toast.success('Propuesta rechazada');
      await loadData();
    } catch (error) {
      console.error('Error al rechazar:', error);
      toast.error('Error al rechazar la propuesta');
    }
  }

  async function handleJobStatusChange(jobId: string, newStatus: string) {
    try {
      await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      toast.success(`Estado actualizado a: ${newStatus}`);
      await loadData();
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error('Error al actualizar el estado');
    }
  }

  async function handleDeleteJob(jobId: string) {
    if (!confirm('¿Eliminar este trabajo? Esta acción no se puede deshacer.')) return;

    try {
      await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      toast.success('Trabajo eliminado');
      await loadData();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el trabajo');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
          <p className="mt-4 text-brand-gris">Cargando panel...</p>
        </div>
      </div>
    );
  }

  const jobProposals = selectedJob 
    ? proposals.filter(p => p.job_id === selectedJob)
    : proposals;

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Panel de Administración</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Volver al inicio</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-negro">Gestión de Trabajos</h1>
            <p className="text-brand-gris mt-1">Publica nuevas oportunidades y revisa propuestas.</p>
          </div>
          <button
            onClick={() => setShowNewJobForm(true)}
            className="tm-btn-rojo inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Publicar Nuevo Trabajo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-brand-crema p-3 rounded-lg">
                <Briefcase className="h-6 w-6 text-brand-vino" />
              </div>
              <div>
                <p className="text-xs text-brand-gris uppercase font-semibold">Total Trabajos</p>
                <p className="text-2xl font-extrabold text-brand-negro">{stats.totalJobs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-brand-gris uppercase font-semibold">Abiertos</p>
                <p className="text-2xl font-extrabold text-brand-negro">{stats.openJobs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-brand-crema p-3 rounded-lg">
                <Users className="h-6 w-6 text-brand-vino" />
              </div>
              <div>
                <p className="text-xs text-brand-gris uppercase font-semibold">Propuestas</p>
                <p className="text-2xl font-extrabold text-brand-negro">{stats.totalProposals}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-50 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-brand-gris uppercase font-semibold">Pendientes</p>
                <p className="text-2xl font-extrabold text-brand-negro">{stats.pendingProposals}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-brand-borde shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-brand-borde">
            <button
              onClick={() => { setActiveTab('jobs'); setSelectedJob(null); }}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === 'jobs' 
                  ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' 
                  : 'text-brand-gris hover:text-brand-negro'
              }`}
            >
              Trabajos ({jobs.length})
            </button>
            <button
              onClick={() => { setActiveTab('proposals'); setSelectedJob(null); }}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === 'proposals' 
                  ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' 
                  : 'text-brand-gris hover:text-brand-negro'
              }`}
            >
              Propuestas ({proposals.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'jobs' && (
              <div>
                {selectedJob ? (
                  <div>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="tm-link mb-4 flex items-center gap-1"
                    >
                      <ArrowLeft size={14} />
                      Volver a todos los trabajos
                    </button>
                    <h3 className="text-xl font-bold text-brand-negro mb-4">
                      Propuestas para: {jobs.find(j => j.id === selectedJob)?.title}
                    </h3>
                    {jobProposals.length === 0 ? (
                      <p className="text-brand-gris text-center py-8">No hay propuestas para este trabajo</p>
                    ) : (
                      <div className="space-y-4">
                        {jobProposals.map(proposal => (
                          <div key={proposal.id} className="border border-brand-borde rounded-lg p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-brand-negro">{proposal.profiles.full_name}</h4>
                                <p className="text-sm text-brand-gris">{proposal.profiles.email}</p>
                                {proposal.profiles.whatsapp_number && (
                                  <p className="text-sm text-brand-gris">WhatsApp: {proposal.profiles.whatsapp_number}</p>
                                )}
                              </div>
                              <Badge estado={proposal.status} />
                            </div>
                            <p className="text-sm text-brand-texto mb-3">{proposal.cover_letter}</p>
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-semibold text-brand-negro">
                                Presupuesto propuesto: ${Number(proposal.proposed_budget).toLocaleString()}
                              </span>
                              <span className="text-brand-gris">
                                {new Date(proposal.created_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                            {proposal.status === 'pendiente' && (
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => handleApproveProposal(proposal.id, proposal.job_id, proposal.freelancer_id)}
                                  className="tm-btn-verde flex items-center gap-1 text-xs"
                                >
                                  <Check size={14} />
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => handleRejectProposal(proposal.id)}
                                  className="tm-btn-vino flex items-center gap-1 text-xs"
                                >
                                  <X size={14} />
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.length === 0 ? (
                      <p className="text-brand-gris text-center py-8">No hay trabajos creados aún</p>
                    ) : (
                      jobs.map(job => {
                        const jobProposalCount = proposals.filter(p => p.job_id === job.id).length;
                        const pendingCount = proposals.filter(p => p.job_id === job.id && p.status === 'pendiente').length;
                        
                        return (
                          <div key={job.id} className="border border-brand-borde rounded-lg p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                              <div className="flex-1">
                                <h3 className="font-bold text-brand-negro text-lg">{job.title}</h3>
                                <p className="text-sm text-brand-gris">{job.category}</p>
                              </div>
                              <Badge estado={job.status} />
                            </div>
                            <p className="text-sm text-brand-texto mb-3 line-clamp-2">{job.description}</p>
                            <div className="flex justify-between items-center flex-wrap gap-3">
                              <div className="flex gap-4 text-sm">
                                <span className="font-semibold text-brand-negro">
                                  Presupuesto: ${Number(job.budget).toLocaleString()}
                                </span>
                                <span className="text-brand-gris">
                                  {jobProposalCount} propuesta{jobProposalCount !== 1 ? 's' : ''}
                                  {pendingCount > 0 && (
                                    <span className="ml-2 text-brand-rojo font-semibold">
                                      ({pendingCount} pendiente{pendingCount !== 1 ? 's' : ''})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {jobProposalCount > 0 && (
                                  <button
                                    onClick={() => { setSelectedJob(job.id); setActiveTab('jobs'); }}
                                    className="tm-btn-outline flex items-center gap-1 text-xs"
                                  >
                                    <Eye size={14} />
                                    Ver Propuestas
                                  </button>
                                )}
                                <select
                                  value={job.status}
                                  onChange={(e) => handleJobStatusChange(job.id, e.target.value)}
                                  className="tm-input text-xs py-1.5"
                                  style={{ width: 'auto' }}
                                >
                                  <option value="abierto">Abierto</option>
                                  <option value="en_progreso">En Progreso</option>
                                  <option value="en_revision">En Revisión</option>
                                  <option value="completado">Completado</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="text-brand-rojo hover:text-brand-rojo-hover p-2"
                                  title="Eliminar trabajo"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'proposals' && (
              <div>
                {proposals.length === 0 ? (
                  <p className="text-brand-gris text-center py-8">No hay propuestas recibidas aún</p>
                ) : (
                  <div className="space-y-4">
                    {proposals.map(proposal => (
                      <div key={proposal.id} className="border border-brand-borde rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                          <div>
                            <h4 className="font-bold text-brand-negro">{proposal.profiles.full_name}</h4>
                            <p className="text-sm text-brand-gris">{proposal.profiles.email}</p>
                            <p className="text-xs text-brand-vino font-semibold mt-1">
                              Trabajo: {proposal.jobs.title}
                            </p>
                          </div>
                          <Badge estado={proposal.status} />
                        </div>
                        <p className="text-sm text-brand-texto mb-3">{proposal.cover_letter}</p>
                        <div className="flex justify-between items-center flex-wrap gap-3 text-sm">
                          <span className="font-semibold text-brand-negro">
                            Presupuesto: ${Number(proposal.proposed_budget).toLocaleString()}
                          </span>
                          <span className="text-brand-gris">
                            {new Date(proposal.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        {proposal.status === 'pendiente' && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleApproveProposal(proposal.id, proposal.job_id, proposal.freelancer_id)}
                              className="tm-btn-verde flex items-center gap-1 text-xs"
                            >
                              <Check size={14} />
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRejectProposal(proposal.id)}
                              className="tm-btn-vino flex items-center gap-1 text-xs"
                            >
                              <X size={14} />
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Panel Administrativo
      </footer>

      {showNewJobForm && (
        <NewJobForm 
          onClose={() => setShowNewJobForm(false)}
          onSuccess={() => {
            setShowNewJobForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}