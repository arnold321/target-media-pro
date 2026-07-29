import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailProps {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Error al enviar email:', error);
      return { success: false, error };
    }

    console.log('Email enviado exitosamente:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error };
  }
}

// Plantillas de email
export function newProposalEmail(freelancerName: string, jobTitle: string, message: string) {
  return {
    subject: `Nueva propuesta recibida: ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nueva propuesta recibida</h2>
        <p><strong>Freelancer:</strong> ${freelancerName}</p>
        <p><strong>Trabajo:</strong> ${jobTitle}</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Mensaje:</strong></p>
          <p style="margin: 8px 0 0 0;">${message}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Revisa las propuestas en tu panel de administrador.
        </p>
      </div>
    `,
  };
}

export function deliverableUploadedEmail(freelancerName: string, jobTitle: string) {
  return {
    subject: `Entregable subido: ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Entregable recibido</h2>
        <p><strong>Freelancer:</strong> ${freelancerName}</p>
        <p><strong>Trabajo:</strong> ${jobTitle}</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>Acción requerida:</strong></p>
          <p style="margin: 8px 0 0 0;">Revisa el entregable y aprueba o solicita cambios.</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Ve a tu panel de administrador para revisar el trabajo.
        </p>
      </div>
    `,
  };
}