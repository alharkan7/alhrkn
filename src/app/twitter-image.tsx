import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Ask Al - Experimental AI Apps by @alhrkn'
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
          background: 'linear-gradient(to bottom right, #000000, #1e40af)',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Space Grotesk"',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 25% 25%, rgba(75, 85, 99, 0.2) 0%, transparent 45%)',
          zIndex: 0,
        }} />
        
        {/* Content container */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            padding: '20px',
          }}
        >
          {/* AI icon/logo */}
          <div style={{
            marginBottom: '32px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
          }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C13.1046 2 14 2.89543 14 4C14 4.74028 13.5978 5.38663 13 5.73244V7H14C16.2091 7 18 8.79086 18 11V15.2676C18.5978 15.6134 19 16.2597 19 17C19 18.1046 18.1046 19 17 19C15.8954 19 15 18.1046 15 17C15 16.2597 15.4022 15.6134 16 15.2676V11C16 9.89543 15.1046 9 14 9H10C8.89543 9 8 9.89543 8 11V15.2676C8.59777 15.6134 9 16.2597 9 17C9 18.1046 8.10457 19 7 19C5.89543 19 5 18.1046 5 17C5 16.2597 5.40223 15.6134 6 15.2676V11C6 8.79086 7.79086 7 10 7H11V5.73244C10.4022 5.38663 10 4.74028 10 4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
            </svg>
          </div>
          
          <h1 
            style={{ 
              fontSize: '80px', 
              margin: '0',
              color: 'white',
              letterSpacing: '-0.025em',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}
          >
            Ask Al
          </h1>
          <p style={{ 
            fontSize: '32px', 
            marginTop: '16px', 
            color: '#e5e7eb',
            textAlign: 'center',
            maxWidth: '600px',
          }}>
            Experimental AI Apps by @alhrkn
          </p>
        </div>
        
        {/* Twitter handle/username */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '24px',
          color: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" fill="#1DA1F2"/>
          </svg>
          @alhrkn
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