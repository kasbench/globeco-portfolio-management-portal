/**
 * Confirmation Dialog Components
 * 
 * Provides confirmation dialogs for submission previews and deletion warnings
 * with detailed impact analysis and cascading effect warnings.
 * 
 * Part of KASBench GlobeCo Portfolio Management Portal
 * Stage 3.1: Submission Controls
 */

'use client'

import React, { useState } from 'react'
import { AlertTriangle, Info, Trash2, Send, X, ChevronRight } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SubmissionPreview {
  level: 'global' | 'rebalance' | 'portfolio' | 'position'
  entityId?: string
  entityName?: string
  rebalanceCount: number
  portfolioCount: number
  positionCount: number
  orderCount: number
  affectedItems: {
    rebalances: string[]
    portfolios: string[]
    estimatedValue: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export interface DeletionPreview {
  level: 'rebalance' | 'portfolio' | 'position'
  entityId: string
  entityName: string
  cascadingEffects: {
    willDeleteRebalances: number
    willDeletePortfolios: number
    willDeletePositions: number
    affectedItems: string[]
    isIrreversible: boolean
  }
  warnings: string[]
}

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'submission' | 'deletion'
  title: string
  description?: string
  submissionPreview?: SubmissionPreview
  deletionPreview?: DeletionPreview
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  requiresExplicitConfirmation?: boolean
}

// ============================================================================
// Submission Preview Component
// ============================================================================

interface SubmissionPreviewDisplayProps {
  preview: SubmissionPreview
}

function SubmissionPreviewDisplay({ preview }: SubmissionPreviewDisplayProps) {
  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'default'
      case 'medium': return 'secondary' 
      case 'high': return 'destructive'
      default: return 'outline'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Rebalances:</span>
            <span className="font-medium">{preview.rebalanceCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Portfolios:</span>
            <span className="font-medium">{preview.portfolioCount}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Positions:</span>
            <span className="font-medium">{preview.positionCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Orders:</span>
            <span className="font-medium">{preview.orderCount}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Impact Analysis */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Impact Analysis</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Estimated Value:</span>
            <span className="font-medium">{formatCurrency(preview.affectedItems.estimatedValue)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Risk Level:</span>
            <Badge variant={getRiskBadgeVariant(preview.affectedItems.riskLevel)}>
              {preview.affectedItems.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Affected Items */}
        {preview.affectedItems.rebalances.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-1">
              Affected Rebalances ({preview.affectedItems.rebalances.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {preview.affectedItems.rebalances.slice(0, 5).map((id, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {id}
                </Badge>
              ))}
              {preview.affectedItems.rebalances.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{preview.affectedItems.rebalances.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {preview.affectedItems.portfolios.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-1">
              Affected Portfolios ({preview.affectedItems.portfolios.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {preview.affectedItems.portfolios.slice(0, 5).map((id, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {id}
                </Badge>
              ))}
              {preview.affectedItems.portfolios.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{preview.affectedItems.portfolios.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Risk Warnings */}
      {preview.affectedItems.riskLevel === 'high' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This submission involves high-value orders. Please review carefully before proceeding.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ============================================================================
// Deletion Preview Component
// ============================================================================

interface DeletionPreviewDisplayProps {
  preview: DeletionPreview
}

function DeletionPreviewDisplay({ preview }: DeletionPreviewDisplayProps) {
  const hasCascadingEffects = preview.cascadingEffects.willDeleteRebalances > 0 || 
                              preview.cascadingEffects.willDeletePortfolios > 0 || 
                              preview.cascadingEffects.willDeletePositions > 0

  return (
    <div className="space-y-4">
      {/* Item being deleted */}
      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center space-x-2">
          <Trash2 className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-900">
            Deleting {preview.level}: {preview.entityName}
          </span>
        </div>
      </div>

      {/* Cascading Effects */}
      {hasCascadingEffects && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-red-900">Cascading Effects</h4>
          
          <div className="space-y-2">
            {preview.cascadingEffects.willDeleteRebalances > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Will also delete rebalances:</span>
                <span className="font-medium text-red-600">
                  {preview.cascadingEffects.willDeleteRebalances}
                </span>
              </div>
            )}
            
            {preview.cascadingEffects.willDeletePortfolios > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Will also delete portfolios:</span>
                <span className="font-medium text-red-600">
                  {preview.cascadingEffects.willDeletePortfolios}
                </span>
              </div>
            )}
            
            {preview.cascadingEffects.willDeletePositions > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Will also delete positions:</span>
                <span className="font-medium text-red-600">
                  {preview.cascadingEffects.willDeletePositions}
                </span>
              </div>
            )}
          </div>

          {/* Affected Items */}
          {preview.cascadingEffects.affectedItems.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Affected Items ({preview.cascadingEffects.affectedItems.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {preview.cascadingEffects.affectedItems.slice(0, 5).map((id, index) => (
                  <Badge key={index} variant="outline" className="text-xs text-red-600">
                    {id}
                  </Badge>
                ))}
                {preview.cascadingEffects.affectedItems.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{preview.cascadingEffects.affectedItems.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-orange-900">Warnings</h4>
          {preview.warnings.map((warning, index) => (
            <Alert key={index} className="border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {warning}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Irreversible Warning */}
      {preview.cascadingEffects.isIrreversible && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>This action cannot be undone.</strong> All deleted data will be permanently removed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ============================================================================
// Main Confirmation Dialog Component
// ============================================================================

export function ConfirmationDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  submissionPreview,
  deletionPreview,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isLoading = false,
  requiresExplicitConfirmation = false
}: ConfirmationDialogProps) {
  const [explicitConfirmation, setExplicitConfirmation] = useState(false)

  const handleConfirm = async () => {
    if (requiresExplicitConfirmation && !explicitConfirmation) {
      return
    }
    
    try {
      await onConfirm()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    }
  }

  const handleCancel = () => {
    setExplicitConfirmation(false)
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  const isSubmission = type === 'submission'
  const isDeletion = type === 'deletion'

  const defaultConfirmText = isSubmission ? 'Submit Orders' : 'Delete'
  const defaultCancelText = 'Cancel'

  const canConfirm = !requiresExplicitConfirmation || explicitConfirmation

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isSubmission && <Send className="h-5 w-5 text-blue-600" />}
            {isDeletion && <Trash2 className="h-5 w-5 text-red-600" />}
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">
          {isSubmission && submissionPreview && (
            <SubmissionPreviewDisplay preview={submissionPreview} />
          )}
          
          {isDeletion && deletionPreview && (
            <DeletionPreviewDisplay preview={deletionPreview} />
          )}
        </div>

        {/* Explicit Confirmation Checkbox */}
        {requiresExplicitConfirmation && (
          <div className="py-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="explicit-confirmation"
                checked={explicitConfirmation}
                onCheckedChange={(checked) => setExplicitConfirmation(checked as boolean)}
              />
              <label 
                htmlFor="explicit-confirmation" 
                className="text-sm text-gray-700 cursor-pointer"
              >
                {isDeletion 
                  ? "I understand this action cannot be undone"
                  : "I have reviewed the submission details and want to proceed"
                }
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText || defaultCancelText}
          </Button>
          <Button
            variant={isDeletion ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading || !canConfirm}
            className="min-w-24"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText || defaultConfirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Convenience Hooks and Utilities
// ============================================================================

export function useSubmissionPreview() {
  const createPreview = (
    level: SubmissionPreview['level'],
    data: {
      entityId?: string
      entityName?: string
      rebalances?: any[]
      portfolios?: any[]
      positions?: any[]
    }
  ): SubmissionPreview => {
    const rebalances = data.rebalances || []
    const portfolios = data.portfolios || []
    const positions = data.positions || []

    // Calculate estimated values and counts
    const rebalanceCount = level === 'global' ? rebalances.length : (level === 'rebalance' ? 1 : 0)
    const portfolioCount = level === 'global' ? portfolios.length : 
                          level === 'rebalance' ? portfolios.length : 
                          level === 'portfolio' ? 1 : 0
    const positionCount = positions.length
    const orderCount = positions.filter(p => 
      (p.transaction_type === 'BUY' || p.transaction_type === 'SELL') && 
      p.trade_quantity !== 0
    ).length

    // Calculate estimated value
    const estimatedValue = positions.reduce((sum, pos) => {
      if (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') {
        return sum + (Math.abs(pos.trade_quantity) * (pos.current_price || 100))
      }
      return sum
    }, 0)

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (estimatedValue > 10000000) riskLevel = 'high'
    else if (estimatedValue > 1000000) riskLevel = 'medium'

    return {
      level,
      entityId: data.entityId,
      entityName: data.entityName,
      rebalanceCount,
      portfolioCount,
      positionCount,
      orderCount,
      affectedItems: {
        rebalances: rebalances.map(r => r.rebalance_id || r.id).slice(0, 10),
        portfolios: portfolios.map(p => p.portfolio_id || p.id).slice(0, 10),
        estimatedValue,
        riskLevel
      }
    }
  }

  return { createPreview }
}

export function useDeletionPreview() {
  const createPreview = (
    level: DeletionPreview['level'],
    data: {
      entityId: string
      entityName: string
      childRebalances?: any[]
      childPortfolios?: any[]
      childPositions?: any[]
    }
  ): DeletionPreview => {
    const childRebalances = data.childRebalances || []
    const childPortfolios = data.childPortfolios || []
    const childPositions = data.childPositions || []

    // Calculate cascading effects
    const willDeleteRebalances = 0
    let willDeletePortfolios = 0
    let willDeletePositions = 0

    if (level === 'rebalance') {
      willDeletePortfolios = childPortfolios.length
      willDeletePositions = childPositions.length
    } else if (level === 'portfolio') {
      willDeletePositions = childPositions.length
    }

    // Generate warnings
    const warnings = []
    if (willDeleteRebalances > 0) {
      warnings.push(`This will permanently delete ${willDeleteRebalances} rebalance(s) and all associated data.`)
    }
    if (willDeletePortfolios > 0) {
      warnings.push(`This will permanently delete ${willDeletePortfolios} portfolio(s) and all associated positions.`)
    }
    if (willDeletePositions > 10) {
      warnings.push(`This will delete ${willDeletePositions} positions. Consider reviewing the impact on trading strategies.`)
    }

    const affectedItems = [
      ...childRebalances.map(r => r.rebalance_id || r.id),
      ...childPortfolios.map(p => p.portfolio_id || p.id),
      ...childPositions.slice(0, 10).map(p => p.position_id || p.id)
    ]

    return {
      level,
      entityId: data.entityId,
      entityName: data.entityName,
      cascadingEffects: {
        willDeleteRebalances,
        willDeletePortfolios,
        willDeletePositions,
        affectedItems,
        isIrreversible: true
      },
      warnings
    }
  }

  return { createPreview }
}

export default ConfirmationDialog 