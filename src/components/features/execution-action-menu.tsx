'use client'

import React, { useState } from 'react'
import { 
  MoreHorizontal, 
  Eye, 
  X,
  AlertTriangle,
  Clock,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExecutionDTO, ExecutionAction } from '@/types/execution'

interface ExecutionActionMenuProps {
  execution: ExecutionDTO
  onAction: (action: ExecutionAction, execution: ExecutionDTO) => void
  disabled?: boolean
  className?: string
}

interface CancelConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  execution: ExecutionDTO
  loading?: boolean
}

const CancelConfirmationDialog: React.FC<CancelConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  execution,
  loading = false
}) => {
  const canCancel = !['FILLED', 'CANCELLED', 'CANCEL'].includes(execution.executionStatus)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Cancel Execution
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this execution?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Execution Details */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Execution ID:</span>
              <span className="text-sm font-mono">{execution.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Security:</span>
              <span className="text-sm">{execution.security.ticker}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Destination:</span>
              <span className="text-sm">{execution.destination}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Type:</span>
              <Badge variant={execution.tradeType === 'BUY' ? 'default' : 'outline'}>
                {execution.tradeType}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Quantity:</span>
              <span className="text-sm">{execution.quantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant="secondary">
                {execution.executionStatus.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-1">
                <div>Cancellation can be attempted but success is not guaranteed.</div>
                <div className="text-sm">The execution may have already been processed by the trading platform.</div>
              </div>
            </AlertDescription>
          </Alert>

          {!canCancel && (
            <Alert className="border-red-200 bg-red-50">
              <X className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                This execution cannot be cancelled due to its current status: {execution.executionStatus}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || !canCancel}
            className="min-w-[100px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Cancelling...</span>
              </div>
            ) : (
              'Cancel Execution'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ExecutionActionMenu: React.FC<ExecutionActionMenuProps> = ({
  execution,
  onAction,
  disabled = false,
  className = ''
}) => {
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean
    loading: boolean
  }>({
    isOpen: false,
    loading: false
  })

  const canCancel = !['FILLED', 'CANCELLED', 'CANCEL'].includes(execution.executionStatus)

  const handleActionClick = (action: ExecutionAction) => {
    if (action === 'cancel') {
      setCancelDialog({
        isOpen: true,
        loading: false
      })
    } else {
      // For view action, call directly
      onAction(action, execution)
    }
  }

  const handleConfirmCancel = async () => {
    setCancelDialog(prev => ({ ...prev, loading: true }))
    
    try {
      await onAction('cancel', execution)
      setCancelDialog({ isOpen: false, loading: false })
    } catch (error) {
      setCancelDialog(prev => ({ ...prev, loading: false }))
      // Error handling is done in the parent component
    }
  }

  const handleCloseCancelDialog = () => {
    if (!cancelDialog.loading) {
      setCancelDialog({ isOpen: false, loading: false })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Clock className="h-3 w-3 text-blue-500" />
      case 'SENT':
        return <Hash className="h-3 w-3 text-purple-500" />
      case 'FILLED':
        return <div className="h-3 w-3 rounded-full bg-green-500" />
      case 'PARTIALLY_FILLED':
        return <div className="h-3 w-3 rounded-full bg-yellow-500" />
      case 'CANCELLED':
      case 'CANCEL':
        return <X className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={`h-8 w-8 p-0 hover:bg-slate-100 ${className}`}
            aria-label={`Actions for execution ${execution.id}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          {/* Execution Info Header */}
          <div className="px-2 py-1.5 text-xs text-slate-500 border-b">
            <div className="flex items-center gap-2">
              {getStatusIcon(execution.executionStatus)}
              <span>Execution #{execution.id}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-medium">{execution.security.ticker}</span>
              <span>•</span>
              <span>{execution.tradeType}</span>
              <span>•</span>
              <span>{execution.destination}</span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenuItem
            onClick={() => handleActionClick('view')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleActionClick('cancel')}
            disabled={!canCancel}
            className={`flex items-center gap-2 cursor-pointer ${
              canCancel 
                ? 'text-red-600 hover:bg-red-50 focus:bg-red-50' 
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <X className="h-4 w-4" />
            <span>Cancel Execution</span>
            {!canCancel && (
              <span className="text-xs text-slate-400 ml-auto">
                Not available
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel Confirmation Dialog */}
      <CancelConfirmationDialog
        isOpen={cancelDialog.isOpen}
        onClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancel}
        execution={execution}
        loading={cancelDialog.loading}
      />
    </>
  )
} 