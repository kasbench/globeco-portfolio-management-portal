'use client'

import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  TradeOrderEnhancedResponseDTO, 
  TradeOrderAction, 
  TradeOrderSortField,
  SortDirection 
} from '@/types/trade'
import { TradeOrderActionMenu } from '@/components/features/trade-order-action-menu'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'

export interface TradeOrderListTableProps {
  tradeOrders: TradeOrderEnhancedResponseDTO[]
  selectedOrders: Set<number>
  onOrderSelection: (orderId: number, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOrderAction: (action: TradeOrderAction, tradeOrder: TradeOrderEnhancedResponseDTO) => void
  loading?: boolean
  onSort?: (field: TradeOrderSortField, direction: SortDirection) => void
  sortField?: TradeOrderSortField
  sortDirection?: SortDirection
}

interface TableColumn {
  key: TradeOrderSortField
  label: string
  sortable: boolean
  className?: string
  mobileHidden?: boolean
}

const TABLE_COLUMNS: TableColumn[] = [
  { key: 'id', label: 'Order ID', sortable: true, className: 'w-24' },
  { key: 'securityTicker', label: 'Security', sortable: true, className: 'w-20' },
  { key: 'orderType', label: 'Type', sortable: true, className: 'w-16', mobileHidden: true },
  { key: 'quantity', label: 'Quantity', sortable: true, className: 'w-24 text-right' },
  { key: 'limitPrice', label: 'Limit Price', sortable: true, className: 'w-24 text-right', mobileHidden: true },
  { key: 'portfolioName', label: 'Portfolio', sortable: true, className: 'w-32', mobileHidden: true },
  { key: 'blotterAbbreviation', label: 'Blotter', sortable: true, className: 'w-20', mobileHidden: true },
  { key: 'submitted', label: 'Status', sortable: true, className: 'w-24' },
  { key: 'tradeTimestamp', label: 'Trade Time', sortable: true, className: 'w-32' }
]

const TradeOrderListTable: React.FC<TradeOrderListTableProps> = ({
  tradeOrders,
  selectedOrders,
  onOrderSelection,
  onSelectAll,
  onOrderAction,
  loading = false,
  onSort,
  sortField,
  sortDirection
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  // Calculate selection state
  const selectableOrders = tradeOrders.filter(order => !order.submitted)
  const selectableOrderIds = new Set(selectableOrders.map(order => order.id))
  const selectedSelectableOrders = Array.from(selectedOrders).filter(id => selectableOrderIds.has(id))
  const allSelectableSelected = selectableOrders.length > 0 && selectedSelectableOrders.length === selectableOrders.length
  const partiallySelected = selectedSelectableOrders.length > 0 && selectedSelectableOrders.length < selectableOrders.length

  const handleSelectAll = () => {
    onSelectAll(!allSelectableSelected)
  }

  const handleSort = (field: TradeOrderSortField) => {
    if (!onSort) return
    
    let direction: SortDirection = 'ASC'
    if (sortField === field && sortDirection === 'ASC') {
      direction = 'DESC'
    }
    
    onSort(field, direction)
  }

  const getSortIcon = (field: TradeOrderSortField) => {
    if (sortField !== field) return null
    return sortDirection === 'ASC' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />
  }

  const formatOrderType = (orderType: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      'BUY': 'default',
      'SELL': 'destructive',
      'SHORT': 'secondary'
    }
    
    return (
      <Badge variant={variants[orderType] || 'outline'} className="text-xs">
        {orderType}
      </Badge>
    )
  }

  const formatStatus = (submitted: boolean) => {
    return submitted ? (
      <Badge variant="secondary" className="text-xs">
        Submitted
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs">
        Draft
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tradeOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No trade orders found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-12 p-4">
                  <Checkbox
                    checked={allSelectableSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={selectableOrders.length === 0}
                  />
                </th>
                {TABLE_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`p-4 text-left text-sm font-medium text-gray-700 ${column.className}`}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center space-x-1 hover:text-gray-900 transition-colors"
                      >
                        <span>{column.label}</span>
                        {getSortIcon(column.key)}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th className="w-16 p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tradeOrders.map((order) => {
                const isSelectable = !order.submitted
                const isSelected = selectedOrders.has(order.id)
                const isHovered = hoveredRow === order.id

                return (
                  <tr
                    key={order.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onMouseEnter={() => setHoveredRow(order.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="p-4">
                      {isSelectable && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onOrderSelection(order.id, !!checked)}
                        />
                      )}
                    </td>
                    <td className="p-4 font-mono text-sm">#{order.id}</td>
                    <td className="p-4 font-medium">{order.security?.ticker || order.securityTicker || order.securityId || '—'}</td>
                    <td className="p-4">{formatOrderType(order.orderType)}</td>
                    <td className="p-4 text-right font-mono text-sm">
                      {formatNumber(order.quantity)}
                    </td>
                    <td className="p-4 text-right font-mono text-sm">
                      {order.limitPrice ? formatCurrency(order.limitPrice) : '—'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">{order.portfolio?.name || order.portfolioName || order.portfolioId || '—'}</td>
                    <td className="p-4 text-sm text-gray-600">{order.blotter?.abbreviation || order.blotterAbbreviation || '—'}</td>
                    <td className="p-4">{formatStatus(order.submitted)}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {formatDateTime(order.tradeTimestamp)}
                    </td>
                    <td className="p-4">
                      <TradeOrderActionMenu
                        tradeOrder={order}
                        onAction={onOrderAction}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableOrders.length === 0}
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectableOrders.length} selectable)
                </span>
              </label>
              <span className="text-sm text-gray-500">
                {selectedSelectableOrders.length} selected
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {tradeOrders.map((order) => {
              const isSelectable = !order.submitted
              const isSelected = selectedOrders.has(order.id)

              return (
                <div key={order.id} className={`p-4 ${isSelected ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {isSelectable && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onOrderSelection(order.id, !!checked)}
                        />
                      )}
                      <div>
                        <div className="font-mono text-sm text-gray-600">#{order.id}</div>
                        <div className="font-medium text-lg">{order.security?.ticker || order.securityTicker || order.securityId || '—'}</div>
                      </div>
                    </div>
                    <TradeOrderActionMenu
                      tradeOrder={order}
                      onAction={onOrderAction}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Type & Quantity</div>
                      <div className="flex items-center space-x-2">
                        {formatOrderType(order.orderType)}
                        <span className="font-mono">{formatNumber(order.quantity)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div>{formatStatus(order.submitted)}</div>
                    </div>
                    {order.limitPrice && (
                      <div>
                        <div className="text-gray-500">Limit Price</div>
                        <div className="font-mono">{formatCurrency(order.limitPrice)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500">Modified</div>
                      <div>{formatDateTime(order.tradeTimestamp)}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {order.portfolio?.name || order.portfolioName || order.portfolioId || '—'} • {order.blotter?.abbreviation || order.blotterAbbreviation || '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TradeOrderListTable 