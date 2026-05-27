import type { Metadata } from "next"
import "./globals.css"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Vendor Item DB",
  description: "기자재 가격 관리 시스템",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
