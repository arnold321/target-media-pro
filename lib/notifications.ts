import { supabase } from './supabase';

export type NotificationType = 
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'new_message'
  | 'job_overdue'
  | 'deadline_extended'
  | 'job_cancelled'
  | 'deliverable_uploaded';  // <-- AGREGAR ESTA LÍNEA

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  referenceId?: string,
  referenceType?: string
) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      is_read: false,
    });

    if (error) {
      console.error('Error al crear notificación:', error);
    }
  } catch (err) {
    console.error('Error inesperado al crear notificación:', err);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  } catch (err) {
    console.error('Error inesperado al actualizar notificación:', err);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
  } catch (err) {
    console.error('Error inesperado al actualizar notificaciones:', err);
  }
}