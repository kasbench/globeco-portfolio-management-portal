'use client'

import { useState } from 'react'
import { BarChart3, AlertCircle, RefreshCw, Loader2, HelpCircle, Info, Send, Trash2, CheckSquare, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider, HelpTooltip } from '@/components/ui/tooltip'
import { ErrorBoundary, ErrorDisplay } from '@/components/ui/error-boundary'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

import { useRebalances } from '@/lib/hooks/useRebalances'
import RebalanceTable from '@/components/tables/RebalanceTable'
import { 
  ConfirmationDialog, 
  useSubmissionPreview,
  useDeletionPreview,
  type SubmissionPreview,
  type DeletionPreview
} from '@/components/ui/confirmation-dialog'

export default function RebalanceResultsPage() {
  const [isSubmittingAll, setIsSubmittingAll] = useState(false)
  const [selectedRebalances, setSelectedRebalances] = useState<Set<string>>(new Set())
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
  const selectedCount = selectedRebalances.size
  const allSelected = selectedCount > 0 && selectedCount === totalRebalances
  const someSelected = selectedCount > 0 && selectedCount < totalRebalances
  
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

  const handleSubmitSelected = async () => {
    if (selectedCount === 0 || !rebalances) return
    
    try {
      const selectedRebalanceData = rebalances.filter(r => 
        selectedRebalances.has(r.rebalance_id)
      )
      
      // Create submission preview for selected items
      const preview = createSubmissionPreview('global', {
        rebalances: selectedRebalanceData,
        portfolios: selectedRebalanceData.flatMap(r => r.portfolios || []),
        positions: selectedRebalanceData.flatMap(r => 
          (r.portfolios || []).flatMap(p => p.positions || [])
        )
      })
      
      setSubmissionPreview(preview)
      setShowSubmissionDialog(true)
    } catch (error) {
      console.error('Failed to create submission preview:', error)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCount === 0 || !rebalances) return
    
    try {
      const selectedRebalanceData = rebalances.filter(r => 
        selectedRebalances.has(r.rebalance_id)
      )
      
      // Create deletion preview
      const preview = createDeletionPreview('rebalance', {
        entityId: `${selectedCount} selected rebalances`,
        entityName: `${selectedCount} Rebalances`,
        childPortfolios: selectedRebalanceData.flatMap(r => r.portfolios || []),
        childPositions: selectedRebalanceData.flatMap(r => 
          (r.portfolios || []).flatMap(p => p.positions || [])
        )
      })
      
      setDeletionPreview(preview)
      setShowDeletionDialog(true)
    } catch (error) {
      console.error('Failed to create deletion preview:', error)
    }
  }

  const handleConfirmDelete = async () => {
    setShowDeletionDialog(false)
    
    try {
      // TODO: Implement actual deletion logic
      console.log('Deleting selected rebalances:', Array.from(selectedRebalances))
      setSelectedRebalances(new Set()) // Clear selection after deletion
    } catch (error) {
      console.error('Failed to delete selected rebalances:', error)
    }
  }

  const handleSelectAll = () => {
    if (!rebalances) return
    
    if (allSelected) {
      setSelectedRebalances(new Set())
    } else {
      setSelectedRebalances(new Set(rebalances.map(r => r.rebalance_id)))
    }
  }

  const handleSelectRebalance = (rebalanceId: string, selected: boolean) => {
    const newSelection = new Set(selectedRebalances)
    if (selected) {
      newSelection.add(rebalanceId)
    } else {
      newSelection.delete(rebalanceId)
    }
    setSelectedRebalances(newSelection)
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

        {/* Summary and Actions Card */}
        {hasRebalances && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Summary & Actions</span>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Info className="h-4 w-4" />
                  <span>{totalRebalances} rebalance(s) available</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-700">
                    {selectedCount === 0 
                      ? `Select rebalances (${totalRebalances} available)`
                      : `${selectedCount} of ${totalRebalances} rebalances selected`
                    }
                  </span>
                </div>

                {selectedCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubmitSelected}
                      className="flex items-center space-x-1"
                    >
                      <Send className="h-3 w-3" />
                      <span>Submit Selected ({selectedCount})</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete Selected</span>
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Global Actions */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-gray-900">Global Actions</h3>
                  <p className="text-sm text-gray-600">
                    Submit all rebalances and portfolios at once
                  </p>
                </div>

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
                      <span>Submit All Rebalances</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg">
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Alert */}
        {hasRebalances && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Order Submission:</strong> Only positions with BUY/SELL transactions and non-zero quantities will be submitted as orders.
              All submissions will be sent to the Order Service for processing.
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
                onSelectRebalance={handleSelectRebalance}
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

        <ConfirmationDialog
          open={showDeletionDialog}
          onOpenChange={setShowDeletionDialog}
          type="deletion"
          title="Confirm Deletion"
          description="This action will permanently delete the selected rebalances and all associated data."
          deletionPreview={deletionPreview || undefined}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeletionDialog(false)}
          requiresExplicitConfirmation={true}
        />
      </div>
    </TooltipProvider>
  )
} 