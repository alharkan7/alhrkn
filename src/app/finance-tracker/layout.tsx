import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Finance Tracker | @alhrkn',
  description: 'Simple Finance Tracker that Directly Saves to Google Sheets',
}

export default function JapaneseFlashcardsLayout({
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