import Image from "next/image"
import Link from "next/link"
import { Home } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-16 pt-24">
        <div className="text-center">
          <Image
            src="/images/globeco-logo.png"
            alt="GlobeCo"
            width={150}
            height={150}
            className="mx-auto mb-8"
          />
          
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Dashboard Coming Soon
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            The portfolio management dashboard is under development. This will include 
            role-based access, portfolio analytics, trading interfaces, and more.
          </p>
          
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-white font-semibold hover:bg-teal-700 transition-colors"
          >
            <Home className="mr-2 h-5 w-5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 