import type { Metadata } from 'next'
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: 'Nusantara Timeline',
  description: 'Interactive Timeline of Indonesian History',
}

export default function IndonesiaHistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <main className="w-full">
          {children}
        </main>
      </div>
    </Providers>
  )
}