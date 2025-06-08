import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/layout/Header"
import QueryProvider from "@/lib/providers/QueryProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GlobeCo Portfolio Management Portal",
  description: "Professional portfolio management and trading platform for financial services.",
  keywords: ["portfolio management", "trading", "financial services", "asset management"],
  authors: [{ name: "Noah Krieger" }],
  creator: "KASBench",
  robots: {
    index: false, // Not for public indexing since it's a benchmark app
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Header />
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  )
} 