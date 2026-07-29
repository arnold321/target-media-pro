'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Logo } from './ui';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setSuccess('¡Cuenta creada! Revisa tu correo para confirmar el registro.');
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

      {/* Header simple */}
      <header className="bg-brand-negro py-4 px-6 relative z-10">
        <div className="max-w-5xl mx-auto flex justify-center">
          <Logo height={36} />
        </div>
      </header>

      {/* Contenido Central */}
      <main className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-brand-borde">
          
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
      </main>

      {/* Footer simple */}
      <footer className="bg-brand-negro text-gray-500 text-center py-4 text-xs relative z-10">
        © Target Media {new Date().getFullYear()}
      </footer>
    </div>
  );
}