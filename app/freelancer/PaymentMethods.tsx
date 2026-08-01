'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, CreditCard, Globe, Smartphone, Bitcoin, DollarSign, X } from 'lucide-react';
import { useToast } from '@/app/components/ToastProvider';

interface PaymentMethod {
  id: string;
  method_type: string;
  method_name: string;
  account_details: any;
  is_default: boolean;
}

const METHOD_TYPES = [
  { value: 'bank_transfer_national', label: 'Transferencia Bancaria Nacional', icon: CreditCard },
  { value: 'bank_transfer_international', label: 'Transferencia Bancaria Internacional', icon: Globe },
  { value: 'zelle', label: 'Zelle', icon: DollarSign },
  { value: 'crypto', label: 'Criptomoneda', icon: Bitcoin },
  { value: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
  { value: 'paypal', label: 'PayPal', icon: DollarSign },
  { value: 'stripe', label: 'Stripe', icon: CreditCard },
];

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadMethods();
  }, []);

  async function loadMethods() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setMethods(data || []);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) {
      toast.error('Selecciona un tipo de método de pago');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const methodType = METHOD_TYPES.find(m => m.value === selectedType);
      
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          method_type: selectedType,
          method_name: methodType?.label || '',
          account_details: formData,
          is_default: methods.length === 0,
        });

      if (error) throw error;

      toast.success('Método de pago agregado exitosamente');
      setShowForm(false);
      setSelectedType('');
      setFormData({});
      await loadMethods();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar el método de pago');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(methodId: string) {
    if (!confirm('¿Eliminar este método de pago?')) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      toast.success('Método de pago eliminado');
      await loadMethods();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el método de pago');
    }
  }

  function renderFormFields() {
    switch (selectedType) {
      case 'bank_transfer_national':
        return (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Banco *</label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="tm-input"
                placeholder="Ej: Banco de Venezuela"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Número de Cuenta *</label>
              <input
                type="text"
                value={formData.account_number || ''}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="tm-input"
                placeholder="Ej: 0102-0123-45-6789012345"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Tipo de Cuenta *</label>
              <select
                value={formData.account_type || ''}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                className="tm-input"
                required
              >
                <option value="">Seleccionar</option>
                <option value="corriente">Corriente</option>
                <option value="ahorro">Ahorro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Cédula/RIF del Titular *</label>
              <input
                type="text"
                value={formData.id_number || ''}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                className="tm-input"
                placeholder="Ej: V-12345678"
                required
              />
            </div>
          </>
        );

      case 'bank_transfer_international':
        return (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Banco *</label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="tm-input"
                placeholder="Ej: Bank of America"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Número de Cuenta / IBAN *</label>
              <input
                type="text"
                value={formData.account_number || ''}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="tm-input"
                placeholder="Ej: US12345678901234567890"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">SWIFT/BIC *</label>
              <input
                type="text"
                value={formData.swift_code || ''}
                onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                className="tm-input"
                placeholder="Ej: BOFAUS3N"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">País *</label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="tm-input"
                placeholder="Ej: Estados Unidos"
                required
              />
            </div>
          </>
        );

      case 'zelle':
        return (
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">Email de Zelle *</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="tm-input"
              placeholder="Ej: tu@email.com"
              required
            />
          </div>
        );

      case 'crypto':
        return (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Criptomoneda *</label>
              <select
                value={formData.crypto_type || ''}
                onChange={(e) => setFormData({ ...formData, crypto_type: e.target.value })}
                className="tm-input"
                required
              >
                <option value="">Seleccionar</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
                <option value="USDC">USD Coin (USDC)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Dirección de Wallet *</label>
              <input
                type="text"
                value={formData.wallet_address || ''}
                onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                className="tm-input"
                placeholder="Ej: 0x1234..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Red *</label>
              <input
                type="text"
                value={formData.network || ''}
                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                className="tm-input"
                placeholder="Ej: ERC-20, BEP-20, Bitcoin"
                required
              />
            </div>
          </>
        );

      case 'pago_movil':
        return (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Banco *</label>
              <input
                type="text"
                value={formData.bank_code || ''}
                onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                className="tm-input"
                placeholder="Ej: 0102 (Banco de Venezuela)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Cédula *</label>
              <input
                type="text"
                value={formData.id_number || ''}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                className="tm-input"
                placeholder="Ej: V-12345678"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">Teléfono *</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="tm-input"
                placeholder="Ej: 0412-1234567"
                required
              />
            </div>
          </>
        );

      case 'paypal':
        return (
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">Email de PayPal *</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="tm-input"
              placeholder="Ej: tu@email.com"
              required
            />
          </div>
        );

      case 'stripe':
        return (
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">Email de Stripe *</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="tm-input"
              placeholder="Ej: tu@email.com"
              required
            />
          </div>
        );

      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-rojo"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-brand-negro">Métodos de Pago</h3>
          <p className="text-sm text-brand-gris mt-1">Agrega tus métodos de pago preferidos para recibir pagos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="tm-btn-rojo flex items-center gap-2"
        >
          <Plus size={16} />
          Agregar Método
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-12 bg-brand-crema/30 rounded-xl border border-brand-borde">
          <CreditCard className="mx-auto h-12 w-12 text-brand-gris opacity-30 mb-4" />
          <p className="text-brand-gris">No tienes métodos de pago configurados</p>
          <p className="text-xs text-brand-gris mt-2">Agrega al menos un método para recibir pagos</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => {
            const methodType = METHOD_TYPES.find(m => m.value === method.method_type);
            const Icon = methodType?.icon || CreditCard;
            
            return (
              <div key={method.id} className="bg-white rounded-xl border border-brand-borde p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="bg-brand-crema p-2 rounded-lg">
                      <Icon size={20} className="text-brand-vino" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-negro">{method.method_name}</h4>
                      {method.is_default && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Predeterminado
                        </span>
                      )}
                      <div className="mt-2 text-sm text-brand-gris">
                        {Object.entries(method.account_details).map(([key, value]) => (
                          <p key={key}>
                            <span className="font-semibold">{key.replace('_', ' ').toUpperCase()}:</span> {value as string}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="text-brand-gris hover:text-brand-rojo p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para agregar método */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Agregar Método de Pago</h2>
                <p className="text-gray-400 text-sm mt-1">Selecciona el tipo de método y completa los datos</p>
              </div>
              <button
                onClick={() => { setShowForm(false); setSelectedType(''); setFormData({}); }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">Tipo de Método de Pago *</label>
                <select
                  value={selectedType}
                  onChange={(e) => { setSelectedType(e.target.value); setFormData({}); }}
                  className="tm-input"
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {METHOD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {selectedType && (
                <div className="space-y-4">
                  {renderFormFields()}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedType(''); setFormData({}); }}
                  className="flex-1 tm-btn-outline"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedType}
                  className="flex-1 tm-btn-rojo flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Guardar Método
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