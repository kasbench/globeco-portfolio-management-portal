'use client'

import { useState, useCallback } from 'react'
import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BarChart3, AlertCircle, RefreshCw, Loader2, HelpCircle, Info, Send, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider, HelpTooltip } from '@/components/ui/tooltip'
import { ErrorBoundary, ErrorDisplay } from '@/components/ui/error-boundary'
import { toast } from 'sonner'

import { useRebalances } from '@/lib/hooks/useRebalances'
import { orderServiceApi } from '@/lib/api/orderService'
import { orderGenerationApi } from '@/lib/api/orderGenerationService'
import { transformToSubmissionRebalance } from '@/lib/utils/rebalanceTransform'
import { OrderSubmissionResult, SubmissionState } from '@/types/order'
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
  const queryClient = useQueryClient()
  const [isSubmittingAll, setIsSubmittingAll] = useState(false)
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showDeletionDialog, setShowDeletionDialog] = useState(false)
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null)
  const [deletionPreview, setDeletionPreview] = useState<DeletionPreview | null>(null)
  const [submissionProgress, setSubmissionProgress] = useState<{
    current: number
    total: number
    currentRebalance?: string
  } | null>(null)
  const [localRebalances, setLocalRebalances] = useState<any[] | undefined>(undefined)
  const [selectedRebalances, setSelectedRebalances] = useState<Set<string>>(new Set())
  

  
  const {
    rebalances: fetchedRebalances,
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

  // Use local rebalances if available, otherwise use fetched data
  const rebalances = localRebalances ?? fetchedRebalances
  
  // Update local rebalances when fetched data changes or when local state is reset
  React.useEffect(() => {
    if (fetchedRebalances && !isLoading) {
      console.log('Updating local rebalances with fresh data:', fetchedRebalances.length, 'rebalances')
      setLocalRebalances(fetchedRebalances)
    }
  }, [fetchedRebalances, isLoading])

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
          (r.portfolios || []).flatMap((p: any) => p.positions || [])
        )
      })
      
      setSubmissionPreview(preview)
      setShowSubmissionDialog(true)
    } catch (error) {
      console.error('Failed to create submission preview:', error)
      toast.error('Failed to create submission preview. Please try again.')
    }
  }

  const handleConfirmSubmitAll = async () => {
    if (!rebalances) return
    
    setIsSubmittingAll(true)
    setShowSubmissionDialog(false)
    setSubmissionProgress({ current: 0, total: rebalances.length })
    
    try {
      // Transform rebalances to submission format
      const submissionRebalances = rebalances.map((rebalance: any) => transformToSubmissionRebalance(rebalance))
      
      let successfulSubmissions = 0
      let failedSubmissions = 0
      const allResults: OrderSubmissionResult[] = []
      const processedRebalanceIds = new Set<string>() // Track processed rebalances to prevent duplicates
      
      // Process each rebalance sequentially - DO NOT modify the array during iteration
      for (let i = 0; i < submissionRebalances.length; i++) {
        const rebalance = submissionRebalances[i]
        
        // Skip if already processed (safety check)
        if (processedRebalanceIds.has(rebalance.rebalance_id)) {
          console.warn(`Skipping already processed rebalance: ${rebalance.rebalance_id}`)
          continue
        }
        
        processedRebalanceIds.add(rebalance.rebalance_id)
        
        setSubmissionProgress({
          current: i + 1,
          total: submissionRebalances.length,
          currentRebalance: rebalance.rebalance_id
        })
        
        try {
          // Submit the rebalance using the Order Service API
          const { rebalance: updatedRebalance, result } = await orderServiceApi.submitRebalanceOrders(
            rebalance,
            (progress) => {
              console.log(`Rebalance ${rebalance.rebalance_id} progress:`, progress)
            }
          )
          
          allResults.push(result)
          
          if (result.successfulOrders > 0) {
            successfulSubmissions++
            
            // If all orders were successful and no orders failed, delete the rebalance from backend
            if (result.failedOrders === 0) {
              try {
                const deleteResult = await orderGenerationApi.deleteRebalance(rebalance.rebalance_id, rebalance.version)
                if (deleteResult.success) {
                  console.log(`Rebalance ${rebalance.rebalance_id} deleted from backend after successful submission`)
                } else {
                  console.warn(`Backend deletion reported failure for ${rebalance.rebalance_id}, but continuing`)
                }
              } catch (deleteError) {
                console.warn(`Failed to delete rebalance ${rebalance.rebalance_id} from backend:`, deleteError)
                // Don't fail the entire operation since orders were submitted successfully
              }
            }
            
            console.log(`Processing complete for ${rebalance.rebalance_id}:`, {
              successfulOrders: result.successfulOrders,
              failedOrders: result.failedOrders,
              deletedFromBackend: result.failedOrders === 0
            })
          }
          
          if (result.failedOrders > 0) {
            failedSubmissions++
          }
          
        } catch (error) {
          console.error(`Failed to submit rebalance ${rebalance.rebalance_id}:`, error)
          failedSubmissions++
          
          // Create a failed result entry
          allResults.push({
            totalOrders: 0,
            successfulOrders: 0,
            failedOrders: 1,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            submittedOrderIds: [],
            failedPositions: []
          })
        }
      }
      
      // Show completion toast
      const totalSuccessful = allResults.reduce((sum, r) => sum + r.successfulOrders, 0)
      const totalFailed = allResults.reduce((sum, r) => sum + r.failedOrders, 0)
      
      if (totalSuccessful > 0) {
        if (totalFailed === 0) {
          toast.success(`Successfully submitted ${totalSuccessful} orders.`)
        } else {
          toast.warning(`Submitted ${totalSuccessful} orders, ${totalFailed} failed.`)
        }
      } else {
        toast.error(`No orders were successfully submitted. ${totalFailed} orders failed.`)
      }
      
      // Refresh data to reflect backend changes
      console.log('Submit All complete - invalidating cache and refetching data')
      
      // Increased delay to ensure all backend deletions are fully processed
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Force cache invalidation to ensure fresh data
      console.log('Invalidating rebalances cache to force fresh data fetch')
      await queryClient.invalidateQueries({ queryKey: ['rebalances'] })
      
      await refetch()
      
      // Reset local state AFTER fresh data is fetched
      console.log('Resetting local state to use fresh fetched data')
      setLocalRebalances(undefined)
      
    } catch (error) {
      console.error('Failed to submit all rebalances:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit orders. Please try again.')
    } finally {
      setIsSubmittingAll(false)
      setSubmissionProgress(null)
    }
  }

  const handleBatchOperationComplete = async (results: any) => {
    console.log('Batch operation completed:', results)
    
    // Use the same comprehensive refresh logic as Submit All
    console.log('Batch operation complete - invalidating cache and refetching data')
    
    // Add delay to ensure all backend changes are fully processed
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Force cache invalidation to ensure fresh data
    console.log('Invalidating rebalances cache to force fresh data fetch')
    await queryClient.invalidateQueries({ queryKey: ['rebalances'] })
    
    await refetch()
    
    // Reset local state AFTER fresh data is fetched
    console.log('Resetting local state to use fresh fetched data')
    setLocalRebalances(undefined)
  }

  const handleDataChange = useCallback(async () => {
    console.log('Data change callback triggered - invalidating cache and refetching data')
    
    // Add a small additional delay before refetch to ensure backend consistency
    console.log('Waiting additional 1000ms before refetch to ensure backend consistency')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Force cache invalidation to ensure fresh data BEFORE refetch
    console.log('Invalidating rebalances cache to force fresh data fetch')
    await queryClient.invalidateQueries({ queryKey: ['rebalances'] })
    
    // Now refetch with invalidated cache
    console.log('Refetching data after cache invalidation')
    await refetch()
    
    // Reset local state AFTER fresh data is fetched to use the new data
    console.log('Resetting local state to use fresh fetched data')
    setLocalRebalances(undefined)
  }, [refetch, queryClient])

  const handleRetry = async () => {
    console.log('Refresh button clicked - invalidating cache and refetching data')
    
    // Force cache invalidation for manual refresh
    console.log('Manual refresh - invalidating rebalances cache')
    await queryClient.invalidateQueries({ queryKey: ['rebalances'] })
    
    await refetch()
    
    // Reset local state AFTER fresh data is fetched
    console.log('Resetting local state to use fresh fetched data')
    setLocalRebalances(undefined)
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
                          <span>
                            {submissionProgress 
                              ? `Submitting ${submissionProgress.current}/${submissionProgress.total}...`
                              : 'Submitting...'
                            }
                          </span>
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
            selectedRebalances={selectedRebalances}
            onSelectRebalance={(rebalanceId, selected) => {
              if (selected) {
                setSelectedRebalances(prev => new Set(prev).add(rebalanceId))
              } else {
                setSelectedRebalances(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(rebalanceId)
                  return newSet
                })
              }
            }}
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
                selectedRebalances={selectedRebalances}
                onSelectRebalance={(rebalanceId, selected) => {
                  if (selected) {
                    setSelectedRebalances(prev => new Set(prev).add(rebalanceId))
                  } else {
                    setSelectedRebalances(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(rebalanceId)
                      return newSet
                    })
                  }
                }}
                onDataChange={handleDataChange}
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