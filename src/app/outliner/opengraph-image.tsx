import { generateOpenGraphImage } from '@/lib/opengraph-image'
import { metadata } from './layout'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Outliner - Quick Research Paper Outline & Draft'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return generateOpenGraphImage({
    title: metadata.title as string,
    description: metadata.description as string,
    path: 'outliner'
  })
} 