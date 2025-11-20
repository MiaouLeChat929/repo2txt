import { Header } from "./Header"
import { Footer } from "./Footer"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto py-6 px-4 md:px-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
