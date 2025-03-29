import { generateOpenGraphImage } from '@/lib/opengraph-image'
import { metadata } from './layout'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Experimental AI Apps'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  // For the root page, we want to display the description as h1
  // The path parameter is what's shown in the h1 style, but without the "/"
  return generateOpenGraphImage({
    title: metadata.title as string,
    description: metadata.description as string,
    path: metadata.title as string
  })
} 