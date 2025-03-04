import '@/app/globals.css';
import './styles/xyflow-theme.css';
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Mindmap',
  description: 'AI Mindmap Creator. Automatically Generate Mindmap from PDF.',
  openGraph: {
    title: 'AI Mindmap',
    description: 'AI Mindmap Creator. Automatically Generate Mindmap from PDF.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Mindmap',
    description: 'AI Mindmap Creator. Automatically Generate Mindmap from PDF.',
  }
}

export default function MindmapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}