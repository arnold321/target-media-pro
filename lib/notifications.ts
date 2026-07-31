import { supabase } from './supabase';

export type NotificationType = 
  | 'message'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'deliverable_uploaded'
  | 'assignment_cancelled'
  | 'job_status_changed'
  | 'new_proposal';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  referenceId?: string,
  referenceType?: 'job' | 'proposal' | 'message'
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        reference_id: referenceId || null,
        reference_type: referenceType || null,
      });

    if (error) {
      console.error('Error al crear notificación:', error);
    }
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
}