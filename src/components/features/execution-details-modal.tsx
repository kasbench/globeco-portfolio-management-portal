'use client'

import React from 'react'
import { X, Clock, TrendingUp, Building2, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExecutionDTO } from '@/types/execution'
import { formatCurrency, formatNumber, formatTimestamp } from '@/lib/utils'

interface ExecutionDetailsModalProps {
  execution: ExecutionDTO | null
  isOpen: boolean
  onClose: () => void
}

const ExecutionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'secondary'
      case 'SENT':
        return 'default'
      case 'FILLED':
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
    <Badge variant={getStatusVariant(status)} className="font-medium">
      {status.replace('_', ' ')}
    </Badge>
  )
}

const TradeTypeBadge: React.FC<{ tradeType: string }> = ({ tradeType }) => {
  return (
    <Badge 
      variant={tradeType === 'BUY' ? 'default' : 'outline'}
      className={tradeType === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
    >
      {tradeType}
    </Badge>
  )
}

export const ExecutionDetailsModal: React.FC<ExecutionDetailsModalProps> = ({
  execution,
  isOpen,
  onClose
}) => {
  if (!execution) {
    return null
  }

  const fillRate = execution.quantity > 0 ? (execution.quantityFilled / execution.quantity) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-slate-600" />
              <span>Execution Details - #{execution.id}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExecutionStatusBadge status={execution.executionStatus} />
              <TradeTypeBadge tradeType={execution.tradeType} />
            </div>
            <div className="text-sm text-slate-500">
              Version: {execution.version}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Execution Details
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Execution ID:</span>
                  <span className="text-sm font-mono">{execution.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Destination:</span>
                  <span className="text-sm">{execution.destination}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Security:</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{execution.security.ticker}</div>
                    <div className="text-xs text-slate-500">{execution.security.securityId}</div>
                  </div>
                </div>

                {execution.tradeServiceExecutionId && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Trade Service ID:</span>
                    <span className="text-sm font-mono">{execution.tradeServiceExecutionId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Order Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Quantity:</span>
                  <span className="text-sm font-mono">{formatNumber(execution.quantity)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Limit Price:</span>
                  <span className="text-sm font-mono">{formatCurrency(execution.limitPrice)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Quantity Filled:</span>
                  <div className="text-right">
                    <span className="text-sm font-mono">{formatNumber(execution.quantityFilled)}</span>
                    <div className="text-xs text-slate-500">({fillRate.toFixed(1)}%)</div>
                  </div>
                </div>

                {execution.averagePrice && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Average Price:</span>
                    <span className="text-sm font-mono">{formatCurrency(execution.averagePrice)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-600">Received</div>
                <div className="text-sm font-mono bg-slate-50 p-2 rounded">
                  {formatTimestamp(execution.receivedTimestamp)}
                </div>
              </div>
              
              {execution.sentTimestamp && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600">Sent</div>
                  <div className="text-sm font-mono bg-slate-50 p-2 rounded">
                    {formatTimestamp(execution.sentTimestamp)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fill Progress Bar */}
          {execution.quantityFilled > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">Fill Progress</span>
                <span className="text-slate-500">
                  {formatNumber(execution.quantityFilled)} / {formatNumber(execution.quantity)}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(fillRate, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 text-right">
                {fillRate.toFixed(1)}% filled
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 