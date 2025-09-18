import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Writing Assistant with Block Style',
  description: 'All-in-One AI Assistant for Science/Academic Writing with Block Style',
}

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3">
        {children}
      </main>
    </div>
  )
}