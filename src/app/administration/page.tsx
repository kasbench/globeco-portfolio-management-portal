import Image from "next/image"
import Link from "next/link"
import { Home, Settings } from "lucide-react"

export default function AdministrationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-16 pt-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Settings className="h-8 w-8 text-red-600" />
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
            Administration
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            System administration and configuration tools for managing users, permissions, 
            system settings, and platform monitoring. Admin-only access required.
          </p>

          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Coming Soon</h2>
            <p className="text-slate-600 mb-6">
              This module will provide comprehensive administrative capabilities:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">User Management</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• User account creation and management</li>
                  <li>• Role and permission assignment</li>
                  <li>• Access control configuration</li>
                  <li>• User activity monitoring</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">System Configuration</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Platform settings and parameters</li>
                  <li>• Service configuration management</li>
                  <li>• Security and compliance settings</li>
                  <li>• System monitoring and alerts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center mr-3">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-amber-800 text-sm font-medium">
                Administrator access required. This section is only visible to users with admin privileges.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-red-600 px-6 py-3 text-white font-semibold hover:bg-red-700 transition-colors"
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