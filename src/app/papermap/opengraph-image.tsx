import { ImageResponse } from 'next/og'

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
  // Font
  const spaceGrotesk = fetch(
    new URL('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap', import.meta.url)
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 72,
          background: 'linear-gradient(to bottom, #f9fafb, #e5e7eb)',
          color: '#111827',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Space Grotesk"',
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
        
        {/* Content */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '15px',
            padding: '40px 60px',
            backgroundColor: 'rgba(255,255,255,0.85)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            zIndex: 1
          }}
        >
          {/* Paper/document icon */}
          <div style={{
            display: 'flex',
            marginBottom: '32px'
          }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <path d="M19 5V19H5V5H19ZM21 3H3V21H21V3ZM17 7H7V9H17V7ZM17 11H7V13H17V11ZM13 15H7V17H13V15Z" fill="#3b82f6"/>
            </svg>
          </div>
          
          <h1 
            style={{ 
              fontSize: '80px', 
              margin: '0',
              color: '#111827',
              letterSpacing: '-0.025em'
            }}
          >
            PaperMap
          </h1>
          <p style={{ 
            fontSize: '32px', 
            marginTop: '16px', 
            color: '#4b5563',
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            Turn Any PDF into an Interactive AI Mindmap
          </p>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Space Grotesk',
          data: await spaceGrotesk,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
} 