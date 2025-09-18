import type { Metadata } from 'next'
import { Providers } from "./components/providers";

export const metadata: Metadata = {
  title: 'Finance Tracker',
  description: 'Simple Finance Tracker that Directly Saves to Google Sheets',
}

export default function FinanceTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Providers>
        <main className="container">
          {children}
        </main>
      </Providers>
    </div>
  )
}