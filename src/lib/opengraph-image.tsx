import { ImageResponse } from '@vercel/og'
import { loadSpaceGroteskFont } from '@/lib/og-helpers'

type OpenGraphImageProps = {
  title: string;
  description?: string;
  path?: string;
}

export async function generateOpenGraphImage({ 
  title, 
  description, 
  path 
}: OpenGraphImageProps) {
  const spaceGroteskFont = await loadSpaceGroteskFont()
  
  // Get favicon using fetch - this works in edge runtime
  let faviconSrc = null
  
  try {
    // For local development and production
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    // In Edge runtime, we can use a direct URL to the favicon
    faviconSrc = `${baseUrl}/favicon.ico`
  } catch (error) {
    console.error('Error setting favicon path:', error)
  }


  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          background: 'linear-gradient(to right, white, white, #ff65a3, #ffcb57)',
          padding: '40px',
          position: 'relative',
          fontFamily: '"Space Grotesk"',
        }}
      >
        {/* Logo */}
        {faviconSrc && (
          <img
            src={faviconSrc}
            width={40}
            height={40}
            style={{ marginBottom: '100px' }}
            alt="Logo"
          />
        )}
        
        <h1
          style={{
            fontSize: 90,
            fontWeight: 800,
            color: 'black',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            margin: 0,
            padding: 0,
            fontFamily: '"Space Grotesk"',
          }}
        >
          {path ? `/${path}` : ""}
        </h1>
        
        <h2
          style={{
            fontSize: 50,
            fontWeight: 600,
            color: 'black',
            lineHeight: 1.2,
            margin: 0,
            padding: 0,
            marginTop: 24,
            fontFamily: '"Space Grotesk"',
          }}
        >
          {description || "Experimental AI Apps"}
        </h2>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [spaceGroteskFont],
    }
  )
} 