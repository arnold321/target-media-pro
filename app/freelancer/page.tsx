'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, Upload, CheckCircle, Clock, ArrowLeft, DollarSign, Award, FileText, TrendingUp, XCircle, User, Mail, Phone, Save, Edit3, AlertCircle, CheckCircle2, MessageCircle, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo, Badge } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';
import ChatModal from '@/app/components/ChatModal';

interface AssignedJob {
  id: string;
  title: string;
  category: string;
  budget: number;
  status: string;
  description: string;
  deliverable_url: string | null;
  created_at: string;
  unread_messages?: number;
}

interface Proposal {
  id: string;
  job_id: string;
  cover_letter: string;
  proposed_budget: number;
  status: string;
  created_at: string;
  jobs: {
    title: string;
    category: string;
    budget: number;
    status: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  role: string;
  created_at: string;
}

export default function FreelancerDashboard() {
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'proposals' | 'profile'>('assigned');
  const [stats, setStats] = useState({
    active: 0,
    inReview: 0,
    completed: 0,
    totalEarned: 0,
    pendingProposals: 0,
    approvedProposals: 0,
    rejectedProposals: 0,
  });
  
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    whatsapp_number: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Estados para el Chat
  const [chatJob, setChatJob] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  
  // Estados para búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    fetchAssignedJobs();
    fetchProposals();
    fetchProfile();
  }, []);

  useEffect(() => {
    // Escuchar nuevos mensajes para actualizar el badge en tiempo real
    const handleNewMessage = () => {
      loadJobsWithUnread(currentUserId);
    };
    window.addEventListener('new-chat-message', handleNewMessage);
    
    return () => {
      window.removeEventListener('new-chat-message', handleNewMessage);
    };
  }, [currentUserId]);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) console.error('Error al cargar perfil:', error);
    else {
      setProfile(data);
      setCurrentUserName(data.full_name || 'Freelancer');
      setProfileForm({
        full_name: data.full_name || '',
        whatsapp_number: data.whatsapp_number || '',
      });
    }
  }

  async function loadJobsWithUnread(userIdToUse?: string) {
    const uid = userIdToUse || currentUserId;
    if (!uid) return;

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('assigned_freelancer_id', uid)
      .in('status', ['en_progreso', 'en_revision', 'completado'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar trabajos:', error);
      return;
    }

    // Cargar mensajes no leídos para cada trabajo
    const jobsWithUnread = await Promise.all(
      (data || []).map(async (job) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .eq('read', false)
          .neq('sender_id', uid);
        
        return { ...job, unread_messages: count || 0 };
      })
    );

    setJobs(jobsWithUnread);
    
    const active = (jobsWithUnread || []).filter(j => j.status === 'en_progreso').length;
    const inReview = (jobsWithUnread || []).filter(j => j.status === 'en_revision').length;
    const completed = (jobsWithUnread || []).filter(j => j.status === 'completado').length;
    const totalEarned = (jobsWithUnread || [])
      .filter(j => j.status === 'completado')
      .reduce((sum, j) => sum + Number(j.budget || 0), 0);

    setStats(prev => ({ ...prev, active, inReview, completed, totalEarned }));
  }

  async function fetchAssignedJobs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    setCurrentUserId(user.id);
    await loadJobsWithUnread(user.id);
    setLoading(false);
  }

  async function fetchProposals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          job_id,
          freelancer_id,
          cover_letter,
          proposed_budget,
          delivery_days,
          portfolio_link,
          status,
          deliverable_url,
          created_at,
          jobs:job_id (
            id,
            title,
            category,
            budget,
            status
          )
        `)
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar propuestas:', error);
        return;
      }

      const transformedProposals: Proposal[] = (data || []).map((proposal: any) => ({
        id: proposal.id,
        job_id: proposal.job_id,
        cover_letter: proposal.cover_letter,
        proposed_budget: proposal.proposed_budget,
        status: proposal.status,
        created_at: proposal.created_at,
        jobs: {
          title: proposal.jobs?.title || '',
          category: proposal.jobs?.category || '',
          budget: proposal.jobs?.budget || 0,
          status: proposal.jobs?.status || '',
        },
      }));

      setProposals(transformedProposals);
      
      const pending = transformedProposals.filter(p => p.status === 'pendiente').length;
      const approved = transformedProposals.filter(p => p.status === 'aprobada').length;
      const rejected = transformedProposals.filter(p => p.status === 'rechazada').length;

      setStats(prev => ({ ...prev, pendingProposals: pending, approvedProposals: approved, rejectedProposals: rejected }));
    } catch (error) {
      console.error('Error en fetchProposals:', error);
    }
  }

  async function handleUploadDeliverable(jobId: string, file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingJobId(jobId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${jobId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deliverables')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('proposals')
        .update({ deliverable_url: publicUrl })
        .eq('job_id', jobId)
        .eq('freelancer_id', user.id);

      if (updateError) throw updateError;

      const { error: statusError } = await supabase
        .from('jobs')
        .update({ status: 'en_revision' })
        .eq('id', jobId);

      if (statusError) throw statusError;

      toast.success('Entregable subido exitosamente. El cliente lo revisará pronto.');
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const currentJob = jobs.find(j => j.id === jobId);

      if (profileData && currentJob) {
        await fetch('/api/notify-deliverable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freelancerName: profileData.full_name,
            jobTitle: currentJob.title,
          }),
        });
      }

      await fetchAssignedJobs();
    } catch (error) {
      console.error('Error al subir:', error);
      toast.error('Error al subir el entregable');
    } finally {
      setUploadingJobId(null);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          whatsapp_number: profileForm.whatsapp_number.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Perfil actualizado correctamente');
      setEditingProfile(false);
      fetchProfile();
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  }

  // Filtrar trabajos según búsqueda y estado
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calcular total de mensajes no leídos
  const totalUnreadMessages = jobs.reduce((sum, job) => sum + (job.unread_messages || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
          <p className="mt-4 text-brand-gris">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Panel Freelancer</span>
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

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-negro">Panel de Freelancer</h1>
          <p className="text-brand-gris mt-1">
            {profile?.email} · Gestiona tus proyectos, postulaciones y perfil
          </p>
        </div>

        <div className="bg-white rounded-xl border border-brand-borde shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-brand-borde overflow-x-auto">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${
                activeTab === 'assigned' 
                  ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' 
                  : 'text-brand-gris hover:text-brand-negro'
              }`}
            >
              <Briefcase size={16} className="inline mr-2" />
              Trabajos ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${
                activeTab === 'proposals' 
                  ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' 
                  : 'text-brand-gris hover:text-brand-negro'
              }`}
            >
              <FileText size={16} className="inline mr-2" />
              Postulaciones ({proposals.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${
                activeTab === 'profile' 
                  ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' 
                  : 'text-brand-gris hover:text-brand-negro'
              }`}
            >
              <User size={16} className="inline mr-2" />
              Mi Perfil
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'assigned' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">En Progreso</p>
                        <p className="text-xl font-extrabold text-brand-negro">{stats.active}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">En Revisión</p>
                        <p className="text-xl font-extrabold text-brand-negro">{stats.inReview}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">Completados</p>
                        <p className="text-xl font-extrabold text-brand-negro">{stats.completed}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-rojo/10 p-2 rounded-lg">
                        <DollarSign className="h-5 w-5 text-brand-rojo" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">Ingresos</p>
                        <p className="text-xl font-extrabold text-brand-negro">${stats.totalEarned.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BARRA DE BÚSQUEDA Y FILTROS */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                    <input
                      type="text"
                      placeholder="Buscar por título, categoría o descripción..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="tm-input pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-brand-gris" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="tm-input py-2"
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="en_revision">En Revisión</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>
                </div>

                {/* Contador de resultados */}
                <div className="mb-4 text-sm text-brand-gris">
                  Mostrando {filteredJobs.length} de {jobs.length} trabajos
                  {totalUnreadMessages > 0 && (
                    <span className="ml-3 text-brand-rojo font-semibold">
                      🔔 {totalUnreadMessages} mensaje{totalUnreadMessages !== 1 ? 's' : ''} sin leer
                    </span>
                  )}
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="mx-auto h-16 w-16 text-brand-gris opacity-30" />
                    <h3 className="mt-4 text-xl font-bold text-brand-negro">No tienes trabajos asignados aún</h3>
                    <p className="text-brand-gris mt-2 max-w-md mx-auto">
                      Explora el tablero de trabajos disponibles y postúlate a los proyectos que te interesen.
                    </p>
                    <button
                      onClick={() => router.push('/')}
                      className="tm-btn-rojo mt-6 inline-flex items-center gap-2"
                    >
                      Ver Trabajos Disponibles
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredJobs.map((job) => (
                      <div key={job.id} className="bg-brand-crema/30 rounded-xl border border-brand-borde overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-brand-crema text-brand-vino font-semibold text-xs px-3 py-1 rounded-full">
                                  {job.category}
                                </span>
                                <Badge estado={job.status} />
                              </div>
                              <h2 className="text-xl font-bold text-brand-negro">{job.title}</h2>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-brand-gris mb-1">Presupuesto</p>
                              <p className="text-2xl font-extrabold text-brand-negro">
                                ${Number(job.budget).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <p className="text-brand-texto mb-4 leading-relaxed">{job.description}</p>

                          <div className="flex items-center justify-between pt-4 border-t border-brand-borde flex-wrap gap-3">
                            <div className="text-xs text-brand-gris">
                              Publicado: {new Date(job.created_at).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              {job.status === 'en_progreso' && (
                                <label className="tm-btn-rojo flex items-center gap-2 cursor-pointer">
                                  <Upload size={16} />
                                  {uploadingJobId === job.id ? 'Subiendo...' : 'Subir entregable'}
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleUploadDeliverable(job.id, e.target.files[0]);
                                      }
                                    }}
                                    accept=".pdf,.zip,.rar,.doc,.docx,.jpg,.png"
                                  />
                                </label>
                              )}

                              {job.status === 'en_revision' && (
                                <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-4 py-2 rounded-lg">
                                  <Clock size={16} />
                                  <span className="text-sm font-semibold">Esperando revisión</span>
                                </div>
                              )}

                              {job.status === 'completado' && (
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                                  <CheckCircle size={16} />
                                  <span className="text-sm font-semibold">Completado</span>
                                </div>
                              )}

                              {/* BOTÓN DE CHAT CON BADGE DE MENSAJES NO LEÍDOS */}
                              <button
                                onClick={() => setChatJob(job)}
                                className="tm-btn-outline flex items-center gap-1 text-xs relative"
                              >
                                <MessageCircle size={14} />
                                Chat
                                {job.unread_messages && job.unread_messages > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-brand-rojo text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                    {job.unread_messages}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'proposals' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">Pendientes</p>
                        <p className="text-xl font-extrabold text-brand-negro">{stats.pendingProposals}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">Aprobadas</p>
                        <p className="text-xl font-extrabold text-brand-negro">{stats.approvedProposals}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-brand-crema/50 rounded-lg p-4 border border-brand-borde">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-rojo/10 p-2 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-brand-rojo" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-gris font-semibold">Total Postulaciones</p>
                        <p className="text-xl font-extrabold text-brand-negro">{proposals.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {proposals.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-16 w-16 text-brand-gris opacity-30" />
                    <h3 className="mt-4 text-xl font-bold text-brand-negro">No has enviado postulaciones aún</h3>
                    <p className="text-brand-gris mt-2 max-w-md mx-auto">
                      Explora el tablero de trabajos y postúlate a los proyectos que te interesen.
                    </p>
                    <button
                      onClick={() => router.push('/')}
                      className="tm-btn-rojo mt-6 inline-flex items-center gap-2"
                    >
                      Ver Trabajos Disponibles
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="bg-brand-crema/30 rounded-lg border border-brand-borde p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-brand-negro">{proposal.jobs.title}</h3>
                            <p className="text-sm text-brand-gris">{proposal.jobs.category}</p>
                          </div>
                          <Badge estado={proposal.status} />
                        </div>
                        
                        <div className="bg-white/50 rounded-lg p-3 mb-3">
                          <p className="text-sm text-brand-texto line-clamp-2">{proposal.cover_letter}</p>
                        </div>
                        
                        <div className="flex justify-between items-center flex-wrap gap-3 text-sm">
                          <div className="flex gap-4">
                            <span className="font-semibold text-brand-negro">
                              Ofertado: ${Number(proposal.proposed_budget).toLocaleString()}
                            </span>
                            <span className="text-brand-gris">
                              Presupuesto cliente: ${Number(proposal.jobs.budget).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-xs text-brand-gris">
                            {new Date(proposal.created_at).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>

                        {proposal.status === 'rechazada' && (
                          <div className="mt-3 flex items-center gap-2 text-brand-rojo text-sm">
                            <XCircle size={14} />
                            <span>Esta propuesta no fue seleccionada</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'profile' && profile && (
              <>
                <div className="bg-gradient-to-br from-brand-negro to-gray-800 rounded-xl p-6 mb-6 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-brand-rojo rounded-full w-16 h-16 flex items-center justify-center text-2xl font-extrabold">
                      {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold">{profile.full_name || 'Sin nombre'}</h2>
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <Mail size={14} />
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Propuestas</p>
                      <p className="text-2xl font-extrabold">{proposals.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Aprobadas</p>
                      <p className="text-2xl font-extrabold text-green-400">{stats.approvedProposals}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Completados</p>
                      <p className="text-2xl font-extrabold text-green-400">{stats.completed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Ingresos</p>
                      <p className="text-2xl font-extrabold text-brand-rojo">${stats.totalEarned.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-crema/30 rounded-xl border border-brand-borde p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-brand-negro">Información Personal</h3>
                      <p className="text-sm text-brand-gris mt-1">Actualiza tus datos de contacto</p>
                    </div>
                    {!editingProfile && (
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="tm-btn-outline flex items-center gap-2"
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>
                    )}
                  </div>

                  {!editingProfile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-brand-gris uppercase tracking-wide">Nombre completo</label>
                        <p className="text-brand-negro font-medium mt-1">{profile.full_name || 'No especificado'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-brand-gris uppercase tracking-wide">Correo electrónico</label>
                        <p className="text-brand-negro font-medium mt-1 flex items-center gap-2">
                          <Mail size={14} className="text-brand-gris" />
                          {profile.email}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-brand-gris uppercase tracking-wide">WhatsApp</label>
                        <p className="text-brand-negro font-medium mt-1 flex items-center gap-2">
                          <Phone size={14} className="text-brand-gris" />
                          {profile.whatsapp_number || 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-brand-gris uppercase tracking-wide">Miembro desde</label>
                        <p className="text-brand-negro font-medium mt-1">
                          {new Date(profile.created_at).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brand-negro mb-2">
                          Nombre completo *
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                          <input
                            type="text"
                            required
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                            className="tm-input pl-10"
                            placeholder="Tu nombre completo"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-negro mb-2">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                          <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="tm-input pl-10 bg-gray-100 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-brand-gris mt-1">El correo no se puede cambiar</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-negro mb-2">
                          Número de WhatsApp
                        </label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                          <input
                            type="tel"
                            value={profileForm.whatsapp_number}
                            onChange={(e) => setProfileForm({ ...profileForm, whatsapp_number: e.target.value })}
                            className="tm-input pl-10"
                            placeholder="Ej: +58 412 1234567"
                          />
                        </div>
                        <p className="text-xs text-brand-gris mt-1">Opcional · Para contacto directo con clientes</p>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-brand-borde">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfile(false);
                            setProfileForm({
                              full_name: profile.full_name || '',
                              whatsapp_number: profile.whatsapp_number || '',
                            });
                          }}
                          className="flex-1 tm-btn-outline"
                          disabled={savingProfile}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="flex-1 tm-btn-rojo flex items-center justify-center gap-2"
                        >
                          {savingProfile ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              Guardar Cambios
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Panel Freelancer
      </footer>

      {chatJob && (
        <ChatModal
          job={chatJob}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserRole="freelancer"
          onClose={() => {
            setChatJob(null);
            loadJobsWithUnread(currentUserId);
          }}
        />
      )}
    </div>
  );
}