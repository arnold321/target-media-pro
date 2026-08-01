'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, DollarSign, Clock, Briefcase, Share2, Search, Filter, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  created_at: string;
  entregables?: string;
}

interface JobBoardProps {
  userId: string;
  userRole: string | null;
}

type SortOption = 'recent' | 'budget_high' | 'budget_low';
type DateFilter = 'all' | '7days' | '30days';

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
    const shareUrl = `${window.location.origin}/trabajo/${job.id}`;
    const shareText = `¡Hola! Vi esta oferta de trabajo y pensé en ti:\n\n🚀 *${job.title}*\n Presupuesto: $${Number(job.budget).toLocaleString()}\n📂 Categoría: ${job.category}\n\nMira los detalles y postúlate aquí:`;

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
    setMinBudget('');
    setMaxBudget('');
    setDateFilter('all');
    setSortBy('recent');
    toast.success('Filtros limpiados');
  }

  // Obtener categorías únicas de los trabajos
  const categories = useMemo(() => {
    const cats = new Set(jobs.map(job => job.category));
    return Array.from(cats).sort();
  }, [jobs]);

  // Aplicar filtros y ordenamiento
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.category.toLowerCase().includes(query)
      );
    }

    // Filtro por categoría
    if (selectedCategory) {
      result = result.filter(job => job.category === selectedCategory);
    }

    // Filtro por presupuesto mínimo
    if (minBudget) {
      result = result.filter(job => job.budget >= parseFloat(minBudget));
    }

    // Filtro por presupuesto máximo
    if (maxBudget) {
      result = result.filter(job => job.budget <= parseFloat(maxBudget));
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const days = dateFilter === '7days' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter(job => new Date(job.created_at) >= cutoffDate);
    }

    // Ordenamiento
    if (sortBy === 'budget_high') {
      result.sort((a, b) => b.budget - a.budget);
    } else if (sortBy === 'budget_low') {
      result.sort((a, b) => a.budget - b.budget);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [jobs, searchQuery, selectedCategory, minBudget, maxBudget, dateFilter, sortBy]);

  const hasActiveFilters = searchQuery || selectedCategory || minBudget || maxBudget || dateFilter !== 'all' || sortBy !== 'recent';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-rojo"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header con búsqueda y filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-negro">Trabajos Disponibles</h2>
            <p className="text-sm text-brand-gris mt-1">
              {filteredJobs.length} de {jobs.length} oportunidades activas
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasActiveFilters
                ? 'bg-brand-rojo text-white'
                : 'bg-white border border-brand-borde text-brand-negro hover:bg-brand-crema'
            }`}
          >
            <Filter size={16} />
            Filtros
            {hasActiveFilters && (
              <span className="bg-white text-brand-rojo text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {[searchQuery, selectedCategory, minBudget, maxBudget, dateFilter !== 'all', sortBy !== 'recent'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, descripción o categoría..."
            className="tm-input pl-10 w-full"
          />
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-brand-borde p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-brand-negro">Filtros Avanzados</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-brand-rojo hover:text-brand-rojo-hover flex items-center gap-1"
                >
                  <X size={14} />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-brand-gris uppercase mb-2">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="tm-input w-full"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Presupuesto Mínimo */}
              <div>
                <label className="block text-xs font-semibold text-brand-gris uppercase mb-2">Presupuesto Mínimo</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                  <input
                    type="number"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="tm-input pl-10 w-full"
                  />
                </div>
              </div>

              {/* Presupuesto Máximo */}
              <div>
                <label className="block text-xs font-semibold text-brand-gris uppercase mb-2">Presupuesto Máximo</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    placeholder="Sin límite"
                    min="0"
                    className="tm-input pl-10 w-full"
                  />
                </div>
              </div>

              {/* Fecha de Publicación */}
              <div>
                <label className="block text-xs font-semibold text-brand-gris uppercase mb-2">Publicado</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="tm-input w-full"
                >
                  <option value="all">Cualquier fecha</option>
                  <option value="7days">Últimos 7 días</option>
                  <option value="30days">Últimos 30 días</option>
                </select>
              </div>
            </div>

            {/* Ordenar por */}
            <div>
              <label className="block text-xs font-semibold text-brand-gris uppercase mb-2">Ordenar por</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'recent'
                      ? 'bg-brand-negro text-white'
                      : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
                  }`}
                >
                  Más Recientes
                </button>
                <button
                  onClick={() => setSortBy('budget_high')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    sortBy === 'budget_high'
                      ? 'bg-brand-negro text-white'
                      : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
                  }`}
                >
                  <TrendingUp size={14} />
                  Mayor Presupuesto
                </button>
                <button
                  onClick={() => setSortBy('budget_low')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    sortBy === 'budget_low'
                      ? 'bg-brand-negro text-white'
                      : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
                  }`}
                >
                  <TrendingDown size={14} />
                  Menor Presupuesto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid de trabajos */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-brand-borde">
          <Briefcase className="mx-auto h-12 w-12 text-brand-gris opacity-30 mb-4" />
          <p className="text-brand-gris">
            {hasActiveFilters
              ? 'No se encontraron trabajos con los filtros aplicados'
              : 'No hay trabajos disponibles en este momento'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="tm-btn-rojo mt-4"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-white rounded-xl border border-brand-borde p-5 hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full relative group"
            >
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

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge estado={job.status} />
                <span className="text-xs font-semibold text-brand-vino bg-brand-crema px-2 py-1 rounded-full">
                  {job.category}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-brand-negro mb-2 line-clamp-2 leading-tight min-h-[3rem]">
                {job.title}
              </h3>
              
              <p className="text-brand-texto text-xs mb-4 line-clamp-3 flex-grow">
                {job.description}
              </p>
              
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

              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => handleShare(job)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand-gris hover:text-brand-negro transition-colors px-3 py-2 rounded-lg hover:bg-brand-crema/50 border border-brand-borde"
                  title="Compartir esta oferta"
                >
                  <Share2 size={14} />
                  Compartir
                </button>
                
                <Link 
                  href={`/trabajo/${job.id}`}
                  className="flex-1 tm-btn-rojo text-xs py-2 text-center"
                >
                  Ver Detalles
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalles del Trabajo */}
      {selectedJob && !showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge estado={selectedJob.status} />
                  <span className="text-xs font-semibold text-brand-vino bg-brand-crema px-2 py-1 rounded-full">
                    {selectedJob.category}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">{selectedJob.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-brand-negro mb-2">Descripción del Proyecto</h3>
                <p className="text-brand-texto text-sm leading-relaxed">{selectedJob.description}</p>
              </div>

              {selectedJob.entregables && (
                <div>
                  <h3 className="text-sm font-semibold text-brand-negro mb-2">Entregables Esperados</h3>
                  <p className="text-brand-texto text-sm leading-relaxed">{selectedJob.entregables}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-borde">
                <div>
                  <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Presupuesto</p>
                  <p className="text-2xl font-extrabold text-green-600">${Number(selectedJob.budget).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Publicado</p>
                  <p className="text-lg font-bold text-brand-negro">
                    {new Date(selectedJob.created_at).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 tm-btn-outline"
                >
                  Cerrar
                </button>
                {userRole === 'freelancer' && (
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="flex-1 tm-btn-rojo flex items-center justify-center gap-2"
                  >
                    Postularme a este Trabajo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Postulación */}
      {selectedJob && showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Postularme al Trabajo</h2>
                <p className="text-gray-400 text-sm mt-1">{selectedJob.title}</p>
              </div>
              <button 
                onClick={() => { setShowApplyModal(false); setSelectedJob(null); }}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Carta de Presentación *
                </label>
                <textarea
                  rows={6}
                  value={applyForm.cover_letter}
                  onChange={(e) => setApplyForm({ ...applyForm, cover_letter: e.target.value })}
                  className="tm-input resize-none"
                  placeholder="Cuéntale al cliente por qué eres el mejor candidato para este proyecto..."
                  required
                  minLength={50}
                />
                <p className="text-xs text-brand-gris mt-1">
                  Mínimo 50 caracteres · {applyForm.cover_letter.length} caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Tu Presupuesto Propuesto (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-brand-gris" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={applyForm.proposed_budget}
                    onChange={(e) => setApplyForm({ ...applyForm, proposed_budget: e.target.value })}
                    className="tm-input pl-10"
                    placeholder="Ej: 500"
                    required
                  />
                </div>
                <p className="text-xs text-brand-gris mt-1">
                  Presupuesto del cliente: ${Number(selectedJob.budget).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 tm-btn-outline"
                  disabled={applying}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="flex-1 tm-btn-rojo flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    'Enviar Propuesta'
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