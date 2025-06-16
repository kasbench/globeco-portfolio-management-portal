'use client'

import React, { useState, useMemo, Suspense } from 'react'
import { TrendingUp, Filter, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterPills } from '@/components/ui/filter-pills'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useTradeOrders } from '@/lib/hooks/useTradeOrders'
import TradeOrderListTable from '@/components/tables/TradeOrderListTable'
import { TradeOrderEnhancedResponseDTO, TradeOrderAction, TradeOrderFilters } from '@/types/trade'
import { TradeOrderActionMenu } from '@/components/features/trade-order-action-menu'

// Filter configuration for Trade Orders
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
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<TradeOrderFilters>({})

  const {
    data: tradeOrdersData,
    isLoading,
    error,
    refetch,
    pagination,
    updateFilters,
    updatePagination,
    updateSorting
  } = useTradeOrders({ 
    initialFilters: filters,
    initialPageSize: 50 
  })

  // Handle filter changes
  const handleFiltersChange = (newFilters: any[]) => {
    const filtersObject: TradeOrderFilters = {} // Start with empty filters - no forced defaults
    
    newFilters.forEach(filter => {
      if (filter.field === 'submitted') {
        filtersObject.submitted = filter.values[0] === 'true'
      } else if (filter.field === 'orderType') {
        filtersObject.orderType = filter.values
      } else if (filter.field === 'securityTickers') {
        filtersObject.securityTickers = filter.values
      } else if (filter.field === 'portfolioNames') {
        filtersObject.portfolioNames = filter.values
      } else if (filter.field === 'blotterAbbreviation') {
        filtersObject.blotterAbbreviation = filter.values
      }
    })

    setFilters(filtersObject)
    updateFilters(filtersObject)
  }

  // Handle order selection
  const handleOrderSelection = (orderId: number, selected: boolean) => {
    const newSelection = new Set(selectedOrders)
    if (selected) {
      newSelection.add(orderId)
    } else {
      newSelection.delete(orderId)
    }
    setSelectedOrders(newSelection)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected && tradeOrdersData?.content) {
      const selectableOrders = tradeOrdersData.content
        .filter(order => !order.submitted)
        .map(order => order.id)
      setSelectedOrders(new Set(selectableOrders))
    } else {
      setSelectedOrders(new Set())
    }
  }

  // Handle individual order actions
  const handleOrderAction = async (action: TradeOrderAction, tradeOrder: TradeOrderEnhancedResponseDTO) => {
    try {
      switch (action) {
        case 'view':
          // TODO: Open order details modal
          toast({
            title: 'View Trade Order',
            description: `Opening details for Trade Order #${tradeOrder.id}`,
          })
          break
        case 'edit':
          // TODO: Open order edit form
          toast({
            title: 'Edit Trade Order',
            description: `Opening edit form for Trade Order #${tradeOrder.id}`,
          })
          break
        case 'delete':
          // TODO: Implement delete functionality
          toast({
            title: 'Delete Trade Order',
            description: `Trade Order #${tradeOrder.id} would be deleted`,
          })
          await refetch()
          break
        case 'submit':
          // TODO: Implement submit functionality
          toast({
            title: 'Submit Trade Order',
            description: `Trade Order #${tradeOrder.id} would be submitted`,
          })
          await refetch()
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} trade order:`, error)
      toast({
        title: 'Error',
        description: `Failed to ${action} trade order. Please try again.`,
        variant: 'destructive',
      })
    }
  }

  // Convert filters to filter pills format
  const filterPills = useMemo(() => {
    const pills: any[] = []
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const fieldConfig = FILTER_FIELDS.find(f => f.field === key)
        if (fieldConfig && Array.isArray(value) && value.length > 0) {
          pills.push({
            field: key,
            values: value,
            label: fieldConfig.label
          })
        } else if (fieldConfig && typeof value === 'boolean') {
          pills.push({
            field: key,
            values: [value.toString()],
            label: fieldConfig.label
          })
        }
      }
    })

    return pills
  }, [filters])

  const selectedCount = selectedOrders.size
  const totalCount = tradeOrdersData?.content?.length || 0
  const allSelected = totalCount > 0 && selectedCount === totalCount
  const partiallySelected = selectedCount > 0 && selectedCount < totalCount

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Trade Management</h1>
              <p className="text-slate-600">Manage and monitor trade orders across all portfolios</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FilterPills
              filters={filterPills}
              onFiltersChange={handleFiltersChange}
              availableFields={FILTER_FIELDS}
            />
          </CardContent>
        </Card>

        {/* Results Summary */}
        {tradeOrdersData && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                Showing {tradeOrdersData.numberOfElements} of {tradeOrdersData.totalElements} trade orders
              </div>
              {selectedCount > 0 && (
                <Badge variant="secondary">
                  {selectedCount} selected
                </Badge>
              )}
            </div>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Submit Selected ({selectedCount})
                </Button>
                <Button variant="outline" size="sm">
                  Move to Blotter
                </Button>
                <Button variant="destructive" size="sm">
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>
              Failed to load trade orders: {error.message}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Trade Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ) : tradeOrdersData?.content && tradeOrdersData.content.length > 0 ? (
              <TradeOrderListTable
                tradeOrders={tradeOrdersData.content}
                selectedOrders={selectedOrders}
                onOrderSelection={handleOrderSelection}
                onSelectAll={handleSelectAll}
                onOrderAction={handleOrderAction}
                loading={isLoading}
              />
            ) : (
              <div className="p-12 text-center">
                <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Trade Orders Found</h3>
                <p className="text-slate-600 mb-4">
                  No trade orders match your current filters. Try adjusting your search criteria.
                </p>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({ submitted: false })
                    updateFilters({ submitted: false })
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {tradeOrdersData && tradeOrdersData.totalElements > 0 && (
          <div className="mt-6">
            <Pagination
              pagination={{
                offset: tradeOrdersData.number * tradeOrdersData.size,
                pageSize: tradeOrdersData.size,
                totalElements: tradeOrdersData.totalElements,
                hasNext: !tradeOrdersData.last,
                hasPrevious: !tradeOrdersData.first,
              }}
              onPageChange={(page) => updatePagination({ page: page - 1 })}
              onPageSizeChange={(pageSize) => updatePagination({ size: pageSize })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const TradeManagementPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Trade Management...</p>
        </div>
      </div>
    }>
      <TradeManagementPageContent />
    </Suspense>
  )
}

export default TradeManagementPage 