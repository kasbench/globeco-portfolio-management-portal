import React, { useState, useMemo } from 'react'
import { TrendingUp, Filter, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterPills } from '@/components/ui/filter-pills'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useTradeOrders } from '@/lib/hooks/useTradeOrders'
import TradeOrderListTable from '@/components/tables/TradeOrderListTable'
import { TradeOrderEnhancedResponseDTO, TradeOrderAction, TradeOrderFilters, TradeOrderSortField, SortDirection } from '@/types/trade'
import { TradeOrderActionMenu } from '@/components/features/trade-order-action-menu'
import TradeOrderDetailsModal from '@/components/features/trade-order-details-modal'
import { TradeSubmissionModal } from '@/components/features/trade-submission-modal'
import tradeService from '@/lib/api/tradeService'
import { OrderFilter } from '@/types/order'
import { OrderQueryParams } from '@/types/order'

const FILTER_FIELDS = [
  {
    field: 'securityTickers',
    label: 'Security Ticker',
    placeholder: 'Enter ticker symbol (e.g. AAPL)'
  },
  {
    field: 'portfolioNames',
    label: 'Portfolio',
    placeholder: 'Enter portfolio name'
  },
  {
    field: 'blotterAbbreviation',
    label: 'Blotter',
    placeholder: 'Enter blotter abbreviation (e.g. EQ)'
  },
  {
    field: 'orderType',
    label: 'Order Type',
    placeholder: 'BUY, SELL, or SHORT'
  },
  {
    field: 'submitted',
    label: 'Submitted',
    placeholder: 'true or false'
  }
]

interface TradeManagementPageContentProps {}

