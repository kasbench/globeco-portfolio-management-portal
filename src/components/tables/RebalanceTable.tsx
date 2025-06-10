'use client'

import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { format } from 'date-fns'
import { ChevronUp, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'

import { Rebalance, RebalanceSortField, RebalanceSortConfig } from '@/types/rebalance'

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
}

export default function RebalanceTable({
  rebalances,
  isLoading,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  loadMore,
  sortConfig,
  onSort,
}: RebalanceTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const loadMoreRef = useRef<HTMLDivElement>(null)

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

  // Render expanded row content with nested portfolio information
  const renderExpandedContent = (rebalance: Rebalance) => {
    const details = getRebalanceDetails(rebalance)
    const isExpanded = expandedRows.has(rebalance.rebalance_id)
    
    return (
      <TableRow key={`${rebalance.rebalance_id}-expanded`}>
        <TableCell colSpan={5} className="p-0">
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
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

              {/* Portfolio Table Section */}
              <div className="bg-white rounded-lg border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-slate-900">Portfolio Details</h5>
                    <div className="text-sm text-slate-600">
                      {details.portfolios} portfolios • Loading in Phase 3
                    </div>
                  </div>
                </div>
                
                {/* Placeholder for Portfolio Table (Phase 3) */}
                <div className="p-6">
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                    <h6 className="text-lg font-medium text-slate-900 mb-2">
                      Portfolio Data Loading...
                    </h6>
                    <p className="text-slate-600 max-w-md mx-auto mb-4">
                      Nested portfolio table with expandable position details will be implemented in 
                      <strong className="text-blue-600"> Phase 3: Portfolio Level Integration</strong>.
                    </p>
                    <div className="text-sm text-slate-500">
                      <strong>Preview:</strong> Portfolio ID • Market Value • Cash Before/After • Expand for Positions
                    </div>
                  </div>
                </div>
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
                <Button variant="outline" size="sm" disabled>
                  <Loader2 className="h-4 w-4 mr-1" />
                  Load Portfolio Data (Phase 3)
                </Button>
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  // Show skeleton loading rows
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`} className="animate-pulse">
        <TableCell>
          <div className="h-4 bg-slate-200 rounded w-16"></div>
        </TableCell>
        <TableCell>
          <div className="h-4 bg-slate-200 rounded w-32"></div>
        </TableCell>
        <TableCell>
          <div className="h-4 bg-slate-200 rounded w-24"></div>
        </TableCell>
        <TableCell>
          <div className="h-4 bg-slate-200 rounded w-20"></div>
        </TableCell>
        <TableCell>
          <div className="h-4 bg-slate-200 rounded w-12"></div>
        </TableCell>
      </TableRow>
    ))
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
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
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
      <div className="block md:hidden bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Mobile View:</strong> Scroll horizontally to see all columns. 
          Tap the arrow to expand portfolio details (coming in Phase 3).
        </p>
      </div>
    </div>
  )
} 