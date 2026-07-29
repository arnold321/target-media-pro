'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, DollarSign, Calendar, FileText, Link, Send, AlertCircle, CheckCircle2, Briefcase, Tag } from 'lucide-react';

interface ProposalModalProps {
  job: {
    id: string;
    title: string;
    category: string;
    budget: number;
    description: string;
    entregables?: string;
  };
  freelancerId: string;
  onClose: () => void;
}

export default function ProposalModal({ job, freelancerId, onClose }: ProposalModalProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState(job.budget.toString());
  const [deliveryDays, setDeliveryDays] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!proposedBudget) {
      newErrors.proposedBudget = 'El presupuesto es obligatorio';
    } else if (Number(proposedBudget) <= 0) {
      newErrors.proposedBudget = 'El presupuesto debe ser mayor a 0';
    }

    if (!deliveryDays) {
      newErrors.deliveryDays = 'El tiempo de entrega es obligatorio';
    } else if (Number(deliveryDays) <= 0) {
      newErrors.deliveryDays = 'Los días deben ser mayor a 0';
    }

    if (!coverLetter.trim()) {
      newErrors.coverLetter = 'La carta de presentación es obligatoria';
    } else if (coverLetter.trim().length < 20) {
      newErrors.coverLetter = 'La carta debe tener al menos 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('proposals')
        .insert({
          job_id: job.id,
          freelancer_id: freelancerId,
          cover_letter: coverLetter.trim(),
          proposed_budget: parseFloat(proposedBudget),
          delivery_days: parseInt(deliveryDays),
          portfolio_link: portfolio.trim() || null,
          status: 'pendiente',
        });

      if (error) throw error;

      // Enviar notificación por email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', freelancerId)
        .single();

      if (profileData) {
        await fetch('/api/notify-new-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freelancerName: profileData.full_name,
            jobTitle: job.title,
            message: coverLetter,
          }),
        });
      }

      setSuccess(true);
      
      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al enviar propuesta:', err);
      setError(err.message || 'Error al enviar la propuesta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-brand-crema text-brand-vino font-semibold text-xs px-3 py-1 rounded-full">
                {job.category}
              </span>
              <span className="text-gray-400 text-sm">
                Presupuesto: ${Number(job.budget).toLocaleString()}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">{job.title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1 ml-4"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {success ? (
            // Mensaje de éxito
            <div className="text-center py-8">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-brand-negro mb-2">¡Propuesta enviada!</h3>
              <p className="text-brand-gris">
                Target revisará tu propuesta y te notificará por correo electrónico.
              </p>
            </div>
          ) : (
            <>
              {/* Descripción del trabajo */}
              <div className="bg-brand-crema/50 rounded-lg p-4 mb-6 border border-brand-borde">
                <h3 className="text-sm font-semibold text-brand-negro mb-2 flex items-center gap-2">
                  <Briefcase size={16} />
                  Descripción del trabajo
                </h3>
                <p className="text-sm text-brand-texto leading-relaxed">{job.description}</p>
                {job.entregables && (
                  <div className="mt-3 pt-3 border-t border-brand-borde">
                    <h4 className="text-xs font-semibold text-brand-gris uppercase tracking-wide mb-1">
                      Entregables esperados
                    </h4>
                    <p className="text-sm text-brand-texto">{job.entregables}</p>
                  </div>
                )}
              </div>

              {/* Mensaje de error general */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Presupuesto y Tiempo de entrega en fila */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Presupuesto propuesto */}
                  <div>
                    <label className="block text-sm font-semibold text-brand-negro mb-2">
                      Tu precio (USD) *
                    </label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={proposedBudget}
                        onChange={(e) => {
                          setProposedBudget(e.target.value);
                          if (errors.proposedBudget) setErrors({ ...errors, proposedBudget: '' });
                        }}
                        className={`tm-input pl-10 ${errors.proposedBudget ? 'border-red-500 focus:outline-red-500' : ''}`}
                        placeholder="Ej: 2200"
                      />
                    </div>
                    {errors.proposedBudget && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.proposedBudget}
                      </p>
                    )}
                  </div>

                  {/* Tiempo de entrega */}
                  <div>
                    <label className="block text-sm font-semibold text-brand-negro mb-2">
                      Tiempo de entrega (días) *
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                      <input
                        type="number"
                        min="1"
                        value={deliveryDays}
                        onChange={(e) => {
                          setDeliveryDays(e.target.value);
                          if (errors.deliveryDays) setErrors({ ...errors, deliveryDays: '' });
                        }}
                        className={`tm-input pl-10 ${errors.deliveryDays ? 'border-red-500 focus:outline-red-500' : ''}`}
                        placeholder="Ej: 15"
                      />
                    </div>
                    {errors.deliveryDays && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.deliveryDays}
                      </p>
                    )}
                  </div>
                </div>

                {/* Carta de presentación */}
                <div>
                  <label className="block text-sm font-semibold text-brand-negro mb-2">
                    Carta de presentación *
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-3 text-brand-gris" />
                    <textarea
                      rows={5}
                      value={coverLetter}
                      onChange={(e) => {
                        setCoverLetter(e.target.value);
                        if (errors.coverLetter) setErrors({ ...errors, coverLetter: '' });
                      }}
                      className={`tm-input pl-10 resize-none ${errors.coverLetter ? 'border-red-500 focus:outline-red-500' : ''}`}
                      placeholder="Cuéntale a Target por qué eres la persona indicada: experiencia relevante, enfoque, qué incluye tu precio..."
                    />
                  </div>
                  {errors.coverLetter && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.coverLetter}
                    </p>
                  )}
                  <p className="text-xs text-brand-gris mt-1">
                    Mínimo 20 caracteres · {coverLetter.length} caracteres
                  </p>
                </div>

                {/* Link a portafolio */}
                <div>
                  <label className="block text-sm font-semibold text-brand-negro mb-2">
                    Link a portafolio (opcional)
                  </label>
                  <div className="relative">
                    <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                    <input
                      type="text"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      className="tm-input pl-10"
                      placeholder="behance.net/tuusuario o github.com/tuusuario"
                    />
                  </div>
                  <p className="text-xs text-brand-gris mt-1">
                    Opcional · Muestra tu trabajo anterior
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4 border-t border-brand-borde">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 tm-btn-outline"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 tm-btn-rojo flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar Propuesta
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}