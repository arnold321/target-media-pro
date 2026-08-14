'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit, Image as ImageIcon, X, Save } from 'lucide-react';
import { Logo } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export default function NewsManagement() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    checkAdminAndLoadNews();
  }, []);

  async function checkAdminAndLoadNews() {
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

    await loadNews();
    setLoading(false);
  }

  async function loadNews() {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setNews(data || []);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update({
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNews.id);

        if (error) throw error;
        toast.success('Noticia actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('news')
          .insert([{
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url,
          }]);

        if (error) throw error;
        toast.success('Noticia creada exitosamente');
      }

      setShowForm(false);
      setEditingNews(null);
      setFormData({ title: '', description: '', image_url: '' });
      await loadNews();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la noticia');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(newsId: string) {
    if (!confirm('¿Eliminar esta noticia?')) return;

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', newsId);

      if (error) throw error;
      toast.success('Noticia eliminada');
      await loadNews();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar la noticia');
    }
  }

  async function handleToggleActive(newsItem: NewsItem) {
    try {
      const { error } = await supabase
        .from('news')
        .update({ is_active: !newsItem.is_active })
        .eq('id', newsItem.id);

      if (error) throw error;
      toast.success(newsItem.is_active ? 'Noticia desactivada' : 'Noticia activada');
      await loadNews();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar el estado');
    }
  }

  function handleEdit(newsItem: NewsItem) {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      description: newsItem.description,
      image_url: newsItem.image_url || '',
    });
    setShowForm(true);
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
            <span className="text-white font-semibold hidden sm:block">| Gestión de Noticias</span>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-negro">Gestión de Noticias</h1>
            <p className="text-brand-gris mt-1">Administra las novedades que aparecen en la pantalla de login</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingNews(null);
              setFormData({ title: '', description: '', image_url: '' });
            }}
            className="tm-btn-rojo inline-flex items-center gap-2"
          >
            <Plus size={18} /> Nueva Noticia
          </button>
        </div>

        {/* Lista de noticias */}
        {news.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-brand-borde">
            <ImageIcon className="mx-auto h-16 w-16 text-brand-gris opacity-30 mb-4" />
            <h3 className="text-xl font-bold text-brand-negro mb-2">No hay noticias creadas</h3>
            <p className="text-brand-gris">Crea la primera noticia para mostrar en la pantalla de login</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-brand-borde overflow-hidden hover:shadow-lg transition-shadow">
                {item.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-brand-negro text-lg line-clamp-2">{item.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-sm text-brand-gris line-clamp-3 mb-4">{item.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 tm-btn-outline flex items-center justify-center gap-1 text-xs"
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="flex-1 tm-btn-outline flex items-center justify-center gap-1 text-xs"
                    >
                      {item.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-brand-rojo hover:text-brand-rojo-hover p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal para crear/editar noticia */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-brand-negro rounded-t-2xl p-6 flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-white">
                {editingNews ? 'Editar Noticia' : 'Nueva Noticia'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingNews(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="tm-input"
                  placeholder="Ej: Nueva funcionalidad disponible"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  Descripción *
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="tm-input resize-none"
                  placeholder="Breve descripción de la novedad..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-negro mb-2">
                  URL de la Imagen
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="tm-input"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <p className="text-xs text-brand-gris mt-1">
                  Puedes usar URLs de Unsplash, Pexels, o subir a un servicio de hosting de imágenes
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-brand-borde">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNews(null);
                  }}
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
                      {editingNews ? 'Actualizar' : 'Crear'} Noticia
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