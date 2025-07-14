import React, { useState, useMemo, useEffect } from 'react'
import { Activity, RefreshCw, X, Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExecutionFilterPills } from '@/components/ui/execution-filter-pills'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useExecutions } from '@/lib/hooks/useExecutions'
import { ExecutionListTable } from '@/components/tables/ExecutionListTable'
import { EnhancedExecutionDTO, ExecutionAction, ExecutionFilters, ExecutionSortField, SortDirection } from '@/types/execution'
import { ExecutionDetailsModal } from '@/components/features/execution-details-modal'
import { executionService } from '@/lib/api/executionService'
import { saveFilters, loadFilters, cleanupExpiredFilters } from '@/lib/utils/filterPersistence'
import { exportExecutions, getExportSummary } from '@/lib/utils/exportUtils'

const ENHANCED_FILTER_FIELDS = [
  {
    field: 'ticker' as keyof ExecutionFilters,
    label: 'Security Ticker',
    placeholder: 'Enter ticker symbol (e.g. AAPL)',
    type: 'text' as const
  },
  {
    field: 'executionStatus' as keyof ExecutionFilters,
    label: 'Status',
    placeholder: 'Select execution status',
    type: 'multiselect' as const
  },
  {
    field: 'tradeType' as keyof ExecutionFilters,
    label: 'Trade Type',
    placeholder: 'Select trade type',
    type: 'multiselect' as const
  },
  {
    field: 'destination' as keyof ExecutionFilters,
    label: 'Destination',
    placeholder: 'Enter destination',
    type: 'text' as const
  },
  {
    field: 'receivedTimestamp' as keyof ExecutionFilters,
    label: 'Received Date',
    placeholder: 'Select date range',
    type: 'daterange' as const
  },
  {
    field: 'sentTimestamp' as keyof ExecutionFilters,
    label: 'Sent Date',
    placeholder: 'Select date range',
    type: 'daterange' as const
  }
]

const FILTER_PERSISTENCE_KEY = 'execution_management'

interface ExecutionManagementPageContentProps {}

