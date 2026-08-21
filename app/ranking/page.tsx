'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Award, Star, TrendingUp, Users } from 'lucide-react';
import { Logo } from '@/app/components/ui';
import Link from 'next/link';

interface Freelancer {
  id: string;
  full_name: string;
  email: string;
  rating: number;
  total_reviews: number;
  completed_jobs: number;
  total_earned: number;
}

export default function FreelancerRanking() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

async function loadRanking() {
  try {
    console.log('🔍 Iniciando carga de ranking...');
    
    // 1. Obtener freelancers APROBADOS explícitamente
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('role', 'freelancer')
      .eq('is_approved', true);

    console.log('📊 Resultado de la consulta:', {
      data: profilesData,
      error: profilesError,
      dataLength: profilesData?.length,
      errorKeys: profilesError ? Object.keys(profilesError) : null
    });

    if (profilesError) {
      console.error('❌ Error detallado:', JSON.stringify(profilesError, null, 2));
      setLoading(false);
      return;
    }

    if (!profilesData || profilesData.length === 0) {
      console.warn('⚠️ No se encontraron perfiles de freelancers aprobados');
      setLoading(false);
      return;
    }

    console.log(`✅ Encontrados ${profilesData.length} perfiles, calculando estadísticas...`);

    // 2. Calcular estadísticas reales desde la tabla jobs
    const freelancersWithStats = await Promise.all(
      profilesData.map(async (profile) => {
        // Contar trabajos completados
        const { count: completedCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_freelancer_id', profile.id)
          .eq('status', 'completado');

        // Obtener presupuesto y rating de trabajos completados
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('budget, rating')
          .eq('assigned_freelancer_id', profile.id)
          .eq('status', 'completado');

        const totalEarned = jobsData?.reduce((sum, job) => sum + Number(job.budget || 0), 0) || 0;
        
        // Calcular rating promedio real
        const ratings = jobsData?.map(j => j.rating).filter(r => r !== null && r !== undefined) || [];
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + Number(r), 0) / ratings.length 
          : 0;

        return {
          id: profile.id,
          full_name: profile.full_name || 'Freelancer',
          email: profile.email,
          rating: Number(avgRating.toFixed(1)),
          total_reviews: ratings.length,
          completed_jobs: completedCount || 0,
          total_earned: totalEarned,
        };
      })
    );

    // 3. Ordenar
    const sortedFreelancers = freelancersWithStats.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.completed_jobs - a.completed_jobs;
    });

    console.log('🏆 Ranking final:', sortedFreelancers.length, 'freelancers');
    setFreelancers(sortedFreelancers);
  } catch (error) {
    console.error('💥 Error fatal al cargar ranking:', error);
  } finally {
    setLoading(false);
  }
}

  const topThree = freelancers.slice(0, 3);
  const restOfFreelancers = freelancers.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
          <p className="mt-4 text-brand-gris font-medium">Cargando ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <Link href="/">
            <Logo height={34} />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy size={40} className="text-brand-rojo" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-brand-negro">
              Top Freelancers
            </h1>
          </div>
          <p className="text-brand-gris text-lg max-w-2xl mx-auto">
            Los mejores talentos de Target Media Connect según su calificación y desempeño
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-brand-gris">
            <Users size={16} />
            <span>{freelancers.length} freelancers registrados y aprobados</span>
          </div>
        </div>

        {freelancers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-brand-borde">
            <Award className="mx-auto h-16 w-16 text-brand-gris opacity-30 mb-4" />
            <h3 className="text-xl font-bold text-brand-negro mb-2">
              Aún no hay freelancers aprobados
            </h3>
            <p className="text-brand-gris">
              Los nuevos registros deben ser aprobados por un administrador antes de aparecer aquí.
            </p>
          </div>
        ) : (
          <>
            {topThree.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-brand-negro text-center mb-8 flex items-center justify-center gap-2">
                  <Medal size={24} className="text-brand-rojo" />
                  Podio de Honor
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  {/* Segundo Lugar */}
                  {topThree[1] && (
                    <div className="order-2 md:order-1">
                      <div className="bg-gradient-to-b from-gray-200 to-gray-300 rounded-t-2xl p-6 text-center shadow-lg relative">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                          <div className="bg-gray-400 rounded-full p-3 shadow-lg">
                            <Trophy size={32} className="text-white" />
                          </div>
                        </div>
                        <div className="mt-8">
                          <div className="bg-gray-500 rounded-full w-20 h-20 mx-auto mb-3 flex items-center justify-center text-3xl font-extrabold text-white">
                            {topThree[1].full_name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-brand-negro text-lg mb-1 line-clamp-1">
                            {topThree[1].full_name}
                          </h3>
                          <div className="flex items-center justify-center gap-1 text-yellow-600 mb-2">
                            <Star size={16} fill="currentColor" />
                            <span className="font-bold">{topThree[1].rating.toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-brand-gris">
                            {topThree[1].completed_jobs} trabajos completados
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-400">
                          <span className="text-4xl font-extrabold text-gray-600">2</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Primer Lugar */}
                  {topThree[0] && (
                    <div className="order-1 md:order-2">
                      <div className="bg-gradient-to-b from-yellow-200 to-yellow-300 rounded-t-2xl p-8 text-center shadow-xl relative transform md:-translate-y-4">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                          <div className="bg-yellow-500 rounded-full p-4 shadow-lg">
                            <Trophy size={40} className="text-white" />
                          </div>
                        </div>
                        <div className="mt-10">
                          <div className="bg-yellow-600 rounded-full w-24 h-24 mx-auto mb-3 flex items-center justify-center text-4xl font-extrabold text-white border-4 border-yellow-400">
                            {topThree[0].full_name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-brand-negro text-xl mb-1 line-clamp-1">
                            {topThree[0].full_name}
                          </h3>
                          <div className="flex items-center justify-center gap-1 text-yellow-600 mb-2">
                            <Star size={20} fill="currentColor" />
                            <span className="font-bold text-xl">{topThree[0].rating.toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-brand-gris font-semibold">
                            {topThree[0].completed_jobs} trabajos completados
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-yellow-400">
                          <span className="text-5xl font-extrabold text-yellow-700">1</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tercer Lugar */}
                  {topThree[2] && (
                    <div className="order-3">
                      <div className="bg-gradient-to-b from-amber-200 to-amber-300 rounded-t-2xl p-6 text-center shadow-lg relative">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                          <div className="bg-amber-600 rounded-full p-3 shadow-lg">
                            <Award size={32} className="text-white" />
                          </div>
                        </div>
                        <div className="mt-8">
                          <div className="bg-amber-700 rounded-full w-20 h-20 mx-auto mb-3 flex items-center justify-center text-3xl font-extrabold text-white">
                            {topThree[2].full_name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-brand-negro text-lg mb-1 line-clamp-1">
                            {topThree[2].full_name}
                          </h3>
                          <div className="flex items-center justify-center gap-1 text-yellow-600 mb-2">
                            <Star size={16} fill="currentColor" />
                            <span className="font-bold">{topThree[2].rating.toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-brand-gris">
                            {topThree[2].completed_jobs} trabajos completados
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-amber-400">
                          <span className="text-4xl font-extrabold text-amber-700">3</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {restOfFreelancers.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-brand-negro text-center mb-6 flex items-center justify-center gap-2">
                  <TrendingUp size={24} className="text-brand-rojo" />
                  Otros Freelancers Destacados
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restOfFreelancers.map((freelancer, index) => (
                    <div
                      key={freelancer.id}
                      className="bg-white rounded-xl border border-brand-borde p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-brand-crema rounded-full w-14 h-14 flex items-center justify-center text-xl font-extrabold text-brand-negro flex-shrink-0">
                          {freelancer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-brand-negro mb-1 line-clamp-1">
                            {freelancer.full_name}
                          </h3>
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Star size={14} fill="currentColor" />
                            <span className="font-semibold text-sm">
                              {freelancer.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-brand-gris">
                            #{index + 4}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-brand-borde flex justify-between text-xs text-brand-gris">
                        <span>{freelancer.completed_jobs} trabajos</span>
                        <span>{freelancer.total_reviews} reseñas</span> {/* ✅ Corregido: ahora muestra reseñas */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Ranking de Freelancers
      </footer>
    </div>
  );
}