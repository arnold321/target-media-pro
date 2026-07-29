import { NextResponse } from 'next/server';
import { sendEmail, deliverableUploadedEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { freelancerName, jobTitle } = body;

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ error: 'ADMIN_EMAIL no configurado' }, { status: 500 });
    }

    const emailContent = deliverableUploadedEmail(freelancerName, jobTitle);
    
    const result = await sendEmail({
      to: adminEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en notify-deliverable:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}