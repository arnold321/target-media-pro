'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit2, X, Check, Folder, FolderOpen } from 'lucide-react';
import { Logo } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    checkAdminAndLoadCategories();
  }, []);

  async function checkAdminAndLoadCategories() {
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

    await loadCategories();
    setLoading(false);
  }

  async function loadCategories() {
    const { data: categoriesData, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error al cargar categorías:', error);
      return;
    }

    const { data: subcategoriesData } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');

    const categoriesWithSubs = (categoriesData || []).map(cat => ({
      ...cat,
      subcategories: (subcategoriesData || []).filter(sub => sub.category_id === cat.id),
    }));

    setCategories(categoriesWithSubs);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert({ name: categoryName.trim() });

      if (error) throw error;

      toast.success('Categoría creada exitosamente');
      setCategoryName('');
      setShowCategoryForm(false);
      await loadCategories();
    } catch (error) {
      console.error('Error al crear categoría:', error);
      toast.error('Error al crear la categoría');
    }
  }

  async function handleUpdateCategory(categoryId: string) {
    if (!categoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: categoryName.trim() })
        .eq('id', categoryId);

      if (error) throw error;

      toast.success('Categoría actualizada exitosamente');
      setCategoryName('');
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      toast.error('Error al actualizar la categoría');
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('¿Eliminar esta categoría? Se eliminarán también todas sus subcategorías.')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast.success('Categoría eliminada exitosamente');
      await loadCategories();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      toast.error('Error al eliminar la categoría');
    }
  }

  async function handleCreateSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!subcategoryName.trim() || !selectedCategoryId) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({ 
          category_id: selectedCategoryId, 
          name: subcategoryName.trim() 
        });

      if (error) throw error;

      toast.success('Subcategoría creada exitosamente');
      setSubcategoryName('');
      setShowSubcategoryForm(false);
      setSelectedCategoryId(null);
      await loadCategories();
    } catch (error) {
      console.error('Error al crear subcategoría:', error);
      toast.error('Error al crear la subcategoría');
    }
  }

  async function handleUpdateSubcategory(subcategoryId: string) {
    if (!subcategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .update({ name: subcategoryName.trim() })
        .eq('id', subcategoryId);

      if (error) throw error;

      toast.success('Subcategoría actualizada exitosamente');
      setSubcategoryName('');
      setEditingSubcategory(null);
      await loadCategories();
    } catch (error) {
      console.error('Error al actualizar subcategoría:', error);
      toast.error('Error al actualizar la subcategoría');
    }
  }

  async function handleDeleteSubcategory(subcategoryId: string) {
    if (!confirm('¿Eliminar esta subcategoría?')) return;

    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId);

      if (error) throw error;

      toast.success('Subcategoría eliminada exitosamente');
      await loadCategories();
    } catch (error) {
      console.error('Error al eliminar subcategoría:', error);
      toast.error('Error al eliminar la subcategoría');
    }
  }

  function startEditCategory(category: Category) {
    setCategoryName(category.name);
    setEditingCategory(category.id);
    setShowCategoryForm(true);
  }

  function startEditSubcategory(subcategory: Subcategory) {
    setSubcategoryName(subcategory.name);
    setEditingSubcategory(subcategory.id);
    setShowSubcategoryForm(true);
    setSelectedCategoryId(subcategory.category_id);
  }

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
            <span className="text-white font-semibold hidden sm:block">| Gestión de Categorías</span>
          </div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Volver al panel
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-negro">Categorías y Subcategorías</h1>
            <p className="text-brand-gris mt-1">Organiza los trabajos por categorías y subcategorías</p>
          </div>
          <button 
            onClick={() => {
              setShowCategoryForm(true);
              setEditingCategory(null);
              setCategoryName('');
            }}
            className="tm-btn-rojo inline-flex items-center gap-2"
          >
            <Plus size={18} /> Nueva Categoría
          </button>
        </div>

        {/* Formulario de Categoría */}
        {showCategoryForm && (
          <div className="bg-white rounded-xl border border-brand-borde p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-brand-negro">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={() => { setShowCategoryForm(false); setEditingCategory(null); setCategoryName(''); }} className="text-brand-gris hover:text-brand-negro">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingCategory ? () => handleUpdateCategory(editingCategory) : handleCreateCategory} className="flex gap-3">
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Nombre de la categoría"
                className="tm-input flex-1"
                required
              />
              <button type="submit" className="tm-btn-rojo flex items-center gap-2">
                <Check size={16} /> {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </form>
          </div>
        )}

        {/* Formulario de Subcategoría */}
        {showSubcategoryForm && (
          <div className="bg-white rounded-xl border border-brand-borde p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-brand-negro">
                {editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
              </h2>
              <button onClick={() => { setShowSubcategoryForm(false); setEditingSubcategory(null); setSubcategoryName(''); setSelectedCategoryId(null); }} className="text-brand-gris hover:text-brand-negro">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingSubcategory ? () => handleUpdateSubcategory(editingSubcategory) : handleCreateSubcategory} className="flex gap-3">
              <input
                type="text"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="Nombre de la subcategoría"
                className="tm-input flex-1"
                required
              />
              <button type="submit" className="tm-btn-rojo flex items-center gap-2">
                <Check size={16} /> {editingSubcategory ? 'Actualizar' : 'Crear'}
              </button>
            </form>
          </div>
        )}

        {/* Lista de Categorías */}
        <div className="grid gap-4">
          {categories.map(category => (
            <div key={category.id} className="bg-white rounded-xl border border-brand-borde overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <FolderOpen size={24} className="text-brand-rojo" />
                    <h3 className="text-xl font-bold text-brand-negro">{category.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setShowSubcategoryForm(true);
                        setEditingSubcategory(null);
                        setSubcategoryName('');
                      }}
                      className="tm-btn-outline flex items-center gap-1 text-xs"
                    >
                      <Plus size={14} /> Agregar Subcategoría
                    </button>
                    <button 
                      onClick={() => startEditCategory(category)}
                      className="text-brand-gris hover:text-brand-negro p-2"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-brand-rojo hover:text-brand-rojo-hover p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Subcategorías */}
                {category.subcategories && category.subcategories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {category.subcategories.map(sub => (
                      <div key={sub.id} className="bg-brand-crema/30 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Folder size={16} className="text-brand-vino" />
                          <span className="text-sm font-medium text-brand-negro">{sub.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => startEditSubcategory(sub)}
                            className="text-brand-gris hover:text-brand-negro p-1"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSubcategory(sub.id)}
                            className="text-brand-rojo hover:text-brand-rojo-hover p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-gris text-sm italic">No hay subcategorías</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <Folder size={48} className="mx-auto text-brand-gris opacity-30 mb-4" />
            <p className="text-brand-gris">No hay categorías creadas aún</p>
          </div>
        )}
      </main>
    </div>
  );
}