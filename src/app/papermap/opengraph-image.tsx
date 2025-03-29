import { ImageResponse } from '@vercel/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'PaperMap - Turn Any PDF into an Interactive AI Mindmap'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom, #f9fafb, #e5e7eb)',
          position: 'relative',
          color: '#111827',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        {/* Grid background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(#64748b20 1px, transparent 1px),
            linear-gradient(to right, #64748b20 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          zIndex: 0
        }} />
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 60px',
            borderRadius: '15px',
            backgroundColor: 'rgba(255,255,255,0.85)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            zIndex: 1,
            width: 'auto',
          }}
        >
          {/* Paper/document icon */}
          <div style={{
            display: 'flex',
            marginBottom: '32px',
            background: 'linear-gradient(to right, #3b82f6, #2563eb)',
            borderRadius: '12px',
            width: 110,
            height: 110,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="70" height="70" viewBox="0 0 24 24" fill="none">
              <path d="M19 5V19H5V5H19ZM21 3H3V21H21V3ZM17 7H7V9H17V7ZM17 11H7V13H17V11ZM13 15H7V17H13V15Z" fill="white"/>
            </svg>
          </div>
          
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <h1
              style={{
                fontSize: 70,
                fontWeight: 800,
                margin: 0,
                marginTop: 10,
                color: '#111827',
                lineHeight: 1.1,
                letterSpacing: '-0.05em',
              }}
            >
              PaperMap
            </h1>
            <p
              style={{
                fontSize: 28,
                color: '#4b5563',
                margin: 0,
                marginTop: 10,
                lineHeight: 1.5,
                textAlign: 'center',
                maxWidth: 500,
              }}
            >
              Turn Any PDF into an Interactive AI Mindmap
            </p>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
} 