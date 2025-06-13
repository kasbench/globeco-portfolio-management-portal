'use client'

import React from 'react'
import { Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BatchActionBarProps {
  selectedCount: number
  onSubmitSelected: () => void
  onClearSelection: () => void
  loading?: boolean
  disabled?: boolean
  maxBatchSize?: number
  className?: string
}

export function BatchActionBar({
  selectedCount,
  onSubmitSelected,
  onClearSelection,
  loading = false,
  disabled = false,
  maxBatchSize = 100,
  className = ''
}: BatchActionBarProps) {
  if (selectedCount === 0) {
    return null
  }

  const isOverLimit = selectedCount > maxBatchSize
  const canSubmit = selectedCount > 0 && !isOverLimit && !disabled && !loading

  return (
    <div className={`
      fixed bottom-6 left-1/2 transform -translate-x-1/2 
      bg-white border border-slate-200 rounded-lg shadow-lg 
      px-4 py-3 flex items-center gap-4 z-50
      ${className}
    `}>
      {/* Selection Count */}
      <div className="flex items-center gap-2">
        <Badge variant={isOverLimit ? "destructive" : "secondary"} className="px-3 py-1">
          {selectedCount} selected
        </Badge>
        {isOverLimit && (
          <span className="text-sm text-red-600">
            Maximum {maxBatchSize} orders per batch
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSubmitSelected}
          disabled={!canSubmit}
          size="sm"
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {loading ? 'Submitting...' : 'Submit Selected'}
        </Button>

        <Button
          onClick={onClearSelection}
          variant="outline"
          size="sm"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Batch Size Warning */}
      {selectedCount > 50 && selectedCount <= maxBatchSize && (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Large batch - may take longer to process
        </div>
      )}
    </div>
  )
} 