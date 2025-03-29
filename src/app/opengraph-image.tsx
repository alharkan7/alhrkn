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
  const interBold = fetch(
    new URL('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap', import.meta.url)
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 72,
          background: 'linear-gradient(to bottom, #000000, #111827)',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Space Grotesk"',
        }}
      >
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '15px',
            padding: '40px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
          }}
        >
          <h1 
            style={{ 
              fontSize: '80px', 
              margin: '0',
              backgroundImage: 'linear-gradient(90deg, #4F46E5, #06B6D4)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.025em'
            }}
          >
            Ask Al
          </h1>
          <p style={{ fontSize: '32px', marginTop: '20px', color: '#E5E7EB' }}>
            Experimental AI Apps by @alhrkn
          </p>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Space Grotesk',
          data: await interBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
} 