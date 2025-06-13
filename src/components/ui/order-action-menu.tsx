'use client'

import React, { useState } from 'react'
import { MoreHorizontal, Eye, Edit, Trash2, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { OrderWithDetailsDTO } from '@/types/order'

interface OrderActionMenuProps {
  order: OrderWithDetailsDTO
  onView: (order: OrderWithDetailsDTO) => void
  onEdit: (order: OrderWithDetailsDTO) => void
  onDelete: (order: OrderWithDetailsDTO) => void
  onSubmit: (order: OrderWithDetailsDTO) => void
  loading?: {
    submit?: boolean
    delete?: boolean
  }
  disabled?: boolean
}

export function OrderActionMenu({
  order,
  onView,
  onEdit,
  onDelete,
  onSubmit,
  loading = {},
  disabled = false
}: OrderActionMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  const isNewOrder = order.status.abbreviation === 'NEW'
  const isSubmitting = loading.submit || false
  const isDeleting = loading.delete || false

  const handleDelete = () => {
    setShowDeleteDialog(false)
    onDelete(order)
  }

  const handleSubmit = () => {
    setShowSubmitDialog(false)
    onSubmit(order)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={disabled || isSubmitting || isDeleting}
          >
            <span className="sr-only">Open menu</span>
            {isSubmitting || isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* View Order */}
          <DropdownMenuItem onClick={() => onView(order)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          {/* Edit Order - Only for NEW orders */}
          {isNewOrder && (
            <DropdownMenuItem onClick={() => onEdit(order)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Order
            </DropdownMenuItem>
          )}

          {/* Submit Order - Only for NEW orders */}
          {isNewOrder && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowSubmitDialog(true)}
                className="text-blue-600 focus:text-blue-600"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit Order
              </DropdownMenuItem>
            </>
          )}

          {/* Delete Order - Only for NEW orders */}
          {isNewOrder && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Order
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order #{order.id}?
              <br />
              <span className="font-medium">
                {order.orderType.abbreviation} {order.quantity} {order.security.ticker}
              </span>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit order #{order.id} to the trade service?
              <br />
              <span className="font-medium">
                {order.orderType.abbreviation} {order.quantity} {order.security.ticker}
                {order.limitPrice && ` at $${order.limitPrice}`}
              </span>
              <br />
              Once submitted, the order status will change to "SENT" and cannot be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 