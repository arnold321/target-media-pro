'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Briefcase, Users, DollarSign, Clock, Plus, ArrowLeft, Check, X, Eye, Trash2, Star, TrendingUp, PieChart as PieChartIcon, BarChart3, MessageCircle, AlertTriangle, RotateCcw, Search, Filter, Shield, ShieldAlert, ChevronLeft, ChevronRight, FolderOpen, CreditCard } from 'lucide-react';
import { Logo, Badge } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';
import NewJobForm from '@/app/admin/NewJobForm';
import ReviewModal from '@/app/components/ReviewModal';
import ChatModal from '@/app/components/ChatModal';
import NotificationBell from '@/app/components/NotificationBell';
import ThemeToggle from '@/app/components/ThemeToggle';
import { createNotification } from '@/lib/notifications';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  created_at: string;
  assigned_freelancer_id: string | null;
  rating?: number | null;
  review_text?: string | null;
  unread_messages?: number;
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

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const COLORS = ['#D9374A', '#6E1423', '#F4E4D6', '#1F2937', '#9CA3AF'];
const ITEMS_PER_PAGE = 20;

export default function AdminPanel() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    openJobs: 0,
    totalProposals: 0,
    pendingProposals: 0,
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'proposals' | 'stats' | 'users'>('jobs');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  
  const [reviewJob, setReviewJob] = useState<any>(null);
  const [chatJob, setChatJob] = useState<any>(null);
  
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalFilteredJobs, setTotalFilteredJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    checkAdminAndLoadData();
    
    const handleNewMessage = () => {
      loadData(currentUserId);
    };
    window.addEventListener('new-chat-message', handleNewMessage);
    
    return () => {
      window.removeEventListener('new-chat-message', handleNewMessage);
    };
  }, [currentUserId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (activeTab === 'jobs' && !selectedJob && currentUserId) {
      loadData(currentUserId);
    }
  }, [currentPage, activeTab, selectedJob, searchQuery, statusFilter]);

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      toast.error('No tienes permisos de administrador');
      router.push('/');
      return;
    }

    setCurrentUserId(user.id);
    setCurrentUserName(profile?.full_name || 'Administrador');
    setCurrentUserRole('admin');

    await loadData(user.id);
    await fetchUsers();
    setLoading(false);
  }

  async function loadData(userIdToUse?: string) {
    const uid = userIdToUse || currentUserId;

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

    let query = supabase.from('jobs').select('*', { count: 'exact' });

    if (statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data: jobsData, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    setTotalFilteredJobs(count || 0);
    setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

    const jobsWithUnread = await Promise.all(
      (jobsData || []).map(async (job) => {
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

    const { data: proposalsData } = await supabase
      .from('proposals')
      .select(`*, profiles (full_name, email, whatsapp_number), jobs (title, category, budget, status)`)
      .order('created_at', { ascending: false });
    setProposals(proposalsData || []);
  }

  async function fetchUsers() {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setUsers(data || []);
    }
    setLoadingUsers(false);
  }

  async function handleUpdateRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'freelancer' : 'admin';
    
    const confirmMsg = newRole === 'admin'
      ? '⚠️ ¿Estás seguro de promover a este usuario a ADMINISTRADOR?\n\nTendrá acceso total al panel de control, podrá aprobar trabajos, ver ingresos y gestionar la plataforma.'
      : '¿Quitar privilegios de administrador a este usuario?\n\nVolverá a tener rol de Freelancer/Trabajador.';

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Rol actualizado exitosamente a: ${newRole === 'admin' ? 'Administrador' : 'Freelancer'}`);
      fetchUsers();
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      toast.error('Error al actualizar el rol del usuario');
    }
  }

  async function handleApproveProposal(proposalId: string, jobId: string, freelancerId: string) {
    if (!confirm('¿Aprobar esta propuesta? El trabajo pasará a estado "En progreso".')) return;
    
    try {
      const job = jobs.find(j => j.id === jobId);
      
      console.log('🔄 Aprobando propuesta:', proposalId);
      
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .update({ status: 'aprobada' })
        .eq('id', proposalId)
        .select();

      if (proposalError) throw proposalError;

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .update({ 
          status: 'en_progreso', 
          assigned_freelancer_id: freelancerId 
        })
        .eq('id', jobId)
        .select();

      if (jobError) throw jobError;

      toast.success('Propuesta aprobada exitosamente');
      
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { ...p, status: 'aprobada' } : p
      ));
      
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'en_progreso', assigned_freelancer_id: freelancerId } : j
      ));
      
      await loadData(currentUserId);
      
      if (freelancerId && job) {
        await createNotification(
          freelancerId,
          'proposal_approved',
          '¡Propuesta aprobada!',
          `Tu propuesta para "${job.title}" ha sido aprobada.`,
          jobId,
          'job'
        );
      }
      
    } catch (error) {
      console.error('💥 Error en handleApproveProposal:', error);
      toast.error('Error al aprobar la propuesta');
    }
  }

  async function handleRejectProposal(proposalId: string) {
    if (!confirm('¿Rechazar esta propuesta?')) return;
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      await supabase.from('proposals').update({ status: 'rechazada' }).eq('id', proposalId);
      toast.success('Propuesta rechazada');
      
      if (proposal) {
        await createNotification(
          proposal.freelancer_id,
          'proposal_rejected',
          'Propuesta rechazada',
          `Tu propuesta para "${proposal.jobs.title}" no fue seleccionada.`,
          proposal.job_id,
          'job'
        );
      }
      
      await loadData(currentUserId);
    } catch (error) {
      toast.error('Error al rechazar la propuesta');
    }
  }

  async function handleAnularAsignacion(jobId: string) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (!confirm(`¿ANULAR la asignación del trabajo "${job.title}"?\n\nEl trabajo volverá a "Abierto" y la propuesta se marcará como "Anulada".`)) return;

    try {
      await supabase.from('jobs').update({ status: 'abierto', assigned_freelancer_id: null }).eq('id', jobId);
      await supabase.from('proposals').update({ status: 'anulada' }).eq('job_id', jobId).eq('status', 'aprobada');
      toast.success('Asignación anulada. El trabajo se republicó.');
      await loadData(currentUserId);
    } catch (error) {
      toast.error('Error al anular la asignación');
    }
  }

  async function handleJobStatusChange(jobId: string, newStatus: string) {
    try {
      await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
      toast.success(`Estado actualizado a: ${newStatus}`);
      await loadData(currentUserId);
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  }

  async function handleDeleteJob(jobId: string) {
    if (!confirm('¿Eliminar este trabajo? Esta acción no se puede deshacer.')) return;
    try {
      await supabase.from('jobs').delete().eq('id', jobId);
      toast.success('Trabajo eliminado');
      await loadData(currentUserId);
    } catch (error) {
      toast.error('Error al eliminar el trabajo');
    }
  }

  const jobProposals = selectedJob ? proposals.filter(p => p.job_id === selectedJob) : proposals;

  const completedJobs = jobs.filter(j => j.status === 'completado');
  const totalRevenue = completedJobs.reduce((sum, j) => sum + (Number(j.budget) || 0), 0);
  const approvedProposalsCount = proposals.filter(p => p.status === 'aprobada').length;
  const approvalRate = proposals.length > 0 ? Math.round((approvedProposalsCount / proposals.length) * 100) : 0;

  const jobsByMonthMap = completedJobs.reduce((acc, job) => {
    const monthYear = new Date(job.created_at).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    acc[monthYear] = (acc[monthYear] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const chartJobsByMonth = Object.entries(jobsByMonthMap).map(([name, trabajos]) => ({ name, trabajos })).slice(-6);

  const budgetByCategoryMap = completedJobs.reduce((acc, job) => {
    const cat = job.category || 'Sin categoría';
    acc[cat] = (acc[cat] || 0) + (Number(job.budget) || 0);
    return acc;
  }, {} as Record<string, number>);
  const chartBudgetByCategory = Object.entries(budgetByCategoryMap).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      {/* ✅ HEADER CON BOTÓN DE NOTICIAS AGREGADO */}
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Panel de Administración</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell userId={currentUserId} />
            <ThemeToggle />
            
            {/* ✅ NUEVO: Botón de Noticias */}
            <button 
              onClick={() => router.push('/admin/news')} 
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              title="Gestionar Noticias"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
              <span className="hidden sm:inline">Noticias</span>
            </button>
            
            <button 
              onClick={() => router.push('/admin/categories')} 
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              title="Gestionar Categorías"
            >
              <FolderOpen size={18} /> 
              <span className="hidden sm:inline">Categorías</span>
            </button>
            
            <button
              onClick={() => router.push('/admin/payments')}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              title="Gestión de Pagos"
            >
              <CreditCard size={18} />
              <span className="hidden sm:inline">Pagos</span>
            </button>
            
            <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Volver al inicio
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-negro">Gestión y Estadísticas</h1>
            <p className="text-brand-gris mt-1">Administra oportunidades, usuarios y analiza el rendimiento.</p>
          </div>
          <button onClick={() => setShowNewJobForm(true)} className="tm-btn-rojo inline-flex items-center gap-2">
            <Plus size={18} /> Publicar Nuevo Trabajo
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-brand-crema p-3 rounded-lg"><Briefcase className="h-6 w-6 text-brand-vino" /></div>
              <div><p className="text-xs text-brand-gris uppercase font-semibold">Total Trabajos</p><p className="text-2xl font-extrabold text-brand-negro">{stats.totalJobs}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-3 rounded-lg"><DollarSign className="h-6 w-6 text-green-600" /></div>
              <div><p className="text-xs text-brand-gris uppercase font-semibold">Ingresos (Completados)</p><p className="text-2xl font-extrabold text-brand-negro">${totalRevenue.toLocaleString()}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div>
              <div><p className="text-xs text-brand-gris uppercase font-semibold">Tasa de Aprobación</p><p className="text-2xl font-extrabold text-brand-negro">{approvalRate}%</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-brand-borde shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-50 p-3 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div>
              <div><p className="text-xs text-brand-gris uppercase font-semibold">Propuestas Pendientes</p><p className="text-2xl font-extrabold text-brand-negro">{stats.pendingProposals}</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-brand-borde shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-brand-borde overflow-x-auto">
            <button onClick={() => setActiveTab('stats')} className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' : 'text-brand-gris hover:text-brand-negro'}`}>
              <span className="flex items-center justify-center gap-2"><BarChart3 size={16} /> Estadísticas</span>
            </button>
            <button onClick={() => setActiveTab('jobs')} className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'jobs' ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' : 'text-brand-gris hover:text-brand-negro'}`}>
              <span className="flex items-center justify-center gap-2"><Briefcase size={16} /> Trabajos ({stats.totalJobs})</span>
            </button>
            <button onClick={() => setActiveTab('proposals')} className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'proposals' ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' : 'text-brand-gris hover:text-brand-negro'}`}>
              <span className="flex items-center justify-center gap-2"><Users size={16} /> Propuestas ({proposals.length})</span>
            </button>
            <button onClick={() => setActiveTab('users')} className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-brand-negro border-b-2 border-brand-rojo bg-brand-crema/30' : 'text-brand-gris hover:text-brand-negro'}`}>
              <span className="flex items-center justify-center gap-2"><Shield size={16} /> Usuarios ({users.length})</span>
            </button>
          </div>

          <div className="p-6">
            {/* PESTAÑA ESTADÍSTICAS */}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-brand-crema/30 rounded-xl p-6 border border-brand-borde">
                    <h3 className="text-lg font-bold text-brand-negro mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-brand-rojo" /> Trabajos Completados por Mes</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartJobsByMonth}><CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" /><XAxis dataKey="name" stroke="#6B7280" fontSize={12} /><YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} /><Tooltip /><Bar dataKey="trabajos" fill="#D9374A" radius={[4, 4, 0, 0]} /></BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-brand-crema/30 rounded-xl p-6 border border-brand-borde">
                    <h3 className="text-lg font-bold text-brand-negro mb-4 flex items-center gap-2"><PieChartIcon size={20} className="text-brand-vino" /> Distribución de Ingresos</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={chartBudgetByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{chartBudgetByCategory.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => `$${Number(value || 0).toLocaleString()}`} /></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                      {chartBudgetByCategory.map((entry, index) => (<div key={entry.name} className="flex items-center gap-1.5 text-xs text-brand-gris"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>{entry.name}</div>))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA TRABAJOS */}
            {activeTab === 'jobs' && (
              <div>
                {selectedJob ? (
                  <div>
                    <button onClick={() => setSelectedJob(null)} className="tm-link mb-4 flex items-center gap-1"><ArrowLeft size={14} /> Volver</button>
                    <h3 className="text-xl font-bold text-brand-negro mb-4">Propuestas para: {jobs.find(j => j.id === selectedJob)?.title}</h3>
                    <div className="space-y-4">
                      {jobProposals.map(proposal => (
                        <div key={proposal.id} className="border border-brand-borde rounded-lg p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div><h4 className="font-bold text-brand-negro">{proposal.profiles.full_name}</h4><p className="text-sm text-brand-gris">{proposal.profiles.email}</p></div>
                            <Badge estado={proposal.status} />
                          </div>
                          <p className="text-sm text-brand-texto mb-3">{proposal.cover_letter}</p>
                          {proposal.status === 'pendiente' && (
                            <div className="flex gap-2 mt-4">
                              <button onClick={() => handleApproveProposal(proposal.id, proposal.job_id, proposal.freelancer_id)} className="tm-btn-verde flex items-center gap-1 text-xs"><Check size={14} /> Aprobar</button>
                              <button onClick={() => handleRejectProposal(proposal.id)} className="tm-btn-vino flex items-center gap-1 text-xs"><X size={14} /> Rechazar</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                        <input type="text" placeholder="Buscar trabajo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="tm-input pl-10" />
                      </div>
                      <select 
                        value={statusFilter} 
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }} 
                        className="tm-input py-2"
                      >
                        <option value="todos">Todos los estados</option>
                        <option value="abierto">Abierto</option>
                        <option value="en_progreso">En Progreso</option>
                        <option value="en_revision">En Revisión</option>
                        <option value="completado">Completado</option>
                      </select>
                    </div>
                    
                    <div className="mb-4 flex justify-between items-center flex-wrap gap-2 text-sm text-brand-gris">
                      <span>
                        Mostrando {jobs.length} de {totalFilteredJobs} trabajos
                        {totalFilteredJobs > 0 && <span className="ml-2 text-brand-negro font-semibold">(Página {currentPage} de {totalPages})</span>}
                      </span>
                      {jobs.reduce((sum, job) => sum + (job.unread_messages || 0), 0) > 0 && (
                        <span className="text-brand-rojo font-semibold">
                          🔔 {jobs.reduce((sum, job) => sum + (job.unread_messages || 0), 0)} mensajes sin leer
                        </span>
                      )}
                    </div>

                    {jobs.length === 0 ? (
                      <p className="text-brand-gris text-center py-8">
                        {searchQuery || statusFilter !== 'todos' 
                          ? 'No se encontraron trabajos con los filtros aplicados' 
                          : 'No hay trabajos creados aún'}
                      </p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {jobs.map(job => {
                            const jobProposalCount = proposals.filter(p => p.job_id === job.id).length;
                            return (
                              <div key={job.id} className="border border-brand-borde rounded-lg p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                  <div className="flex-1"><h3 className="font-bold text-brand-negro text-lg">{job.title}</h3><p className="text-sm text-brand-gris">{job.category}</p></div>
                                  <Badge estado={job.status} />
                                </div>
                                <p className="text-sm text-brand-texto mb-3 line-clamp-2">{job.description}</p>
                                <div className="flex justify-between items-center flex-wrap gap-3">
                                  <span className="font-semibold text-brand-negro">Presupuesto: ${Number(job.budget).toLocaleString()}</span>
                                  <div className="flex gap-2 flex-wrap">
                                    {jobProposalCount > 0 && <button onClick={() => { setSelectedJob(job.id); }} className="tm-btn-outline flex items-center gap-1 text-xs"><Eye size={14} /> Ver Propuestas</button>}
                                    <select value={job.status} onChange={(e) => handleJobStatusChange(job.id, e.target.value)} className="tm-input text-xs py-1.5" style={{ width: 'auto' }}>
                                      <option value="abierto">Abierto</option>
                                      <option value="en_progreso">En Progreso</option>
                                      <option value="en_revision">En Revisión</option>
                                      <option value="completado">Completado</option>
                                    </select>
                                    <button onClick={() => handleDeleteJob(job.id)} className="text-brand-rojo hover:text-brand-rojo-hover p-2"><Trash2 size={16} /></button>
                                    {job.status === 'completado' && <button onClick={() => setReviewJob(job)} className="tm-btn-outline flex items-center gap-1 text-xs"><Star size={14} /> Reseña</button>}
                                    {(job.status === 'en_progreso' || job.status === 'en_revision') && <button onClick={() => handleAnularAsignacion(job.id)} className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold"><RotateCcw size={14} /> Anular</button>}
                                    {(job.status === 'en_progreso' || job.status === 'en_revision' || job.status === 'completado') && (
                                      <button onClick={() => setChatJob(job)} className="tm-btn-outline flex items-center gap-1 text-xs relative">
                                        <MessageCircle size={14} /> Chat
                                        {job.unread_messages && job.unread_messages > 0 && <span className="absolute -top-2 -right-2 bg-brand-rojo text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">{job.unread_messages}</span>}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {totalPages > 1 && (
                          <div className="mt-8 flex justify-center items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="tm-btn-outline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft size={16} />
                              Anterior
                            </button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition-colors ${
                                      currentPage === pageNum
                                        ? 'bg-brand-rojo text-white'
                                        : 'bg-white text-brand-negro border border-brand-borde hover:bg-brand-crema'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="tm-btn-outline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Siguiente
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA PROPUESTAS */}
            {activeTab === 'proposals' && (
              <div className="space-y-4">
                {(() => {
                  const pendingProposals = proposals.filter(p => p.status?.toLowerCase().trim() === 'pendiente');
                  
                  if (pendingProposals.length === 0) {
                    return (
                      <div className="text-center py-12 bg-brand-crema/30 rounded-xl border border-brand-borde">
                        <p className="text-brand-gris">No hay propuestas pendientes</p>
                      </div>
                    );
                  }

                  return pendingProposals.map(proposal => (
                    <div key={proposal.id} className="border border-brand-borde rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                        <div>
                          <h4 className="font-bold text-brand-negro">{proposal.profiles.full_name}</h4>
                          <p className="text-xs text-brand-vino font-semibold mt-1">Trabajo: {proposal.jobs.title}</p>
                          <p className="text-xs text-brand-gris mt-1">Estado en BD: <strong className="text-brand-rojo">{proposal.status}</strong></p>
                        </div>
                        <Badge estado={proposal.status} />
                      </div>
                      <p className="text-sm text-brand-texto mb-3">{proposal.cover_letter}</p>
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => handleApproveProposal(proposal.id, proposal.job_id, proposal.freelancer_id)} 
                          className="tm-btn-verde flex items-center gap-1 text-xs"
                        >
                          <Check size={14} /> Aprobar
                        </button>
                        <button 
                          onClick={() => handleRejectProposal(proposal.id)} 
                          className="tm-btn-vino flex items-center gap-1 text-xs"
                        >
                          <X size={14} /> Rechazar
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* PESTAÑA USUARIOS */}
            {activeTab === 'users' && (
              <div>
                {loadingUsers ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-rojo"></div></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-brand-gris uppercase bg-brand-crema/50">
                        <tr>
                          <th className="px-6 py-3 rounded-tl-lg">Nombre</th>
                          <th className="px-6 py-3">Correo Electrónico</th>
                          <th className="px-6 py-3">Rol Actual</th>
                          <th className="px-6 py-3">Fecha de Registro</th>
                          <th className="px-6 py-3 rounded-tr-lg text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-borde">
                        {users.map((user) => (
                          <tr key={user.id} className="bg-white hover:bg-brand-crema/20 transition-colors">
                            <td className="px-6 py-4 font-medium text-brand-negro">{user.full_name || 'Sin nombre'}</td>
                            <td className="px-6 py-4 text-brand-gris">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'admin' ? 'bg-brand-rojo/10 text-brand-rojo' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {user.role === 'admin' ? 'Administrador' : 'Freelancer / Trabajador'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-brand-gris">
                              {new Date(user.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleUpdateRole(user.id, user.role)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  user.role === 'admin'
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-brand-negro text-white hover:bg-gray-800'
                                }`}
                              >
                                {user.role === 'admin' ? (
                                  <><ShieldAlert size={14} /> Quitar Admin</>
                                ) : (
                                  <><Shield size={14} /> Promover a Admin</>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {users.length === 0 && (
                      <p className="text-center text-brand-gris py-8">No hay usuarios registrados aún.</p>
                    )}
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

      {showNewJobForm && <NewJobForm onClose={() => setShowNewJobForm(false)} onSuccess={() => { setShowNewJobForm(false); loadData(currentUserId); }} />}
      {reviewJob && <ReviewModal job={reviewJob} onClose={() => setReviewJob(null)} onSuccess={() => { setReviewJob(null); loadData(currentUserId); }} />}
      {chatJob && <ChatModal job={chatJob} currentUserId={currentUserId} currentUserName={currentUserName} currentUserRole={currentUserRole} onClose={() => { setChatJob(null); loadData(currentUserId); }} />}
    </div>
  );
}