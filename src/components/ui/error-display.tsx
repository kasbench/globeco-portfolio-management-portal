// Comprehensive Error Display Components for Order Submission
// Handles error messages, retry functionality, error logs, and batch summaries

'use client'

import React, { useState, useCallback } from 'react'
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Info, 
  ExternalLink,
  Copy,
  Download,
  Filter,
  Search,
  AlertCircle,
  Zap,
  Shield,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { HelpTooltip } from '@/components/ui/tooltip'
import { getHelpContent, formatHelpTooltip } from '@/lib/utils/helpContent'

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  BUSINESS_RULE = 'business_rule',
  SERVICE_ERROR = 'service_error',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

/**
 * Error information interface
 */
export interface ErrorInfo {
  id: string
  message: string
  code?: string
  severity: ErrorSeverity
  category: ErrorCategory
  timestamp: Date
  details?: string
  context?: Record<string, any>
  retryable: boolean
  retryCount?: number
  lastRetryAt?: Date
  suggestedAction?: string
  helpTopicId?: string
  affectedItems?: string[]
  originalError?: any
}

/**
 * Batch error summary interface
 */
export interface BatchErrorSummary {
  batchId: string
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  retryableErrors: number
  nonRetryableErrors: number
  firstError: Date
  lastError: Date
  affectedItems: string[]
  commonPatterns?: string[]
}

/**
 * Error display props
 */
export interface ErrorDisplayProps {
  error: ErrorInfo
  showDetails?: boolean
  showRetry?: boolean
  onRetry?: (errorId: string) => Promise<void>
  onDismiss?: (errorId: string) => void
  onViewDetails?: (errorId: string) => void
  className?: string
}

/**
 * Error list props
 */
export interface ErrorListProps {
  errors: ErrorInfo[]
  showRetry?: boolean
  showBulkActions?: boolean
  onRetry?: (errorId: string) => Promise<void>
  onRetryAll?: (errorIds: string[]) => Promise<void>
  onDismiss?: (errorId: string) => void
  onDismissAll?: (errorIds: string[]) => void
  onExport?: (errors: ErrorInfo[]) => void
  className?: string
}

/**
 * Batch error summary props
 */
export interface BatchErrorSummaryProps {
  summary: BatchErrorSummary
  errors: ErrorInfo[]
  onRetryBatch?: (batchId: string) => Promise<void>
  onViewDetails?: (batchId: string) => void
  className?: string
}

/**
 * Error log viewer props
 */
export interface ErrorLogViewerProps {
  errors: ErrorInfo[]
  maxHeight?: string
  searchable?: boolean
  filterable?: boolean
  exportable?: boolean
  onRetry?: (errorId: string) => Promise<void>
  className?: string
}

/**
 * Retry button props
 */
export interface RetryButtonProps {
  errorId: string
  isRetrying?: boolean
  retryCount?: number
  maxRetries?: number
  onRetry: (errorId: string) => Promise<void>
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
}

/**
 * Error severity configuration
 */
const severityConfig = {
  [ErrorSeverity.LOW]: {
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: Info,
    label: 'Low'
  },
  [ErrorSeverity.MEDIUM]: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    label: 'Medium'
  },
  [ErrorSeverity.HIGH]: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertCircle,
    label: 'High'
  },
  [ErrorSeverity.CRITICAL]: {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Critical'
  }
}

/**
 * Error category configuration
 */
