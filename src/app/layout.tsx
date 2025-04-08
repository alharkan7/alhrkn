import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
});

const title = "Ask Al"
const description = "Experimental AI Apps"

export const metadata: Metadata = {
  title: title,
  description: description,
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: title,
    description: description,
    type: "website",
    locale: "en_US",
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title: title,
    description: description,
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
      <body className={`${spaceGrotesk.className} font-sans`}>
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