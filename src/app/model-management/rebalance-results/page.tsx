'use client'

import { useState } from 'react'
import { BarChart3, AlertCircle, RefreshCw, Loader2, HelpCircle, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider, HelpTooltip } from '@/components/ui/tooltip'
import { ErrorBoundary, ErrorDisplay } from '@/components/ui/error-boundary'

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
    <TooltipProvider>
      <ErrorBoundary 
        maxRetries={3}
        onRetry={handleRetry}
      >
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-3xl font-bold text-slate-900">Rebalance Results</h1>
                  <HelpTooltip
                    content={
                      <div className="max-w-sm">
                        <p className="font-medium mb-1">About Rebalance Results</p>
                        <p className="text-sm">This page shows portfolio rebalancing operations performed by the investment models. Each rebalance contains multiple portfolios with their position-level details.</p>
                      </div>
                    }
                  >
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </HelpTooltip>
                </div>
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
          <div className="mb-6">
            <ErrorDisplay
              title="Failed to Load Rebalance Results"
              message={error?.message || "Unable to connect to the Order Generation Service"}
              error={error}
              onRetry={handleRetry}
              retryCount={0}
              maxRetries={3}
            />
          </div>
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
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center space-x-1">
                    <span>Total Rebalances</span>
                    <HelpTooltip content="Number of rebalancing operations performed. Click the arrow next to each rebalance to see portfolio details.">
                      <Info className="h-3 w-3 text-slate-400" />
                    </HelpTooltip>
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
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center space-x-1">
                    <span>Total Portfolios</span>
                    <HelpTooltip content="Total number of portfolios across all rebalances. Each portfolio contains multiple security positions.">
                      <Info className="h-3 w-3 text-slate-400" />
                    </HelpTooltip>
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
                Development Progress - Phase 2, Step 4 Complete
              </h4>
              <p className="text-sm text-blue-800">
                Expandable row foundation implemented with smooth animations and nested table structure. 
                Next up: <strong>Phase 3, Step 5: Portfolio Level Integration</strong> with real portfolio data loading.
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <strong>New Features:</strong> Row Expansion • Smooth Animations • Nested Content • Action Buttons <br/>
                <strong>API Status:</strong> {isLoading ? 'Loading...' : isError ? 'Error' : `${rebalances.length} rebalances loaded`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </ErrorBoundary>
    </TooltipProvider>
  )
} 