import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BarChart3, Globe, Shield, TrendingUp } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="globeco-gradient relative flex-1">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/images/globeco-logo.png"
              alt="GlobeCo Global Asset Management"
              width={300}
              height={300}
              className="mx-auto drop-shadow-2xl"
              priority
            />
          </div>
          
          {/* Hero Content */}
          <div className="max-w-4xl space-y-6">
            <h1 className="text-5xl font-bold text-white sm:text-6xl lg:text-7xl">
              Portfolio Management
              <span className="block globeco-text-gradient mt-2">
                Portal
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-xl text-white/90 sm:text-2xl">
              Professional portfolio management and trading platform designed for 
              financial institutions, partners, and institutional investors.
            </p>
            
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="group inline-flex items-center rounded-lg bg-white px-8 py-4 text-lg font-semibold text-teal-800 shadow-lg transition-all hover:bg-white/95 hover:shadow-xl"
              >
                Access Dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <Link
                href="#features"
                className="inline-flex items-center rounded-lg border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/10"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="animate-bounce">
            <div className="h-6 w-1 rounded-full bg-white/60" />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Built for Financial Excellence
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our platform provides comprehensive tools for portfolio management, 
              risk assessment, and trading operations across global markets.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="financial-card text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
                <BarChart3 className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                Portfolio Analytics
              </h3>
              <p className="text-slate-600">
                Advanced analytics and performance tracking for comprehensive portfolio insights.
              </p>
            </div>
            
            <div className="financial-card text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100">
                <TrendingUp className="h-8 w-8 text-gold-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                Risk Management
              </h3>
              <p className="text-slate-600">
                Sophisticated risk assessment tools and real-time monitoring capabilities.
              </p>
            </div>
            
            <div className="financial-card text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Globe className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                Global Markets
              </h3>
              <p className="text-slate-600">
                Access to international markets with real-time pricing and execution.
              </p>
            </div>
            
            <div className="financial-card text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Shield className="h-8 w-8 text-slate-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                Secure Platform
              </h3>
              <p className="text-slate-600">
                Enterprise-grade security with role-based access controls.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* User Types Section */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Designed for Every User Type
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Role-based access ensures each user type has the tools and data they need.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Admin</h3>
              <p className="text-slate-600">
                Complete system access with administrative privileges for platform management.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Internal</h3>
              <p className="text-slate-600">
                Full platform access for internal team members and employees.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-gold-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Partner</h3>
              <p className="text-slate-600">
                Specialized access for external partners providing services to GlobeCo.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Customer</h3>
              <p className="text-slate-600">
                Tailored interface for institutional investors and clients.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/images/globeco-logo.png"
              alt="GlobeCo"
              width={120}
              height={120}
              className="mb-4 opacity-80"
            />
            <p className="text-slate-400 mb-4">
              © 2024 GlobeCo Global Asset Management. Part of KASBench.
            </p>
            <p className="text-sm text-slate-500">
              Built for benchmarking and performance testing purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 