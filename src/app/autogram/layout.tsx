import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autogram',
  description: 'Transform Text into Smart Art Diagrams',
}

export default function AutogramLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container">
        {children}
      </main>
    </div>
  )
}