const categoryConfig = {
  [ErrorCategory.NETWORK]: {
    label: 'Network Error',
    description: 'Connection or network-related issue',
    suggestedAction: 'Check your internet connection and try again'
  },
  [ErrorCategory.VALIDATION]: {
    label: 'Validation Error',
    description: 'Data validation failed',
    suggestedAction: 'Review the data and correct any validation errors'
  },
  [ErrorCategory.AUTHORIZATION]: {
    label: 'Authorization Error',
    description: 'Insufficient permissions',
    suggestedAction: 'Contact your administrator for proper permissions'
  },
  [ErrorCategory.BUSINESS_RULE]: {
    label: 'Business Rule Violation',
    description: 'Business logic constraint violated',
    suggestedAction: 'Review business rules and adjust your request'
  },
  [ErrorCategory.SERVICE_ERROR]: {
    label: 'Service Error',
    description: 'External service error',
    suggestedAction: 'The service may be temporarily unavailable. Try again later'
  },
  [ErrorCategory.TIMEOUT]: {
    label: 'Timeout Error',
    description: 'Operation timed out',
    suggestedAction: 'Try again with a smaller batch size'
  },
  [ErrorCategory.RATE_LIMIT]: {
    label: 'Rate Limit Exceeded',
    description: 'Too many requests',
    suggestedAction: 'Wait a moment before trying again'
  },
  [ErrorCategory.UNKNOWN]: {
    label: 'Unknown Error',
    description: 'Unexpected error occurred',
    suggestedAction: 'Contact support if the problem persists'
  }
}

/**
 * Basic error display component
 */
