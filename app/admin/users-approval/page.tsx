'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Clock, UserCheck, UserX, Search } from 'lucide-react';
import { Logo } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  is_approved: boolean;
  rejection_reason: string | null;
}

export default function UsersApproval() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModal, setRejectModal] = useState<{ userId: string; userName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  async function checkAdminAndLoadUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      toast.error('No tienes permisos de administrador');
      router.push('/');
      return;
    }

    await loadUsers();
    setLoading(false);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setPendingUsers(data || []);
    }
  }

  async function handleApprove(userId: string) {
    if (!confirm('¿Aprobar este usuario? Podrá iniciar sesión inmediatamente.')) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_approved: true, 
          approval_date: new Date().toISOString(),
          rejection_reason: null 
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Usuario aprobado exitosamente');
      await loadUsers();
    } catch (error) {
      console.error('Error al aprobar:', error);
      toast.error('Error al aprobar el usuario');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    if (!rejectionReason.trim()) {
      toast.error('Debes proporcionar un motivo de rechazo');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_approved: false, 
          rejection_reason: rejectionReason.trim() 
        })
        .eq('id', rejectModal.userId);

      if (error) throw error;
      toast.success('Usuario rechazado');
      setRejectModal(null);
      setRejectionReason('');
      await loadUsers();
    } catch (error) {
      console.error('Error al rechazar:', error);
      toast.error('Error al rechazar el usuario');
    } finally {
      setProcessing(false);
    }
  }

  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'pending') return matchesSearch && !user.is_approved && !user.rejection_reason;
    if (filterStatus === 'approved') return matchesSearch && user.is_approved;
    if (filterStatus === 'rejected') return matchesSearch && user.rejection_reason;
    
    return matchesSearch;
  });

  const stats = {
    total: pendingUsers.length,
    pending: pendingUsers.filter(u => !u.is_approved && !u.rejection_reason).length,
    approved: pendingUsers.filter(u => u.is_approved).length,
    rejected: pendingUsers.filter(u => u.rejection_reason).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Aprobación de Usuarios</span>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Volver al panel
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-negro">Gestión de Aprobación de Usuarios</h1>
          <p className="text-brand-gris mt-1">Aprueba o rechaza los registros de nuevos usuarios</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-brand-borde">
            <p className="text-xs text-brand-gris uppercase font-semibold">Total Usuarios</p>
            <p className="text-2xl font-extrabold text-brand-negro">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <p className="text-xs text-yellow-700 uppercase font-semibold">Pendientes</p>
            <p className="text-2xl font-extrabold text-yellow-700">{stats.pending}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <p className="text-xs text-green-700 uppercase font-semibold">Aprobados</p>
            <p className="text-2xl font-extrabold text-green-700">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-6 border border-red-200">
            <p className="text-xs text-red-700 uppercase font-semibold">Rechazados</p>
            <p className="text-2xl font-extrabold text-red-700">{stats.rejected}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-brand-borde p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="tm-input pl-10 w-full"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="tm-input"
            >
              <option value="pending">Pendientes de aprobación</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        {/* Lista de usuarios */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-brand-borde">
            <Clock className="mx-auto h-16 w-16 text-brand-gris opacity-30 mb-4" />
            <h3 className="text-xl font-bold text-brand-negro mb-2">No hay usuarios</h3>
            <p className="text-brand-gris">No se encontraron usuarios con los filtros aplicados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl border border-brand-borde p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-brand-negro">{user.full_name || 'Sin nombre'}</h3>
                      {user.is_approved ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                          <UserCheck size={12} /> Aprobado
                        </span>
                      ) : user.rejection_reason ? (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                          <UserX size={12} /> Rechazado
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                          <Clock size={12} /> Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-brand-gris mb-1">{user.email}</p>
                    <p className="text-xs text-brand-gris">
                      Registrado: {new Date(user.created_at).toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {user.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 font-semibold mb-1">Motivo del rechazo:</p>
                        <p className="text-sm text-red-600">{user.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!user.is_approved && !user.rejection_reason && (
                      <>
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={processing}
                          className="tm-btn-verde flex items-center gap-1 text-sm"
                        >
                          <Check size={16} /> Aprobar
                        </button>
                        <button
                          onClick={() => setRejectModal({ userId: user.id, userName: user.full_name })}
                          disabled={processing}
                          className="tm-btn-vino flex items-center gap-1 text-sm"
                        >
                          <X size={16} /> Rechazar
                        </button>
                      </>
                    )}
                    {user.rejection_reason && (
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={processing}
                        className="tm-btn-verde flex items-center gap-1 text-sm"
                      >
                        <Check size={16} /> Re-aprobar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-brand-negro rounded-t-2xl p-6">
              <h2 className="text-xl font-extrabold text-white">Rechazar Usuario</h2>
              <p className="text-gray-400 text-sm mt-1">{rejectModal.userName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Motivo del Rechazo *
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="tm-input resize-none"
                  placeholder="Explica por qué rechazas este usuario..."
                  required
                />
                <p className="text-xs text-brand-gris mt-1">
                  Este mensaje será visible para el usuario cuando intente iniciar sesión
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  onClick={() => {
                    setRejectModal(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 tm-btn-outline"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 tm-btn-vino flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <X size={16} /> Confirmar Rechazo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}