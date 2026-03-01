import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Powrót do menu</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-white/40 text-sm">
        <p>© {new Date().getFullYear()} MESO - Smart Asian Comfort</p>
      </footer>
    </div>
  )
}
