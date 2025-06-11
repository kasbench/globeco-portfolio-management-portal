// Comprehensive Submission Controls for Order Service Integration
// Handles submit buttons, multi-select operations, and confirmation dialogs

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  Send, 
  Trash2, 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  Info,
  ChevronDown,
  User,
  Building2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HelpTooltip } from '@/components/ui/tooltip'

import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission 
} from '@/types/rebalance'
import { SubmissionState } from '@/types/order'
import { dataTransformationService } from '@/lib/services/dataTransformationService'

/**
 * Submission control props
 */
export interface SubmissionControlsProps {
  // Data
  rebalances: RebalanceWithSubmission[]
  selectedRebalanceIds: Set<string>
  selectedPortfolioIds: Set<string>
  
  // Selection handlers
  onRebalanceSelectionChange: (rebalanceIds: Set<string>) => void
  onPortfolioSelectionChange: (portfolioIds: Set<string>) => void
  
  // Submission handlers
  onSubmitAll: () => Promise<void>
  onSubmitRebalances: (rebalanceIds: string[]) => Promise<void>
  onSubmitPortfolios: (portfolioIds: string[]) => Promise<void>
  
  // Deletion handlers
  onDeleteRebalances: (rebalanceIds: string[]) => Promise<void>
  onDeletePortfolios: (portfolioIds: string[]) => Promise<void>
  
  // State
  isSubmitting: boolean
  isDeleting: boolean
}

/**
 * Individual rebalance submission controls
 */
interface RebalanceControlsProps {
  rebalance: RebalanceWithSubmission
  isSelected: boolean
  onSelectionChange: (selected: boolean) => void
  onSubmit: () => Promise<void>
  onDelete: () => Promise<void>
  isSubmitting: boolean
  isDeleting: boolean
}

/**
 * Individual portfolio submission controls
 */
interface PortfolioControlsProps {
  portfolio: RebalancePortfolioWithSubmission
  rebalanceId: string
  isSelected: boolean
  onSelectionChange: (selected: boolean) => void
  onSubmit: () => Promise<void>
  onDelete: () => Promise<void>
  isSubmitting: boolean
  isDeleting: boolean
}

/**
 * Submission preview data
 */
interface SubmissionPreview {
  totalOrders: number
  portfolioCount: number
  rebalanceCount: number
  estimatedBatches: number
  eligiblePositions: number
  portfoliosAffected: string[]
  orderBreakdown: {
    buyOrders: number
    sellOrders: number
    totalQuantity: number
  }
}

/**
 * Confirmation dialog props
 */
interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  preview?: SubmissionPreview | null
  isDestructive?: boolean
  isSubmitting?: boolean
  confirmText?: string
  cancelText?: string
}

/**
 * Global submission controls component
 */
