'use client'

import { useState } from 'react'
import { BarChart3, AlertCircle, RefreshCw, Loader2, HelpCircle, Info, Send, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider, HelpTooltip } from '@/components/ui/tooltip'
import { ErrorBoundary, ErrorDisplay } from '@/components/ui/error-boundary'


import { useRebalances } from '@/lib/hooks/useRebalances'
import RebalanceTable from '@/components/tables/RebalanceTable'
import BatchOperationsPanel from '@/components/features/BatchOperationsPanel'
import { 
  ConfirmationDialog, 
  useSubmissionPreview,
  useDeletionPreview,
  type SubmissionPreview,
  type DeletionPreview
} from '@/components/ui/confirmation-dialog'

export default function RebalanceResultsPage() {
  const [isSubmittingAll, setIsSubmittingAll] = useState(false)
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showDeletionDialog, setShowDeletionDialog] = useState(false)
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null)
  const [deletionPreview, setDeletionPreview] = useState<DeletionPreview | null>(null)
  
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
    refetch
  } = useRebalances()

  const { createPreview: createSubmissionPreview } = useSubmissionPreview()
  const { createPreview: createDeletionPreview } = useDeletionPreview()

  // Calculate summary statistics
  const totalRebalances = rebalances?.length || 0
  
  // Calculate estimated counts for all rebalances
  const estimatedPortfolios = rebalances?.reduce((sum, rebalance) => 
    sum + (rebalance.portfolios?.length || 100), 0
  ) || 0
  
  const estimatedOrders = Math.round(estimatedPortfolios * 50) // Rough estimate

  const handleSubmitAll = async () => {
    if (!rebalances) return
    
    try {
      // Create submission preview
      const preview = createSubmissionPreview('global', {
        rebalances,
        portfolios: rebalances.flatMap(r => r.portfolios || []),
        positions: rebalances.flatMap(r => 
          (r.portfolios || []).flatMap(p => p.positions || [])
        )
      })
      
      setSubmissionPreview(preview)
      setShowSubmissionDialog(true)
    } catch (error) {
      console.error('Failed to create submission preview:', error)
    }
  }

  const handleConfirmSubmitAll = async () => {
    setIsSubmittingAll(true)
    setShowSubmissionDialog(false)
    
    try {
      // TODO: Implement actual submission logic
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      console.log('Submitting all rebalances')
    } catch (error) {
      console.error('Failed to submit all rebalances:', error)
    } finally {
      setIsSubmittingAll(false)
    }
  }

  const handleBatchOperationComplete = (results: any) => {
    console.log('Batch operation completed:', results)
    // Refresh data after batch operations
    refetch()
  }

  const handleRetry = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600">Loading rebalance results...</span>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <ErrorBoundary>
          <ErrorDisplay 
            error={error}
            onRetry={handleRetry}
          />
        </ErrorBoundary>
      </div>
    )
  }

  const hasRebalances = rebalances && rebalances.length > 0

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rebalance Results</h1>
              <p className="text-gray-600 mt-1">
                Review and submit portfolio rebalancing recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <HelpTooltip content="This page shows portfolio rebalancing results. You can submit orders at different levels: all rebalances, individual rebalances, or specific portfolios.">
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </HelpTooltip>
            
            <Button 
              variant="outline" 
              onClick={handleRetry}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Summary Statistics */}
        {hasRebalances && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Portfolio Summary</span>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Info className="h-4 w-4" />
                  <span>{totalRebalances} rebalance(s) available</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalRebalances}</div>
                  <div className="text-sm text-blue-700">Rebalances</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{estimatedPortfolios.toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Portfolios</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">~{estimatedOrders.toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Estimated Orders</div>
                </div>
                <div className="text-center">
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleSubmitAll}
                      disabled={isSubmittingAll}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmittingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Submit All</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-sm text-blue-700 mt-1">Quick Submit</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Batch Operations Panel */}
        {hasRebalances && (
          <BatchOperationsPanel
            rebalances={rebalances}
            onOperationComplete={handleBatchOperationComplete}
          />
        )}

        {/* Information Alert */}
        {hasRebalances && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Order Submission:</strong> Only positions with BUY/SELL transactions and non-zero quantities will be submitted as orders.
              All submissions will be sent to the Order Service for processing. Use the Batch Operations panel above for advanced selection and processing options.
            </AlertDescription>
          </Alert>
        )}

        {/* Rebalance Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Rebalance Results</span>
              {hasRebalances && (
                <span className="text-sm font-normal text-gray-500">
                  {totalRebalances} rebalance(s)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorBoundary>
              <RebalanceTable 
                rebalances={rebalances || []}
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                loadMore={loadMore}
                sortConfig={sortConfig}
                onSort={handleSort}
                selectedRebalances={new Set()} // Managed by BatchOperationsPanel now
                onSelectRebalance={() => {}} // Managed by BatchOperationsPanel now
              />
            </ErrorBoundary>
          </CardContent>
        </Card>

        {/* Confirmation Dialogs */}
        <ConfirmationDialog
          open={showSubmissionDialog}
          onOpenChange={setShowSubmissionDialog}
          type="submission"
          title="Confirm Order Submission"
          description="Please review the submission details before proceeding."
          submissionPreview={submissionPreview || undefined}
          onConfirm={handleConfirmSubmitAll}
          onCancel={() => setShowSubmissionDialog(false)}
          isLoading={isSubmittingAll}
          requiresExplicitConfirmation={submissionPreview?.affectedItems.riskLevel === 'high'}
        />
      </div>
    </TooltipProvider>
  )
} 