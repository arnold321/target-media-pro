'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Download, Database, UserPlus } from 'lucide-react';
import { Logo } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';

interface ParsedJob {
  freelancer_email: string;
  title: string;
  category: string;
  description?: string;
  budget: number;
  completed_date?: string;
  entregables?: string;
  _row?: number;
  _error?: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

export default function BulkImportPage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [parsedJobs, setParsedJobs] = useState<ParsedJob[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [autoCreateFreelancer, setAutoCreateFreelancer] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const text = await file.text();
      let jobs: ParsedJob[] = [];

      if (file.name.endsWith('.json')) {
        jobs = parseJSON(text);
      } else if (file.name.endsWith('.csv')) {
        jobs = parseCSV(text);
      } else {
        toast.error('Formato no soportado. Usa JSON o CSV.');
        setLoading(false);
        return;
      }

      if (jobs.length === 0) {
        toast.error('El archivo está vacío o no tiene el formato correcto.');
        setLoading(false);
        return;
      }

      setParsedJobs(jobs);
      setStep('preview');
      toast.success(`${jobs.length} trabajos detectados en el archivo`);
    } catch (error) {
      console.error('Error al leer archivo:', error);
      toast.error('Error al procesar el archivo. Verifica el formato.');
    } finally {
      setLoading(false);
    }
  };

  const parseJSON = (text: string): ParsedJob[] => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('El JSON debe ser un array');
      return data.map((item: any, index: number) => ({
        ...item,
        _row: index + 1,
        budget: Number(item.budget) || 0,
      }));
    } catch (error) {
      toast.error('JSON inválido. Verifica la sintaxis.');
      return [];
    }
  };

  const parseCSV = (text: string): ParsedJob[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['freelancer_email', 'title', 'category', 'budget'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      toast.error(`Faltan columnas obligatorias: ${missing.join(', ')}`);
      return [];
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = { _row: index + 2 };
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      obj.budget = Number(obj.budget) || 0;
      return obj;
    });
  };

  const validateJobs = (): ParsedJob[] => {
    return parsedJobs.map(job => {
      const errors: string[] = [];
      if (!job.freelancer_email) errors.push('Email del freelancer es obligatorio');
      if (!job.title) errors.push('Título es obligatorio');
      if (!job.category) errors.push('Categoría es obligatoria');
      if (!job.budget || job.budget <= 0) errors.push('Presupuesto debe ser mayor a 0');
      return { ...job, _error: errors.join('; ') || undefined };
    });
  };

  const handleImport = async () => {
    const validatedJobs = validateJobs();
    const validJobs = validatedJobs.filter(j => !j._error);
    const invalidJobs = validatedJobs.filter(j => j._error);

    setLoading(true);
    const errors: Array<{ row: number; email: string; error: string }> = [];
    let successful = 0;

    try {
      // Procesar cada trabajo válido
      for (const job of validJobs) {
        try {
          // 1. Buscar freelancer por email
          const { data: freelancer, error: freelancerError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('email', job.freelancer_email)
            .single();

          let freelancerId = freelancer?.id;

          // 2. Si no existe y autoCreate está activado, crearlo
          if (!freelancerId && autoCreateFreelancer) {
            const { data: newFreelancer, error: createError } = await supabase
              .from('profiles')
              .insert({
                email: job.freelancer_email,
                full_name: job.freelancer_email.split('@')[0],
                role: 'freelancer',
                is_approved: true,
              })
              .select('id')
              .single();

            if (createError) throw createError;
            freelancerId = newFreelancer.id;
          }

          if (!freelancerId) {
            errors.push({
              row: job._row || 0,
              email: job.freelancer_email,
              error: 'Freelancer no encontrado en la base de datos',
            });
            continue;
          }

          // 3. Insertar el trabajo
          const { error: jobError } = await supabase.from('jobs').insert({
            title: job.title,
            description: job.description || `Trabajo importado: ${job.title}`,
            category: job.category,
            budget: job.budget,
            status: 'completado',
            assigned_freelancer_id: freelancerId,
            created_at: job.completed_date || new Date().toISOString(),
            entregables: job.entregables || 'Entregables según especificaciones',
            deadline: null,
            overdue_notified: false,
          });

          if (jobError) throw jobError;
          successful++;
        } catch (error: any) {
          errors.push({
            row: job._row || 0,
            email: job.freelancer_email,
            error: error.message || 'Error desconocido',
          });
        }
      }

      // 4. Agregar errores de validación
      invalidJobs.forEach(job => {
        errors.push({
          row: job._row || 0,
          email: job.freelancer_email || 'N/A',
          error: job._error || 'Datos inválidos',
        });
      });

      // 5. Guardar log de importación
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('bulk_imports').insert({
        imported_by: user?.id,
        filename: fileName,
        total_records: validatedJobs.length,
        successful,
        failed: errors.length,
        errors: JSON.stringify(errors),
      });

      setResult({
        total: validatedJobs.length,
        successful,
        failed: errors.length,
        errors,
      });

      setStep('result');
      toast.success(`Importación completada: ${successful} exitosos, ${errors.length} errores`);
    } catch (error: any) {
      console.error('Error en importación:', error);
      toast.error(`Error crítico: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        freelancer_email: 'ejemplo@correo.com',
        title: 'Título del trabajo',
        category: 'Diseño',
        description: 'Descripción detallada del trabajo',
        budget: 1500,
        completed_date: '2026-08-15',
        entregables: 'Entregables específicos',
      },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_trabajos.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFileName('');
    setParsedJobs([]);
    setStep('upload');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Carga Masiva de Trabajos</span>
          </div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Volver al Panel
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-negro flex items-center gap-3">
            <Database className="text-brand-rojo" />
            Carga Masiva de Trabajos Completados
          </h1>
          <p className="text-brand-gris mt-1">
            Importa trabajos ya finalizados desde un archivo JSON o CSV para registrarlos en el sistema.
          </p>
        </div>

        {step === 'upload' && (
          <div className="bg-white rounded-xl border border-brand-borde p-8 shadow-sm">
            <div className="text-center">
              <div className="bg-brand-crema/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-10 w-10 text-brand-rojo" />
              </div>
              <h2 className="text-xl font-bold text-brand-negro mb-2">Sube tu archivo</h2>
              <p className="text-brand-gris mb-6">
                Formatos soportados: <strong>JSON</strong> o <strong>CSV</strong> (exportable desde Excel)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 tm-btn-rojo cursor-pointer"
              >
                <FileText size={18} />
                {loading ? 'Procesando...' : 'Seleccionar Archivo'}
              </label>

              <div className="mt-8 text-left bg-brand-crema/30 rounded-lg p-6 border border-brand-borde">
                <h3 className="font-bold text-brand-negro mb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Formato requerido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-brand-negro mb-2">Campos obligatorios:</p>
                    <ul className="space-y-1 text-brand-gris">
                      <li>• <code className="bg-white px-2 py-0.5 rounded">freelancer_email</code> - Email del freelancer</li>
                      <li>• <code className="bg-white px-2 py-0.5 rounded">title</code> - Título del trabajo</li>
                      <li>• <code className="bg-white px-2 py-0.5 rounded">category</code> - Categoría</li>
                      <li>• <code className="bg-white px-2 py-0.5 rounded">budget</code> - Presupuesto en USD</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-brand-negro mb-2">Campos opcionales:</p>
                    <ul className="space-y-1 text-brand-gris">
                      <li>• <code className="bg-white px-2 py-0.5 rounded">description</code> - Descripción</li>
                      <li>• <code className="bg-white px-2 py-0.5 rounded">completed_date</code> - Fecha (YYYY-MM-DD)</li>
                      <li>• <code className="bg-white px-2 py-0.5 rounded">entregables</code> - Entregables</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-brand-rojo hover:text-brand-vino font-semibold"
                >
                  <Download size={16} />
                  Descargar plantilla JSON de ejemplo
                </button>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateFreelancer}
                    onChange={(e) => setAutoCreateFreelancer(e.target.checked)}
                    className="mt-1 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-blue-900 flex items-center gap-2">
                      <UserPlus size={16} />
                      Crear freelancer automáticamente si no existe
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Si el email del freelancer no está registrado en el sistema, se creará un perfil automáticamente con rol "freelancer" y aprobado.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-brand-borde p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-brand-negro">Vista Previa</h2>
                  <p className="text-sm text-brand-gris">
                    Archivo: <strong>{fileName}</strong> · {parsedJobs.length} trabajos detectados
                  </p>
                </div>
                <button onClick={resetImport} className="tm-btn-outline text-sm">
                  Cambiar archivo
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-brand-gris uppercase bg-brand-crema/50">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Freelancer</th>
                      <th className="px-4 py-3 text-left">Título</th>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-right">Presupuesto</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-borde">
                    {parsedJobs.map((job, index) => {
                      const hasError = !job.freelancer_email || !job.title || !job.category || !job.budget || job.budget <= 0;
                      return (
                        <tr key={index} className={hasError ? 'bg-red-50' : 'bg-white'}>
                          <td className="px-4 py-3 text-brand-gris">{job._row || index + 1}</td>
                          <td className="px-4 py-3 font-medium">{job.freelancer_email || <span className="text-red-600">Falta</span>}</td>
                          <td className="px-4 py-3">{job.title || <span className="text-red-600">Falta</span>}</td>
                          <td className="px-4 py-3">{job.category || <span className="text-red-600">Falta</span>}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            ${Number(job.budget).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-brand-gris">{job.completed_date || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            {hasError ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                <AlertCircle size={12} /> Error
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                <CheckCircle2 size={12} /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between items-center flex-wrap gap-3">
                <div className="text-sm text-brand-gris">
                  <span className="text-green-600 font-semibold">
                    ✓ {parsedJobs.filter(j => j.freelancer_email && j.title && j.category && j.budget > 0).length} válidos
                  </span>
                  {' · '}
                  <span className="text-red-600 font-semibold">
                    ✗ {parsedJobs.filter(j => !j.freelancer_email || !j.title || !j.category || !j.budget || j.budget <= 0).length} con errores
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={resetImport} className="tm-btn-outline">
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading || parsedJobs.filter(j => j.freelancer_email && j.title && j.category && j.budget > 0).length === 0}
                    className="tm-btn-rojo flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Importando...
                      </>
                    ) : (
                      <>
                        <Database size={16} />
                        Confirmar Importación
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-brand-borde p-8 shadow-sm text-center">
              <div className={`rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 ${
                result.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {result.failed === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-yellow-600" />
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-brand-negro mb-2">
                {result.failed === 0 ? '¡Importación Exitosa!' : 'Importación Completada con Errores'}
              </h2>
              <p className="text-brand-gris mb-6">
                Se procesaron {result.total} registros del archivo <strong>{fileName}</strong>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-brand-crema/30 rounded-lg p-4">
                  <p className="text-xs text-brand-gris uppercase font-semibold">Total</p>
                  <p className="text-3xl font-extrabold text-brand-negro">{result.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-700 uppercase font-semibold">Exitosos</p>
                  <p className="text-3xl font-extrabold text-green-600">{result.successful}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-xs text-red-700 uppercase font-semibold">Fallidos</p>
                  <p className="text-3xl font-extrabold text-red-600">{result.failed}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Errores detallados
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm bg-white rounded p-3 border border-red-100">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-brand-negro">Fila {error.row} · {error.email}</p>
                            <p className="text-red-700 text-xs mt-1">{error.error}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button onClick={resetImport} className="tm-btn-rojo">
                  Importar Otro Archivo
                </button>
                <button onClick={() => router.push('/admin')} className="tm-btn-outline">
                  Volver al Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Carga Masiva de Trabajos
      </footer>
    </div>
  );
}