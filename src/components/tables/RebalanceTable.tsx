'use client'

import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { format } from 'date-fns'
import { ChevronUp, ChevronDown, ChevronRight, Loader2, Send, ExternalLink, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton, ExpandedContentSkeleton } from '@/components/ui/skeleton'
import { TooltipProvider, HelpTooltip } from '@/components/ui/tooltip'
import PortfolioTable from '@/components/tables/PortfolioTable'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ConfirmationDialog, 
  useSubmissionPreview,
  useDeletionPreview,
  type SubmissionPreview,
  type DeletionPreview
} from '@/components/ui/confirmation-dialog'

import { Rebalance, RebalanceSortField, RebalanceSortConfig } from '@/types/rebalance'
import { useRebalancePortfolios } from '@/lib/hooks/useRebalances'
import { useRebalancePortfolios as usePortfolios } from '@/lib/hooks/usePortfolios'

interface RebalanceTableProps {
  rebalances: Rebalance[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadMore: () => void
  sortConfig: RebalanceSortConfig
  onSort: (field: RebalanceSortField) => void
  selectedRebalances: Set<string>
  onSelectRebalance: (rebalanceId: string, selected: boolean) => void
}

const RebalanceTable = React.memo(function RebalanceTable({
  rebalances,
  isLoading,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  loadMore,
  sortConfig,
  onSort,
  selectedRebalances,
  onSelectRebalance
}: RebalanceTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [submittingRebalances, setSubmittingRebalances] = useState<Set<string>>(new Set())
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [showDeletionDialog, setShowDeletionDialog] = useState(false)
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null)
  const [deletionPreview, setDeletionPreview] = useState<DeletionPreview | null>(null)
  const [currentRebalanceId, setCurrentRebalanceId] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { createPreview: createSubmissionPreview } = useSubmissionPreview()
  const { createPreview: createDeletionPreview } = useDeletionPreview()

  // Handle confirmation dialog actions
  const handleConfirmSubmit = async () => {
    if (!currentRebalanceId) return
    
    setSubmittingRebalances(prev => new Set(prev).add(currentRebalanceId))
    setShowSubmissionDialog(false)
    
    try {
      // TODO: Implement actual submission logic
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      console.log('Submitting rebalance:', currentRebalanceId)
    } catch (error) {
      console.error('Failed to submit rebalance:', error)
    } finally {
      setSubmittingRebalances(prev => {
        const newSet = new Set(prev)
        newSet.delete(currentRebalanceId)
        return newSet
      })
      setCurrentRebalanceId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!currentRebalanceId) return
    
    setShowDeletionDialog(false)
    
    try {
      // TODO: Implement actual deletion logic
      console.log('Deleting rebalance:', currentRebalanceId)
    } catch (error) {
      console.error('Failed to delete rebalance:', error)
    } finally {
      setCurrentRebalanceId(null)
    }
  }

  // Format rebalance date for display
  const formatRebalanceDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return format(date, 'MMM dd, yyyy HH:mm')
    } catch (error) {
      return 'Invalid Date'
    }
  }

  // Format number of portfolios with proper comma separation
  const formatPortfolioCount = (count: number): string => {
    return count.toLocaleString()
  }

  // Get sort icon for table headers
  const getSortIcon = (field: RebalanceSortField) => {
    if (sortConfig.field !== field) {
      return <ChevronDown className="h-4 w-4 text-gray-400" />
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />
  }

  // Handle row expansion with smooth animations
  const toggleRowExpansion = (rebalanceId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rebalanceId)) {
        newSet.delete(rebalanceId)
      } else {
        newSet.add(rebalanceId)
      }
      return newSet
    })
  }

  // Get rebalance details for expanded row
  const getRebalanceDetails = (rebalance: Rebalance) => {
    return {
      portfolios: rebalance.number_of_portfolios,
      modelId: rebalance.model_id,
      createdAt: rebalance.created_at,
      version: rebalance.version
    }
  }

  // Infinite scroll intersection observer
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      loadMore()
    }
  }, [hasNextPage, isFetchingNextPage, loadMore])

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '100px',
    })

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [handleIntersection])

  // Component for handling portfolio data within expanded rebalance
  const ExpandedRebalanceContent = ({ rebalance }: { rebalance: Rebalance }) => {
    const details = getRebalanceDetails(rebalance)
    const isExpanded = expandedRows.has(rebalance.rebalance_id)
    const [isSubmittingRebalance, setIsSubmittingRebalance] = useState(false)
    
    // Use the portfolio data hook for lazy loading
    const {
      data: portfolios,
      isLoading: portfoliosLoading,
      isError: portfoliosError,
      error: portfoliosErrorData,
    } = useRebalancePortfolios(rebalance.rebalance_id, isExpanded)

    // Handler for rebalance-level submission
    const handleSubmitRebalance = async () => {
      try {
        // Create submission preview
        const preview = createSubmissionPreview('rebalance', {
          entityId: rebalance.rebalance_id,
          entityName: `${rebalance.model_name} - ${formatRebalanceDate(rebalance.rebalance_date)}`,
          rebalances: [rebalance],
          portfolios: portfolios || [],
          positions: (portfolios || []).flatMap((p: any) => p.positions || [])
        })
        
        setSubmissionPreview(preview)
        setCurrentRebalanceId(rebalance.rebalance_id)
        setShowSubmissionDialog(true)
      } catch (error) {
        console.error('Failed to create submission preview:', error)
      }
    }

    // Handler for rebalance-level deletion
    const handleDeleteRebalance = async () => {
      try {
        // Create deletion preview
        const preview = createDeletionPreview('rebalance', {
          entityId: rebalance.rebalance_id,
          entityName: `${rebalance.model_name} - ${formatRebalanceDate(rebalance.rebalance_date)}`,
          childPortfolios: portfolios || [],
          childPositions: (portfolios || []).flatMap((p: any) => p.positions || [])
        })
        
        setDeletionPreview(preview)
        setCurrentRebalanceId(rebalance.rebalance_id)
        setShowDeletionDialog(true)
      } catch (error) {
        console.error('Failed to create deletion preview:', error)
      }
    }

    // Calculate estimated orders for this rebalance
    const getEstimatedOrders = () => {
      // TODO: Calculate based on actual position data
      // For now, estimate based on portfolio count
      return details.portfolios * 50 // Estimated 50 positions per portfolio
    }

    return (
      <TableRow key={`${rebalance.rebalance_id}-expanded`}>
        <TableCell colSpan={6} className="p-0">
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-6 bg-slate-25 border-t border-slate-100">
              {/* Expanded Content Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-900">
                  Rebalance Details
                </h4>
                <div className="text-sm text-slate-500">
                  Full ID: {rebalance.rebalance_id}
                </div>
              </div>

              {/* Rebalance Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="text-sm font-medium text-slate-600 mb-1">Model Information</div>
                  <div className="text-lg font-bold text-slate-900">{rebalance.model_name}</div>
                  <div className="text-xs text-slate-500 font-mono">ID: {details.modelId}</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="text-sm font-medium text-slate-600 mb-1">Portfolio Count</div>
                  <div className="text-lg font-bold text-slate-900">{details.portfolios.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">portfolios rebalanced</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="text-sm font-medium text-slate-600 mb-1">Version & Created</div>
                  <div className="text-lg font-bold text-slate-900">v{details.version}</div>
                  <div className="text-xs text-slate-500">{formatRebalanceDate(details.createdAt)}</div>
                </div>
              </div>

              {/* Rebalance Submit Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Send className="h-4 w-4 text-green-600" />
                      <h5 className="font-medium text-green-900">Submit Rebalance</h5>
                    </div>
                    <p className="text-sm text-green-800 mb-2">
                      Submit all portfolios in this rebalance to the Order Service for execution.
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-green-700">
                      <span>• {details.portfolios.toLocaleString()} portfolios</span>
                      <span>• ~{getEstimatedOrders().toLocaleString()} estimated orders</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteRebalance}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </Button>

                    <Button 
                      onClick={handleSubmitRebalance}
                      disabled={portfoliosLoading}
                      size="sm"
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                      <span>Submit Rebalance</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Portfolio Table Section */}
              <div className="bg-white rounded-lg border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-slate-900">Portfolio Details</h5>
                    <div className="text-sm text-slate-600">
                      {portfoliosLoading 
                        ? 'Loading portfolios...' 
                        : `${portfolios?.length || 0} portfolios loaded`
                      }
                    </div>
                  </div>
                </div>
                
                              {/* Portfolio Table - Real Data or Loading Skeleton */}
              {portfoliosLoading ? (
                <ExpandedContentSkeleton />
              ) : (
                <PortfolioTable
                  portfolios={portfolios || []}
                  isLoading={portfoliosLoading}
                  isError={portfoliosError}
                  error={portfoliosErrorData}
                  rebalanceId={rebalance.rebalance_id}
                  onRetry={() => window.location.reload()}
                />
              )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleRowExpansion(rebalance.rebalance_id)}
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={portfoliosLoading}
                >
                  {portfoliosLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Refresh Portfolios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  // Render expanded row content with nested portfolio information
  const renderExpandedContent = (rebalance: Rebalance) => {
    return <ExpandedRebalanceContent rebalance={rebalance} />
  }

  // Show enhanced skeleton loading rows
  const renderSkeletonRows = () => {
    return <TableSkeleton rows={8} />
  }

  // Show error state
  if (isError) {
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50">
        <p className="text-red-800">
          Failed to load rebalance data: {error?.message}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Mobile-optimized table container */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12">
                {/* Selection Column */}
              </TableHead>
              
              <TableHead className="w-12">
                {/* Expand/Collapse Column */}
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors min-w-[200px]"
                onClick={() => onSort('rebalance_id')}
              >
                <div className="flex items-center space-x-2">
                  <span>Rebalance ID</span>
                  {getSortIcon('rebalance_id')}
                </div>
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors min-w-[180px]"
                onClick={() => onSort('model_name')}
              >
                <div className="flex items-center space-x-2">
                  <span>Model Name</span>
                  {getSortIcon('model_name')}
                </div>
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors min-w-[160px]"
                onClick={() => onSort('rebalance_date')}
              >
                <div className="flex items-center space-x-2">
                  <span>Rebalance Date</span>
                  {getSortIcon('rebalance_date')}
                </div>
              </TableHead>
              
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors min-w-[140px]"
                onClick={() => onSort('number_of_portfolios')}
              >
                <div className="flex items-center space-x-2">
                  <span>Portfolios</span>
                  {getSortIcon('number_of_portfolios')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading && rebalances.length === 0 ? (
              renderSkeletonRows()
            ) : (
              rebalances.map((rebalance) => (
                <Fragment key={rebalance.rebalance_id}>
                  <TableRow 
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Selection Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedRebalances.has(rebalance.rebalance_id)}
                        onCheckedChange={(checked) => 
                          onSelectRebalance(rebalance.rebalance_id, checked as boolean)
                        }
                      />
                    </TableCell>
                    
                    {/* Expand/Collapse Button */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(rebalance.rebalance_id)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight 
                          className={`h-4 w-4 transition-transform ${
                            expandedRows.has(rebalance.rebalance_id) ? 'rotate-90' : ''
                          }`} 
                        />
                      </Button>
                    </TableCell>
                    
                    {/* Rebalance ID */}
                    <TableCell className="font-mono text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {rebalance.rebalance_id.slice(0, 8)}...
                        </span>
                        <span className="text-xs text-slate-500">
                          v{rebalance.version}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Model Name */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {rebalance.model_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          Model ID: {rebalance.model_id.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Rebalance Date */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {formatRebalanceDate(rebalance.rebalance_date)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(rebalance.rebalance_date), 'yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Number of Portfolios */}
                    <TableCell>
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold text-slate-900">
                          {formatPortfolioCount(rebalance.number_of_portfolios)}
                        </span>
                        <span className="text-xs text-slate-500">
                          portfolios
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Content Row */}
                  {expandedRows.has(rebalance.rebalance_id) && renderExpandedContent(rebalance)}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* Loading More Indicator */}
        {isFetchingNextPage && (
          <div className="p-4 text-center border-t bg-slate-50">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-slate-600">Loading more rebalances...</span>
            </div>
          </div>
        )}
        
        {/* End of Data Indicator */}
        {!hasNextPage && rebalances.length > 0 && (
          <div className="p-4 text-center border-t bg-slate-50">
            <span className="text-sm text-slate-500">
              All rebalances loaded ({rebalances.length} total)
            </span>
          </div>
        )}
      </div>
      
      {/* Intersection Observer Target */}
      <div ref={loadMoreRef} className="h-4" />
      
      {/* Mobile-Responsive Notice */}
      <div className="block lg:hidden bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Mobile View Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Swipe horizontally to see all columns</li>
              <li>• Tap ▶ to expand rebalance details</li>
              <li>• Tap portfolio rows to see positions</li>
              <li>• Use two fingers to zoom for better readability</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showSubmissionDialog}
        onOpenChange={setShowSubmissionDialog}
        type="submission"
        title="Confirm Rebalance Submission"
        description="Please review the submission details before proceeding."
        submissionPreview={submissionPreview || undefined}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmissionDialog(false)}
        isLoading={currentRebalanceId ? submittingRebalances.has(currentRebalanceId) : false}
        requiresExplicitConfirmation={submissionPreview?.affectedItems.riskLevel === 'high'}
      />

      <ConfirmationDialog
        open={showDeletionDialog}
        onOpenChange={setShowDeletionDialog}
        type="deletion"
        title="Confirm Rebalance Deletion"
        description="This action will permanently delete the rebalance and all associated portfolios and positions."
        deletionPreview={deletionPreview || undefined}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeletionDialog(false)}
        requiresExplicitConfirmation={true}
      />
    </div>
  )
})

export default RebalanceTable 