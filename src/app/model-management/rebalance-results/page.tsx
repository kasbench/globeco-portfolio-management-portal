'use client'

import { BarChart3, Home } from 'lucide-react'
import Link from 'next/link'

export default function RebalanceResultsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Rebalance Results</h1>
              <p className="text-slate-600">
                View and analyze portfolio rebalancing results and performance
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Coming Soon</h2>
            <p className="text-slate-600 mb-8 text-lg leading-relaxed">
              This page will provide comprehensive rebalance results analysis, including:
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 text-left mb-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 text-lg">Rebalance Overview</h3>
                <ul className="space-y-2 text-slate-600">
                  <li>• Expandable rebalance history with nested portfolio details</li>
                  <li>• Position-level changes and adjustments</li>
                  <li>• Target vs. actual allocation analysis</li>
                  <li>• Drift calculations and performance metrics</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 text-lg">Advanced Features</h3>
                <ul className="space-y-2 text-slate-600">
                  <li>• Infinite scrolling for large datasets</li>
                  <li>• Real-time data from Order Generation Service</li>
                  <li>• Interactive collapsible data tables</li>
                  <li>• Export capabilities and detailed reporting</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/model-management"
                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                View Investment Models
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

        {/* Development Note */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Development Note:</strong> This page will be implemented in Step 2 of Requirement 2, 
            featuring data from the Order Generation Service's <code>/api/v1/rebalances</code> endpoint 
            with nested portfolio and position details.
          </p>
        </div>
      </div>
    </div>
  )
} 