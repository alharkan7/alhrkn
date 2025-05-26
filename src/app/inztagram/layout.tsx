import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inztagram - Instant Diagram',
  description: 'Create Any Diagram in Seconds with AI',
}

export default function FinanceTrackerLayout({
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