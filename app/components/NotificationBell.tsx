'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Check, MessageCircle, CheckCircle, XCircle, Upload, RotateCcw, TrendingUp, Users } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
}

const ICONS: Record<string, any> = {
  message: MessageCircle,
  proposal_approved: CheckCircle,
  proposal_rejected: XCircle,
  deliverable_uploaded: Upload,
  assignment_cancelled: RotateCcw,
  job_status_changed: TrendingUp,
  new_proposal: Users,
};

const COLORS: Record<string, string> = {
  message: 'bg-blue-100 text-blue-600',
  proposal_approved: 'bg-green-100 text-green-600',
  proposal_rejected: 'bg-red-100 text-red-600',
  deliverable_uploaded: 'bg-purple-100 text-purple-600',
  assignment_cancelled: 'bg-orange-100 text-orange-600',
  job_status_changed: 'bg-yellow-100 text-yellow-600',
  new_proposal: 'bg-indigo-100 text-indigo-600',
};

export default function NotificationBell({ userId, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    
    loadNotifications();
    
    if (!isSubscribedRef.current) {
      setupRealtime();
      isSubscribedRef.current = true;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        isSubscribedRef.current = false;
      }
    };
  }, [userId]);

  async function loadNotifications() {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
    setLoading(false);
  }

  function setupRealtime() {
    channelRef.current = supabase.channel(`notifications-${userId}`);

    channelRef.current
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => { // ✅ CORREGIDO: Agregado ': any'
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => { // ✅ CORREGIDO: Agregado ': any'
          const updated = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          setUnreadCount(prev => updated.read ? prev - 1 : prev);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Notificaciones realtime suscritas correctamente');
        }
      });
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function deleteNotification(notificationId: string) {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
        title="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-brand-rojo text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-brand-borde overflow-hidden z-50 max-h-[500px] flex flex-col">
          <div className="bg-brand-negro p-4 flex justify-between items-center">
            <h3 className="text-white font-bold text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-gray-300 hover:text-white flex items-center gap-1"
              >
                <Check size={12} /> Marcar todas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-rojo"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-brand-gris text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = ICONS[notif.type] || Bell;
                const colorClass = COLORS[notif.type] || 'bg-gray-100 text-gray-600';
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border-b border-brand-borde hover:bg-brand-crema/30 cursor-pointer transition-colors ${
                      !notif.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-sm font-semibold ${!notif.read ? 'text-brand-negro' : 'text-brand-gris'}`}>
                            {notif.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="text-brand-gris hover:text-brand-rojo flex-shrink-0"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-brand-gris mt-1 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-brand-gris mt-1">{formatTime(notif.created_at)}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-brand-rojo rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}