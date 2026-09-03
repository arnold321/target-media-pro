'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, CreditCard, Wallet, Building2, Smartphone, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/app/components/ToastProvider';

interface PaymentMethod {
  id: string;
  type: 'zelle' | 'paypal' | 'transfer' | 'binance' | 'pago_movil';
  account_holder: string;
  details: string;
  is_default: boolean;
  created_at: string;
}

const PAYMENT_METHODS_CONFIG = {
  zelle: {
    label: 'Zelle',
    icon: Smartphone,
    color: 'bg-purple-100 text-purple-700',
    placeholder: 'tu@email.com',
    label_details: 'Email o teléfono registrado en Zelle',
    validation: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[\d\s-]{10,}$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    },
    validation_message: 'Ingresa un email válido o número de teléfono con código de país',
  },
  paypal: {
    label: 'PayPal',
    icon: Wallet,
    color: 'bg-blue-100 text-blue-700',
    placeholder: 'tu@email.com',
    label_details: 'Email de PayPal',
    validation: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    validation_message: 'Ingresa un email válido de PayPal',
  },
  transfer: {
    label: 'Transferencia Bancaria',
    icon: Building2,
    color: 'bg-green-100 text-green-700',
    placeholder: 'Banco: XXX | Cuenta: XXX | Titular: XXX',
    label_details: 'Banco, número de cuenta y titular',
    validation: (value: string) => value.length >= 20,
    validation_message: 'Ingresa al menos 20 caracteres con la información bancaria completa',
  },
  binance: {
    label: 'Binance Pay',
    icon: CreditCard,
    color: 'bg-yellow-100 text-yellow-700',
    placeholder: 'tu@email.com o ID de Binance',
    label_details: 'Email o ID de Binance Pay',
    validation: (value: string) => value.length >= 5,
    validation_message: 'Ingresa un email o ID de Binance válido',
  },
  pago_movil: {
    label: 'Pago Móvil (Venezuela)',
    icon: Smartphone,
    color: 'bg-red-100 text-red-700',
    placeholder: 'Banco: XXX | Teléfono: 04XX-XXX-XXXX | Cédula: V-XXX',
    label_details: 'Banco, teléfono y cédula',
    validation: (value: string) => {
      const phoneRegex = /04\d{2}-\d{7}/;
      return value.length >= 25 && phoneRegex.test(value);
    },
    validation_message: 'Ingresa banco, teléfono (04XX-XXX-XXXX) y cédula completos',
  },
};

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<keyof typeof PAYMENT_METHODS_CONFIG>('zelle');
  const [accountHolder, setAccountHolder] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const toast = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  async function fetchPaymentMethods() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('freelancer_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error('Error al cargar métodos:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMethod() {
    const config = PAYMENT_METHODS_CONFIG[selectedType];
    
    if (!accountHolder.trim()) {
      toast.error('El nombre del titular es obligatorio');
      return;
    }

    if (!config.validation(details)) {
      toast.error(config.validation_message);
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isDefault = methods.length === 0;

      const { error } = await supabase
        .from('payment_methods')
        .insert({
          freelancer_id: user.id,
          type: selectedType,
          account_holder: accountHolder.trim(),
          details: details.trim(),
          is_default: isDefault,
        });

      if (error) throw error;

      toast.success('Método de pago agregado correctamente');
      setShowAddModal(false);
      setAccountHolder('');
      setDetails('');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error al agregar método:', error);
      toast.error('Error al agregar método de pago');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(methodId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Primero quitar el default de todos
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('freelancer_id', user.id);

      // Luego establecer el nuevo default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)
        .eq('freelancer_id', user.id);

      if (error) throw error;

      toast.success('Método predeterminado actualizado');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error al establecer default:', error);
      toast.error('Error al actualizar método predeterminado');
    }
  }

  async function handleDelete(methodId: string) {
    const method = methods.find(m => m.id === methodId);
    if (!method) return;

    if (!confirm(`¿Estás seguro de eliminar ${PAYMENT_METHODS_CONFIG[method.type].label} (${method.account_holder})?`)) {
      return;
    }

    setDeletingId(methodId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId)
        .eq('freelancer_id', user.id);

      if (error) throw error;

      toast.success('Método de pago eliminado');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar método de pago');
    } finally {
      setDeletingId(null);
    }
  }

  const defaultMethod = methods.find(m => m.is_default);
  const canAddMore = methods.length < 4;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-brand-negro">Métodos de Pago</h2>
          <p className="text-brand-gris mt-1">Agrega tus métodos de pago preferidos para recibir pagos</p>
        </div>
        {canAddMore && (
          <button
            onClick={() => setShowAddModal(true)}
            className="tm-btn-rojo flex items-center gap-2"
          >
            <Plus size={18} />
            Agregar Método
          </button>
        )}
      </div>

      {/* Límite de métodos */}
      {!canAddMore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Límite alcanzado</p>
            <p className="text-sm text-yellow-700">Has alcanzado el máximo de 4 métodos de pago. Elimina uno para agregar otro.</p>
          </div>
        </div>
      )}

      {/* Lista de métodos */}
      {methods.length === 0 ? (
        <div className="text-center py-16 bg-brand-crema/30 rounded-xl border border-brand-borde border-dashed">
          <Wallet className="mx-auto h-16 w-16 text-brand-gris opacity-30" />
          <h3 className="mt-4 text-xl font-bold text-brand-negro">Sin métodos de pago</h3>
          <p className="text-brand-gris mt-2 max-w-md mx-auto">
            Agrega al menos un método de pago para recibir los pagos de tus trabajos completados
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="tm-btn-rojo mt-6 inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Agregar Primer Método
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {methods.map((method) => {
            const config = PAYMENT_METHODS_CONFIG[method.type];
            const Icon = config.icon;

            return (
              <div
                key={method.id}
                className={`bg-white rounded-xl border-2 p-6 transition-all ${
                  method.is_default
                    ? 'border-brand-rojo shadow-lg shadow-brand-rojo/10'
                    : 'border-brand-borde hover:border-brand-rojo/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`${config.color} p-3 rounded-xl`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-brand-negro text-lg">{config.label}</h3>
                        {method.is_default && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} />
                            Predeterminado
                          </span>
                        )}
                      </div>
                      <p className="text-brand-negro font-semibold mt-1">{method.account_holder}</p>
                      <p className="text-brand-gris text-sm mt-1">{method.details}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {!method.is_default && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="text-xs font-semibold text-brand-rojo hover:bg-brand-rojo/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Establecer como principal
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(method.id)}
                      disabled={deletingId === method.id}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar método"
                    >
                      {deletingId === method.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para agregar método */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-brand-borde">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-extrabold text-brand-negro">Agregar Método de Pago</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAccountHolder('');
                    setDetails('');
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Selector de tipo */}
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-3">
                  Selecciona el método de pago
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.entries(PAYMENT_METHODS_CONFIG) as Array<[keyof typeof PAYMENT_METHODS_CONFIG, typeof PAYMENT_METHODS_CONFIG.zelle]>).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedType(key)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          selectedType === key
                            ? 'border-brand-rojo bg-brand-rojo/5'
                            : 'border-brand-borde hover:border-brand-rojo/50'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${selectedType === key ? 'text-brand-rojo' : 'text-brand-gris'}`} />
                        <span className={`text-sm font-semibold ${selectedType === key ? 'text-brand-negro' : 'text-brand-gris'}`}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-negro mb-2">
                    Nombre del titular *
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="tm-input"
                    placeholder="Tu nombre completo o razón social"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-negro mb-2">
                    {PAYMENT_METHODS_CONFIG[selectedType].label_details} *
                  </label>
                  <input
                    type="text"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="tm-input"
                    placeholder={PAYMENT_METHODS_CONFIG[selectedType].placeholder}
                  />
                  <p className="text-xs text-brand-gris mt-1">
                    {PAYMENT_METHODS_CONFIG[selectedType].validation_message}
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAccountHolder('');
                    setDetails('');
                  }}
                  className="flex-1 tm-btn-outline"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMethod}
                  disabled={saving}
                  className="flex-1 tm-btn-rojo flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Agregar Método
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