export function ErrorDisplay({ 
  error, 
  showDetails = false,
  showRetry = true,
  onRetry,
  onDismiss,
  onViewDetails,
  className 
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const severityInfo = severityConfig[error.severity]
  const categoryInfo = categoryConfig[error.category]
  const SeverityIcon = severityInfo.icon

  const handleRetry = useCallback(async () => {
    if (!onRetry) return
    
    setIsRetrying(true)
    try {
      await onRetry(error.id)
    } finally {
      setIsRetrying(false)
    }
  }, [error.id, onRetry])

  const handleCopyError = useCallback(() => {
    const errorText = `
Error ID: ${error.id}
Message: ${error.message}
Code: ${error.code || 'N/A'}
Category: ${categoryInfo.label}
Severity: ${severityInfo.label}
Time: ${error.timestamp.toLocaleString()}
${error.details ? `Details: ${error.details}` : ''}
${error.context ? `Context: ${JSON.stringify(error.context, null, 2)}` : ''}
    `.trim()
    
    navigator.clipboard.writeText(errorText)
  }, [error, categoryInfo, severityInfo])

  const helpContent = error.helpTopicId ? getHelpContent(error.helpTopicId) : null

  return (
    <div className={cn(
      'border rounded-lg p-4',
      severityInfo.bgColor,
      severityInfo.borderColor,
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <SeverityIcon className={cn('h-5 w-5 mt-0.5', severityInfo.color)} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className={cn('font-medium', severityInfo.color)}>
                {error.message}
              </h4>
              
              <Badge variant="outline" className="text-xs">
                {categoryInfo.label}
              </Badge>
              
              {error.code && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {error.code}
                </Badge>
              )}
              
              {helpContent && (
                <HelpTooltip content={formatHelpTooltip(helpContent)}>
                  <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                </HelpTooltip>
              )}
            </div>
            
            <p className="text-sm text-slate-600 mb-2">
              {error.suggestedAction || categoryInfo.suggestedAction}
            </p>
            
            <div className="flex items-center space-x-4 text-xs text-slate-500">
              <span>
                <Clock className="h-3 w-3 inline mr-1" />
                {error.timestamp.toLocaleString()}
              </span>
              
              {error.retryCount && error.retryCount > 0 && (
                <span>
                  Retries: {error.retryCount}
                </span>
              )}
              
              {error.affectedItems && error.affectedItems.length > 0 && (
                <span>
                  Affected: {error.affectedItems.length} items
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {showRetry && error.retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={cn(
                'h-3 w-3',
                isRetrying && 'animate-spin'
              )} />
              <span>Retry</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyError}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {(error.details || error.context) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(error.id)}
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Expandable Details */}
      {isExpanded && (error.details || error.context) && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          {error.details && (
            <div className="mb-3">
              <h5 className="font-medium text-sm text-slate-700 mb-1">Details</h5>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {error.details}
              </p>
            </div>
          )}
          
          {error.context && (
            <div className="mb-3">
              <h5 className="font-medium text-sm text-slate-700 mb-1">Context</h5>
              <pre className="text-xs text-slate-600 bg-slate-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
          
          {error.affectedItems && error.affectedItems.length > 0 && (
            <div>
              <h5 className="font-medium text-sm text-slate-700 mb-1">
                Affected Items ({error.affectedItems.length})
              </h5>
              <div className="flex flex-wrap gap-1">
                {error.affectedItems.slice(0, 10).map((item, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
                {error.affectedItems.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{error.affectedItems.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Error list component
 */
export function ErrorList({
  errors,
  showRetry = true,
  showBulkActions = true,
  onRetry,
  onRetryAll,
  onDismiss,
  onDismissAll,
  onExport,
  className
}: ErrorListProps) {
  const [selectedErrors, setSelectedErrors] = useState<string[]>([])
  const [isRetryingAll, setIsRetryingAll] = useState(false)

  const retryableErrors = errors.filter(error => error.retryable)
  const hasRetryableErrors = retryableErrors.length > 0

  const handleSelectAll = useCallback(() => {
    if (selectedErrors.length === errors.length) {
      setSelectedErrors([])
    } else {
      setSelectedErrors(errors.map(error => error.id))
    }
  }, [errors, selectedErrors])

  const handleRetryAll = useCallback(async () => {
    if (!onRetryAll || selectedErrors.length === 0) return
    
    setIsRetryingAll(true)
    try {
      await onRetryAll(selectedErrors)
      setSelectedErrors([])
    } finally {
      setIsRetryingAll(false)
    }
  }, [onRetryAll, selectedErrors])

  const handleDismissAll = useCallback(() => {
    if (!onDismissAll || selectedErrors.length === 0) return
    
    onDismissAll(selectedErrors)
    setSelectedErrors([])
  }, [onDismissAll, selectedErrors])

  const handleExport = useCallback(() => {
    if (!onExport) return
    
    const errorsToExport = selectedErrors.length > 0 
      ? errors.filter(error => selectedErrors.includes(error.id))
      : errors
    
    onExport(errorsToExport)
  }, [onExport, errors, selectedErrors])

  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p>No errors to display</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedErrors.length === errors.length}
              onChange={handleSelectAll}
              className="rounded"
            />
            <span className="text-sm text-slate-600">
              {selectedErrors.length === 0 
                ? `Select all ${errors.length} errors`
                : `${selectedErrors.length} of ${errors.length} selected`
              }
            </span>
          </div>
          
          {selectedErrors.length > 0 && (
            <div className="flex items-center space-x-2">
              {hasRetryableErrors && onRetryAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryAll}
                  disabled={isRetryingAll}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={cn(
                    'h-3 w-3',
                    isRetryingAll && 'animate-spin'
                  )} />
                  <span>Retry Selected</span>
                </Button>
              )}
              
              {onDismissAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismissAll}
                >
                  Dismiss Selected
                </Button>
              )}
              
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Export</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Error List */}
      <div className="space-y-3">
        {errors.map((error) => (
          <div key={error.id} className="flex items-start space-x-3">
            {showBulkActions && (
              <input
                type="checkbox"
                checked={selectedErrors.includes(error.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedErrors([...selectedErrors, error.id])
                  } else {
                    setSelectedErrors(selectedErrors.filter(id => id !== error.id))
                  }
                }}
                className="mt-4 rounded"
              />
            )}
            
            <div className="flex-1">
              <ErrorDisplay
                error={error}
                showRetry={showRetry}
                onRetry={onRetry}
                onDismiss={onDismiss}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Retry button component
 */
export function RetryButton({
  errorId,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  size = 'sm',
  variant = 'outline',
  className
}: RetryButtonProps) {
  const [localRetrying, setLocalRetrying] = useState(false)
  
  const handleRetry = useCallback(async () => {
    setLocalRetrying(true)
    try {
      await onRetry(errorId)
    } finally {
      setLocalRetrying(false)
    }
  }, [errorId, onRetry])

  const isDisabled = isRetrying || localRetrying || retryCount >= maxRetries

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRetry}
      disabled={isDisabled}
      className={cn('flex items-center space-x-1', className)}
    >
      <RefreshCw className={cn(
        'h-3 w-3',
        (isRetrying || localRetrying) && 'animate-spin'
      )} />
      <span>
        Retry {retryCount > 0 && `(${retryCount}/${maxRetries})`}
      </span>
    </Button>
  )
}

/**
 * Error list component
 */
export function ErrorList({
  errors,
  showRetry = true,
  showBulkActions = true,
  onRetry,
  onRetryAll,
  onDismiss,
  onDismissAll,
  onExport,
  className
}: ErrorListProps) {
  const [selectedErrors, setSelectedErrors] = useState<string[]>([])
  const [isRetryingAll, setIsRetryingAll] = useState(false)

  const retryableErrors = errors.filter(error => error.retryable)
  const hasRetryableErrors = retryableErrors.length > 0

  const handleSelectAll = useCallback(() => {
    if (selectedErrors.length === errors.length) {
      setSelectedErrors([])
    } else {
      setSelectedErrors(errors.map(error => error.id))
    }
  }, [errors, selectedErrors])

  const handleRetryAll = useCallback(async () => {
    if (!onRetryAll || selectedErrors.length === 0) return
    
    setIsRetryingAll(true)
    try {
      await onRetryAll(selectedErrors)
      setSelectedErrors([])
    } finally {
      setIsRetryingAll(false)
    }
  }, [onRetryAll, selectedErrors])

  const handleDismissAll = useCallback(() => {
    if (!onDismissAll || selectedErrors.length === 0) return
    
    onDismissAll(selectedErrors)
    setSelectedErrors([])
  }, [onDismissAll, selectedErrors])

  const handleExport = useCallback(() => {
    if (!onExport) return
    
    const errorsToExport = selectedErrors.length > 0 
      ? errors.filter(error => selectedErrors.includes(error.id))
      : errors
    
    onExport(errorsToExport)
  }, [onExport, errors, selectedErrors])

  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p>No errors to display</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedErrors.length === errors.length}
              onChange={handleSelectAll}
              className="rounded"
            />
            <span className="text-sm text-slate-600">
              {selectedErrors.length === 0 
                ? `Select all ${errors.length} errors`
                : `${selectedErrors.length} of ${errors.length} selected`
              }
            </span>
          </div>
          
          {selectedErrors.length > 0 && (
            <div className="flex items-center space-x-2">
              {hasRetryableErrors && onRetryAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryAll}
                  disabled={isRetryingAll}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={cn(
                    'h-3 w-3',
                    isRetryingAll && 'animate-spin'
                  )} />
                  <span>Retry Selected</span>
                </Button>
              )}
              
              {onDismissAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismissAll}
                >
                  Dismiss Selected
                </Button>
              )}
              
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Export</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Error List */}
      <div className="space-y-3">
        {errors.map((error) => (
          <div key={error.id} className="flex items-start space-x-3">
            {showBulkActions && (
              <input
                type="checkbox"
                checked={selectedErrors.includes(error.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedErrors([...selectedErrors, error.id])
                  } else {
                    setSelectedErrors(selectedErrors.filter(id => id !== error.id))
                  }
                }}
                className="mt-4 rounded"
              />
            )}
            
            <div className="flex-1">
              <ErrorDisplay
                error={error}
                showRetry={showRetry}
                onRetry={onRetry}
                onDismiss={onDismiss}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Batch error summary component
 */
export function BatchErrorSummary({
  summary,
  errors,
  onRetryBatch,
  onViewDetails,
  className
}: BatchErrorSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetryBatch = useCallback(async () => {
    if (!onRetryBatch) return
    
    setIsRetrying(true)
    try {
      await onRetryBatch(summary.batchId)
    } finally {
      setIsRetrying(false)
    }
  }, [summary.batchId, onRetryBatch])

  const severityEntries = Object.entries(summary.errorsBySeverity)
    .filter(([_, count]) => count > 0)
    .sort(([a], [b]) => {
      const order = [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW]
      return order.indexOf(a as ErrorSeverity) - order.indexOf(b as ErrorSeverity)
    })

  return (
    <div className={cn(
      'border rounded-lg p-4 bg-red-50 border-red-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h4 className="font-medium text-red-900">
              Batch {summary.batchId} - {summary.totalErrors} Errors
            </h4>
            <p className="text-sm text-red-700">
              {summary.retryableErrors} retryable, {summary.nonRetryableErrors} permanent
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {summary.retryableErrors > 0 && onRetryBatch && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryBatch}
              disabled={isRetrying}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={cn(
                'h-3 w-3',
                isRetrying && 'animate-spin'
              )} />
              <span>Retry Batch</span>
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1"
          >
            <span>Details</span>
            {isExpanded ? 
              <ChevronDown className="h-3 w-3" /> : 
              <ChevronRight className="h-3 w-3" />
            }
          </Button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-lg font-semibold text-slate-900">
            {summary.totalErrors}
          </div>
          <div className="text-xs text-slate-600">Total Errors</div>
        </div>
        
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-lg font-semibold text-yellow-600">
            {summary.retryableErrors}
          </div>
          <div className="text-xs text-slate-600">Retryable</div>
        </div>
        
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-lg font-semibold text-slate-600">
            {summary.affectedItems.length}
          </div>
          <div className="text-xs text-slate-600">Affected Items</div>
        </div>
        
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-lg font-semibold text-slate-600">
            {Math.round((summary.lastError.getTime() - summary.firstError.getTime()) / 1000)}s
          </div>
          <div className="text-xs text-slate-600">Duration</div>
        </div>
      </div>
      
      {/* Severity Breakdown */}
      <div className="flex flex-wrap gap-2 mb-3">
        {severityEntries.map(([severity, count]) => {
          const config = severityConfig[severity as ErrorSeverity]
          return (
            <Badge
              key={severity}
              variant="outline"
              className={cn(
                'flex items-center space-x-1',
                config.bgColor,
                config.borderColor,
                config.color
              )}
            >
              <config.icon className="h-3 w-3" />
              <span>{config.label}: {count}</span>
            </Badge>
          )
        })}
      </div>
      
      {/* Expanded Details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="mt-3 pt-3 border-t border-red-200">
          <ErrorList
            errors={errors}
            showBulkActions={false}
            className="max-h-96 overflow-y-auto"
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/**
 * Error log viewer component
 */
export function ErrorLogViewer({
  errors,
  maxHeight = '400px',
  searchable = true,
  filterable = true,
  exportable = true,
  onRetry,
  className
}: ErrorLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredErrors = errors.filter(error => {
    // Search filter
    if (searchTerm) {
      const searchableText = `${error.message} ${error.code || ''} ${error.details || ''}`.toLowerCase()
      if (!searchableText.includes(searchTerm.toLowerCase())) {
        return false
      }
    }
    
    // Severity filter
    if (severityFilter !== 'all' && error.severity !== severityFilter) {
      return false
    }
    
    // Category filter
    if (categoryFilter !== 'all' && error.category !== categoryFilter) {
      return false
    }
    
    return true
  })

  const handleExport = useCallback(() => {
    const errorData = filteredErrors.map(error => ({
      id: error.id,
      message: error.message,
      code: error.code,
      severity: error.severity,
      category: error.category,
      timestamp: error.timestamp.toISOString(),
      details: error.details,
      retryable: error.retryable,
      retryCount: error.retryCount,
      affectedItems: error.affectedItems
    }))

    const blob = new Blob([JSON.stringify(errorData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filteredErrors])

  return (
    <div className={cn('border rounded-lg bg-white', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-900">
            Error Log ({filteredErrors.length} of {errors.length})
          </h3>
          
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center space-x-1"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </Button>
          )}
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {searchable && (
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          {filterable && (
            <>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {Object.values(ErrorSeverity).map(severity => (
                    <SelectItem key={severity} value={severity}>
                      {severityConfig[severity].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.values(ErrorCategory).map(category => (
                    <SelectItem key={category} value={category}>
                      {categoryConfig[category].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>
      
      {/* Error List */}
      <div 
        className="overflow-y-auto p-4"
        style={{ maxHeight }}
      >
        <ErrorList
          errors={filteredErrors}
          onRetry={onRetry}
          showBulkActions={false}
        />
      </div>
    </div>
  )
} 