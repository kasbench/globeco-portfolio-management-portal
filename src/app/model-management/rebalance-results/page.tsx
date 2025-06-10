'use client'

import { useState } from 'react'
import { BarChart3, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useRebalances } from '@/lib/hooks/useRebalances'
import RebalanceTable from '@/components/tables/RebalanceTable'

export default function RebalanceResultsPage() {
  const {
    rebalances,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    sortConfig,
    handleSort,
    refetch,
  } = useRebalances()

  const handleRetry = () => {
    refetch()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 mb-2">
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
            
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={handleRetry}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center justify-between">
                <span>Failed to load rebalance results: {error?.message}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="ml-4"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Loading Rebalance Results
                </h3>
                <p className="text-slate-600">
                  Fetching rebalance data from Order Generation Service...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && rebalances.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No Rebalance Results Found
                </h3>
                <p className="text-slate-600 mb-6 max-w-md">
                  There are no rebalance results available at this time. 
                  Rebalance results will appear here after models are rebalanced.
                </p>
                <Button onClick={handleRetry} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content State - Data Loaded */}
        {!isLoading && !isError && rebalances.length > 0 && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Rebalances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {rebalances.length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {hasNextPage ? 'More available' : 'All loaded'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Portfolios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {rebalances.reduce((sum, r) => sum + r.number_of_portfolios, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Across all rebalances
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Unique Models
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {new Set(rebalances.map(r => r.model_name)).size}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Different investment models
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Latest Rebalance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-slate-900">
                    {new Date(rebalances[0]?.rebalance_date).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Most recent activity
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rebalance Results</span>
                  <div className="text-sm font-normal text-slate-600">
                    {rebalances.length} results loaded
                    {hasNextPage && ' (scroll for more)'}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <RebalanceTable
                  rebalances={rebalances}
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  loadMore={loadMore}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </CardContent>
            </Card>


          </div>
        )}

        {/* Development Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Development Progress - Phase 2, Step 3 Complete
              </h4>
              <p className="text-sm text-blue-800">
                Rebalance-level table implemented with sorting, infinite scrolling, and responsive design. 
                Next up: <strong>Phase 2, Step 4: Expandable Row Foundation</strong> for nested portfolio and position data.
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <strong>Table Features:</strong> Sorting • Infinite Scroll • Professional Formatting • Row Expansion (Phase 3) <br/>
                <strong>API Status:</strong> {isLoading ? 'Loading...' : isError ? 'Error' : `${rebalances.length} rebalances loaded`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 