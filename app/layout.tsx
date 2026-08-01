import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/app/components/ToastProvider';
import { ThemeProvider } from '@/app/components/ThemeContext';

export const metadata: Metadata = {
  title: 'Target Media Connect - Conectamos Talento Freelance con Oportunidades',
  description: 'Plataforma profesional para conectar empresas con freelancers talentosos. Publica trabajos, recibe propuestas y gestiona proyectos de forma eficiente.',
  keywords: ['freelance', 'trabajos', 'diseño', 'desarrollo', 'marketing', 'target media', 'conectar talento'],
  authors: [{ name: 'Target Media' }],
  creator: 'Target Media Connect',
  publisher: 'Target Media',
  metadataBase: new URL('https://targetdcorp.targetmediaconnect.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://targetdcorp.targetmediaconnect.com',
    siteName: 'Target Media Connect',
    title: 'Target Media Connect - Conectamos Talento Freelance con Oportunidades',
    description: 'Plataforma profesional para conectar empresas con freelancers talentosos. Publica trabajos, recibe propuestas y gestiona proyectos de forma eficiente.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Target Media Connect - Plataforma Freelance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Target Media Connect - Conectamos Talento Freelance con Oportunidades',
    description: 'Plataforma profesional para conectar empresas con freelancers talentosos.',
    images: ['/og-image.png'],
    creator: '@targetmedia',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}