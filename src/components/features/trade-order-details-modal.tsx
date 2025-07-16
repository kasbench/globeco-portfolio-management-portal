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
  TrendingUp,
  User,
  ShieldCheck
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
  TradeOrderEnhancedResponseDTO,
  TradeOrderResponseDTO,
  CreateTradeOrderRequestDTO,
  UpdateTradeOrderRequestDTO
} from '@/types/trade'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'
import { useBlotters } from '@/lib/hooks/useBlotters'
// import { tradeService } from '@/lib/api/tradeService'

interface TradeOrderDetailsModalProps {
  tradeOrder: TradeOrderEnhancedResponseDTO | null
  mode: 'view' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onTradeOrderUpdated?: (tradeOrder: TradeOrderEnhancedResponseDTO) => void
}

interface EditableTradeOrder {
  orderType: string
  quantity: number
  limitPrice?: number | null
  blotterAbbreviation: string
  tradeTimestamp: string
}

export function TradeOrderDetailsModal({
  tradeOrder,
  mode: initialMode,
  open,
  onOpenChange,
  onTradeOrderUpdated
}: TradeOrderDetailsModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const [editedTradeOrder, setEditedTradeOrder] = useState<EditableTradeOrder | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch blotters with caching
  const { blotters, isLoading: blottersLoading, error: blottersError } = useBlotters()

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (tradeOrder && open) {
      // Initialize edit form with current values
      setEditedTradeOrder({
        orderType: tradeOrder.orderType,
        quantity: tradeOrder.quantity,
        limitPrice: tradeOrder.limitPrice,
        blotterAbbreviation: tradeOrder.blotterAbbreviation,
        tradeTimestamp: tradeOrder.tradeTimestamp
      })
    }
    setError(null)
  }, [tradeOrder, open])

  const handleSave = async () => {
    if (!tradeOrder || !editedTradeOrder) return

    setSaving(true)
    setError(null)

    try {
      // Find the blotter ID from the abbreviation
      const selectedBlotter = blotters.find(b => b.abbreviation === editedTradeOrder.blotterAbbreviation)
      if (!selectedBlotter) {
        throw new Error(`Blotter with abbreviation "${editedTradeOrder.blotterAbbreviation}" not found`)
      }

      // Debug: Log the original trade order and edited data
      console.log('🔍 DEBUG - Original trade order:', {
        id: tradeOrder.id,
        orderId: tradeOrder.orderId,
        portfolioId: tradeOrder.portfolioId,
        securityId: tradeOrder.securityId,
        blotterId: tradeOrder.blotterId,
        version: tradeOrder.version
      })
      
      console.log('🔍 DEBUG - Edited trade order data:', editedTradeOrder)
      console.log('🔍 DEBUG - Selected blotter:', selectedBlotter)

      // Extract portfolioId and securityId from enhanced data if base fields are missing
      const portfolioId = tradeOrder.portfolioId || tradeOrder.portfolio?.portfolioId
      const securityId = tradeOrder.securityId || tradeOrder.security?.securityId
      
      console.log('🔍 DEBUG - ID extraction:', {
        'tradeOrder.portfolioId': tradeOrder.portfolioId,
        'tradeOrder.portfolio?.portfolioId': tradeOrder.portfolio?.portfolioId,
        'extracted portfolioId': portfolioId,
        'tradeOrder.securityId': tradeOrder.securityId,
        'tradeOrder.security?.securityId': tradeOrder.security?.securityId,
        'extracted securityId': securityId
      })

      // Validate that we have the required IDs
      if (!portfolioId) {
        throw new Error('Portfolio ID could not be determined from trade order data')
      }
      if (!securityId) {
        throw new Error('Security ID could not be determined from trade order data')
      }

      // Create the update request DTO with all required fields
      const updateRequest: UpdateTradeOrderRequestDTO = {
        id: tradeOrder.id, // Include the trade order ID
        orderId: tradeOrder.orderId,
        orderType: editedTradeOrder.orderType as 'BUY' | 'SELL' | 'SHORT',
        quantity: editedTradeOrder.quantity,
        quantitySent: tradeOrder.quantitySent, // Keep original quantitySent
        portfolioId: portfolioId,
        securityId: securityId,
        blotterId: selectedBlotter.id, // Send as number as expected by API
        limitPrice: editedTradeOrder.limitPrice || undefined,
        tradeTimestamp: editedTradeOrder.tradeTimestamp,
        version: tradeOrder.version // Required for optimistic locking
      }

      // Debug: Log the complete request object
      console.log('🔍 DEBUG - Complete update request:', updateRequest)
      console.log('🔍 DEBUG - Update request JSON:', JSON.stringify(updateRequest, null, 2))

      // Validation: Check for null/undefined critical fields
      const validationErrors = []
      if (!updateRequest.portfolioId) validationErrors.push(`portfolioId is ${updateRequest.portfolioId}`)
      if (!updateRequest.securityId) validationErrors.push(`securityId is ${updateRequest.securityId}`)
      if (!updateRequest.orderType) validationErrors.push(`orderType is ${updateRequest.orderType}`)
      if (updateRequest.blotterId === null || updateRequest.blotterId === undefined) validationErrors.push(`blotterId is ${updateRequest.blotterId}`)
      
      if (validationErrors.length > 0) {
        console.error('🚨 VALIDATION ERRORS:', validationErrors)
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
      }

      // Call the update API (v1 returns TradeOrderResponseDTO)
      const response = await fetch(`/api/trade-orders/${tradeOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      if (!response.ok) throw new Error('Failed to update trade order');
      const updatedBasicTradeOrder = await response.json();
      
      // Merge the updated basic fields with the existing enhanced fields
      const updatedTradeOrder: TradeOrderEnhancedResponseDTO = {
        ...updatedBasicTradeOrder,
        // Preserve enhanced fields from the original trade order
        portfolioName: tradeOrder.portfolioName,
        securityTicker: tradeOrder.securityTicker,
        portfolio: tradeOrder.portfolio,
        security: tradeOrder.security
      }
      
      // Show success and switch back to view mode
      setMode('view')
      
      if (onTradeOrderUpdated) {
        onTradeOrderUpdated(updatedTradeOrder)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update trade order'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (tradeOrder) {
      // Reset to original values
      setEditedTradeOrder({
        orderType: tradeOrder.orderType,
        quantity: tradeOrder.quantity,
        limitPrice: tradeOrder.limitPrice,
        blotterAbbreviation: tradeOrder.blotterAbbreviation,
        tradeTimestamp: tradeOrder.tradeTimestamp
      })
    }
    setMode('view')
    setError(null)
  }

  const canEdit = !tradeOrder?.submitted

  if (!tradeOrder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="ml-2">Trade order not found</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'view' ? <Eye className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
            {mode === 'view' ? 'Trade Order Details' : 'Edit Trade Order'} - #{tradeOrder.id}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Status</Label>
              <div>
                <Badge variant={tradeOrder.submitted ? 'default' : 'secondary'}>
                  {tradeOrder.submitted ? 'Submitted' : 'Draft'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Order Type</Label>
              {mode === 'edit' && canEdit ? (
                <select
                  value={editedTradeOrder?.orderType || ''}
                  onChange={(e) => setEditedTradeOrder(prev => prev ? { ...prev, orderType: e.target.value as any } : null)}
                  className="w-full p-2 border rounded"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                  <option value="SHORT">SHORT</option>
                </select>
              ) : (
                <Badge variant={tradeOrder.orderType === 'BUY' ? 'outline' : 'destructive'}>
                  {tradeOrder.orderType}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Version</Label>
              <div className="font-mono text-sm">{tradeOrder.version}</div>
            </div>
          </div>

          <Separator />

          {/* IDs Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Trade Order ID</Label>
              <div className="font-mono text-lg">#{tradeOrder.id}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Order ID</Label>
              <div className="font-mono text-lg">#{tradeOrder.orderId}</div>
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
              <div>
                <div className="font-medium text-lg">
                  {tradeOrder.security?.ticker || tradeOrder.securityTicker || '—'}
                </div>
                <div className="text-sm text-slate-500 font-mono">
                  ID: {tradeOrder.securityId}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Building className="h-4 w-4" />
                Portfolio
              </Label>
              <div>
                <div className="font-medium text-lg">
                  {tradeOrder.portfolio?.name || tradeOrder.portfolioName || '—'}
                </div>
                <div className="text-sm text-slate-500 font-mono">
                  ID: {tradeOrder.portfolioId}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trade Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Hash className="h-4 w-4" />
                Quantity
              </Label>
              {mode === 'edit' && canEdit ? (
                <Input
                  type="number"
                  value={editedTradeOrder?.quantity || ''}
                  onChange={(e) => setEditedTradeOrder(prev => prev ? { 
                    ...prev, 
                    quantity: parseFloat(e.target.value) || 0 
                  } : null)}
                  placeholder="Quantity"
                />
              ) : (
                <div className="font-mono text-lg">{formatNumber(tradeOrder.quantity)}</div>
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
                  value={editedTradeOrder?.limitPrice || ''}
                  onChange={(e) => setEditedTradeOrder(prev => prev ? { 
                    ...prev, 
                    limitPrice: e.target.value ? parseFloat(e.target.value) : null 
                  } : null)}
                  placeholder="Limit Price (optional)"
                />
              ) : (
                <div className="font-mono text-lg">
                  {tradeOrder.limitPrice ? formatCurrency(tradeOrder.limitPrice) : 'Market Order'}
                </div>
              )}
            </div>
          </div>

          {/* Quantity Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Quantity Sent</Label>
              <div className="font-mono text-lg">{formatNumber(tradeOrder.quantitySent)}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Remaining</Label>
              <div className="font-mono text-lg">
                {formatNumber(tradeOrder.quantity - tradeOrder.quantitySent)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Blotter Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Blotter</Label>
              {mode === 'edit' && canEdit ? (
                <div className="space-y-1">
                  <select
                    value={editedTradeOrder?.blotterAbbreviation || ''}
                    onChange={(e) => setEditedTradeOrder(prev => prev ? { 
                      ...prev, 
                      blotterAbbreviation: e.target.value 
                    } : null)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={blottersLoading}
                  >
                    <option value="">Select Blotter</option>
                    {blotters.map(blotter => (
                      <option key={blotter.id} value={blotter.abbreviation}>
                        {blotter.abbreviation} - {blotter.name}
                      </option>
                    ))}
                  </select>
                  {blottersLoading && (
                    <div className="text-xs text-gray-500">Loading blotters...</div>
                  )}
                  {blottersError && (
                    <div className="text-xs text-red-500">Failed to load blotters</div>
                  )}
                </div>
              ) : (
                <div className="font-medium">{tradeOrder.blotter?.abbreviation || tradeOrder.blotterAbbreviation || '—'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Blotter Details</Label>
              <div>
                <div className="font-medium">
                  {tradeOrder.blotter?.name || '—'}
                </div>
                <div className="font-mono text-sm text-slate-500">
                  ID: {tradeOrder.blotter?.id || tradeOrder.blotterId || '—'}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Calendar className="h-4 w-4" />
              Trade Timestamp
            </Label>
            <div className="font-mono">
              {formatDateTime(tradeOrder.tradeTimestamp)}
            </div>
          </div>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-slate-50 p-3 rounded">
              <Label className="text-sm font-medium text-slate-600">Debug Info</Label>
              <div className="text-xs text-slate-500 mt-1">
                <div>API Response Structure Available</div>
                <div>Security Object: {tradeOrder.security ? 'Yes' : 'No'}</div>
                <div>Portfolio Object: {tradeOrder.portfolio ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {mode === 'view' && canEdit && (
              <Button 
                variant="outline" 
                onClick={() => setMode('edit')}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Trade Order
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {mode === 'edit' ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TradeOrderDetailsModal 