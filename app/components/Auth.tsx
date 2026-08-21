'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Logo } from './ui';
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';

// Componentes de iconos SVG para redes sociales
function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  );
}

interface AuthProps {
  onAuthSuccess: () => void;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Noticias
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

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
    setCurrentNewsIndex((prev) => (prev + 1) % news.length);
  };

  const prevNews = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + news.length) % news.length);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    if (isLogin) {
      // 1. Intentar login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) throw authError;

      // 2. Verificar si el usuario está aprobado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved, rejection_reason')
        .eq('id', authData.user?.id)
        .single();

      if (profileError) throw profileError;

      // 3. Si no está aprobado, cerrar sesión y mostrar mensaje
      if (!profile.is_approved) {
        await supabase.auth.signOut();
        
        if (profile.rejection_reason) {
          setError(`Cuenta rechazada: ${profile.rejection_reason}`);
        } else {
          setError('Tu cuenta está pendiente de aprobación. Un administrador debe habilitarla antes de que puedas acceder.');
        }
        return;
      }

      // 4. Si está aprobado, continuar
      onAuthSuccess();
    } else {
      // Registro
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      setSuccess('¡Cuenta creada! Tu registro está pendiente de aprobación por un administrador. Recibirás un correo cuando sea habilitada.');
    }
  } catch (err: any) {
    setError(err.message || 'Ocurrió un error. Intenta de nuevo.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col relative overflow-hidden">
      {/* Formas orgánicas de fondo */}
      <svg 
        aria-hidden="true" 
        className="absolute -top-20 -left-20 opacity-90 pointer-events-none" 
        width="400" 
        height="400" 
        viewBox="0 0 320 300"
      >
        <path 
          d="M40,-10 C160,-40 260,40 220,130 C190,200 80,230 10,180 C-50,135 -40,20 40,-10 Z" 
          fill="#D9374A" 
        />
      </svg>
      
      <svg 
        aria-hidden="true" 
        className="absolute -bottom-32 -right-20 opacity-90 pointer-events-none" 
        width="450" 
        height="400" 
        viewBox="0 0 340 280"
      >
        <path 
          d="M300,20 C380,80 360,200 260,250 C170,295 60,260 40,180 C25,110 200,-40 300,20 Z" 
          fill="#6E1423" 
        />
      </svg>

      {/* Header */}
      <header className="bg-brand-negro py-4 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Logo height={36} />
        </div>
      </header>

      {/* Contenido Principal - Grid Layout */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* COLUMNA IZQUIERDA - LOGIN */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-brand-borde">
            
            {/* Título */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-brand-negro">
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              <p className="text-sm text-brand-gris mt-2">
                {isLogin 
                  ? 'Accede a tu panel de Target Media' 
                  : 'Únete a nuestra red de freelancers'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-borde mb-6">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  isLogin 
                    ? 'text-brand-negro border-b-2 border-brand-rojo' 
                    : 'text-brand-gris hover:text-brand-negro'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  !isLogin 
                    ? 'text-brand-negro border-b-2 border-brand-rojo' 
                    : 'text-brand-gris hover:text-brand-negro'
                }`}
              >
                Registrarse
              </button>
            </div>

            {/* Mensajes de Error/Éxito */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nombre (Solo registro) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-brand-negro mb-1.5 uppercase tracking-wide">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="tm-input pl-10"
                      placeholder="Tu nombre"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-brand-negro mb-1.5 uppercase tracking-wide">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="tm-input pl-10"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-brand-negro mb-1.5 uppercase tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="tm-input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gris hover:text-brand-negro"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={loading}
                className="tm-btn-rojo w-full flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    {isLogin ? 'Entrar' : 'Crear cuenta'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Footer del formulario */}
            <p className="text-center text-xs text-brand-gris mt-6">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                className="text-brand-rojo font-semibold hover:underline"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>

          {/* COLUMNA DERECHA - NOTICIAS */}
          <div className="hidden lg:block">
            <div className="bg-brand-negro rounded-2xl shadow-2xl p-8 text-white">
              <h3 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
                📰 Novedades y Actualizaciones
              </h3>
              
              {newsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo"></div>
                </div>
              ) : news.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No hay noticias disponibles</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Imagen de la noticia */}
                  <div className="mb-6 rounded-xl overflow-hidden h-64">
                    <img
                      src={news[currentNewsIndex]?.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'}
                      alt={news[currentNewsIndex]?.title || 'Noticia'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Contenido de la noticia */}
                  <div className="mb-6">
                    <h4 className="text-xl font-bold mb-3">
                      {news[currentNewsIndex]?.title}
                    </h4>
                    <p className="text-gray-300 leading-relaxed">
                      {news[currentNewsIndex]?.description}
                    </p>
                  </div>

                  {/* Navegación */}
                  {news.length > 1 && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={prevNews}
                        className="p-2 rounded-full bg-brand-crema/20 hover:bg-brand-crema/40 transition-colors"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      
                      <div className="flex gap-2">
                        {news.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentNewsIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentNewsIndex ? 'bg-brand-rojo' : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={nextNews}
                        className="p-2 rounded-full bg-brand-crema/20 hover:bg-brand-crema/40 transition-colors"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer con Redes Sociales */}
      <footer className="bg-brand-negro text-gray-400 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Redes Sociales */}
          <div className="flex justify-center items-center gap-6 mb-4 flex-wrap">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-brand-rojo transition-colors"
            >
              <InstagramIcon />
              <span className="text-sm hidden sm:inline">Instagram</span>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-brand-rojo transition-colors"
            >
              <LinkedinIcon />
              <span className="text-sm hidden sm:inline">LinkedIn</span>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-brand-rojo transition-colors"
            >
              <FacebookIcon />
              <span className="text-sm hidden sm:inline">Facebook</span>
            </a>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition-colors"
            >
              <WhatsAppIcon />
              <span className="text-sm hidden sm:inline">WhatsApp</span>
            </a>
          </div>
          
          {/* Copyright */}
          <div className="text-center text-xs border-t border-gray-800 pt-4">
            © Target Media {new Date().getFullYear()} · Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}