'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Logo } from '@/app/components/ui';

interface ReceiptData {
  payment: {
    id: string;
    amount: number;
    payment_method_type: string;
    reference_number: string;
    payment_date: string;
    notes: string | null;
    created_at: string;
  };
  job: {
    title: string;
    category: string;
    budget: number;
  };
  freelancer: {
    full_name: string;
    email: string;
  };
  admin: {
    full_name: string;
    email: string;
  };
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadReceipt();
  }, [params.id]);

  async function loadReceipt() {
    const { data: paymentData, error } = await supabase
      .from('payments')
      .select(`
        *,
        jobs (title, category, budget),
        profiles:freelancer_id (full_name, email),
        admin_profile:admin_id (full_name, email)
      `)
      .eq('id', params.id)
      .single();

    if (error || !paymentData) {
      router.push('/admin/payments');
      return;
    }

    setData({
      payment: paymentData,
      job: paymentData.jobs,
      freelancer: paymentData.profiles,
      admin: paymentData.admin_profile,
    });
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-crema flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-rojo mx-auto"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      {/* Barra de acciones (no se imprime) */}
      <div className="bg-brand-negro py-3.5 px-5 print:hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/admin/payments')}
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white"
          >
            <ArrowLeft size={14} /> Volver a pagos
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="tm-btn-rojo flex items-center gap-2"
            >
              <Printer size={16} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Contenido del recibo */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8 print:px-0 print:py-0">
        <div className="bg-white rounded-xl border border-brand-borde p-8 print:border-0 print:rounded-none print:shadow-none">
          {/* Header del recibo */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-brand-negro">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-negro">RECIBO DE PAGO</h1>
              <p className="text-brand-gris mt-1">N° {data.payment.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-gris uppercase font-semibold">Fecha de Emisión</p>
              <p className="text-lg font-bold text-brand-negro">
                {new Date(data.payment.payment_date).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Información del pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-xs text-brand-gris uppercase font-semibold mb-3">Pagado a</h2>
              <div className="bg-brand-crema/30 rounded-lg p-4">
                <p className="font-bold text-brand-negro text-lg">{data.freelancer.full_name}</p>
                <p className="text-sm text-brand-gris">{data.freelancer.email}</p>
                <p className="text-xs text-brand-gris mt-2 uppercase font-semibold">Método de Pago</p>
                <p className="text-sm text-brand-negro font-medium">{data.payment.payment_method_type}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs text-brand-gris uppercase font-semibold mb-3">Proyecto</h2>
              <div className="bg-brand-crema/30 rounded-lg p-4">
                <p className="font-bold text-brand-negro text-lg">{data.job.title}</p>
                <p className="text-sm text-brand-gris">{data.job.category}</p>
              </div>
            </div>
          </div>

          {/* Monto */}
          <div className="bg-brand-negro text-white rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Monto Total Pagado</p>
                <p className="text-4xl font-extrabold mt-2">
                  ${Number(data.payment.amount).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-semibold">Referencia</p>
                <p className="text-lg font-bold mt-2">{data.payment.reference_number}</p>
              </div>
            </div>
          </div>

          {/* Notas */}
          {data.payment.notes && (
            <div className="mb-8">
              <h2 className="text-xs text-brand-gris uppercase font-semibold mb-2">Notas</h2>
              <p className="text-brand-texto text-sm bg-brand-crema/30 rounded-lg p-4">
                {data.payment.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-brand-borde">
            <div className="flex justify-between items-center text-xs text-brand-gris">
              <div>
                <p className="font-semibold text-brand-negro">Target Media Connect</p>
                <p>Recibo generado automáticamente</p>
              </div>
              <div className="text-right">
                <p>Procesado por: {data.admin.full_name}</p>
                <p>{data.admin.email}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}