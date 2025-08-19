import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Outliner - Quickly Draft Research Paper',
  description: 'From idea to fully drafted research paper in seconds.',
}

export default function OutlinerLayout({
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