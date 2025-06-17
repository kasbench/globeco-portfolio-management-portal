'use client'

import React, { useState } from 'react'
import { 
  MoreHorizontal, 
  Eye, 
  Edit3, 
  Trash2, 
  Send, 
  AlertTriangle,
  Clock
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
import { toast } from 'sonner'
import { TradeOrderEnhancedResponseDTO, TradeOrderAction } from '@/types/trade'

interface TradeOrderActionMenuProps {
  tradeOrder: TradeOrderEnhancedResponseDTO
  onAction: (action: TradeOrderAction, tradeOrder: TradeOrderEnhancedResponseDTO) => void
  disabled?: boolean
  className?: string
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  action: TradeOrderAction
  tradeOrder: TradeOrderEnhancedResponseDTO
  loading?: boolean
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  tradeOrder,
  loading = false
}) => {
  const getActionDetails = () => {
    // This dialog is now only used for delete actions
    if (action === 'delete') {
      return {
        title: 'Delete Trade Order',
        description: 'Are you sure you want to delete this trade order?',
        details: `This action cannot be undone. Trade Order #${tradeOrder.id} will be permanently removed.`,
        confirmText: 'Delete',
        confirmVariant: 'destructive' as const,
        icon: <Trash2 className="h-4 w-4" />,
        warning: true
      }
    }
    
    // Fallback for other actions (should not be used)
    return {
      title: 'Confirm Action',
      description: 'Are you sure you want to perform this action?',
      details: '',
      confirmText: 'Confirm',
      confirmVariant: 'default' as const,
      icon: <AlertTriangle className="h-4 w-4" />,
      warning: false
    }
  }

  const actionDetails = getActionDetails()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionDetails.icon}
            {actionDetails.title}
          </DialogTitle>
          <DialogDescription>
            {actionDetails.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trade Order Details */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Trade Order ID:</span>
              <span className="text-sm">{tradeOrder.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Order ID:</span>
              <span className="text-sm">{tradeOrder.orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Security:</span>
              <span className="text-sm">{tradeOrder.security?.ticker || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Portfolio:</span>
              <span className="text-sm">{tradeOrder.portfolio?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Type:</span>
              <Badge variant="outline">{tradeOrder.orderType}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Quantity:</span>
              <span className="text-sm">{tradeOrder.quantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={tradeOrder.submitted ? "default" : "secondary"}>
                {tradeOrder.submitted ? "Submitted" : "Draft"}
              </Badge>
            </div>
          </div>

          {/* Warning or Details */}
          {actionDetails.warning && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {actionDetails.details}
              </AlertDescription>
            </Alert>
          )}

          {!actionDetails.warning && actionDetails.details && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              {actionDetails.details}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant={actionDetails.confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            className="min-w-[80px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Processing...</span>
              </div>
            ) : (
              actionDetails.confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const TradeOrderActionMenu: React.FC<TradeOrderActionMenuProps> = ({
  tradeOrder,
  onAction,
  disabled = false,
  className = ''
}) => {
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    action: TradeOrderAction | null
    loading: boolean
  }>({
    isOpen: false,
    action: null,
    loading: false
  })

  const handleActionClick = (action: TradeOrderAction) => {
    // Only delete action requires the simple confirmation dialog
    if (action === 'delete') {
      setConfirmationDialog({
        isOpen: true,
        action,
        loading: false
      })
    } else {
      // All other actions (view, edit, submit) go directly to parent handler
      // Submit will open the enhanced TradeSubmissionModal in the parent
      onAction(action, tradeOrder)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmationDialog.action) return

    setConfirmationDialog(prev => ({ ...prev, loading: true }))

    try {
      await onAction(confirmationDialog.action, tradeOrder)
      
      // Show success toast (only for delete action now)
      toast.success(`Trade order deleted successfully.`)

      setConfirmationDialog({ isOpen: false, action: null, loading: false })
    } catch (error) {
      console.error(`Failed to ${confirmationDialog.action} trade order:`, error)
      
      toast.error(`Failed to delete trade order. Please try again.`)

      setConfirmationDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleCloseConfirmation = () => {
    if (confirmationDialog.loading) return
    setConfirmationDialog({ isOpen: false, action: null, loading: false })
  }

  // Determine which actions are available based on trade order state
  const availableActions = React.useMemo(() => {
    const actions: { action: TradeOrderAction; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
      {
        action: 'view',
        label: 'View Details',
        icon: <Eye className="h-4 w-4" />,
        disabled: false
      }
    ]

    // Only allow edit/delete/submit for non-submitted orders
    if (!tradeOrder.submitted) {
      actions.push({
        action: 'edit',
        label: 'Edit Trade',
        icon: <Edit3 className="h-4 w-4" />,
        disabled: false
      })

      actions.push({
        action: 'delete',
        label: 'Delete Trade',
        icon: <Trash2 className="h-4 w-4" />,
        disabled: false
      })

      actions.push({
        action: 'submit',
        label: 'Submit Trade',
        icon: <Send className="h-4 w-4" />,
        disabled: false
      })
    }

    return actions
  }, [tradeOrder.submitted])

  if (availableActions.length === 0) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`h-8 w-8 p-0 ${className}`}
            disabled={disabled}
          >
            <span className="sr-only">Open action menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableActions.map((actionItem, index) => (
            <React.Fragment key={actionItem.action}>
              <DropdownMenuItem
                onClick={() => handleActionClick(actionItem.action)}
                disabled={actionItem.disabled || disabled}
                className={`flex items-center gap-2 ${
                  actionItem.action === 'delete' ? 'text-red-600 focus:text-red-600' : ''
                }`}
              >
                {actionItem.icon}
                {actionItem.label}
              </DropdownMenuItem>
              {/* Add separator after view action */}
              {index === 0 && availableActions.length > 1 && <DropdownMenuSeparator />}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      {confirmationDialog.action && (
        <ConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmAction}
          action={confirmationDialog.action}
          tradeOrder={tradeOrder}
          loading={confirmationDialog.loading}
        />
      )}
    </>
  )
}

export default TradeOrderActionMenu 