'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Plus, DollarSign, Tag, Package, AlertCircle } from 'lucide-react';

interface NewJobFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
}

export default function NewJobForm({ onClose, onSuccess }: NewJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    entregables: '',
  });
  
  // Estados para categorías y subcategorías
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar categorías al montar el componente
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      setCategories(data || []);
    }
    loadCategories();
  }, []);

  // Cargar subcategorías cuando cambia la categoría seleccionada
  useEffect(() => {
    async function loadSubcategories() {
      if (!selectedCategoryId) {
        setSubcategories([]);
        setSelectedSubcategoryId('');
        return;
      }

      const { data } = await supabase
        .from('subcategories')
        .select('id, name')
        .eq('category_id', selectedCategoryId)
        .order('name');
      
      setSubcategories(data || []);
      setSelectedSubcategoryId(''); // Resetear subcategoría al cambiar de categoría
    }
    loadSubcategories();
  }, [selectedCategoryId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    } else if (formData.title.trim().length < 10) {
      newErrors.title = 'El título debe tener al menos 10 caracteres';
    }

    if (!selectedCategoryId) {
      newErrors.category = 'La categoría es obligatoria';
    }

    if (!formData.budget) {
      newErrors.budget = 'El presupuesto es obligatorio';
    } else if (Number(formData.budget) <= 0) {
      newErrors.budget = 'El presupuesto debe ser mayor a 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.trim().length < 30) {
      newErrors.description = 'La descripción debe tener al menos 30 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Construir el string de categoría (ej: "Diseño > Diseño de Logo")
      const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || '';
      const subcategoryName = subcategories.find(s => s.id === selectedSubcategoryId)?.name || '';
      const finalCategoryString = subcategoryName ? `${categoryName} > ${subcategoryName}` : categoryName;

      const { error } = await supabase
        .from('jobs')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: finalCategoryString, // Guardamos el string combinado
          budget: parseFloat(formData.budget),
          entregables: formData.entregables.trim() || 'A definir con el freelancer',
          status: 'abierto',
        });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error al crear trabajo:', error);
      setErrors({ submit: 'Error al crear el trabajo. Por favor, intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Publicar Nuevo Trabajo</h2>
            <p className="text-gray-400 text-sm mt-1">
              Completa los detalles para publicar una nueva oportunidad
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} />
              <span className="text-sm">{errors.submit}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">
              Título del trabajo *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className={`tm-input ${errors.title ? 'border-red-500 focus:outline-red-500' : ''}`}
              placeholder="Ej: Diseño de landing page para cliente retail"
              maxLength={100}
            />
            {errors.title && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.title}
              </p>
            )}
            <p className="text-xs text-brand-gris mt-1">
              {formData.title.length}/100 caracteres
            </p>
          </div>

          {/* Categoría y Subcategoría en fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">
                Categoría *
              </label>
              <div className="relative">
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    if (errors.category) setErrors({ ...errors, category: '' });
                  }}
                  className={`tm-input pl-10 appearance-none ${errors.category ? 'border-red-500' : ''}`}
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.category}
                </p>
              )}
            </div>

            {/* Subcategoría */}
            <div>
              <label className="block text-sm font-semibold text-brand-negro mb-2">
                Subcategoría {selectedCategoryId ? '*' : '(Selecciona categoría primero)'}
              </label>
              <div className="relative">
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gris" />
                <select
                  value={selectedSubcategoryId}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                  className="tm-input pl-10 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!selectedCategoryId}
                >
                  <option value="">Seleccionar subcategoría</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Presupuesto */}
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">
              Presupuesto (USD) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign size={16} className="text-brand-gris" />
              </div>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.budget}
                onChange={(e) => {
                  setFormData({ ...formData, budget: e.target.value });
                  if (errors.budget) setErrors({ ...errors, budget: '' });
                }}
                className={`tm-input pl-10 ${errors.budget ? 'border-red-500 focus:outline-red-500' : ''}`}
                placeholder="Ej: 500"
              />
            </div>
            {errors.budget && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.budget}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">
              Descripción *
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              className={`tm-input resize-none ${errors.description ? 'border-red-500 focus:outline-red-500' : ''}`}
              placeholder="Describe el proyecto, alcance, requisitos, plazos estimados..."
            />
            {errors.description && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.description}
              </p>
            )}
            <p className="text-xs text-brand-gris mt-1">
              Mínimo 30 caracteres · {formData.description.length} caracteres
            </p>
          </div>

          {/* Entregables */}
          <div>
            <label className="block text-sm font-semibold text-brand-negro mb-2">
              Entregables esperados
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3">
                <Package size={16} className="text-brand-gris" />
              </div>
              <textarea
                rows={3}
                value={formData.entregables}
                onChange={(e) => setFormData({ ...formData, entregables: e.target.value })}
                className="tm-input pl-10 resize-none"
                placeholder="Ej: Archivos finales en formato editable + documentación"
              />
            </div>
            <p className="text-xs text-brand-gris mt-1">
              Opcional · Se puede definir después con el freelancer
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
                  Publicando...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Publicar Trabajo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}