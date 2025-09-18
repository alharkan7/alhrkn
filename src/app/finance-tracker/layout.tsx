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
    <div className="h-screen w-full bg-background">
      <Providers>
        <main className="w-full h-full">
          {children}
        </main>
      </Providers>
    </div>
  )
}