import { ImageResponse } from '@vercel/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Ask Al - Experimental AI Apps'
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
          background: 'linear-gradient(to bottom, #000000, #111827)',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            borderRadius: '15px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            width: 'auto',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              marginBottom: '20px',
              display: 'flex',
              background: 'linear-gradient(to right, #4F46E5, #06B6D4)',
              borderRadius: '50%',
              width: 120,
              height: 120,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C13.1046 2 14 2.89543 14 4C14 4.74028 13.5978 5.38663 13 5.73244V7H14C16.2091 7 18 8.79086 18 11V15.2676C18.5978 15.6134 19 16.2597 19 17C19 18.1046 18.1046 19 17 19C15.8954 19 15 18.1046 15 17C15 16.2597 15.4022 15.6134 16 15.2676V11C16 9.89543 15.1046 9 14 9H10C8.89543 9 8 9.89543 8 11V15.2676C8.59777 15.6134 9 16.2597 9 17C9 18.1046 8.10457 19 7 19C5.89543 19 5 18.1046 5 17C5 16.2597 5.40223 15.6134 6 15.2676V11C6 8.79086 7.79086 7 10 7H11V5.73244C10.4022 5.38663 10 4.74028 10 4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
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
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-0.05em',
              }}
            >
              Ask Al
            </h1>
            <p
              style={{
                fontSize: 28,
                color: '#E5E7EB',
                margin: 0,
                marginTop: 10,
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              Experimental AI Apps
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