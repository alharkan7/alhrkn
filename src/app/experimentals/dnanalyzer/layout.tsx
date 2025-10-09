import type { Metadata } from 'next'
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: 'Automatic Discourse Highlighter',
  description: 'Automatically Identify and Highlight Discourse in Text using AI',
}

export default function DNAnalyzerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <main className="container !px-2">
          {children}
        </main>
      </div>
    </Providers>
  )
}