import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Essay Reviewer',
  description: 'Review your Essays with Custom Rubrics',
}

export default function EssayReviewerLayout({
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