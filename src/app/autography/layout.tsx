import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autography - Spreadsheets to Data Visualization in Seconds',
  description: 'Create Data Visualizations from Your Spreadsheets without Writing a Single Formula or Code',
}

export default function AutographyLayout({
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