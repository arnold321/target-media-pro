'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, CheckCircle, Clock, XCircle, FileText, Eye, CreditCard, X, Save, Download } from 'lucide-react';
import { Logo } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';
import Link from 'next/link';

interface Payment {
  id: string;
  job_id: string;
  freelancer_id: string;
  admin_id: string;
  amount: number;
  payment_method_id: string | null;
  payment_method_type: string;
  payment_details: any;
  status: string;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  jobs: {
    title: string;
    budget: number;
    category: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

interface PaymentMethod {
  id: string;
  method_type: string;
  method_name: string;
  account_details: any;
}

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [freelancerMethods, setFreelancerMethods] = useState<PaymentMethod[]>([]);
  const [formData, setFormData] = useState({
    payment_method_id: '',
    payment_method_type: '',
    reference_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    checkAdminAndLoadPayments();
  }, []);

  async function checkAdminAndLoadPayments() {
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

    await loadPayments();
    setLoading(false);
  }

  async function loadPayments() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        jobs (title, budget, category),
        profiles:freelancer_id (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setPayments(data || []);
    }
  }

  async function loadFreelancerMethods(freelancerId: string) {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', freelancerId);
    
    setFreelancerMethods(data || []);
  }

  async function handleOpenForm(payment: Payment) {
    setSelectedPayment(payment);
    await loadFreelancerMethods(payment.freelancer_id);
    
    // Pre-seleccionar el método predeterminado
    const defaultMethod = (await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', payment.freelancer_id)
      .eq('is_default', true)
      .single()).data;
    
    if (defaultMethod) {
      setFormData({
        payment_method_id: defaultMethod.id,
        payment_method_type: defaultMethod.method_type,
        reference_number: '',
        notes: '',
      });
    } else {
      setFormData({
        payment_method_id: '',
        payment_method_type: payment.payment_method_type,
        reference_number: '',
        notes: '',
      });
    }
    
    setShowForm(true);
  }

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPayment) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          payment_method_id: formData.payment_method_id || null,
          payment_method_type: formData.payment_method_type,
          reference_number: formData.reference_number.trim(),
          notes: formData.notes.trim(),
          status: 'completed',
          payment_date: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast.success('Pago registrado exitosamente');
      setShowForm(false);
      setSelectedPayment(null);
      await loadPayments();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error('Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelPayment(paymentId: string) {
    if (!confirm('¿Cancelar este pago?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Pago cancelado');
      await loadPayments();
    } catch (error) {
      console.error('Error al cancelar:', error);
      toast.error('Error al cancelar el pago');
    }
  }

  const filteredPayments = filterStatus === 'all'
    ? payments
    : payments.filter(p => p.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'En Proceso';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
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
            <span className="text-white font-semibold hidden sm:block">| Gestión de Pagos</span>
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
          <h1 className="text-3xl font-extrabold text-brand-negro">Gestión de Pagos</h1>
          <p className="text-brand-gris mt-1">Administra los pagos a freelancers</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-brand-borde">
            <p className="text-xs text-brand-gris uppercase font-semibold">Total Pagos</p>
            <p className="text-2xl font-extrabold text-brand-negro mt-1">{payments.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-brand-borde">
            <p className="text-xs text-brand-gris uppercase font-semibold">Pendientes</p>
            <p className="text-2xl font-extrabold text-yellow-600 mt-1">
              {payments.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-brand-borde">
            <p className="text-xs text-brand-gris uppercase font-semibold">Completados</p>
            <p className="text-2xl font-extrabold text-green-600 mt-1">
              {payments.filter(p => p.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-brand-borde">
            <p className="text-xs text-brand-gris uppercase font-semibold">Monto Total Pagado</p>
            <p className="text-2xl font-extrabold text-brand-negro mt-1">
              ${payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-brand-borde p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-brand-negro text-white' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
              }`}
            >
              Todos ({payments.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'pending' ? 'bg-brand-negro text-white' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
              }`}
            >
              Pendientes ({payments.filter(p => p.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilterStatus('processing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'processing' ? 'bg-brand-negro text-white' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
              }`}
            >
              En Proceso ({payments.filter(p => p.status === 'processing').length})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'completed' ? 'bg-brand-negro text-white' : 'bg-brand-crema text-brand-negro hover:bg-brand-crema/70'
              }`}
            >
              Completados ({payments.filter(p => p.status === 'completed').length})
            </button>
          </div>
        </div>

        {/* Lista de pagos */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-brand-borde">
            <DollarSign className="mx-auto h-12 w-12 text-brand-gris opacity-30 mb-4" />
            <p className="text-brand-gris">No hay pagos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-white rounded-xl border border-brand-borde p-6">
                <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-brand-negro text-lg">{payment.jobs?.title || 'Trabajo'}</h3>
                    <p className="text-sm text-brand-gris mt-1">
                      Freelancer: {payment.profiles?.full_name || 'N/A'} ({payment.profiles?.email || 'N/A'})
                    </p>
                    <p className="text-xs text-brand-gris mt-1">
                      Categoría: {payment.jobs?.category || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-brand-gris mb-1">Monto</p>
                    <p className="text-2xl font-extrabold text-green-600">${Number(payment.amount).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-brand-borde">
                  <div>
                    <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Estado</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                      {getStatusLabel(payment.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Método</p>
                    <p className="text-sm font-medium text-brand-negro">{payment.payment_method_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Fecha de Pago</p>
                    <p className="text-sm font-medium text-brand-negro">
                      {payment.payment_date
                        ? new Date(payment.payment_date).toLocaleDateString('es-ES')
                        : 'Pendiente'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Referencia</p>
                    <p className="text-sm font-medium text-brand-negro">
                      {payment.reference_number || 'N/A'}
                    </p>
                  </div>
                </div>

                {payment.notes && (
                  <div className="mb-4 p-3 bg-brand-crema/30 rounded-lg">
                    <p className="text-xs text-brand-gris uppercase font-semibold mb-1">Notas</p>
                    <p className="text-sm text-brand-negro">{payment.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-brand-borde flex-wrap">
                  {payment.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleOpenForm(payment)}
                        className="tm-btn-rojo flex items-center gap-1 text-xs"
                      >
                        <DollarSign size={14} />
                        Registrar Pago
                      </button>
                      <button 
                        onClick={() => handleCancelPayment(payment.id)}
                        className="tm-btn-outline flex items-center gap-1 text-xs"
                      >
                        <XCircle size={14} />
                        Cancelar
                      </button>
                    </>
                  )}
                  {payment.status === 'completed' && (
                    <Link
                      href={`/admin/payments/${payment.id}/receipt`}
                      className="tm-btn-outline flex items-center gap-1 text-xs"
                    >
                      <Download size={14} />
                      Ver Recibo
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal para registrar pago */}
      {showForm && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Registrar Pago</h2>
                <p className="text-gray-400 text-sm mt-1">{selectedPayment.jobs?.title}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Freelancer: {selectedPayment.profiles?.full_name} · Monto: ${Number(selectedPayment.amount).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setSelectedPayment(null); }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-5">
              {/* Métodos de pago del freelancer */}
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Método de Pago del Freelancer *
                </label>
                {freelancerMethods.length === 0 ? (
                  <p className="text-sm text-brand-gris bg-yellow-50 p-3 rounded-lg">
                    ⚠️ El freelancer no tiene métodos de pago registrados
                  </p>
                ) : (
                  <select
                    value={formData.payment_method_id}
                    onChange={(e) => {
                      const method = freelancerMethods.find(m => m.id === e.target.value);
                      setFormData({
                        ...formData,
                        payment_method_id: e.target.value,
                        payment_method_type: method?.method_type || '',
                      });
                    }}
                    className="tm-input"
                    required
                  >
                    <option value="">Seleccionar método</option>
                    {freelancerMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.method_name} {method.is_default ? '(Predeterminado)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Detalles del método seleccionado */}
              {formData.payment_method_id && (
                <div className="bg-brand-crema/30 rounded-lg p-4">
                  <p className="text-xs text-brand-gris uppercase font-semibold mb-2">Datos del método seleccionado:</p>
                  {(() => {
                    const method = freelancerMethods.find(m => m.id === formData.payment_method_id);
                    if (!method) return null;
                    return Object.entries(method.account_details || {}).map(([key, value]) => (
                      <p key={key} className="text-sm text-brand-negro">
                        <span className="font-semibold">{key.replace('_', ' ').toUpperCase()}:</span> {value as string}
                      </p>
                    ));
                  })()}
                </div>
              )}

              {/* Número de referencia */}
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Número de Referencia / Comprobante *
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="tm-input"
                  placeholder="Ej: REF-2024-001, N° de transferencia, etc."
                  required
                />
                <p className="text-xs text-brand-gris mt-1">
                  Identificador único del pago realizado
                </p>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="tm-input resize-none"
                  placeholder="Observaciones sobre el pago..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedPayment(null); }}
                  className="flex-1 tm-btn-outline"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 tm-btn-rojo flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Registrar Pago
                    </>
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