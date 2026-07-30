'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Send, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

interface ChatModalProps {
  job: {
    id: string;
    title: string;
    assigned_freelancer_id: string | null;
  };
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  onClose: () => void;
}

export default function ChatModal({ 
  job, 
  currentUserId, 
  currentUserName,
  currentUserRole,
  onClose 
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes iniciales y configurar realtime
  useEffect(() => {
    let isSubscribed = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id (full_name, role)
          `)
          .eq('job_id', job.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!isSubscribed) return;

        const formattedMessages: Message[] = (data || []).map(msg => ({
          ...msg,
          sender_name: msg.sender?.full_name || 'Usuario',
          sender_role: msg.sender?.role || 'user',
        }));

        setMessages(formattedMessages);

        // Marcar mensajes como leídos
        const unreadMessages = formattedMessages.filter(
          msg => msg.sender_id !== currentUserId && !msg.read
        );

        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadMessages.map(m => m.id));
        }
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    function setupRealtime() {
      // Crear el canal y suscribirse PRIMERO
      channel = supabase.channel(`chat-${job.id}`);

      // Agregar el callback ANTES de suscribirse (encadenado correctamente)
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `job_id=eq.${job.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            // ✅ NUEVA LÍNEA: Si el mensaje NO es mío, avisar al panel admin para actualizar el badge
            if (newMsg.sender_id !== currentUserId) {
              window.dispatchEvent(new CustomEvent('new-chat-message', { detail: { jobId: newMsg.job_id } }));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Chat realtime suscrito correctamente');
          }
        });
    }

    loadMessages();
    setupRealtime();

    // Cleanup: remover canal al desmontar
    return () => {
      isSubscribed = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [job.id, currentUserId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          job_id: job.id,
          sender_id: currentUserId,
          content: messageContent,
          read: false,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-brand-negro rounded-t-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-brand-rojo/20 p-2 rounded-lg">
              <MessageCircle size={20} className="text-brand-rojo" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Chat del Trabajo</h2>
              <p className="text-gray-400 text-xs truncate max-w-xs">{job.title}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 bg-brand-crema/30 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-rojo"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle size={48} className="text-brand-gris mb-3 opacity-30" />
              <p className="text-brand-gris text-sm">Aún no hay mensajes</p>
              <p className="text-brand-gris text-xs mt-1">Inicia la conversación</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center my-4">
                  <span className="bg-white px-3 py-1 rounded-full text-xs text-brand-gris shadow-sm">
                    {date}
                  </span>
                </div>
                <div className="space-y-2">
                  {msgs.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                          {!isMe && (
                            <p className="text-xs text-brand-gris mb-1 ml-1">
                              {msg.sender_name} {msg.sender_role === 'admin' && '👑'}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isMe
                                ? 'bg-brand-rojo text-white rounded-br-md'
                                : 'bg-white text-brand-negro border border-brand-borde rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-brand-gris'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input para enviar mensaje */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 border-t border-brand-borde bg-white rounded-b-2xl"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 tm-input"
              disabled={sending}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="tm-btn-rojo flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send size={16} />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
          <p className="text-[10px] text-brand-gris mt-1 text-right">
            {newMessage.length}/1000
          </p>
        </form>
      </div>
    </div>
  );
}