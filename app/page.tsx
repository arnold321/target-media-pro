'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Search, Filter, ChevronLeft, ChevronRight, Briefcase, MapPin, DollarSign, Clock, Heart, Share2, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { Logo, Badge } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';
import JobBoard from './components/JobBoard';
import Auth from './components/Auth';
import ThemeToggle from './components/ThemeToggle';
import Link from 'next/link';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Estado para las noticias
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [newsLoading, setNewsLoading] = useState(true);

  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    checkUser();
    loadNews();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await fetchProfile(user.id);
    }
    setLoading(false);
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  }

  async function loadNews() {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setNews(data);
      }
    } catch (err) {
      console.error('Error al cargar noticias:', err);
    } finally {
      setNewsLoading(false);
    }
  }

  const nextNews = () => {
    setCurrentNewsIndex((prev) => (prev + 1) % (news.length || 1));
  };

  const prevNews = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + (news.length || 1)) % (news.length || 1));
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo"></div>
      </div>
    );
  }

  // Si no hay usuario, mostrar pantalla de Auth (que ya incluye el diseño de noticias)
  if (!user) {
    return <Auth onAuthSuccess={() => checkUser()} />;
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      {/* HEADER */}
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Logo height={32} />
            <span className="text-white font-semibold hidden sm:block text-sm">| Target Media Connect</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Link href="/ranking" className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1">
              🏆 Ranking
            </Link>
            
            {profile?.role === 'admin' && (
              <button 
                onClick={() => router.push('/admin')} 
                className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <LayoutDashboard size={16} /> Panel Admin
              </button>
            )}
            
            {profile?.role === 'freelancer' && (
              <button 
                onClick={() => router.push('/freelancer')} 
                className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <LayoutDashboard size={16} /> Mi Panel
              </button>
            )}

            <button 
              onClick={handleLogout} 
              className="flex items-center gap-1.5 text-sm text-brand-rojo hover:text-red-400 transition-colors font-medium"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-brand-negro border-t border-gray-800 py-4 px-5 space-y-4">
            <ThemeToggle />
            <Link href="/ranking" className="block text-sm text-gray-300 hover:text-white">🏆 Ranking</Link>
            {profile?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} className="block w-full text-left text-sm text-gray-300 hover:text-white">
                Panel Admin
              </button>
            )}
            {profile?.role === 'freelancer' && (
              <button onClick={() => router.push('/freelancer')} className="block w-full text-left text-sm text-gray-300 hover:text-white">
                Mi Panel
              </button>
            )}
            <button onClick={handleLogout} className="block w-full text-left text-sm text-brand-rojo font-medium">
              Cerrar Sesión
            </button>
          </div>
        )}
      </header>

      {/* 📰 SECCIÓN DE NOTICIAS (CARRUSEL SUPERIOR) */}
      {!newsLoading && news.length > 0 && (
        <section className="w-full bg-gradient-to-r from-brand-negro via-brand-vino to-brand-negro text-white py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-brand-rojo text-white text-xs font-bold px-2 py-1 rounded">NOVEDADES</span>
              <h2 className="text-lg font-semibold">Mantente informado</h2>
            </div>
            
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Imagen de la noticia */}
                <div className="rounded-xl overflow-hidden h-48 md:h-64 shadow-lg">
                  <img
                    src={news[currentNewsIndex]?.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'}
                    alt={news[currentNewsIndex]?.title || 'Noticia'}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>

                {/* Contenido de la noticia */}
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-3 leading-tight">
                    {news[currentNewsIndex]?.title}
                  </h3>
                  <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6">
                    {news[currentNewsIndex]?.description}
                  </p>

                  {/* Navegación */}
                  {news.length > 1 && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={prevNews}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        aria-label="Noticia anterior"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      
                      <div className="flex gap-2 flex-1 justify-center md:justify-start">
                        {news.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentNewsIndex(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === currentNewsIndex ? 'bg-brand-rojo w-6' : 'bg-white/30 w-2 hover:bg-white/50'
                            }`}
                            aria-label={`Ir a noticia ${index + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={nextNews}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        aria-label="Siguiente noticia"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTENIDO PRINCIPAL: TABLERO DE TRABAJOS */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        <JobBoard 
          userId={user?.id} 
          userRole={profile?.role} 
        />
      </main>

      {/* FOOTER */}
      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-auto border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <p>© Target Media {new Date().getFullYear()} · Conectando talento con oportunidades</p>
        </div>
      </footer>
    </div>
  );
}