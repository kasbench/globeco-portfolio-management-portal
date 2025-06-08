'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ChevronUp, ChevronDown, Edit, RefreshCcw, MoreVertical, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { Model, ModelSortField, SortConfig } from '@/types/model'

interface ModelsTableProps {
  models: Model[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadMore: () => void
  sortConfig: SortConfig
  onSort: (field: ModelSortField) => void
  onEdit: (model: Model) => void
  onRebalance: (modelId: string) => void
  isRebalancing?: boolean
  onView?: (model: Model) => void
}

export default function ModelsTable({
  models,
  isLoading,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  loadMore,
  sortConfig,
  onSort,
  onEdit,
  onRebalance,
  isRebalancing = false,
  onView,
}: ModelsTableProps) {
  const [rebalanceModelId, setRebalanceModelId] = useState<string | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    const loadingElement = loadingRef.current
    if (!loadingElement || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadingElement)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, loadMore])

  const getSortIcon = (field: ModelSortField) => {
    if (sortConfig.field !== field) {
      return <div className="w-4 h-4" /> // Empty space
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  const handleRebalanceConfirm = () => {
    if (rebalanceModelId) {
      onRebalance(rebalanceModelId)
      setRebalanceModelId(null)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Models</h3>
        <p className="text-slate-600 mb-4 max-w-md">
          {error?.message || 'Unable to load investment models. Please check your connection and try again.'}
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort('model_id')}
              >
                <div className="flex items-center space-x-2">
                  <span>Model ID</span>
                  {getSortIcon('model_id')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center space-x-2">
                  <span>Name</span>
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead>Portfolios</TableHead>
              <TableHead>Positions</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => onSort('last_rebalance_date')}
              >
                <div className="flex items-center space-x-2">
                  <span>Last Rebalance</span>
                  {getSortIcon('last_rebalance_date')}
                </div>
              </TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    <span className="text-slate-600">Loading models...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Investment Models</h3>
                    <p className="text-sm">Create your first investment model to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              models.map((model) => (
                <TableRow key={model.model_id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-sm">
                    {model.model_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {model.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {model.portfolios.slice(0, 2).map((portfolio, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {portfolio.slice(0, 8)}...
                        </Badge>
                      ))}
                      {model.portfolios.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{model.portfolios.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {model.positions?.length || 0} positions
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {formatDate(model.last_rebalance_date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      v{model.version}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(model)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(model)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRebalanceModelId(model.model_id)}
                        disabled={isRebalancing}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshCcw className={`h-4 w-4 ${isRebalancing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Loading indicator for infinite scroll */}
      {hasNextPage && (
        <div ref={loadingRef} className="flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center space-x-2 text-slate-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
              <span>Loading more models...</span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={loadMore}
              className="text-slate-600 hover:text-slate-900"
            >
              Load More Models
            </Button>
          )}
        </div>
      )}

      {/* Rebalance Confirmation Dialog */}
      <AlertDialog open={!!rebalanceModelId} onOpenChange={() => setRebalanceModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebalance Model</AlertDialogTitle>
            <AlertDialogDescription>
              This will rebalance all portfolios associated with this investment model. 
              This action will generate new orders based on the current model configuration 
              and market conditions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRebalanceConfirm}>
              Rebalance Model
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 