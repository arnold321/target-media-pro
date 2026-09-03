'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, DollarSign, Clock, Briefcase, Share2, Search, Filter, X, TrendingUp, TrendingDown, Sparkles, LayoutGrid, List, Users, Star, Zap } from 'lucide-react';
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
  entregables?: string;
  is_featured?: boolean; // Soporte para trabajos destacados
}

interface JobBoardProps {
  userId: string;
  userRole: string | null;
}

type SortOption = 'recent' | 'budget_high' | 'budget_low';
type DateFilter = 'all' | '7days' | '30days';
type ViewMode = 'grid' | 'list';

export default function JobBoard({ userId, userRole }: JobBoardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteJobs, setFavoriteJobs] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [applyForm, setApplyForm] = useState({
    cover_letter: '',
    proposed_budget: '',
  });
  const [applying, setApplying] = useState(false);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Nuevos estados para mejoras
  const [proposalsCount, setProposalsCount] = useState<Record<string, number>>({});
  const [budgetRange, setBudgetRange] = useState({ min: 0, max: 10000 });
  
  const toast = useToast();

  useEffect(() => {
    loadJobs();
    if (userRole === 'freelancer') {
      loadFavorites();
    }
  }, [userRole]);

  // Cargar contador de propuestas cuando cambian los trabajos
  useEffect(() => {
    if (jobs.length > 0) {
      loadProposalsCount();
      calculateBudgetRange();
    }
  }, [jobs]);

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

  async function loadProposalsCount() {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      const { count } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', job.id);
      counts[job.id] = count || 0;
    }
    setProposalsCount(counts);
  }

  function calculateBudgetRange() {
    const budgets = jobs.map(j => j.budget);
    const min = Math.floor(Math.min(...budgets, 0) / 100) * 100;
    const max = Math.ceil(Math.max(...budgets, 1000) / 100) * 100;
    setBudgetRange({ min, max });
    if (!minBudget) setMinBudget(min.toString());
    if (!maxBudget) setMaxBudget(max.toString());
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
    const shareUrl = `${window.location.origin}/trabajo/${job.id}`;
    const shareText = `¡Hola! Vi esta oferta de trabajo y pensé en ti:\n\n🚀 *${job.title}*\n💰 Presupuesto: $${Number(job.budget).toLocaleString()}\n🏷️ Categoría: ${job.category}\n\nMira los detalles y postúlate aquí:`;

    try {
      if (navigator.share) {
        await navigator.share({ title: `Oferta: ${job.title}`, text: shareText, url: shareUrl });
        toast.success('¡Oferta compartida exitosamente!');
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success('Enlace copiado. ¡Pégalo (Ctrl+V) en WhatsApp o redes!');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error al compartir:', error);
        toast.error('No se pudo compartir la oferta');
      }
    }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob) return;

    setApplying(true);
    try {
      const { error } = await supabase
        .from('proposals')
        .insert({
          job_id: selectedJob.id,
          freelancer_id: userId,
          cover_letter: applyForm.cover_letter.trim(),
          proposed_budget: parseFloat(applyForm.proposed_budget),
          status: 'pendiente',
        });

      if (error) throw error;

      toast.success('¡Propuesta enviada exitosamente! El admin la revisará pronto.');
      setShowApplyModal(false);
      setSelectedJob(null);
      setApplyForm({ cover_letter: '', proposed_budget: '' });
      loadProposalsCount(); // Actualizar contador
    } catch (error) {
      console.error('Error al enviar propuesta:', error);
      toast.error('Error al enviar la propuesta');
    } finally {
      setApplying(false);
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setSelectedCategory('');
    setMinBudget(budgetRange.min.toString());
    setMaxBudget(budgetRange.max.toString());
    setDateFilter('all');
    setSortBy('recent');
    toast.success('Filtros limpiados');
  }

  const categories = useMemo(() => {
    const cats = new Set(jobs.map(job => job.category));
    return Array.from(cats).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.category.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      result = result.filter(job => job.category === selectedCategory);
    }

    if (minBudget) {
      result = result.filter(job => job.budget >= parseFloat(minBudget));
    }

    if (maxBudget) {
      result = result.filter(job => job.budget <= parseFloat(maxBudget));
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const days = dateFilter === '7days' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter(job => new Date(job.created_at) >= cutoffDate);
    }

    // Ordenamiento inteligente: Destacados primero, luego según criterio
    result.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      
      if (sortBy === 'budget_high') return b.budget - a.budget;
      if (sortBy === 'budget_low') return a.budget - b.budget;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [jobs, searchQuery, selectedCategory, minBudget, maxBudget, dateFilter, sortBy]);

  const hasActiveFilters = searchQuery || selectedCategory || minBudget !== budgetRange.min.toString() || maxBudget !== budgetRange.max.toString() || dateFilter !== 'all' || sortBy !== 'recent';

  const isNewJob = (createdAt: string) => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return new Date(createdAt) >= threeDaysAgo;
  };

  const isHighBudget = (budget: number) => budget >= 2000;

  const getProposalsLevel = (count: number) => {
    if (count === 0) return { label: 'Sin propuestas aún', color: 'text-green-700 bg-green-50 border-green-100' };
    if (count < 5) return { label: `${count} propuestas`, color: 'text-blue-700 bg-blue-50 border-blue-100' };
    if (count < 10) return { label: `${count} propuestas`, color: 'text-yellow-700 bg-yellow-50 border-yellow-100' };
    return { label: `${count} propuestas (Alta competencia)`, color: 'text-red-700 bg-red-50 border-red-100' };
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-brand-borde p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3"></div>
      <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-5/6 bg-gray-200 rounded mb-4"></div>
      <div className="border-t border-gray-100 pt-4 flex justify-between">
        <div className="h-5 w-24 bg-gray-200 rounded"></div>
        <div className="h-5 w-20 bg-gray-200 rounded"></div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-10 w-1/2 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-1/2 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header con búsqueda y filtros */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-brand-negro flex items-center gap-2">
              <Briefcase className="text-brand-rojo" size={28} />
              Trabajos Disponibles
            </h2>
            <p className="text-sm text-brand-gris mt-1">
              Explora <span className="font-bold text-brand-negro">{filteredJobs.length}</span> oportunidades activas
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white border border-brand-borde text-brand-negro hover:bg-brand-crema transition-all shadow-sm"
              title="Cambiar vista"
            >
              {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
              {viewMode === 'grid' ? 'Lista' : 'Grid'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                hasActiveFilters
                  ? 'bg-brand-rojo text-white shadow-brand-rojo/20'
                  : 'bg-white border border-brand-borde text-brand-negro hover:bg-brand-crema'
              }`}
            >
              <Filter size={16} />
              Filtros
              {hasActiveFilters && (
                <span className="bg-white text-brand-rojo text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {[searchQuery, selectedCategory, minBudget !== budgetRange.min.toString(), maxBudget !== budgetRange.max.toString(), dateFilter !== 'all', sortBy !== 'recent'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gris group-focus-within:text-brand-rojo transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, descripción o categoría..."
            className="tm-input pl-12 w-full py-3 text-base transition-all focus:ring-2 focus:ring-brand-rojo/20"
          />
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-brand-borde p-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-brand-negro text-lg">Filtros Avanzados</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-brand-rojo hover:text-brand-rojo-hover flex items-center gap-1 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X size={14} />
                  Limpiar todo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-brand-gris uppercase mb-2 tracking-wide">Categoría</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="tm-input w-full">
                  <option value="">Todas las categorías</option>
                  {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-gris uppercase mb-2 tracking-wide">Presupuesto Mínimo</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                  <input type="number" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} placeholder="0" min="0" className="tm-input pl-10 w-full" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-gris uppercase mb-2 tracking-wide">Presupuesto Máximo</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                  <input type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} placeholder="Sin límite" min="0" className="tm-input pl-10 w-full" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-gris uppercase mb-2 tracking-wide">Publicado</label>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="tm-input w-full">
                  <option value="all">Cualquier fecha</option>
                  <option value="7days">Últimos 7 días</option>
                  <option value="30days">Últimos 30 días</option>
                </select>
              </div>
            </div>

            {/* Sliders de Presupuesto */}
            <div className="mb-6 bg-brand-crema/30 rounded-xl p-4 border border-brand-borde">
              <label className="block text-xs font-bold text-brand-gris uppercase mb-4 tracking-wide">
                Rango de Presupuesto: <span className="text-brand-negro">${Number(minBudget || 0).toLocaleString()} - ${Number(maxBudget || 0).toLocaleString()}</span>
              </label>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-brand-gris w-12">Mín</span>
                  <input
                    type="range" min={budgetRange.min} max={budgetRange.max} step={50}
                    value={minBudget || budgetRange.min}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-rojo"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-brand-gris w-12">Máx</span>
                  <input
                    type="range" min={budgetRange.min} max={budgetRange.max} step={50}
                    value={maxBudget || budgetRange.max}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-rojo"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-gris uppercase mb-3 tracking-wide">Ordenar por</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSortBy('recent')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${sortBy === 'recent' ? 'bg-brand-negro text-white shadow-md' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'}`}>
                  <Clock size={14} /> Más Recientes
                </button>
                <button onClick={() => setSortBy('budget_high')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${sortBy === 'budget_high' ? 'bg-brand-negro text-white shadow-md' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'}`}>
                  <TrendingUp size={14} /> Mayor Presupuesto
                </button>
                <button onClick={() => setSortBy('budget_low')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${sortBy === 'budget_low' ? 'bg-brand-negro text-white shadow-md' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'}`}>
                  <TrendingDown size={14} /> Menor Presupuesto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid/Lista de trabajos */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-brand-borde border-dashed">
          <div className="bg-brand-crema/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-10 w-10 text-brand-gris opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-brand-negro mb-2">
            {hasActiveFilters ? 'No se encontraron resultados' : 'No hay trabajos disponibles'}
          </h3>
          <p className="text-brand-gris max-w-md mx-auto mb-6">
            {hasActiveFilters ? 'Intenta ajustar o limpiar los filtros para ver más oportunidades.' : 'Vuelve pronto, estamos agregando nuevas oportunidades constantemente.'}
          </p>
          {hasActiveFilters && <button onClick={clearFilters} className="tm-btn-rojo">Limpiar todos los filtros</button>}
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredJobs.map((job, index) => {
            const isNew = isNewJob(job.created_at);
            const highBudget = isHighBudget(job.budget);
            const proposalsInfo = getProposalsLevel(proposalsCount[job.id] || 0);
            
            return (
              <div 
                key={job.id} 
                className={`group bg-white rounded-2xl border p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex relative animate-in fade-in slide-in-from-bottom-4 ${
                  job.is_featured 
                    ? 'border-yellow-400 shadow-lg shadow-yellow-100' 
                    : highBudget 
                      ? 'border-green-300 shadow-md shadow-green-50' 
                      : 'border-brand-borde hover:border-brand-rojo/30'
                } ${viewMode === 'list' ? 'flex-row items-start gap-6' : 'flex-col'}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Badge Premium */}
                {job.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold uppercase px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-10 tracking-wider">
                    <Star size={10} fill="currentColor" />
                    Trabajo Destacado
                  </div>
                )}

                {userRole === 'freelancer' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(job.id); }}
                    className={`absolute top-4 right-4 p-2 rounded-full transition-all z-10 ${
                      favoriteJobs.includes(job.id)
                        ? 'text-brand-rojo bg-brand-rojo/10 scale-110'
                        : 'text-brand-gris hover:text-brand-rojo hover:bg-brand-rojo/5 opacity-0 group-hover:opacity-100'
                    }`}
                    title={favoriteJobs.includes(job.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  >
                    <Heart size={18} fill={favoriteJobs.includes(job.id) ? 'currentColor' : 'none'} />
                  </button>
                )}

                <div className={`flex flex-col ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex flex-wrap gap-2">
                      {isNew && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                          <Zap size={10} /> Nuevo
                        </span>
                      )}
                      {highBudget && !job.is_featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                          <DollarSign size={10} /> Alto Presupuesto
                        </span>
                      )}
                      <Badge estado={job.status} />
                    </div>
                  </div>
                  
                  <span className="text-xs font-bold text-brand-vino bg-brand-crema/50 px-3 py-1 rounded-full w-fit mb-3 border border-brand-crema">
                    {job.category}
                  </span>

                  <h3 className={`font-bold text-brand-negro mb-3 group-hover:text-brand-rojo transition-colors ${viewMode === 'list' ? 'text-xl' : 'text-lg line-clamp-2 leading-snug'}`}>
                    {job.title}
                  </h3>
                  
                  <p className={`text-brand-texto mb-6 flex-grow ${viewMode === 'list' ? 'text-base line-clamp-2' : 'text-sm line-clamp-3 leading-relaxed'}`}>
                    {job.description}
                  </p>
                  
                  <div className={`flex flex-col gap-3 text-sm text-brand-gris mb-6 pt-4 border-t border-brand-borde/50 ${viewMode === 'list' ? 'flex-row items-center' : ''}`}>
                    <span className={`flex items-center gap-2 font-bold text-green-700 ${viewMode === 'list' ? 'text-lg' : 'text-base'}`}>
                      <DollarSign size={viewMode === 'list' ? 18 : 16} className="text-green-600" />
                      ${Number(job.budget).toLocaleString()} <span className="text-xs font-normal text-brand-gris">USD</span>
                    </span>
                    {viewMode === 'list' && <span className="text-brand-borde hidden sm:block">|</span>}
                    <span className="flex items-center gap-2">
                      <Clock size={14} className="text-brand-gris" />
                      {new Date(job.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`flex items-center gap-2 font-medium px-3 py-1 rounded-full text-xs border ${proposalsInfo.color}`}>
                      <Users size={12} />
                      {proposalsInfo.label}
                    </span>
                  </div>

                  <div className={`flex gap-3 mt-auto ${viewMode === 'list' ? 'flex-col sm:flex-row' : ''}`}>
                    <button 
                      onClick={() => handleShare(job)}
                      className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-brand-gris hover:text-brand-negro hover:bg-brand-crema transition-all px-3 py-2.5 rounded-xl border border-brand-borde"
                      title="Compartir esta oferta"
                    >
                      <Share2 size={16} />
                      <span className="hidden sm:inline">Compartir</span>
                    </button>
                    
                    <button 
                      onClick={() => setSelectedJob(job)}
                      className="flex-[2] tm-btn-rojo text-sm font-semibold py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalles del Trabajo */}
      {selectedJob && !showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-brand-negro rounded-t-2xl p-6 md:p-8 flex justify-between items-start sticky top-0 z-10">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge estado={selectedJob.status} />
                  <span className="text-xs font-bold text-brand-vino bg-brand-crema px-3 py-1 rounded-full border border-brand-crema/50">
                    {selectedJob.category}
                  </span>
                  {selectedJob.is_featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full border border-yellow-200">
                      <Star size={12} fill="currentColor" /> Destacado
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{selectedJob.title}</h2>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-brand-gris uppercase tracking-wide mb-2">Descripción del Proyecto</h3>
                <p className="text-brand-texto leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
              </div>

              {selectedJob.entregables && (
                <div className="bg-brand-crema/30 rounded-xl p-5 border border-brand-borde">
                  <h3 className="text-sm font-bold text-brand-negro mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-brand-rojo" />
                    Entregables Esperados
                  </h3>
                  <p className="text-brand-texto text-sm leading-relaxed">{selectedJob.entregables}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-brand-borde">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-xs text-green-700 uppercase font-bold mb-1">Presupuesto</p>
                  <p className="text-2xl font-extrabold text-green-700">${Number(selectedJob.budget).toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs text-blue-700 uppercase font-bold mb-1">Publicado</p>
                  <p className="text-lg font-bold text-blue-900">
                    {new Date(selectedJob.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs text-purple-700 uppercase font-bold mb-1">Propuestas</p>
                  <p className="text-lg font-bold text-purple-900">
                    {proposalsCount[selectedJob.id] || 0}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-brand-borde">
                <button onClick={() => setSelectedJob(null)} className="flex-1 tm-btn-outline py-3">Cerrar</button>
                {userRole === 'freelancer' && (
                  <button onClick={() => setShowApplyModal(true)} className="flex-1 tm-btn-rojo py-3 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-brand-rojo/20 hover:shadow-xl transition-all">
                    <Sparkles size={18} /> Postularme a este Trabajo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Postulación */}
      {selectedJob && showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Postularme al Trabajo</h2>
                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{selectedJob.title}</p>
              </div>
              <button onClick={() => { setShowApplyModal(false); setSelectedJob(null); }} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-brand-negro mb-2">Carta de Presentación *</label>
                <textarea
                  rows={6}
                  value={applyForm.cover_letter}
                  onChange={(e) => setApplyForm({ ...applyForm, cover_letter: e.target.value })}
                  className="tm-input resize-none focus:ring-2 focus:ring-brand-rojo/20"
                  placeholder="Cuéntale al cliente por qué eres el mejor candidato para este proyecto..."
                  required
                  minLength={50}
                />
                <p className={`text-xs mt-2 font-medium ${applyForm.cover_letter.length < 50 ? 'text-brand-gris' : 'text-green-600'}`}>
                  Mínimo 50 caracteres · {applyForm.cover_letter.length} caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-negro mb-2">Tu Presupuesto Propuesto (USD) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign size={18} className="text-brand-gris" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={applyForm.proposed_budget}
                    onChange={(e) => setApplyForm({ ...applyForm, proposed_budget: e.target.value })}
                    className="tm-input pl-12 text-lg font-semibold"
                    placeholder="Ej: 500"
                    required
                  />
                </div>
                <p className="text-xs text-brand-gris mt-2 bg-brand-crema/50 inline-block px-3 py-1 rounded-lg">
                  💡 Presupuesto estimado del cliente: <span className="font-bold text-brand-negro">${Number(selectedJob.budget).toLocaleString()}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-brand-borde">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 tm-btn-outline py-3" disabled={applying}>Cancelar</button>
                <button type="submit" disabled={applying} className="flex-1 tm-btn-rojo py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-brand-rojo/20">
                  {applying ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Enviando propuesta...</>
                  ) : (
                    <><Sparkles size={18} /> Enviar Propuesta</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}