import Image from "next/image"
import Link from "next/link"
import { Home, TrendingUp } from "lucide-react"

export default function ModelManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-16 pt-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-teal-600" />
            </div>
            <Image
              src="/images/globeco-logo.png"
              alt="GlobeCo"
              width={100}
              height={100}
              className="mx-auto mb-6 opacity-20"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Model Management
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Create, configure, and manage investment models and strategies. 
            Define risk parameters, asset allocation rules, and performance benchmarks.
          </p>

          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Coming Soon</h2>
            <p className="text-slate-600 mb-6">
              This module will provide comprehensive tools for:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Model Creation</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Investment strategy definition</li>
                  <li>• Asset allocation models</li>
                  <li>• Risk parameter configuration</li>
                  <li>• Performance benchmarks</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Model Management</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Model versioning and history</li>
                  <li>• Backtesting and simulation</li>
                  <li>• Compliance validation</li>
                  <li>• Performance monitoring</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Link>
            
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-slate-300 px-6 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 