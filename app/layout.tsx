import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { StackProvider, StackTheme } from "@stackframe/stack"
import { stackServerApp } from "@/stack"
import { ThemeProvider } from "@/components/theme/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "TalkTalk - Modern Chat Platform",
  description:
    "Connect, communicate, and collaborate with TalkTalk's secure chat platform featuring E2E encryption, voice/video calls, and custom bots",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ThemeProvider defaultTheme="dark" storageKey="chat-theme">
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
        <Analytics />
      </body>
    </html>
  )
}
