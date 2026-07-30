'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Logo } from '@/app/components/ui';
import { Lock, Star } from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  year: number;
  budget?: number;
  created_at: string;
  rating: number | null;       // <-- AGREGAR
  review_text: string | null;  // <-- AGREGAR
}

export default function PortfolioPage() {
  const [featuredItems, setFeaturedItems] = useState<PortfolioItem[]>([]);
  const [historyItems, setHistoryItems] = useState<PortfolioItem[]>([]);
  const [allItems, setAllItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const router = useRouter();

  useEffect(() => {
    fetchPortfolioItems();
  }, []);

  async function fetchPortfolioItems() {
    try {
      console.log('🔍 Buscando trabajos completados...');
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'completado')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error de Supabase:', error);
        throw error;
      }
      
      console.log('✅ Datos recibidos:', data?.length, 'trabajos');
      console.log('📋 Primer trabajo:', data?.[0]);
      
      if (!data || data.length === 0) {
        console.log('️ No hay trabajos completados en la BD');
        setLoading(false);
        return;
      }

 const transformedData: PortfolioItem[] = data.map(job => ({
  id: job.id,
  title: job.title,
  category: job.category,
  description: job.description || '',
  year: new Date(job.created_at).getFullYear(),
  budget: job.budget,
  created_at: job.created_at,
  rating: job.rating || null,       // <-- AGREGAR
  review_text: job.review_text || null, // <-- AGREGAR
}));

      console.log('📊 Total transformados:', transformedData.length);

      setAllItems(transformedData);
      setFeaturedItems(transformedData.slice(0, 12));
      setHistoryItems(transformedData.slice(12));
    } catch (error) {
      console.error('💥 Error al cargar portfolio:', error);
    } finally {
      setLoading(false);
    }
  }

  const categories = ['Todas', ...Array.from(new Set(allItems.map(item => item.category)))];
  
  const filteredHistory = selectedCategory === 'Todas'
    ? historyItems
    : historyItems.filter(item => item.category === selectedCategory);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    totalJobs: allItems.length,
    categories: categories.length - 1,
    sinceYear: allItems.length > 0 
      ? Math.min(...allItems.map(item => item.year))
      : new Date().getFullYear(),
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
          <p className="mt-4 text-brand-gris">Cargando portafolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Portafolio</span>
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
        <div className="flex gap-6 border-b border-brand-borde mb-8">
          <button
            onClick={() => router.push('/')}
            className="pb-3 text-sm font-semibold text-brand-gris hover:text-brand-negro transition-colors"
          >
            Tablero
          </button>
          <button className="pb-3 text-sm font-semibold text-brand-negro border-b-2 border-brand-rojo">
            Trabajos realizados ({stats.totalJobs})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-brand-negro text-white rounded-xl p-6">
            <p className="text-3xl font-extrabold mb-1">{stats.totalJobs}</p>
            <p className="text-sm text-gray-400">Trabajos completados</p>
          </div>
          
          <div className="bg-brand-negro text-white rounded-xl p-6">
            <p className="text-3xl font-extrabold mb-1">{stats.categories}</p>
            <p className="text-sm text-gray-400">Categorías de servicio</p>
          </div>
          
          <div className="bg-brand-negro text-white rounded-xl p-6">
            <p className="text-3xl font-extrabold mb-1">{stats.sinceYear}</p>
            <p className="text-sm text-gray-400">Operando desde</p>
          </div>
        </div>

        {featuredItems.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-extrabold text-brand-negro mb-2">Muestra de trabajos</h2>
            <p className="text-brand-gris text-sm mb-6">
              Una selección de proyectos entregados. La identidad de cada cliente se reserva por acuerdos de confidencialidad; 
              se indica únicamente su sector.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.map((item) => (
<article 
  key={item.id} 
  className="bg-white rounded-xl border border-brand-borde p-6 hover:shadow-lg transition-shadow flex flex-col h-full"
>
  <div className="flex justify-between items-start mb-3">
    <span className="bg-brand-crema text-brand-vino font-semibold text-xs px-3 py-1 rounded-full">
      {item.category}
    </span>
    <span className="text-sm text-brand-gris">{item.year}</span>
  </div>

  <h3 className="text-lg font-bold text-brand-negro mb-3 leading-tight">
    {item.title}
  </h3>

  <div className="flex items-center gap-1 text-xs text-brand-gris mb-3">
    <Lock size={12} />
    <span>Sector · identidad reservada</span>
  </div>

  <p className="text-sm text-brand-texto leading-relaxed mb-4 flex-grow">
    {item.description}
  </p>

  {/* SECCIÓN DE RESEÑA (Solo se muestra si tiene rating) */}
  {item.rating && (
    <div className="mt-4 pt-4 border-t border-brand-borde">
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${
              star <= item.rating! ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="text-xs font-bold text-brand-negro ml-2">{item.rating}/5</span>
      </div>
      {item.review_text && (
        <p className="text-xs text-brand-gris italic leading-relaxed">
          "{item.review_text}"
        </p>
      )}
    </div>
  )}
</article>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-brand-negro mb-1">Histórico completo</h2>
              <p className="text-brand-gris text-sm">
                {filteredHistory.length} trabajo{filteredHistory.length !== 1 ? 's' : ''} en el histórico
              </p>
            </div>
            
            {categories.length > 1 && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="tm-input py-2"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          {paginatedHistory.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {paginatedHistory.map((item) => (
                  <article 
                    key={item.id} 
                    className="bg-white rounded-lg border border-brand-borde p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-brand-crema text-brand-vino font-semibold text-xs px-3 py-1 rounded-full">
                        {item.category}
                      </span>
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                        Completado
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-brand-negro mb-2 leading-tight">
                      {item.title}
                    </h3>

                    <p className="text-xs text-brand-gris">
                      Entregado {formatDate(item.created_at)}
                    </p>
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="tm-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <span className="px-4 py-2 text-sm text-brand-gris">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="tm-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-brand-gris">No hay trabajos en el histórico</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Portafolio de Trabajos
      </footer>
    </div>
  );
}