export function GlobalSubmissionControls({
  rebalances,
  selectedRebalanceIds,
  selectedPortfolioIds,
  onRebalanceSelectionChange,
  onPortfolioSelectionChange,
  onSubmitAll,
  onSubmitRebalances,
  onSubmitPortfolios,
  onDeleteRebalances,
  onDeletePortfolios,
  isSubmitting,
  isDeleting
}: SubmissionControlsProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null)

  // Calculate selection statistics
  const selectionStats = useMemo(() => {
    const totalRebalances = rebalances.length
    const totalPortfolios = rebalances.reduce((sum, r) => sum + r.portfolios.length, 0)
    const selectedRebalances = selectedRebalanceIds.size
    const selectedPortfolios = selectedPortfolioIds.size
    
    const eligiblePositions = rebalances
      .filter(r => selectedRebalanceIds.has(r.rebalance_id))
      .reduce((sum, r) => {
        return sum + r.portfolios
          .filter(p => selectedPortfolioIds.has(p.portfolio_id))
          .reduce((portfolioSum, p) => {
            return portfolioSum + p.positions.filter(pos => 
              (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') &&
              pos.trade_quantity !== 0
            ).length
          }, 0)
      }, 0)

    return {
      totalRebalances,
      totalPortfolios,
      selectedRebalances,
      selectedPortfolios,
      eligiblePositions,
      hasSelections: selectedRebalances > 0 || selectedPortfolios > 0
    }
  }, [rebalances, selectedRebalanceIds, selectedPortfolioIds])

  // Handle select all functionality
  const handleSelectAll = useCallback(() => {
    if (selectionStats.selectedRebalances === selectionStats.totalRebalances) {
      // Deselect all
      onRebalanceSelectionChange(new Set())
      onPortfolioSelectionChange(new Set())
    } else {
      // Select all
      const allRebalanceIds = new Set(rebalances.map(r => r.rebalance_id))
      const allPortfolioIds = new Set(
        rebalances.flatMap(r => r.portfolios.map(p => p.portfolio_id))
      )
      onRebalanceSelectionChange(allRebalanceIds)
      onPortfolioSelectionChange(allPortfolioIds)
    }
  }, [rebalances, selectionStats, onRebalanceSelectionChange, onPortfolioSelectionChange])

  // Generate submission preview
  const generateSubmissionPreview = useCallback(async (): Promise<SubmissionPreview> => {
    const selectedRebalances = rebalances.filter(r => selectedRebalanceIds.has(r.rebalance_id))
    
    const preview = await dataTransformationService.generateSubmissionPreview(
      selectedRebalances,
      'global-submission'
    )

    return {
      totalOrders: preview.orderCount,
      portfolioCount: preview.portfolioCount,
      rebalanceCount: selectedRebalances.length,
      estimatedBatches: preview.summary.estimatedBatches,
      eligiblePositions: preview.summary.eligiblePositions,
      portfoliosAffected: preview.summary.portfoliosAffected,
      orderBreakdown: {
        buyOrders: preview.summary.buyOrders,
        sellOrders: preview.summary.sellOrders,
        totalQuantity: preview.summary.totalQuantity
      }
    }
  }, [rebalances, selectedRebalanceIds])

  // Handle submission confirmation
  const handleSubmitConfirm = useCallback(async () => {
    try {
      if (selectedRebalanceIds.size === rebalances.length) {
        await onSubmitAll()
      } else if (selectedRebalanceIds.size > 0) {
        await onSubmitRebalances(Array.from(selectedRebalanceIds))
      } else if (selectedPortfolioIds.size > 0) {
        await onSubmitPortfolios(Array.from(selectedPortfolioIds))
      }
      setShowSubmitDialog(false)
      setSubmissionPreview(null)
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }, [selectedRebalanceIds, selectedPortfolioIds, rebalances, onSubmitAll, onSubmitRebalances, onSubmitPortfolios])

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    try {
      if (selectedRebalanceIds.size > 0) {
        await onDeleteRebalances(Array.from(selectedRebalanceIds))
      }
      if (selectedPortfolioIds.size > 0) {
        await onDeletePortfolios(Array.from(selectedPortfolioIds))
      }
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Deletion failed:', error)
    }
  }, [selectedRebalanceIds, selectedPortfolioIds, onDeleteRebalances, onDeletePortfolios])

  // Handle submit button click
  const handleSubmitClick = useCallback(async () => {
    if (!selectionStats.hasSelections) return
    
    try {
      const preview = await generateSubmissionPreview()
      setSubmissionPreview(preview)
      setShowSubmitDialog(true)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }, [selectionStats.hasSelections, generateSubmissionPreview])

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Select All Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectionStats.selectedRebalances === selectionStats.totalRebalances && selectionStats.totalRebalances > 0}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <label 
              htmlFor="select-all" 
              className="text-sm font-medium text-slate-700 cursor-pointer"
            >
              Select All
            </label>
            <HelpTooltip content="Select or deselect all rebalances and portfolios for batch operations">
              <Info className="h-4 w-4 text-slate-400" />
            </HelpTooltip>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Building2 className="h-3 w-3" />
              <span>{selectionStats.selectedRebalances} rebalances</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>{selectionStats.selectedPortfolios} portfolios</span>
            </Badge>
            {selectionStats.eligiblePositions > 0 && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Target className="h-3 w-3" />
                <span>{selectionStats.eligiblePositions} orders</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Submit Button */}
          <Button
            onClick={handleSubmitClick}
            disabled={!selectionStats.hasSelections || isSubmitting || selectionStats.eligiblePositions === 0}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Submit Selected</span>
            {selectionStats.eligiblePositions > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectionStats.eligiblePositions}
              </Badge>
            )}
          </Button>

          {/* Delete Button */}
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={!selectionStats.hasSelections || isDeleting}
            className="flex items-center space-x-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Delete Selected</span>
          </Button>
        </div>
      </div>

      {/* Selection Warning */}
      {selectionStats.hasSelections && selectionStats.eligiblePositions === 0 && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No eligible orders found in selected items. Only BUY/SELL positions with non-zero quantities can be submitted.
          </AlertDescription>
        </Alert>
      )}

      {/* Submission Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSubmitDialog}
        onClose={() => {
          setShowSubmitDialog(false)
          setSubmissionPreview(null)
        }}
        onConfirm={handleSubmitConfirm}
        title="Confirm Order Submission"
        description="You are about to submit the selected rebalance positions as orders to the Order Service."
        preview={submissionPreview}
        isSubmitting={isSubmitting}
        confirmText="Submit Orders"
        cancelText="Cancel"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        description="Are you sure you want to delete the selected rebalances and portfolios? This action cannot be undone."
        isDestructive={true}
        isSubmitting={isDeleting}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

/**
 * Individual rebalance submission controls
 */
export function RebalanceControls({
  rebalance,
  isSelected,
  onSelectionChange,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting
}: RebalanceControlsProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null)

  // Calculate eligible orders count
  const eligibleOrdersCount = useMemo(() => {
    return rebalance.portfolios.reduce((sum, portfolio) => {
      return sum + portfolio.positions.filter(pos => 
        (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') &&
        pos.trade_quantity !== 0
      ).length
    }, 0)
  }, [rebalance])

  // Generate submission preview
  const generateSubmissionPreview = useCallback(async (): Promise<SubmissionPreview> => {
    const preview = await dataTransformationService.generateSubmissionPreview(
      [rebalance],
      `rebalance-${rebalance.rebalance_id}`
    )

    return {
      totalOrders: preview.orderCount,
      portfolioCount: preview.portfolioCount,
      rebalanceCount: 1,
      estimatedBatches: preview.summary.estimatedBatches,
      eligiblePositions: preview.summary.eligiblePositions,
      portfoliosAffected: preview.summary.portfoliosAffected,
      orderBreakdown: {
        buyOrders: preview.summary.buyOrders,
        sellOrders: preview.summary.sellOrders,
        totalQuantity: preview.summary.totalQuantity
      }
    }
  }, [rebalance])

  // Handle submit button click
  const handleSubmitClick = useCallback(async () => {
    if (eligibleOrdersCount === 0) return
    
    try {
      const preview = await generateSubmissionPreview()
      setSubmissionPreview(preview)
      setShowSubmitDialog(true)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }, [eligibleOrdersCount, generateSubmissionPreview])

  // Handle submission confirmation
  const handleSubmitConfirm = useCallback(async () => {
    try {
      await onSubmit()
      setShowSubmitDialog(false)
      setSubmissionPreview(null)
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }, [onSubmit])

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    try {
      await onDelete()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Deletion failed:', error)
    }
  }, [onDelete])

  return (
    <div className="flex items-center space-x-2">
      {/* Selection Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelectionChange}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />

      {/* Submit Button */}
      <Button
        size="sm"
        onClick={handleSubmitClick}
        disabled={eligibleOrdersCount === 0 || isSubmitting}
        className="flex items-center space-x-1"
      >
        {isSubmitting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
        <span>Submit</span>
        {eligibleOrdersCount > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {eligibleOrdersCount}
          </Badge>
        )}
      </Button>

      {/* Delete Button */}
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setShowDeleteDialog(true)}
        disabled={isDeleting}
        className="flex items-center space-x-1"
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        <span>Delete</span>
      </Button>

      {/* Submission Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSubmitDialog}
        onClose={() => {
          setShowSubmitDialog(false)
          setSubmissionPreview(null)
        }}
        onConfirm={handleSubmitConfirm}
        title={`Submit Rebalance: ${rebalance.model_name}`}
        description={`Submit all positions from rebalance ${rebalance.rebalance_id} as orders.`}
        preview={submissionPreview}
        isSubmitting={isSubmitting}
        confirmText="Submit Orders"
        cancelText="Cancel"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title={`Delete Rebalance: ${rebalance.model_name}`}
        description={`Are you sure you want to delete rebalance ${rebalance.rebalance_id} and all its portfolios? This action cannot be undone.`}
        isDestructive={true}
        isSubmitting={isDeleting}
        confirmText="Delete Rebalance"
        cancelText="Cancel"
      />
    </div>
  )
}

/**
 * Individual portfolio submission controls
 */
export function PortfolioControls({
  portfolio,
  rebalanceId,
  isSelected,
  onSelectionChange,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting
}: PortfolioControlsProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Calculate eligible orders count
  const eligibleOrdersCount = useMemo(() => {
    return portfolio.positions.filter(pos => 
      (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') &&
      pos.trade_quantity !== 0
    ).length
  }, [portfolio])

  // Handle submission confirmation
  const handleSubmitConfirm = useCallback(async () => {
    try {
      await onSubmit()
      setShowSubmitDialog(false)
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }, [onSubmit])

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    try {
      await onDelete()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Deletion failed:', error)
    }
  }, [onDelete])

  return (
    <div className="flex items-center space-x-2">
      {/* Selection Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelectionChange}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />

      {/* Submit Button */}
      <Button
        size="sm"
        onClick={() => setShowSubmitDialog(true)}
        disabled={eligibleOrdersCount === 0 || isSubmitting}
        className="flex items-center space-x-1"
      >
        {isSubmitting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
        <span>Submit</span>
        {eligibleOrdersCount > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {eligibleOrdersCount}
          </Badge>
        )}
      </Button>

      {/* Delete Button */}
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setShowDeleteDialog(true)}
        disabled={isDeleting}
        className="flex items-center space-x-1"
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        <span>Delete</span>
      </Button>

      {/* Submission Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={handleSubmitConfirm}
        title={`Submit Portfolio: ${portfolio.portfolio_id}`}
        description={`Submit all eligible positions from portfolio ${portfolio.portfolio_id} as orders.`}
        isSubmitting={isSubmitting}
        confirmText="Submit Orders"
        cancelText="Cancel"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title={`Delete Portfolio: ${portfolio.portfolio_id}`}
        description={`Are you sure you want to delete portfolio ${portfolio.portfolio_id} and all its positions? This action cannot be undone.`}
        isDestructive={true}
        isSubmitting={isDeleting}
        confirmText="Delete Portfolio"
        cancelText="Cancel"
      />
    </div>
  )
}

/**
 * Confirmation dialog component
 */
function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  preview,
  isDestructive = false,
  isSubmitting = false,
  confirmText = "Confirm",
  cancelText = "Cancel"
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isDestructive ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Send className="h-5 w-5 text-blue-600" />
            )}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Submission Preview */}
        {preview && (
          <div className="space-y-4">
            <Separator />
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Submission Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Orders:</span>
                    <span className="font-medium">{preview.totalOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Portfolios:</span>
                    <span className="font-medium">{preview.portfolioCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Rebalances:</span>
                    <span className="font-medium">{preview.rebalanceCount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Buy Orders:</span>
                    <span className="font-medium text-green-600">{preview.orderBreakdown.buyOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Sell Orders:</span>
                    <span className="font-medium text-red-600">{preview.orderBreakdown.sellOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Est. Batches:</span>
                    <span className="font-medium">{preview.estimatedBatches}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDestructive ? (
              <Trash2 className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 