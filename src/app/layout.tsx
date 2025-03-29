import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: "Ask Al",
  description: "Experimental AI Apps",
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "Ask Al",
    description: "Experimental AI Apps",
    type: "website",
    locale: "en_US",
    siteName: "Ask Al",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Al",
    description: "Experimental AI Apps",
    creator: "@alhrkn",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster/>
        </ThemeProvider>
      </body>
    </html>
  )
}