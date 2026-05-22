import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Watercolor Clipart by SuzyFlowArt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fef4ec 0%, #f5e4d5 100%)',
          padding: 80,
        }}
      >
        <div style={{ fontSize: 32, color: '#a8694a', marginBottom: 20, fontWeight: 500 }}>
          ✨ Watercolor Clipart
        </div>
        <div style={{ fontSize: 96, color: '#2c2418', textAlign: 'center', lineHeight: 1.1, fontWeight: 300 }}>
          Watercolor that <span style={{ color: '#a8694a', fontStyle: 'italic' }}>pops.</span>
        </div>
        <div style={{ fontSize: 96, color: '#2c2418', textAlign: 'center', lineHeight: 1.1, fontWeight: 300 }}>
          Clipart that <span style={{ fontStyle: 'italic' }}>slays.</span>
        </div>
        <div style={{ fontSize: 28, color: '#2c2418', opacity: 0.7, marginTop: 40 }}>
          1,600+ AI-crafted designs · Star Seller on Etsy
        </div>
      </div>
    ),
    { ...size }
  );
}
