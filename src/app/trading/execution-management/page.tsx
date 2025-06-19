'use client'

import React, { useState, useMemo, Suspense } from 'react'
import { Activity, Filter, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterPills } from '@/components/ui/filter-pills'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useExecutions } from '@/lib/hooks/useExecutions'
import { ExecutionListTable } from '@/components/tables/ExecutionListTable'
import { ExecutionDTO, ExecutionAction, ExecutionFilters, ExecutionSortField, SortDirection } from '@/types/execution'
import { ExecutionDetailsModal } from '@/components/features/execution-details-modal'
import { executionService } from '@/lib/api/executionService'

// Filter configuration for Executions
const FILTER_FIELDS = [
  {
    field: 'ticker',
    label: 'Security Ticker',
    placeholder: 'Enter ticker symbol (e.g. AAPL)'
  },
  {
    field: 'executionStatus',
    label: 'Status',
    placeholder: 'NEW, SENT, FILLED, etc.'
  },
  {
    field: 'tradeType',
    label: 'Trade Type',
    placeholder: 'BUY, SELL, or SHORT'
  },
  {
    field: 'destination',
    label: 'Destination',
    placeholder: 'Enter destination'
  }
]

interface ExecutionManagementPageContentProps {}

export const ExecutionManagementPageContent: React.FC<ExecutionManagementPageContentProps> = () => {
  const [selectedExecutions, setSelectedExecutions] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<ExecutionFilters>({})
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean
    execution: ExecutionDTO | null
  }>({
    isOpen: false,
    execution: null
  })

  const [cancelConfirmation, setCancelConfirmation] = useState<{
    isOpen: boolean
    executions: ExecutionDTO[]
    isBulk: boolean
  }>({
    isOpen: false,
    executions: [],
    isBulk: false
  })

  const {
    data: executionsData,
    executions,
    isLoading,
    error,
    refetch,
    pagination,
    updateFilters,
    updatePagination,
    updateSorting,
    sorting,
    isRefetching
  } = useExecutions({ 
    initialFilters: filters,
    initialPageSize: 50,
    enablePolling: true // Auto-refresh every 30 seconds
  })

  // Handle filter changes
  const handleFiltersChange = (newFilters: any[]) => {
    const filtersObject: ExecutionFilters = {}
    
    newFilters.forEach(filter => {
      if (filter.field === 'executionStatus') {
        filtersObject.executionStatus = filter.values
      } else if (filter.field === 'tradeType') {
        filtersObject.tradeType = filter.values
      } else if (filter.field === 'ticker') {
        filtersObject.ticker = filter.values
      } else if (filter.field === 'destination') {
        filtersObject.destination = filter.values
      }
    })

    setFilters(filtersObject)
    updateFilters(filtersObject)
  }

  // Handle execution selection
  const handleExecutionSelection = (executionId: number, selected: boolean) => {
    const newSelection = new Set(selectedExecutions)
    if (selected) {
      newSelection.add(executionId)
    } else {
      newSelection.delete(executionId)
    }
    setSelectedExecutions(newSelection)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected && executions) {
      // Only select cancellable executions
      const selectableExecutions = executions
        .filter(execution => !['FILLED', 'CANCELLED', 'CANCEL'].includes(execution.executionStatus))
        .map(execution => execution.id)
      setSelectedExecutions(new Set(selectableExecutions))
    } else {
      setSelectedExecutions(new Set())
    }
  }

  // Handle bulk cancel of selected executions
  const handleBulkCancel = () => {
    if (selectedExecutions.size === 0) {
      toast.error('No executions selected for cancellation')
      return
    }

    // Get selected executions for the confirmation modal
    const selectedExecutionList = executions?.filter(execution => 
      selectedExecutions.has(execution.id)
    ) || []

    setCancelConfirmation({
      isOpen: true,
      executions: selectedExecutionList,
      isBulk: true
    })
  }

  // Handle individual execution actions
  const handleExecutionAction = async (action: ExecutionAction, execution: ExecutionDTO) => {
    try {
      switch (action) {
        case 'view':
          setDetailsModal({
            isOpen: true,
            execution: execution
          })
          break
        case 'cancel':
          setCancelConfirmation({
            isOpen: true,
            executions: [execution],
            isBulk: false
          })
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} execution:`, error)
      toast.error(`Failed to ${action} execution. Please try again.`)
    }
  }

  // Handle cancellation confirmation
  const handleCancelConfirm = async () => {
    try {
      const { executions: executionsToCancel, isBulk } = cancelConfirmation
      
      if (isBulk && executionsToCancel.length > 1) {
        // Bulk cancellation
        await executionService.cancelExecutions(executionsToCancel.map(e => e.id))
        toast.success(`Successfully cancelled ${executionsToCancel.length} executions`)
        setSelectedExecutions(new Set())
      } else if (executionsToCancel.length === 1) {
        // Single cancellation
        await executionService.cancelExecution(executionsToCancel[0].id)
        toast.success('Execution cancelled successfully')
      }

      setCancelConfirmation({ isOpen: false, executions: [], isBulk: false })
      await refetch()
    } catch (error) {
      console.error('Failed to cancel execution(s):', error)
      toast.error('Failed to cancel execution(s). Please try again.')
    }
  }

  // Handle sorting changes
  const handleSortChange = (sort: Array<{ field: ExecutionSortField; direction: SortDirection }>) => {
    if (sort.length > 0) {
      updateSorting(sort[0].field, sort[0].direction)
    }
  }

  // Statistics summary
  const stats = useMemo(() => {
    if (!executions || executions.length === 0) return null

    const total = executions.length
    const filled = executions.filter(e => e.executionStatus === 'FILLED').length
    const partiallyFilled = executions.filter(e => e.executionStatus === 'PARTIALLY_FILLED').length
    const cancelled = executions.filter(e => ['CANCELLED', 'CANCEL'].includes(e.executionStatus)).length
    const active = total - filled - cancelled

    return { total, filled, partiallyFilled, cancelled, active }
  }, [executions])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Execution Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage trade executions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {selectedExecutions.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Selected ({selectedExecutions.size})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Executions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.filled}</div>
              <div className="text-sm text-gray-600">Filled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.partiallyFilled}</div>
              <div className="text-sm text-gray-600">Partially Filled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Pills */}
      <FilterPills
        filterFields={FILTER_FIELDS}
        onFiltersChange={handleFiltersChange}
        className="mb-4"
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || 'An error occurred while loading executions'}
          </AlertDescription>
        </Alert>
      )}

      {/* Executions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Executions
            {executionsData && (
              <Badge variant="secondary" className="ml-2">
                {executionsData.pagination.totalElements} total
              </Badge>
            )}
            {isRefetching && (
              <Badge variant="outline" className="ml-2">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Refreshing
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ExecutionListTable
              executions={executions || []}
              loading={isLoading}
              selectedExecutions={selectedExecutions}
              onExecutionSelect={handleExecutionSelection}
              onSelectAll={handleSelectAll}
              onExecutionAction={handleExecutionAction}
              sorting={[{ field: sorting.field, direction: sorting.direction }]}
              onSortChange={handleSortChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {executionsData && executionsData.pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => updatePagination({ page })}
            showSizeSelector
            pageSize={pagination.size}
            onPageSizeChange={(size) => updatePagination({ size, page: 0 })}
          />
        </div>
      )}

      {/* Execution Details Modal */}
      <ExecutionDetailsModal
        execution={detailsModal.execution}
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, execution: null })}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelConfirmation.isOpen} onOpenChange={(open) => 
        !open && setCancelConfirmation({ isOpen: false, executions: [], isBulk: false })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              {cancelConfirmation.isBulk 
                ? `Are you sure you want to cancel ${cancelConfirmation.executions.length} selected execution(s)?`
                : `Are you sure you want to cancel execution #${cancelConfirmation.executions[0]?.id}?`
              }
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelConfirmation({ isOpen: false, executions: [], isBulk: false })}
            >
              Keep Executions
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>
              Cancel Execution{cancelConfirmation.isBulk && cancelConfirmation.executions.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const ExecutionManagementPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    }>
      <ExecutionManagementPageContent />
    </Suspense>
  )
}

export default ExecutionManagementPage 