import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Papermap',
  description: 'Turn Any Science Paper PDF into Interactive Mindmap',
}

export default function PapermapLayout({
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