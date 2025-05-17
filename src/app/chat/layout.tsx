import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ask AI',
  description: 'Experimental AI Apps',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        {children}
      </main>
    </div>
  )
}
