'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  X, 
  Edit, 
  Save, 
  AlertCircle, 
  Loader2,
  Eye,
  Calendar,
  DollarSign,
  Hash,
  Building,
  TrendingUp
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  OrderWithDetailsDTO, 
  OrderDTO,
  StatusDTO,
  OrderTypeDTO,
  BlotterDTO 
} from '@/types/order'
import orderServiceApi from '@/lib/api/orderService'

interface OrderDetailsModalProps {
  orderId: number | null
  mode: 'view' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderUpdated?: (order: OrderWithDetailsDTO) => void
}

export function OrderDetailsModal({
  orderId,
  mode: initialMode,
  open,
  onOpenChange,
  onOrderUpdated
}: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrderWithDetailsDTO | null>(null)
  const [editedOrder, setEditedOrder] = useState<Partial<OrderDTO>>({})
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Reference data
  const [statuses, setStatuses] = useState<StatusDTO[]>([])
  const [orderTypes, setOrderTypes] = useState<OrderTypeDTO[]>([])
  const [blotters, setBlotters] = useState<BlotterDTO[]>([])

  // Load order details when modal opens
  useEffect(() => {
    if (open && orderId) {
      loadOrderDetails()
      loadReferenceData()
    }
  }, [open, orderId])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setOrder(null)
      setEditedOrder({})
      setMode(initialMode)
      setError(null)
    }
  }, [open, initialMode])

  const loadOrderDetails = async () => {
    if (!orderId) return

    setLoading(true)
    setError(null)

    try {
      const orderData = await orderServiceApi.getOrderById(orderId)
      setOrder(orderData)
      
      // Initialize edit form with current values
      setEditedOrder({
        id: orderData.id,
        blotterId: orderData.blotter.id,
        statusId: orderData.status.id,
        portfolioId: orderData.portfolio.portfolioId,
        orderTypeId: orderData.orderType.id,
        securityId: orderData.security.securityId,
        quantity: orderData.quantity,
        limitPrice: orderData.limitPrice,
        tradeOrderId: orderData.tradeOrderId,
        orderTimestamp: orderData.orderTimestamp,
        version: orderData.version
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order details'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadReferenceData = async () => {
    try {
      const [statusesData, orderTypesData, blottersData] = await Promise.all([
        orderServiceApi.listStatuses(),
        orderServiceApi.listOrderTypes(),
        orderServiceApi.listBlotters()
      ])
      
      setStatuses(statusesData)
      setOrderTypes(orderTypesData)
      setBlotters(blottersData)
    } catch (err) {
      console.error('Failed to load reference data:', err)
    }
  }

  const handleSave = async () => {
    if (!order || !editedOrder.id) return

    setSaving(true)
    setError(null)

    try {
      const updatedOrder = await orderServiceApi.updateOrder(order.id, editedOrder as OrderDTO)
      setOrder(updatedOrder)
      setMode('view')
      
      if (onOrderUpdated) {
        onOrderUpdated(updatedOrder)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (order) {
      // Reset to original values
      setEditedOrder({
        id: order.id,
        blotterId: order.blotter.id,
        statusId: order.status.id,
        portfolioId: order.portfolio.portfolioId,
        orderTypeId: order.orderType.id,
        securityId: order.security.securityId,
        quantity: order.quantity,
        limitPrice: order.limitPrice,
        tradeOrderId: order.tradeOrderId,
        orderTimestamp: order.orderTimestamp,
        version: order.version
      })
    }
    setMode('view')
    setError(null)
  }

  const canEdit = order?.status.abbreviation === 'NEW'

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading order details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="ml-2">Order not found</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'view' ? <Eye className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
            {mode === 'view' ? 'Order Details' : 'Edit Order'} - #{order.id}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Order Status and Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Status</Label>
              <div>
                <Badge variant={order.status.abbreviation === 'NEW' ? 'default' : 'secondary'}>
                  {order.status.abbreviation}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">{order.status.description}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Order Type</Label>
              <div>
                <Badge variant={order.orderType.abbreviation === 'BUY' ? 'outline' : 'destructive'}>
                  {order.orderType.abbreviation}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">{order.orderType.description}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security and Portfolio Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <TrendingUp className="h-4 w-4" />
                Security
              </Label>
              {mode === 'edit' && canEdit ? (
                <Input
                  value={editedOrder.securityId || ''}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, securityId: e.target.value }))}
                  placeholder="Security ID"
                />
              ) : (
                <div>
                  <p className="font-mono font-medium">{order.security.ticker}</p>
                  <p className="text-xs text-slate-500">ID: {order.security.securityId}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Building className="h-4 w-4" />
                Portfolio
              </Label>
              {mode === 'edit' && canEdit ? (
                <Input
                  value={editedOrder.portfolioId || ''}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, portfolioId: e.target.value }))}
                  placeholder="Portfolio ID"
                />
              ) : (
                <div>
                  <p className="font-medium">{order.portfolio.name}</p>
                  <p className="text-xs text-slate-500">ID: {order.portfolio.portfolioId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Hash className="h-4 w-4" />
                Quantity
              </Label>
              {mode === 'edit' && canEdit ? (
                <Input
                  type="number"
                  value={editedOrder.quantity || ''}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                  placeholder="Quantity"
                />
              ) : (
                <p className="font-mono text-lg">{order.quantity.toLocaleString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <DollarSign className="h-4 w-4" />
                Limit Price
              </Label>
              {mode === 'edit' && canEdit ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editedOrder.limitPrice || ''}
                  onChange={(e) => setEditedOrder(prev => ({ 
                    ...prev, 
                    limitPrice: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="Limit Price (optional)"
                />
              ) : (
                <p className="font-mono text-lg">
                  {order.limitPrice ? `$${order.limitPrice.toFixed(2)}` : 'Market Order'}
                </p>
              )}
            </div>
          </div>

          {/* Blotter Information */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Blotter</Label>
            {mode === 'edit' && canEdit ? (
              <select
                value={editedOrder.blotterId || ''}
                onChange={(e) => setEditedOrder(prev => ({ ...prev, blotterId: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Blotter</option>
                {blotters.map(blotter => (
                  <option key={blotter.id} value={blotter.id}>
                    {blotter.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-medium">{order.blotter.name}</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Calendar className="h-4 w-4" />
              Order Timestamp
            </Label>
            <p className="font-mono">
              {format(new Date(order.orderTimestamp), 'PPP pp')}
            </p>
          </div>

          {/* Trade Order ID (if exists) */}
          {order.tradeOrderId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Trade Order ID</Label>
              <p className="font-mono">{order.tradeOrderId}</p>
            </div>
          )}

          {/* Version Information */}
          <div className="bg-slate-50 p-3 rounded">
            <Label className="text-sm font-medium text-slate-600">Version</Label>
            <p className="text-sm text-slate-500">
              Version {order.version} - Used for optimistic locking
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <div>
            {mode === 'view' && canEdit && (
              <Button
                onClick={() => setMode('edit')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Order
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {mode === 'edit' ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 