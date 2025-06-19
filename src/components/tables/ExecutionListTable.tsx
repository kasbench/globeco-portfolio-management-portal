'use client'

import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SortableTable, SortableColumn } from '@/components/tables/sortable-table'
import { ExecutionActionMenu } from '@/components/features/execution-action-menu'
import { EnhancedExecutionDTO, ExecutionAction, ExecutionSortField, SortDirection } from '@/types/execution'
import { formatCurrency, formatNumber, formatDate, formatTime } from '@/lib/utils'

interface ExecutionListTableProps {
  executions: EnhancedExecutionDTO[]
  loading?: boolean
  selectedExecutions: Set<number>
  onExecutionSelect: (executionId: number, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onExecutionAction: (action: ExecutionAction, execution: EnhancedExecutionDTO) => void
  sorting: Array<{ field: ExecutionSortField; direction: SortDirection }>
  onSortChange: (sort: Array<{ field: ExecutionSortField; direction: SortDirection }>) => void
  className?: string
}

const ExecutionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'secondary'
      case 'SENT':
        return 'default'
      case 'FILLED':
      case 'FULL':
        return 'success'
      case 'PARTIALLY_FILLED':
        return 'warning'
      case 'CANCELLED':
      case 'CANCEL':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Badge variant={getStatusVariant(status)} className="text-xs font-medium">
      {status.replace('_', ' ')}
    </Badge>
  )
}

const TradeTypeBadge: React.FC<{ tradeType: string }> = ({ tradeType }) => {
  return (
    <Badge 
      variant={tradeType === 'BUY' ? 'default' : 'outline'}
      className={`text-xs font-medium ${
        tradeType === 'BUY' 
          ? 'bg-green-100 text-green-800 border-green-200' 
          : 'bg-red-100 text-red-800 border-red-200'
      }`}
    >
      {tradeType}
    </Badge>
  )
}

export const ExecutionListTable: React.FC<ExecutionListTableProps> = ({
  executions,
  loading = false,
  selectedExecutions,
  onExecutionSelect,
  onSelectAll,
  onExecutionAction,
  sorting,
  onSortChange,
  className = ''
}) => {
  // Determine if an execution can be cancelled
  const canCancel = (execution: EnhancedExecutionDTO): boolean => {
    return !['FILLED', 'FULL', 'CANCELLED', 'CANCEL'].includes(execution.executionStatus)
  }

  // Get cancellable executions for selection
  const cancellableExecutions = useMemo(() => {
    return executions.filter(canCancel)
  }, [executions])

  // Check if all cancellable executions are selected
  const isAllSelected = useMemo(() => {
    return cancellableExecutions.length > 0 && 
           cancellableExecutions.every(execution => selectedExecutions.has(execution.id))
  }, [cancellableExecutions, selectedExecutions])

  // Check if some cancellable executions are selected
  const isPartiallySelected = useMemo(() => {
    return cancellableExecutions.some(execution => selectedExecutions.has(execution.id)) && !isAllSelected
  }, [cancellableExecutions, selectedExecutions, isAllSelected])

  // Format fill progress
  const formatFillProgress = (execution: EnhancedExecutionDTO) => {
    if (execution.quantity === 0) return '0%'
    const percentage = (execution.quantityFilled / execution.quantity) * 100
    return `${percentage.toFixed(1)}%`
  }

  // Table columns configuration
  const columns: SortableColumn[] = [
    // Selection checkbox column
    {
      key: 'select',
      label: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isPartiallySelected || undefined}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
          aria-label="Select all cancellable executions"
        />
      ),
      sortable: false,
      className: 'w-12',
      render: (_, execution) => {
        const isCancellable = canCancel(execution)
        return isCancellable ? (
          <Checkbox
            checked={selectedExecutions.has(execution.id)}
            onCheckedChange={(checked) => onExecutionSelect(execution.id, !!checked)}
            aria-label={`Select execution ${execution.id}`}
          />
        ) : null
      }
    },
    // ID column
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      className: 'w-20 font-mono text-sm',
      render: (value) => `#${value}`
    },
    // Status column
    {
      key: 'executionStatus',
      label: 'Status',
      sortable: true,
      className: 'w-32',
      render: (status) => <ExecutionStatusBadge status={status} />
    },
    // Trade type column
    {
      key: 'tradeType',
      label: 'Type',
      sortable: true,
      className: 'w-20',
      render: (tradeType) => <TradeTypeBadge tradeType={tradeType} />
    },
    // Security ticker column
    {
      key: 'security.ticker',
      label: 'Security',
      sortable: true,
      className: 'w-24 font-medium',
      render: (_, execution) => (
        <div>
          <div className="font-medium">{execution.security.ticker}</div>
          <div className="text-xs text-slate-500">{execution.security.securityId}</div>
        </div>
      )
    },
    // Destination column
    {
      key: 'destination',
      label: 'Destination',
      sortable: true,
      className: 'w-24'
    },
    // Quantity column
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      className: 'w-24 text-right font-mono',
      render: (value) => formatNumber(value)
    },
    // Filled quantity and progress
    {
      key: 'quantityFilled',
      label: 'Filled',
      sortable: false,
      className: 'w-28 text-right',
      render: (_, execution) => (
        <div className="text-right">
          <div className="font-mono text-sm">{formatNumber(execution.quantityFilled)}</div>
          <div className="text-xs text-slate-500">{formatFillProgress(execution)}</div>
        </div>
      )
    },
    // Limit price column
    {
      key: 'limitPrice',
      label: 'Limit Price',
      sortable: true,
      className: 'w-28 text-right font-mono',
      render: (value) => formatCurrency(value)
    },
    // Average price column
    {
      key: 'averagePrice',
      label: 'Avg Price',
      sortable: false,
      className: 'w-28 text-right font-mono',
      render: (value) => value ? formatCurrency(value) : '-'
    },
    // Received timestamp column
    {
      key: 'receivedTimestamp',
      label: 'Received',
      sortable: true,
      className: 'w-40 text-sm',
      render: (value) => (
        <div>
          <div>{formatDate(value)}</div>
          <div className="text-xs text-slate-500">{formatTime(value)}</div>
        </div>
      )
    },
    // Sent timestamp column
    {
      key: 'sentTimestamp',
      label: 'Sent',
      sortable: true,
      className: 'w-40 text-sm',
      render: (value) => value ? (
        <div>
          <div>{formatDate(value)}</div>
          <div className="text-xs text-slate-500">{formatTime(value)}</div>
        </div>
      ) : (
        <span className="text-slate-400">-</span>
      )
    },
    // Actions column
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      className: 'w-16',
      render: (_, execution) => (
        <ExecutionActionMenu
          execution={execution}
          onAction={onExecutionAction}
        />
      )
    }
  ]

  return (
    <div className={className}>
      <SortableTable
        columns={columns}
        data={executions}
        sort={sorting}
        onSortChange={onSortChange}
        loading={loading}
        emptyMessage="No executions found"
        className="rounded-lg border"
      />
    </div>
  )
} 