import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discourse Network Analyzer',
  description: 'Discourse Network Analysis with AI',
}

export default function DNAnalyzerLayout({
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