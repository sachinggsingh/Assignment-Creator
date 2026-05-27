import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

import { StoreProvider } from '@/components/providers/store-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthFlowGuard } from '@/components/auth-flow-guard'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AssessMind AI',
  description: 'AI-powered assessment generation platform',
}

import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <AuthProvider>
              <AuthFlowGuard />
              {children}
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
