import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(to bottom right, #1F2937, #111827)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20 }}>
          Target Media Connect
        </div>
        <div style={{ fontSize: 40, color: '#D9374A', marginBottom: 40 }}>
          Conectamos Talento Freelance con Oportunidades
        </div>
        <div style={{ fontSize: 30, color: '#9CA3AF' }}>
          targetdcorp.targetmediaconnect.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}