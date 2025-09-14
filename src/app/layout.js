// import { Analytics } from "@vercel/analytics/next"
// import { AuthProvider } from "../../contexts/AuthContext"
import { CartProvider } from "../../contexts/CartContext"
import "./globals.css"
import { Suspense } from "react"
import FullPageLoader from "../../components/FullPageLoader"

export const metadata = {
  title: "Keecee Collection - Multi-Vendor Marketplace",
  description: "Discover amazing products from trusted vendors around the world",
  generator: "Keecee Collection",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>
          <Suspense fallback={<FullPageLoader message="Loading..." />}>{children}</Suspense>
        </CartProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
