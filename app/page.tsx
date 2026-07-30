'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import JobBoard from './components/JobBoard';
import Auth from './components/Auth';
import { Logo } from './components/ui';
import { LogOut, LayoutDashboard, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Obtener el rol del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setUserRole(profile?.role || 'freelancer');
      setLoading(false);
    }

    checkUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role || 'freelancer');
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
          <p className="mt-4 text-brand-gris font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      {/* Header Oscuro */}
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <Logo height={34} />
          <div className="flex items-center gap-4">
            {/* Botón Panel Admin (solo si es admin) */}
            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 text-sm text-white hover:text-brand-rojo transition-colors font-medium"
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">Panel Admin</span>
              </button>
            )}
            
            {/* Botón Mis Trabajos (solo si es freelancer) */}
            {userRole === 'freelancer' && (
              <button
                onClick={() => router.push('/freelancer')}
                className="flex items-center gap-1.5 text-sm text-white hover:text-brand-rojo transition-colors font-medium"
              >
                <Briefcase size={16} />
                <span className="hidden sm:inline">Mis Trabajos</span>
              </button>
            )}
            {/* Agrega esto en el header o en una sección de navegación */}
<button
  onClick={() => router.push('/portfolio')}
  className="text-sm text-gray-300 hover:text-white transition-colors"
>
  Portafolio
</button>
            <span className="text-xs text-gray-400 uppercase tracking-wider hidden sm:block">
              {user.email}
            </span>
            
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-grow">
        {userRole === 'admin' ? (
          // Si es admin, mostrar mensaje de bienvenida y acceso rápido
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="bg-white rounded-xl shadow-sm border border-brand-borde p-8 text-center mb-8">
              <h2 className="text-2xl font-bold text-brand-negro mb-2">
                ¡Bienvenido, Administrador!
              </h2>
              <p className="text-brand-gris mb-6">
                Gestiona los trabajos, revisa propuestas y asigna proyectos desde el panel de administración.
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="tm-btn-rojo inline-flex items-center gap-2"
              >
                <LayoutDashboard size={18} />
                Ir al Panel de Administración
              </button>
            </div>
            <JobBoard userId={user.id} />
          </div>
        ) : (
          // Si es freelancer
          <JobBoard userId={user.id} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Síguenos en Instagram
      </footer>
    </div>
  );
}