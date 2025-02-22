import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Japanese Flashcards | @alhrkn',
  description: 'Simple Japanese Hiragana & Katakana Flashcards',
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