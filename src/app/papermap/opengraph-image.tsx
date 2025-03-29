import { ImageResponse } from '@vercel/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Open Graph (OG) Image Generation'
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
          background: 'white',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          <h1
            style={{
              fontSize: 90,
              fontWeight: 800,
              color: 'black',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              margin: 0,
              padding: 0,
            }}
          >
            Open Graph (OG)
          </h1>
          <h2
            style={{
              fontSize: 90,
              fontWeight: 800,
              color: 'black',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              margin: 0,
              padding: 0,
              marginTop: 10,
            }}
          >
            Image Generation
          </h2>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
} 