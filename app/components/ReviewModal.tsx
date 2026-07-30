'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Star, Save } from 'lucide-react';
import { useToast } from './ToastProvider';

interface ReviewModalProps {
  job: {
    id: string;
    title: string;
    rating: number | null;
    review_text: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ job, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(job.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(job.review_text || '');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          rating: rating,
          review_text: reviewText.trim(),
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Reseña guardada correctamente');
      onSuccess();
    } catch (error) {
      console.error('Error al guardar reseña:', error);
      toast.error('Error al guardar la reseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-white">Calificar Trabajo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-brand-negro mb-2">{job.title}</p>
            
            <label className="block text-sm font-semibold text-brand-negro mb-2">Calificación</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">Reseña (Opcional)</label>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="tm-input resize-none"
              placeholder="Escribe una breve reseña sobre el desempeño del freelancer..."
            />
          </div>

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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save size={16} />
              )}
              Guardar Reseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}