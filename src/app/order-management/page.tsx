'use client'

import React, { useState, useMemo, Suspense } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { 
  RefreshCw, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Clock,
  DollarSign,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { FilterPills } from '@/components/ui/filter-pills'
import { SortableTable, SortableColumn } from '@/components/tables/sortable-table'
import { BatchActionBar } from '@/components/ui/batch-action-bar'
import { OrderActionMenu } from '@/components/ui/order-action-menu'
import { Pagination } from '@/components/ui/pagination'
import { OrderDetailsModal } from '@/components/features/order-details-modal'
import { useOrders } from '@/lib/hooks/useOrders'
import { OrderWithDetailsDTO, OrderFilter } from '@/types/order'
import orderServiceApi from '@/lib/api/orderService'

function OrderManagementContent() {
  const {
    orders,
    pagination,
    loading,
    error,
    filters,
    sort,
    selectedOrderIds,
    setFilters,
    setSort,
    toggleOrderSelection,
    selectAllOrders,
    clearSelection,
    goToPage,
    changePageSize,
    refresh
  } = useOrders({
    defaultPageSize: 50,
    autoRefresh: false
  })

  // Loading states for individual actions
  const [actionLoading, setActionLoading] = useState<{
    submit: Record<number, boolean>
    delete: Record<number, boolean>
    batch: boolean
  }>({
    submit: {},
    delete: {},
    batch: false
  })

  // Modal state
  const [modalState, setModalState] = useState<{
    orderId: number | null
    mode: 'view' | 'edit'
    open: boolean
  }>({
    orderId: null,
    mode: 'view',
    open: false
  })

  // Confirmation dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    orderId: number | null
    open: boolean
  }>({
    orderId: null,
    open: false
  })

  // Available filter fields
  const availableFilterFields = [
    { field: 'security.ticker', label: 'Security', placeholder: 'e.g., AAPL, MSFT' },
    { field: 'portfolio.name', label: 'Portfolio', placeholder: 'e.g., Portfolio A' },
    { field: 'blotter.name', label: 'Blotter', placeholder: 'e.g., Main Blotter' },
    { field: 'status.abbreviation', label: 'Status', placeholder: 'e.g., NEW, SENT' },
    { field: 'orderType.abbreviation', label: 'Order Type', placeholder: 'e.g., BUY, SELL' },
    { field: 'orderTimestamp', label: 'Order Date', placeholder: 'e.g., 2024-01-01' }
  ]

  // Table columns configuration
  const columns: SortableColumn[] = [
    {
      key: 'selection',
      label: '',
      className: 'w-12',
      render: (_, order: OrderWithDetailsDTO) => {
        // Safety checks to prevent infinite re-renders
        if (!order) return null
        if (typeof order !== 'object') return null
        if (!order.hasOwnProperty('id')) return null
        if (!order.id) return null
        if (!order.status) return null
        if (!order.status.abbreviation) return null
        
        try {
          const isNewOrder = order.status.abbreviation === 'NEW'
          const isSelected = selectedOrderIds.includes(order.id)
          
          if (!isNewOrder) return null
          
          return (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleOrderSelection(order.id)}
              aria-label={`Select order ${order.id}`}
            />
          )
        } catch (error) {
          console.warn('Error rendering selection checkbox:', error)
          return null
        }
      }
    },
    {
      key: 'id',
      label: 'Order ID',
      sortable: true,
      className: 'font-mono text-sm'
    },
    {
      key: 'security.ticker',
      label: 'Security',
      sortable: true,
      className: 'font-medium',
      render: (value) => {
        if (!value) return null
        return (
          <Badge variant="outline" className="font-mono">
            {value}
          </Badge>
        )
      }
    },
    {
      key: 'portfolio.name',
      label: 'Portfolio',
      sortable: true
    },
    {
      key: 'blotter.name',
      label: 'Blotter',
      sortable: true
    },
    {
      key: 'status.abbreviation',
      label: 'Status',
      sortable: true,
      render: (value) => {
        if (!value) return null
        const variant = value === 'NEW' ? 'default' : 
                      value === 'SENT' ? 'secondary' : 
                      value === 'FILLED' ? 'outline' : 'destructive'
        return <Badge variant={variant}>{value}</Badge>
      }
    },
    {
      key: 'orderType.abbreviation',
      label: 'Type',
      sortable: true,
      render: (value) => {
        if (!value) return null
        return (
          <Badge variant={value === 'BUY' ? 'outline' : 'destructive'}>
            {value}
          </Badge>
        )
      }
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      className: 'text-right font-mono',
      render: (value) => {
        if (value === null || value === undefined) return '-'
        return value.toLocaleString()
      }
    },
    {
      key: 'limitPrice',
      label: 'Limit Price',
      className: 'text-right font-mono',
      render: (value) => value ? `$${value.toFixed(2)}` : '-'
    },
    {
      key: 'orderTimestamp',
      label: 'Order Time',
      sortable: true,
      className: 'text-sm',
      render: (value) => {
        if (!value) return '-'
        try {
          return format(new Date(value), 'MMM dd, HH:mm')
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-16',
      render: (_, order: OrderWithDetailsDTO) => {
        // Multiple safety checks to prevent infinite re-renders
        if (!order) return null
        if (typeof order !== 'object') return null
        if (!order.hasOwnProperty('id')) return null
        if (!order.id) return null
        if (!order.status) return null
        if (!order.orderType) return null
        if (!order.security) return null
        
        // Additional safety check for required nested properties
        try {
          const hasRequiredProps = 
            order.status?.abbreviation &&
            order.orderType?.abbreviation &&
            order.security?.ticker &&
            typeof order.quantity === 'number'
          
          if (!hasRequiredProps) return null
          
          return (
            <OrderActionMenu
              order={order}
              onView={handleViewOrder}
              onEdit={handleEditOrder}
              onDelete={handleDeleteOrder}
              onSubmit={handleSubmitOrder}
              loading={{
                submit: actionLoading.submit[order.id] || false,
                delete: actionLoading.delete[order.id] || false
              }}
            />
          )
        } catch (error) {
          // If any error occurs during rendering, return null to prevent crashes
          console.warn('Error rendering order action menu:', error)
          return null
        }
      }
    }
  ]

  // Action handlers
  const handleViewOrder = (order: OrderWithDetailsDTO) => {
    setModalState({
      orderId: order.id,
      mode: 'view',
      open: true
    })
  }

  const handleEditOrder = (order: OrderWithDetailsDTO) => {
    setModalState({
      orderId: order.id,
      mode: 'edit',
      open: true
    })
  }

  const handleDeleteOrder = (order: OrderWithDetailsDTO) => {
    setDeleteConfirmation({
      orderId: order.id,
      open: true
    })
  }

  const confirmDeleteOrder = async () => {
    const orderId = deleteConfirmation.orderId
    if (!orderId) return

    setActionLoading(prev => ({
      ...prev,
      delete: { ...prev.delete, [orderId]: true }
    }))

    try {
      // Get the order details first to get the version
      const orderDetails = await orderServiceApi.getOrderById(orderId)
      await orderServiceApi.deleteOrder(orderId, orderDetails.version)
      toast.success(`Order #${orderId} deleted successfully`)
      await refresh()
      setDeleteConfirmation({ orderId: null, open: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete order'
      toast.error(`Failed to delete order: ${errorMessage}`)
    } finally {
      setActionLoading(prev => ({
        ...prev,
        delete: { ...prev.delete, [orderId]: false }
      }))
    }
  }

  const handleSubmitOrder = async (order: OrderWithDetailsDTO) => {
    setActionLoading(prev => ({
      ...prev,
      submit: { ...prev.submit, [order.id]: true }
    }))

    try {
      await orderServiceApi.submitOrder(order.id)
      toast.success(`Order #${order.id} submitted successfully`)
      await refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit order'
      toast.error(`Failed to submit order: ${errorMessage}`)
    } finally {
      setActionLoading(prev => ({
        ...prev,
        submit: { ...prev.submit, [order.id]: false }
      }))
    }
  }

  const handleOrderUpdated = (updatedOrder: OrderWithDetailsDTO) => {
    toast.success(`Order #${updatedOrder.id} updated successfully`)
    refresh()
  }

  const handleBatchSubmit = async () => {
    if (selectedOrderIds.length === 0) return

    // Check batch size limit
    if (selectedOrderIds.length > 100) {
      toast.error('Cannot submit more than 100 orders at once. Please select fewer orders.')
      return
    }

    setActionLoading(prev => ({ ...prev, batch: true }))

    try {
      const result = await orderServiceApi.submitOrdersBatch(selectedOrderIds)
      
      if (result.successful === selectedOrderIds.length) {
        toast.success(`Successfully submitted ${result.successful} orders`)
      } else if (result.successful > 0) {
        toast.warning(
          `Submitted ${result.successful} orders successfully, ${result.failed} failed`
        )
      } else {
        toast.error(`Failed to submit all ${result.failed} orders`)
      }
      
      clearSelection()
      await refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit batch'
      toast.error(`Batch submission failed: ${errorMessage}`)
    } finally {
      setActionLoading(prev => ({ ...prev, batch: false }))
    }
  }

  // Calculate selection stats
  const newOrdersCount = orders.filter(order => order.status.abbreviation === 'NEW').length
  const selectedNewOrdersCount = selectedOrderIds.length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Order Management</h1>
              <p className="text-slate-600 mt-1">
                Monitor, modify, and manage trade orders throughout their lifecycle
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={refresh}
                variant="outline"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <FilterPills
            filters={filters}
            onFiltersChange={setFilters}
            availableFields={availableFilterFields}
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-900">
                  {pagination?.totalElements.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">NEW Orders</p>
                <p className="text-2xl font-bold text-slate-900">
                  {newOrdersCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Square className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-slate-600">Selected</p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedNewOrdersCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">Page Size</p>
                <p className="text-2xl font-bold text-slate-900">
                  {pagination?.pageSize || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {newOrdersCount > 0 && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={selectAllOrders}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select All NEW Orders ({newOrdersCount})
                </Button>
                
                {selectedNewOrdersCount > 0 && (
                  <Button
                    onClick={clearSelection}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Clear Selection
                  </Button>
                )}
              </div>
              
              <div className="text-sm text-slate-600">
                {selectedNewOrdersCount > 0 && (
                  <span>
                    {selectedNewOrdersCount} of {newOrdersCount} NEW orders selected
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg border">
          <SortableTable
            columns={columns}
            data={orders}
            sort={sort}
            onSortChange={setSort}
            loading={loading}
            emptyMessage="No orders found. Try adjusting your filters."
          />
        </div>

        {/* Pagination */}
        {pagination && pagination.totalElements > 0 && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        )}

        {/* Batch Action Bar */}
        <BatchActionBar
          selectedCount={selectedNewOrdersCount}
          onSubmitSelected={handleBatchSubmit}
          onClearSelection={clearSelection}
          loading={actionLoading.batch}
          maxBatchSize={100}
        />

        {/* Order Details Modal */}
        <OrderDetailsModal
          orderId={modalState.orderId}
          mode={modalState.mode}
          open={modalState.open}
          onOpenChange={(open) => setModalState(prev => ({ ...prev, open }))}
          onOrderUpdated={handleOrderUpdated}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteConfirmation.open} 
          onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete order #{deleteConfirmation.orderId}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmation({ orderId: null, open: false })}
                disabled={deleteConfirmation.orderId ? actionLoading.delete[deleteConfirmation.orderId] : false}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteOrder}
                disabled={deleteConfirmation.orderId ? actionLoading.delete[deleteConfirmation.orderId] : false}
                className="flex items-center gap-2"
              >
                {deleteConfirmation.orderId && actionLoading.delete[deleteConfirmation.orderId] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Delete Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function OrderManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <OrderManagementContent />
    </Suspense>
  )
} 