const ExecutionManagementPageContent: React.FC<ExecutionManagementPageContentProps> = () => {
  const [selectedExecutions, setSelectedExecutions] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<ExecutionFilters>({})
  const [initialFiltersLoaded, setInitialFiltersLoaded] = useState(false)
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean
    execution: EnhancedExecutionDTO | null
  }>({
    isOpen: false,
    execution: null
  })

  const [cancelConfirmation, setCancelConfirmation] = useState<{
    isOpen: boolean
    executions: EnhancedExecutionDTO[]
    isBulk: boolean
  }>({
    isOpen: false,
    executions: [],
    isBulk: false
  })

  const [exportDialog, setExportDialog] = useState<{
    isOpen: boolean
    selectedOnly: boolean
    includeAllFields: boolean
  }>({
    isOpen: false,
    selectedOnly: false,
    includeAllFields: false
  })

  // Load persisted filters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      cleanupExpiredFilters() // Clean up expired filters first
      const persistedFilters = loadFilters(FILTER_PERSISTENCE_KEY)
      
      if (persistedFilters.length > 0) {
        // Convert persisted filters back to ExecutionFilters format
        const initialFilters: ExecutionFilters = {}
        persistedFilters.forEach(filter => {
          if (filter.field === 'executionStatus') {
            initialFilters.executionStatus = filter.values
          } else if (filter.field === 'tradeType') {
            initialFilters.tradeType = filter.values
          } else if (filter.field === 'ticker') {
            initialFilters.ticker = filter.values
          } else if (filter.field === 'destination') {
            initialFilters.destination = filter.values
          }
        })
        setFilters(initialFilters)
      }
      setInitialFiltersLoaded(true)
    }
  }, [])

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

  // Handle filter changes with persistence
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
    
    // Persist filters to localStorage
    if (typeof window !== 'undefined') {
      saveFilters(FILTER_PERSISTENCE_KEY, newFilters)
    }
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
        .filter(execution => !['FILLED', 'FULL', 'CANCELLED', 'CANCEL'].includes(execution.executionStatus))
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

  // Handle export functionality
  const handleExportClick = (selectedOnly: boolean = false) => {
    if (selectedOnly && selectedExecutions.size === 0) {
      toast.error('No executions selected for export')
      return
    }

    if (!executions || executions.length === 0) {
      toast.error('No executions available for export')
      return
    }

    setExportDialog({
      isOpen: true,
      selectedOnly,
      includeAllFields: false
    })
  }

  const handleExportConfirm = () => {
    try {
      if (!executions) {
        toast.error('No executions available for export')
        return
      }

      // Map EnhancedExecutionDTO[] to ExecutionDTO[] for export
      const executionsForExport = executions.map(e => ({
        ...e,
        securityId: e.securityId || e.security.securityId,
        // Remove the 'security' field for type compatibility
        security: undefined
      })) as any // TypeScript: force as ExecutionDTO[]

      exportExecutions(executionsForExport, selectedExecutions, {
        selectedOnly: exportDialog.selectedOnly,
        includeAllFields: exportDialog.includeAllFields
      })

      const exportCount = exportDialog.selectedOnly ? selectedExecutions.size : executions.length
      toast.success(`Successfully exported ${exportCount} execution${exportCount !== 1 ? 's' : ''} to CSV`)
      setExportDialog({ isOpen: false, selectedOnly: false, includeAllFields: false })
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export executions. Please try again.')
    }
  }

  // Handle individual execution actions
  const handleExecutionAction = async (action: ExecutionAction, execution: EnhancedExecutionDTO) => {
    try {
      switch (action) {
        case 'view':
          // Fetch fresh execution details for the modal
          try {
            const freshExecution = await executionService.getExecution(execution.id)
            setDetailsModal({
              isOpen: true,
              execution: { ...freshExecution, security: execution.security }
            })
          } catch (error) {
            console.warn('Failed to fetch fresh execution details, using cached data:', error)
            // Fallback to cached execution data
            setDetailsModal({
              isOpen: true,
              execution: execution
            })
          }
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
        const executionData = executionsToCancel.map(e => ({ id: e.id, version: e.version }))
        const result = await executionService.cancelExecutionsBatch(executionData)
        toast.success(`Successfully cancelled ${result.successful} of ${result.totalCount} executions`)
        setSelectedExecutions(new Set())
      } else if (executionsToCancel.length === 1) {
        // Single cancellation
        const execution = executionsToCancel[0]
        await executionService.cancelExecution(execution.id, execution.version)
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
      updateSorting([sort[0]])
    }
  }

  // Statistics summary
  const stats = useMemo(() => {
    if (!executions || executions.length === 0) return null

    const total = executions.length
    const filled = executions.filter(e => ['FILLED', 'FULL'].includes(e.executionStatus)).length
    const partiallyFilled = executions.filter(e => e.executionStatus === 'PARTIALLY_FILLED').length
    const cancelled = executions.filter(e => ['CANCELLED', 'CANCEL'].includes(e.executionStatus)).length
    const active = total - filled - cancelled

    return { total, filled, partiallyFilled, cancelled, active }
  }, [executions])

  // Don't render until initial filters are loaded to prevent flash
  if (!initialFiltersLoaded) {
    return (
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
    )
  }

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
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportClick(false)}>
                <FileDown className="h-4 w-4 mr-2" />
                Export All Executions
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExportClick(true)}
                disabled={selectedExecutions.size === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export Selected ({selectedExecutions.size})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Enhanced Filter Pills */}
      <ExecutionFilterPills
        filterFields={ENHANCED_FILTER_FIELDS}
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
              sorting={sorting}
              onSortChange={handleSortChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {executionsData && executionsData.pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            pagination={{
              pageSize: pagination.size,
              offset: pagination.page * pagination.size,
              totalElements: pagination.totalElements,
              hasNext: pagination.hasNext,
              hasPrevious: pagination.hasPrevious,
            }}
            onPageChange={(page) => updatePagination({ page })}
            onPageSizeChange={(size) => updatePagination({ size, page: 0 })}
          />
        </div>
      )}

      {/* Execution Details Modal */}
      <ExecutionDetailsModal
        execution={detailsModal.execution ? (() => {
          const { security, ...rest } = detailsModal.execution
          return {
            ...rest,
            securityId: detailsModal.execution.securityId || detailsModal.execution.security.securityId
          }
        })() : null}
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, execution: null })}
      />

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialog.isOpen} onOpenChange={(open) => 
        !open && setExportDialog({ isOpen: false, selectedOnly: false, includeAllFields: false })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Executions</DialogTitle>
            <DialogDescription>
              {getExportSummary(
                executions?.length || 0,
                selectedExecutions,
                exportDialog.selectedOnly
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAllFields"
                checked={exportDialog.includeAllFields}
                onCheckedChange={(checked) => 
                  setExportDialog(prev => ({ ...prev, includeAllFields: !!checked }))
                }
              />
              <Label htmlFor="includeAllFields">
                Include all fields (including hidden fields like Security ID)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setExportDialog({ isOpen: false, selectedOnly: false, includeAllFields: false })}
            >
              Cancel
            </Button>
            <Button onClick={handleExportConfirm}>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default ExecutionManagementPageContent; 