const TradeManagementPageContent: React.FC<TradeManagementPageContentProps> = () => {
  // State for filters, pagination, sorting, selection, modals, etc.
  const [filters, setFilters] = useState<TradeOrderFilters>({})
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; tradeOrder: TradeOrderEnhancedResponseDTO | null }>({ isOpen: false, tradeOrder: null })
  const [editModal, setEditModal] = useState<{ isOpen: boolean; tradeOrder: TradeOrderEnhancedResponseDTO | null }>({ isOpen: false, tradeOrder: null })
  const [submissionModal, setSubmissionModal] = useState<{ isOpen: boolean; tradeOrders: TradeOrderEnhancedResponseDTO[] }>({ isOpen: false, tradeOrders: [] })

  const {
    data,
    isLoading,
    error,
    refetch,
    pagination,
    updateFilters,
    updatePagination,
    updateSorting,
    sorting
  } = useTradeOrders()

  const tradeOrders = data?.content || []

  // Handlers
  // Utility: Convert TradeOrderFilters object to OrderFilter[] array
  function tradeOrderFiltersToOrderFilterArray(filters: TradeOrderFilters): OrderFilter[] {
    return Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([field, value]) => ({
        field: field as keyof OrderQueryParams,
        values: Array.isArray(value) ? value : [String(value)],
        label: FILTER_FIELDS.find(f => f.field === field)?.label || field
      }))
  }
  // Utility: Convert OrderFilter[] array to TradeOrderFilters object
  function orderFilterArrayToTradeOrderFilters(filters: OrderFilter[]): TradeOrderFilters {
    const result: TradeOrderFilters = {}
    const validFields = new Set([
      'id', 'orderId', 'orderType', 'portfolioId', 'portfolioNames', 'securityId', 'securityTickers',
      'blotterAbbreviation', 'submitted', 'minQuantity', 'maxQuantity', 'minQuantitySent', 'maxQuantitySent',
      'tradeTimestampFrom', 'tradeTimestampTo'
    ])
    for (const filter of filters) {
      if (validFields.has(filter.field as string)) {
        if ((filter.field as string) === 'submitted') {
          result[filter.field as keyof TradeOrderFilters] = filter.values.map(v => v === 'true') as any
        } else if (
          (filter.field as string) === 'minQuantity' ||
          (filter.field as string) === 'maxQuantity' ||
          (filter.field as string) === 'minQuantitySent' ||
          (filter.field as string) === 'maxQuantitySent'
        ) {
          result[filter.field as keyof TradeOrderFilters] = filter.values.map(v => Number(v)) as any
        } else {
          result[filter.field as keyof TradeOrderFilters] = filter.values as any
        }
      }
    }
    return result
  }

  const handleFiltersChange = (newFilters: OrderFilter[]) => {
    const converted = orderFilterArrayToTradeOrderFilters(newFilters)
    setFilters(converted)
    updateFilters(converted)
  }

  const handlePageChange = (page: number) => {
    updatePagination({ page })
  }

  const handlePageSizeChange = (size: number) => {
    updatePagination({ size, page: 0 })
  }

  // Change handleSortChange to match the expected signature for TradeOrderListTable
  const handleSortChange = (field: TradeOrderSortField, direction: SortDirection) => {
    updateSorting(field, direction)
  }

  const handleSelectOrder = (orderId: number, selected: boolean) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(orderId)
      } else {
        newSet.delete(orderId)
      }
      return newSet
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedOrders(new Set(tradeOrders.map(o => o.id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleOrderAction = async (action: TradeOrderAction, tradeOrder: TradeOrderEnhancedResponseDTO) => {
    switch (action) {
      case 'view':
        setDetailsModal({ isOpen: true, tradeOrder })
        break
      case 'edit':
        setEditModal({ isOpen: true, tradeOrder })
        break
      case 'delete':
        try {
          await tradeService.deleteTradeOrder(tradeOrder.id, tradeOrder.version)
          toast.success(`Trade Order #${tradeOrder.id} deleted`)
          refetch()
        } catch (err) {
          toast.error('Failed to delete trade order. Please try again.')
        }
        break
      case 'submit':
        setSubmissionModal({ isOpen: true, tradeOrders: [tradeOrder] })
        break
      default:
        break
    }
  }

  const handleBatchSubmit = () => {
    const selected = tradeOrders.filter(o => selectedOrders.has(o.id))
    setSubmissionModal({ isOpen: true, tradeOrders: selected })
  }

  const handleSubmissionComplete = () => {
    setSelectedOrders(new Set())
    refetch()
  }

  // Render
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Trade Management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load trade orders. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          Trade Management
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon!')}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterPills
            availableFields={FILTER_FIELDS}
            filters={tradeOrderFiltersToOrderFilterArray(filters)}
            onFiltersChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-2">
        {selectedOrders.size > 0 && (
          <Button variant="default" size="sm" onClick={handleBatchSubmit}>
            Configure Submission ({selectedOrders.size})
          </Button>
        )}
      </div>

      <div className="bg-white rounded shadow">
        <TradeOrderListTable
          tradeOrders={tradeOrders}
          selectedOrders={selectedOrders}
          onOrderSelection={handleSelectOrder}
          onSelectAll={handleSelectAll}
          onOrderAction={handleOrderAction}
          onSort={handleSortChange}
          sortField={sorting.field}
          sortDirection={sorting.direction}
        />
      </div>

      <div className="flex justify-center mt-6">
        <Pagination
          pagination={{
            pageSize: pagination.size,
            offset: pagination.page * pagination.size,
            totalElements: pagination.totalElements,
            hasNext: pagination.hasNext,
            hasPrevious: pagination.hasPrevious
          }}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Details Modal */}
      <TradeOrderDetailsModal
        tradeOrder={detailsModal.tradeOrder}
        open={detailsModal.isOpen}
        onOpenChange={open => setDetailsModal({ isOpen: open, tradeOrder: detailsModal.tradeOrder })}
        mode="view"
      />

      {/* Edit Modal */}
      <TradeOrderDetailsModal
        tradeOrder={editModal.tradeOrder}
        open={editModal.isOpen}
        onOpenChange={open => setEditModal({ isOpen: open, tradeOrder: editModal.tradeOrder })}
        mode="edit"
        onTradeOrderUpdated={refetch}
      />

      {/* Submission Modal */}
      <TradeSubmissionModal
        open={submissionModal.isOpen}
        tradeOrders={submissionModal.tradeOrders}
        onOpenChange={open => setSubmissionModal(sm => ({ ...sm, isOpen: open }))}
        onSubmissionComplete={handleSubmissionComplete}
      />
    </div>
  )
}

export default TradeManagementPageContent; 