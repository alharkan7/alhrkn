import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Slider - Quickly Draft Presentation Slides',
  description: 'Transform any documents into presentation slides in seconds.',
}

export default function SliderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container !px-2">
        {children}
      </main>
    </div>
  )
}