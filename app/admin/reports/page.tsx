'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, Download, Calendar, DollarSign, Users, Briefcase, 
  TrendingUp, ArrowLeft, Filter, PieChart, BarChart3, FileSpreadsheet
} from 'lucide-react';
import { Logo } from '@/app/components/ui';
import { useToast } from '@/app/components/ToastProvider';

type ReportType = 'financial' | 'activity' | 'freelancers' | 'proposals' | 'jobs' | 'monthly-income' | 'delivery-compliance';

interface Filters {
  startDate: string;
  endDate: string;
  category: string;
  status: string;
  freelancerId: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const toast = useToast();

  const [reportType, setReportType] = useState<ReportType>('financial');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    category: '',
    status: '',
    freelancerId: '',
  });

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [freelancers, setFreelancers] = useState<Array<{ id: string; full_name: string }>>([]);

  const reportTypes = {
    financial: { label: 'Reporte Financiero', icon: DollarSign, color: 'text-green-600' },
    activity: { label: 'Reporte de Actividad', icon: BarChart3, color: 'text-blue-600' },
    freelancers: { label: 'Reporte de Freelancers', icon: Users, color: 'text-purple-600' },
    proposals: { label: 'Reporte de Propuestas', icon: PieChart, color: 'text-orange-600' },
    jobs: { label: 'Reporte de Trabajos', icon: Briefcase, color: 'text-brand-rojo' },
    'monthly-income': { label: 'Ingresos por Mes', icon: TrendingUp, color: 'text-emerald-600' },
    'delivery-compliance': { label: 'Cumplimiento de Entregas', icon: Calendar, color: 'text-cyan-600' },
  };

  const loadFilterOptions = async () => {
    try {
      const { data: cats } = await supabase.from('categories').select('id, name').order('name');
      setCategories(cats || []);

      const { data: freelancersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'freelancer')
        .order('full_name');
      setFreelancers(freelancersData || []);
    } catch (error) {
      console.error('Error al cargar filtros:', error);
    }
  };

  const generateFinancialReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select(`
          id, title, budget, status, created_at,
          category,
          profiles!jobs_assigned_freelancer_id_fkey (full_name, email)
        `)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate);

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.status) query = query.eq('status', filters.status);

      const { data: jobs, error } = await query;
      if (error) throw error;

      const completedJobs = jobs?.filter(j => j.status === 'completado') || [];
      const totalRevenue = completedJobs.reduce((sum: number, j: any) => sum + Number(j.budget), 0);
      const platformCommission = totalRevenue * 0.10;
      const totalPaidToFreelancers = totalRevenue - platformCommission;

      const pdf = new jsPDF();
      
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Reporte Financiero', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text(`Target Media Connect`, 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Período: ${format(parseISO(filters.startDate), 'dd/MM/yyyy')} - ${format(parseISO(filters.endDate), 'dd/MM/yyyy')}`, 15, 50);
      if (filters.category) pdf.text(`Categoría: ${filters.category}`, 15, 56);

      pdf.setFillColor(244, 228, 214);
      pdf.roundedRect(15, 65, 180, 35, 3, 3, 'F');
      
      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text('Total Ingresos:', 25, 75);
      pdf.setFontSize(16);
      pdf.setTextColor(22, 163, 74);
      pdf.text(`$${totalRevenue.toLocaleString()}`, 25, 85);

      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text('Comisión Plataforma (10%):', 85, 75);
      pdf.setFontSize(16);
      pdf.setTextColor(59, 130, 246);
      pdf.text(`$${platformCommission.toLocaleString()}`, 85, 85);

      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text('Pagado a Freelancers:', 150, 75);
      pdf.setFontSize(16);
      pdf.setTextColor(168, 85, 247);
      pdf.text(`$${totalPaidToFreelancers.toLocaleString()}`, 150, 85);

      const tableData = completedJobs.map(job => [
        job.title.substring(0, 40),
        job.category,
        (job.profiles as any)?.full_name || 'N/A',
        `$${Number(job.budget).toLocaleString()}`,
        format(parseISO(job.created_at), 'dd/MM/yyyy'),
      ]);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.text(`Trabajos Completados (${completedJobs.length})`, 15, 115);

      autoTable(pdf, {
        startY: 120,
        head: [['Trabajo', 'Categoría', 'Freelancer', 'Monto', 'Fecha']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 20, 35], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25 },
        },
      });

      const finalY = (pdf as any).lastAutoTable.finalY + 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('© Target Media Connect - Reporte Confidencial', 15, finalY);
      pdf.text(`Página 1 de 1`, 180, finalY);

      pdf.save(`reporte_financiero_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte financiero generado');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error al generar reporte: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateActivityReport = async () => {
    setLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('status, category, created_at')
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate);

      if (error) throw error;

      const byStatus = jobs?.reduce((acc: Record<string, number>, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const byCategory = jobs?.reduce((acc: Record<string, number>, job: any) => {
        acc[job.category] = (acc[job.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const pdf = new jsPDF();
      
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Reporte de Actividad', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text(`Target Media Connect`, 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Período: ${format(parseISO(filters.startDate), 'dd/MM/yyyy')} - ${format(parseISO(filters.endDate), 'dd/MM/yyyy')}`, 15, 50);

      pdf.setFillColor(244, 228, 214);
      pdf.roundedRect(15, 60, 85, 50, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text('Por Estado', 25, 72);

      let yPos = 82;
      Object.entries(byStatus).forEach(([status, count]) => {
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${status}: ${count}`, 25, yPos);
        yPos += 8;
      });

      pdf.setFillColor(244, 228, 214);
      pdf.roundedRect(110, 60, 85, 50, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text('Por Categoría', 120, 72);

      yPos = 82;
      Object.entries(byCategory).slice(0, 6).forEach(([category, count]) => {
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${category.substring(0, 25)}: ${count}`, 120, yPos);
        yPos += 8;
      });

      pdf.setFontSize(14);
      pdf.setTextColor(110, 20, 35);
      pdf.text(`Total Trabajos: ${jobs?.length || 0}`, 15, 130);

      pdf.save(`reporte_actividad_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte de actividad generado');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateFreelancersReport = async () => {
    setLoading(true);
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select(`
          assigned_freelancer_id, budget, status, rating,
          profiles!jobs_assigned_freelancer_id_fkey (full_name, email)
        `)
        .eq('status', 'completado');

      const freelancerStats: Record<string, any> = {};
      
      jobs?.forEach(job => {
        const fid = job.assigned_freelancer_id as string;
        if (!fid) return;
        
        if (!freelancerStats[fid]) {
          freelancerStats[fid] = {
            name: (job.profiles as any)?.full_name || 'N/A',
            email: (job.profiles as any)?.email || 'N/A',
            jobs: 0,
            earnings: 0,
            ratings: [],
          };
        }
        freelancerStats[fid].jobs += 1;
        freelancerStats[fid].earnings += Number(job.budget);
        if (job.rating) freelancerStats[fid].ratings.push(job.rating);
      });

      const tableData = Object.values(freelancerStats).map((stat: any) => [
        stat.name,
        stat.email,
        stat.jobs,
        `$${stat.earnings.toLocaleString()}`,
        stat.ratings.length > 0 
          ? (stat.ratings.reduce((a: number, b: number) => a + b, 0) / stat.ratings.length).toFixed(1)
          : 'N/A',
      ]);

      const pdf = new jsPDF();
      
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Reporte de Freelancers', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text(`Target Media Connect`, 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Total Freelancers Activos: ${Object.keys(freelancerStats).length}`, 15, 50);

      autoTable(pdf, {
        startY: 60,
        head: [['Freelancer', 'Email', 'Trabajos', 'Ingresos', 'Rating']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 20, 35], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 20, halign: 'center' },
        },
      });

      pdf.save(`reporte_freelancers_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte de freelancers generado');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateProposalsReport = async () => {
    setLoading(true);
    try {
      const { data: proposals } = await supabase
        .from('proposals')
        .select(`
          status, proposed_budget, created_at,
          jobs (title),
          profiles (full_name)
        `)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate);

      const byStatus = proposals?.reduce((acc: Record<string, number>, p: any) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalProposals = proposals?.length || 0;
      const approvedProposals = byStatus['aprobada'] || 0;
      const approvalRate = totalProposals > 0 ? ((approvedProposals / totalProposals) * 100).toFixed(1) : '0';

      const pdf = new jsPDF();
      
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Reporte de Propuestas', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text(`Target Media Connect`, 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Período: ${format(parseISO(filters.startDate), 'dd/MM/yyyy')} - ${format(parseISO(filters.endDate), 'dd/MM/yyyy')}`, 15, 50);

      pdf.setFillColor(244, 228, 214);
      pdf.roundedRect(15, 60, 180, 30, 3, 3, 'F');
      
      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text(`Total Propuestas: ${totalProposals}`, 25, 72);
      pdf.text(`Aprobadas: ${approvedProposals}`, 75, 72);
      pdf.text(`Tasa de Aprobación: ${approvalRate}%`, 130, 72);

      const tableData = proposals?.map(p => [
        (p.profiles as any)?.full_name || 'N/A',
        (p.jobs as any)?.title.substring(0, 35) || 'N/A',
        p.status,
        `$${Number(p.proposed_budget).toLocaleString()}`,
        format(parseISO(p.created_at), 'dd/MM/yyyy'),
      ]) || [];

      autoTable(pdf, {
        startY: 100,
        head: [['Freelancer', 'Trabajo', 'Estado', 'Presupuesto', 'Fecha']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 20, 35], textColor: 255 },
        styles: { fontSize: 9 },
      });

      pdf.save(`reporte_propuestas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte de propuestas generado');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateJobsReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *, 
          profiles!jobs_assigned_freelancer_id_fkey (full_name, email)
        `)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate);

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.freelancerId) query = query.eq('assigned_freelancer_id', filters.freelancerId);

      const { data: jobs, error } = await query;
      if (error) throw error;

      const tableData = jobs?.map(job => [
        job.title.substring(0, 35),
        job.category,
        (job.profiles as any)?.full_name || 'No asignado',
        job.status,
        `$${Number(job.budget).toLocaleString()}`,
        format(parseISO(job.created_at), 'dd/MM/yyyy'),
      ]) || [];

      const pdf = new jsPDF();
      
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Reporte de Trabajos', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text(`Target Media Connect`, 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Total: ${jobs?.length || 0} trabajos`, 15, 50);

      autoTable(pdf, {
        startY: 60,
        head: [['Trabajo', 'Categoría', 'Freelancer', 'Estado', 'Presupuesto', 'Fecha']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 20, 35], textColor: 255 },
        styles: { fontSize: 8 },
      });

      pdf.save(`reporte_trabajos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte de trabajos generado');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyIncomeReport = async () => {
    setLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('budget, status, created_at')
        .eq('status', 'completado')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const byMonth: Record<string, { count: number; total: number }> = {};
      jobs?.forEach(job => {
        const month = format(parseISO(job.created_at), 'yyyy-MM');
        if (!byMonth[month]) {
          byMonth[month] = { count: 0, total: 0 };
        }
        byMonth[month].count += 1;
        byMonth[month].total += Number(job.budget);
      });

      const tableData = Object.entries(byMonth).map(([month, data]) => [
        format(parseISO(month + '-01'), 'MMMM yyyy', { locale: es }),
        data.count,
        `$${data.total.toLocaleString()}`,
        `$${(data.total * 0.10).toLocaleString()}`,
        `$${(data.total * 0.90).toLocaleString()}`,
      ]);

      const totalRevenue = Object.values(byMonth).reduce((sum: number, d) => sum + d.total, 0);
      const totalCommission = totalRevenue * 0.10;

      const pdf = new jsPDF();
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Ingresos por Mes', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text('Target Media Connect', 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Total Histórico: $${totalRevenue.toLocaleString()} | Comisión Total: $${totalCommission.toLocaleString()}`, 15, 50);

      autoTable(pdf, {
        startY: 60,
        head: [['Mes', 'Trabajos', 'Ingresos Totales', 'Comisión (10%)', 'Pago Freelancers']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 20, 35], textColor: 255 },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
        },
      });

      pdf.save(`ingresos_por_mes_${format(new Date(), 'yyyy-MM')}.pdf`);
      toast.success('Reporte de ingresos por mes generado');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateDeliveryComplianceReport = async () => {
    setLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          id, title, deadline, created_at, status,
          profiles!jobs_assigned_freelancer_id_fkey (full_name, email)
        `)
        .in('status', ['completado', 'en_progreso', 'en_revision']);

      if (error) throw error;

      const now = new Date();
      const complianceData = jobs?.map(job => {
        if (!job.deadline) return null;
        
        const deadline = parseISO(job.deadline);
        const completedDate = job.status === 'completado' 
          ? parseISO(job.created_at)
          : now;
        
        const daysDifference = Math.floor((completedDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: string;
        
        if (daysDifference < 0) {
          status = 'Anticipado';
        } else if (daysDifference === 0) {
          status = 'A Tiempo';
        } else {
          status = 'Retrasado';
        }

        return {
          freelancer: (job.profiles as any)?.full_name || 'N/A',
          email: (job.profiles as any)?.email || 'N/A',
          title: job.title,
          deadline: format(deadline, 'dd/MM/yyyy'),
          completedDate: job.status === 'completado' ? format(completedDate, 'dd/MM/yyyy') : 'Pendiente',
          daysDifference: daysDifference,
          status: status,
        };
      }).filter(Boolean);

      const onTime = complianceData?.filter(d => d.status === 'A Tiempo' || d.status === 'Anticipado').length || 0;
      const delayed = complianceData?.filter(d => d.status === 'Retrasado').length || 0;
      const total = complianceData?.length || 0;
      const complianceRate = total > 0 ? ((onTime / total) * 100).toFixed(1) : '0';

      const pdf = new jsPDF();
      pdf.setFillColor(110, 20, 35);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Cumplimiento de Entregas', 15, 25);
      
      pdf.setFontSize(10);
      pdf.text('Target Media Connect', 15, 33);
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 33);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Tasa de Cumplimiento: ${complianceRate}% (${onTime} de ${total})`, 15, 50);

      pdf.setFillColor(220, 252, 231);
      pdf.roundedRect(15, 60, 60, 25, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(22, 163, 74);
      pdf.text(`A Tiempo/Anticipado`, 20, 70);
      pdf.setFontSize(16);
      pdf.text(`${onTime}`, 20, 80);

      pdf.setFillColor(254, 242, 242);
      pdf.roundedRect(85, 60, 60, 25, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(220, 38, 38);
      pdf.text(`Retrasados`, 95, 70);
      pdf.setFontSize(16);
      pdf.text(`${delayed}`, 95, 80);

      pdf.setFillColor(244, 228, 214);
      pdf.roundedRect(155, 60, 40, 25, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(110, 20, 35);
      pdf.text(`Total`, 165, 70);
      pdf.setFontSize(16);
      pdf.text(`${total}`, 165, 80);

      const tableData = complianceData?.map(d => [
        d.freelancer,
        d.title.substring(0, 30),
        d.deadline,
        d.completedDate,
        d.daysDifference > 0 ? `+${d.daysDifference}` : `${d.daysDifference}`,
        d.status,
      ]) || [];

      autoTable(pdf, {
        startY: 100,
        head: [['Freelancer', 'Trabajo', 'Fecha Límite', 'Entregado', 'Días Diff', 'Estado']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 20, 35], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 25 },
        },
      });

      pdf.save(`cumplimiento_entregas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte de cumplimiento generado');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (type: ReportType) => {
    setLoading(true);
    try {
      const XLSX = await import('xlsx');
      let data: any[] = [];
      let filename = '';

      if (type === 'monthly-income') {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('budget, status, created_at')
          .eq('status', 'completado')
          .order('created_at', { ascending: true });

        const byMonth: Record<string, { Mes: string; Trabajos: number; Ingresos: number; Comision: number; Pago_Freelancers: number }> = {};
        jobs?.forEach(job => {
          const month = format(parseISO(job.created_at), 'yyyy-MM');
          const monthName = format(parseISO(month + '-01'), 'MMMM yyyy', { locale: es });
          if (!byMonth[month]) {
            byMonth[month] = { Mes: monthName, Trabajos: 0, Ingresos: 0, Comision: 0, Pago_Freelancers: 0 };
          }
          byMonth[month].Trabajos += 1;
          byMonth[month].Ingresos += Number(job.budget);
          byMonth[month].Comision = byMonth[month].Ingresos * 0.10;
          byMonth[month].Pago_Freelancers = byMonth[month].Ingresos * 0.90;
        });

        data = Object.values(byMonth);
        filename = 'ingresos_por_mes.xlsx';
      } else if (type === 'delivery-compliance') {
        const { data: jobs } = await supabase
          .from('jobs')
          .select(`
            id, title, deadline, created_at, status,
            profiles!jobs_assigned_freelancer_id_fkey (full_name, email)
          `)
          .in('status', ['completado', 'en_progreso', 'en_revision']);

        const now = new Date();
        data = jobs?.map(job => {
          if (!job.deadline) return null;
          const deadline = parseISO(job.deadline);
          const completedDate = job.status === 'completado' ? parseISO(job.created_at) : now;
          const daysDifference = Math.floor((completedDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            Freelancer: (job.profiles as any)?.full_name || 'N/A',
            Email: (job.profiles as any)?.email || 'N/A',
            Trabajo: job.title,
            Fecha_Limite: format(deadline, 'dd/MM/yyyy'),
            Fecha_Entrega: job.status === 'completado' ? format(completedDate, 'dd/MM/yyyy') : 'Pendiente',
            Dias_Diferencia: daysDifference,
            Estado: daysDifference < 0 ? 'Anticipado' : daysDifference === 0 ? 'A Tiempo' : 'Retrasado',
          };
        }).filter(Boolean) || [];
        
        filename = 'cumplimiento_entregas.xlsx';
      } else {
        toast.error('Exportación a Excel solo disponible para Ingresos por Mes y Cumplimiento de Entregas');
        setLoading(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      XLSX.writeFile(wb, filename);
      
      toast.success('Excel exportado correctamente');
    } catch (error: any) {
      toast.error(`Error al exportar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    switch (reportType) {
      case 'financial': generateFinancialReport(); break;
      case 'activity': generateActivityReport(); break;
      case 'freelancers': generateFreelancersReport(); break;
      case 'proposals': generateProposalsReport(); break;
      case 'jobs': generateJobsReport(); break;
      case 'monthly-income': generateMonthlyIncomeReport(); break;
      case 'delivery-compliance': generateDeliveryComplianceReport(); break;
    }
  };

  return (
    <div className="min-h-screen bg-brand-crema flex flex-col">
      <header className="bg-brand-negro py-3.5 px-5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo height={34} />
            <span className="text-white font-semibold hidden sm:block">| Reportes</span>
          </div>
          <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Volver al Panel
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-negro flex items-center gap-3">
            <FileText className="text-brand-rojo" />
            Centro de Reportes
          </h1>
          <p className="text-brand-gris mt-1">
            Genera reportes detallados en PDF y Excel con filtros personalizados
          </p>
        </div>

        {/* Selector de Tipo de Reporte */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {(Object.entries(reportTypes) as Array<[ReportType, typeof reportTypes.financial]>).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setReportType(key)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportType === key
                    ? 'border-brand-rojo bg-brand-rojo/10'
                    : 'border-brand-borde bg-white hover:border-brand-rojo/50'
                }`}
              >
                <Icon className={`h-6 w-6 mx-auto mb-2 ${config.color}`} />
                <p className="text-xs font-semibold text-center text-brand-negro">{config.label}</p>
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-brand-borde p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-brand-negro mb-4 flex items-center gap-2">
            <Filter size={18} className="text-brand-rojo" />
            Filtros del Reporte
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-texto mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="tm-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-texto mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                Fecha Fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="tm-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-texto mb-1.5">
                Categoría
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="tm-input"
                onClick={loadFilterOptions}
              >
                <option value="">Todas</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {(reportType === 'financial' || reportType === 'activity') && (
              <div>
                <label className="block text-sm font-semibold text-brand-texto mb-1.5">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="tm-input"
                >
                  <option value="">Todos</option>
                  <option value="abierto">Abierto</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="completado">Completado</option>
                  <option value="anulado">Anulado</option>
                </select>
              </div>
            )}

            {reportType === 'jobs' && (
              <div>
                <label className="block text-sm font-semibold text-brand-texto mb-1.5">
                  Freelancer
                </label>
                <select
                  value={filters.freelancerId}
                  onChange={(e) => setFilters({ ...filters, freelancerId: e.target.value })}
                  className="tm-input"
                  onClick={loadFilterOptions}
                >
                  <option value="">Todos</option>
                  {freelancers.map(f => (
                    <option key={f.id} value={f.id}>{f.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-6">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex-1 tm-btn-rojo flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Generar Reporte PDF
                </>
              )}
            </button>

            {(reportType === 'monthly-income' || reportType === 'delivery-compliance') && (
              <button
                onClick={() => exportToExcel(reportType)}
                disabled={loading}
                className="flex-1 tm-btn-outline flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileSpreadsheet size={18} />
                Exportar a Excel
              </button>
            )}
          </div>
        </div>

        {/* Info del Reporte Seleccionado */}
        <div className="bg-brand-crema/30 rounded-xl border border-brand-borde p-6">
          <h3 className="font-bold text-brand-negro mb-2">
            {reportTypes[reportType].label}
          </h3>
          <p className="text-sm text-brand-gris">
            {reportType === 'financial' && 'Ingresos totales, comisión de plataforma y pagos a freelancers con desglose por trabajo completado.'}
            {reportType === 'activity' && 'Distribución de trabajos por estado y categoría en el período seleccionado.'}
            {reportType === 'freelancers' && 'Desempeño de todos los freelancers: trabajos completados, ingresos generados y rating promedio.'}
            {reportType === 'proposals' && 'Análisis de propuestas enviadas: tasa de aprobación, presupuestos y estado.'}
            {reportType === 'jobs' && 'Listado completo de trabajos con todos los detalles y filtros aplicados.'}
            {reportType === 'monthly-income' && 'Histórico de ingresos agrupados por mes con desglose de comisión y pago a freelancers. Disponible en PDF y Excel.'}
            {reportType === 'delivery-compliance' && 'Análisis de cumplimiento de plazos: identifica quién entregó a tiempo, antes o después de la fecha límite. Disponible en PDF y Excel.'}
          </p>
        </div>
      </main>

      <footer className="bg-brand-negro text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800">
        © Target Media {new Date().getFullYear()} · Centro de Reportes
      </footer>
    </div>
  );
}