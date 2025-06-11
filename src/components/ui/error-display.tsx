/**
 * Error Display Components
 * 
 * UI components for displaying submission errors, partial success states,
 * and error recovery options. Integrates with ErrorStateService.
 * 
 * Part of KASBench GlobeCo Portfolio Management Portal
 * Stage 4.3: Error State Management
 */

'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Info,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { 
  SubmissionError, 
  PartialSuccessResult, 
  ErrorAnnotation,
  ErrorStateMetrics,
  getErrorStateService
} from '@/lib/services/errorStateService'

// ============================================================================
// Error Level Badge Component
// ============================================================================

interface ErrorLevelBadgeProps {
  level: SubmissionError['level']
  className?: string
}

export function ErrorLevelBadge({ level, className }: ErrorLevelBadgeProps) {
  const variants = {
    position: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
    portfolio: { variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
    rebalance: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
    global: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
  }

  const config = variants[level]

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.color} ${className}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  )
}

// ============================================================================
// Error Status Icon Component
// ============================================================================

interface ErrorStatusIconProps {
  error: SubmissionError
  size?: number
  className?: string
}

export function ErrorStatusIcon({ error, size = 16, className }: ErrorStatusIconProps) {
  const getIcon = () => {
    if (!error.retryable) {
      return <XCircle size={size} className={`text-red-500 ${className}`} />
    }
    
    if (error.retryCount === 0) {
      return <AlertTriangle size={size} className={`text-yellow-500 ${className}`} />
    }
    
    return <RefreshCw size={size} className={`text-blue-500 ${className}`} />
  }

  const getTooltip = () => {
    if (!error.retryable) return 'Non-retryable error'
    if (error.retryCount === 0) return 'New error (not retried)'
    return `Retried ${error.retryCount} time(s)`
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          {getIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltip()}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// Individual Error Display Component
// ============================================================================

interface ErrorItemProps {
  error: SubmissionError
  onRetry?: (errorId: string) => void
  onResolve?: (errorId: string) => void
  showTechnicalDetails?: boolean
  compact?: boolean
}

export function ErrorItem({ 
  error, 
  onRetry, 
  onResolve, 
  showTechnicalDetails = false,
  compact = false 
}: ErrorItemProps) {
  const [showDetails, setShowDetails] = useState(!compact)

  const formatTimestamp = (date: Date) => {
    return format(date, 'MMM dd, yyyy HH:mm:ss')
  }

  const canRetry = error.retryable && error.retryCount < 3

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
        <div className="flex items-center space-x-2">
          <ErrorStatusIcon error={error} size={14} />
          <ErrorLevelBadge level={error.level} className="text-xs" />
          <span className="text-sm text-gray-700 truncate max-w-xs">
            {error.userMessage}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-6 w-6 p-0"
          >
            {showDetails ? <EyeOff size={12} /> : <Eye size={12} />}
          </Button>
          
          {canRetry && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(error.id)}
              className="h-6 w-6 p-0"
            >
              <RotateCcw size={12} />
            </Button>
          )}
          
          {onResolve && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolve(error.id)}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            >
              <X size={12} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ErrorStatusIcon error={error} />
            <ErrorLevelBadge level={error.level} />
            <span className="text-sm text-gray-500">
              {formatTimestamp(error.timestamp)}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(error.id)}
                className="h-7"
              >
                <RotateCcw size={12} className="mr-1" />
                Retry
              </Button>
            )}
            
            {onResolve && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResolve(error.id)}
                className="h-7 text-red-500 hover:text-red-700"
              >
                <X size={12} className="mr-1" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-900">{error.userMessage}</p>
            {error.suggestedAction && (
              <p className="text-sm text-blue-600 mt-1">{error.suggestedAction}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Entity: {error.entityId}</span>
            <span>•</span>
            <span>Code: {error.errorCode}</span>
            {error.retryCount > 0 && (
              <>
                <span>•</span>
                <span>Retries: {error.retryCount}</span>
              </>
            )}
            {error.lastRetryAt && (
              <>
                <span>•</span>
                <span>Last retry: {formatTimestamp(error.lastRetryAt)}</span>
              </>
            )}
          </div>
          
          {showTechnicalDetails && error.technicalDetails && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  <ChevronRight size={12} className="mr-1" />
                  Technical Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                  {error.technicalDetails}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Error Annotation Display Component
// ============================================================================

interface ErrorAnnotationDisplayProps {
  annotation: ErrorAnnotation
  onRetryAll?: (entityId: string) => void
  onResolveAll?: (entityId: string) => void
  showDetails?: boolean
}

export function ErrorAnnotationDisplay({ 
  annotation, 
  onRetryAll, 
  onResolveAll,
  showDetails = false 
}: ErrorAnnotationDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  
  const retryableCount = annotation.errors.filter(e => e.retryable).length
  const nonRetryableCount = annotation.errors.length - retryableCount

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-orange-500" />
            <div>
              <CardTitle className="text-sm">
                {annotation.entityType.charAt(0).toUpperCase() + annotation.entityType.slice(1)}: {annotation.entityId}
              </CardTitle>
              <p className="text-xs text-gray-500">
                {annotation.errorCount} error(s) • Last: {format(annotation.lastErrorAt, 'MMM dd, HH:mm')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {annotation.isRetryable && onRetryAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetryAll(annotation.entityId)}
                className="h-7"
              >
                <RotateCcw size={12} className="mr-1" />
                Retry All
              </Button>
            )}
            
            {onResolveAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResolveAll(annotation.entityId)}
                className="h-7 text-red-500 hover:text-red-700"
              >
                <Trash2 size={12} className="mr-1" />
                Clear All
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Retryable: {retryableCount}</span>
              <span>Non-retryable: {nonRetryableCount}</span>
              <span>Total: {annotation.errorCount}</span>
            </div>
            
            <Separator />
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {annotation.errors.map(error => (
                <ErrorItem 
                  key={error.id} 
                  error={error} 
                  compact={true}
                  showTechnicalDetails={showDetails}
                />
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ============================================================================
// Partial Success Display Component
// ============================================================================

interface PartialSuccessDisplayProps {
  result: PartialSuccessResult
  onRetryFailed?: (resultId: string) => void
  showDetails?: boolean
}

export function PartialSuccessDisplay({ 
  result, 
  onRetryFailed,
  showDetails = false 
}: PartialSuccessDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  
  const successPercentage = Math.round(result.successRate * 100)
  const hasRetryableErrors = result.errors.some(e => e.retryable)

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <div>
              <CardTitle className="text-sm">
                Partial Success - {result.level.charAt(0).toUpperCase() + result.level.slice(1)}: {result.entityId}
              </CardTitle>
              <p className="text-xs text-gray-500">
                {format(result.timestamp, 'MMM dd, yyyy HH:mm:ss')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasRetryableErrors && onRetryFailed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetryFailed(result.id)}
                className="h-7"
              >
                <RotateCcw size={12} className="mr-1" />
                Retry Failed
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Success Rate</span>
              <span className="font-medium">{successPercentage}%</span>
            </div>
            <Progress value={successPercentage} className="h-2" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-green-600 font-medium">{result.successCount}</div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-red-600 font-medium">{result.failureCount}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-gray-900 font-medium">{result.totalCount}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
          
          {expanded && result.errors.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Failed Items ({result.errors.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.errors.map(error => (
                    <ErrorItem 
                      key={error.id} 
                      error={error} 
                      compact={true}
                      showTechnicalDetails={showDetails}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Error Metrics Dashboard Component
// ============================================================================

interface ErrorMetricsDashboardProps {
  metrics: ErrorStateMetrics
  onClearAll?: () => void
  onPerformCleanup?: () => void
}

export function ErrorMetricsDashboard({ 
  metrics, 
  onClearAll, 
  onPerformCleanup 
}: ErrorMetricsDashboardProps) {
  if (metrics.totalErrors === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          No errors currently tracked. All submissions are processing successfully.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Error Summary</CardTitle>
          <div className="flex items-center space-x-2">
            {onPerformCleanup && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPerformCleanup}
                className="h-8"
              >
                <Trash2 size={12} className="mr-1" />
                Cleanup Stale
              </Button>
            )}
            {onClearAll && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearAll}
                className="h-8"
              >
                <X size={12} className="mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.totalErrors}</div>
            <div className="text-sm text-gray-500">Total Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{metrics.retryableErrors}</div>
            <div className="text-sm text-gray-500">Retryable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.nonRetryableErrors}</div>
            <div className="text-sm text-gray-500">Non-retryable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{metrics.staleErrors}</div>
            <div className="text-sm text-gray-500">Stale</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Errors by Level</h4>
            <div className="space-y-1">
              {Object.entries(metrics.errorsByLevel).map(([level, count]) => (
                <div key={level} className="flex justify-between text-sm">
                  <span className="capitalize">{level}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Errors by Code</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {Object.entries(metrics.errorsByCode).map(([code, count]) => (
                <div key={code} className="flex justify-between text-sm">
                  <span className="text-xs font-mono">{code}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {metrics.oldestError && metrics.newestError && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Avg. Retries:</span>
                <span className="ml-2 font-medium">{metrics.averageRetryCount.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-gray-500">Oldest:</span>
                <span className="ml-2 font-medium">{format(metrics.oldestError, 'MMM dd, HH:mm')}</span>
              </div>
              <div>
                <span className="text-gray-500">Newest:</span>
                <span className="ml-2 font-medium">{format(metrics.newestError, 'MMM dd, HH:mm')}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Error Display Container Component
// ============================================================================

interface ErrorDisplayContainerProps {
  entityId?: string
  level?: SubmissionError['level']
  showMetrics?: boolean
  showTechnicalDetails?: boolean
  maxDisplayedErrors?: number
  className?: string
}

export function ErrorDisplayContainer({ 
  entityId,
  level,
  showMetrics = true,
  showTechnicalDetails = false,
  maxDisplayedErrors = 10,
  className
}: ErrorDisplayContainerProps) {
  const [errors, setErrors] = useState<SubmissionError[]>([])
  const [annotations, setAnnotations] = useState<ErrorAnnotation[]>([])
  const [partialResults, setPartialResults] = useState<PartialSuccessResult[]>([])
  const [metrics, setMetrics] = useState<ErrorStateMetrics | null>(null)
  
  const errorService = getErrorStateService()

  useEffect(() => {
    const loadErrorData = () => {
      // Load errors
      let errorList: SubmissionError[] = []
      if (entityId) {
        errorList = errorService.getErrorsForEntity(entityId)
      } else if (level) {
        errorList = errorService.getErrorsByLevel(level)
      } else {
        errorList = errorService.getRetryableErrors()
      }
      setErrors(errorList.slice(0, maxDisplayedErrors))

      // Load annotations
      if (entityId) {
        const annotation = errorService.getEntityAnnotation(entityId)
        setAnnotations(annotation ? [annotation] : [])
      } else {
        setAnnotations(errorService.getAllAnnotations().slice(0, maxDisplayedErrors))
      }

      // Load partial results
      setPartialResults(errorService.getPartialResults().slice(0, maxDisplayedErrors))

      // Load metrics
      if (showMetrics) {
        setMetrics(errorService.getErrorMetrics())
      }
    }

    loadErrorData()

    // Listen for updates
    const handleErrorAdded = () => loadErrorData()
    const handleErrorResolved = () => loadErrorData()
    const handlePartialSuccess = () => loadErrorData()
    const handleCleanup = () => loadErrorData()

    errorService.on('errorAdded', handleErrorAdded)
    errorService.on('errorResolved', handleErrorResolved)
    errorService.on('partialSuccess', handlePartialSuccess)
    errorService.on('cleanupCompleted', handleCleanup)
    errorService.on('allErrorsCleared', handleCleanup)

    return () => {
      errorService.off('errorAdded', handleErrorAdded)
      errorService.off('errorResolved', handleErrorResolved)
      errorService.off('partialSuccess', handlePartialSuccess)
      errorService.off('cleanupCompleted', handleCleanup)
      errorService.off('allErrorsCleared', handleCleanup)
    }
  }, [entityId, level, showMetrics, maxDisplayedErrors])

  const handleRetryError = async (errorId: string) => {
    try {
      await errorService.retryErrors([errorId])
    } catch (error) {
      console.error('Failed to retry error:', error)
    }
  }

  const handleResolveError = (errorId: string) => {
    errorService.resolveError(errorId)
  }

  const handleRetryAllForEntity = async (entityId: string) => {
    try {
      const entityErrors = errorService.getErrorsForEntity(entityId)
      const retryableIds = entityErrors.filter(e => e.retryable).map(e => e.id)
      await errorService.retryErrors(retryableIds)
    } catch (error) {
      console.error('Failed to retry entity errors:', error)
    }
  }

  const handleResolveAllForEntity = (entityId: string) => {
    errorService.resolveErrorsForEntity(entityId)
  }

  const handleRetryFailedFromResult = async (resultId: string) => {
    try {
      const result = partialResults.find(r => r.id === resultId)
      if (result) {
        const retryableIds = result.errors.filter(e => e.retryable).map(e => e.id)
        await errorService.retryErrors(retryableIds)
      }
    } catch (error) {
      console.error('Failed to retry failed from result:', error)
    }
  }

  const handleClearAllErrors = () => {
    if (confirm('Are you sure you want to clear all error data? This action cannot be undone.')) {
      errorService.clearAllErrors()
    }
  }

  const handlePerformCleanup = () => {
    errorService.performStaleCleanup()
  }

  const hasAnyErrors = errors.length > 0 || annotations.length > 0 || partialResults.length > 0

  if (!hasAnyErrors && (!metrics || metrics.totalErrors === 0)) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showMetrics && metrics && (
        <ErrorMetricsDashboard 
          metrics={metrics} 
          onClearAll={handleClearAllErrors}
          onPerformCleanup={handlePerformCleanup}
        />
      )}
      
      {partialResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Partial Successes</h3>
          {partialResults.map(result => (
            <PartialSuccessDisplay
              key={result.id}
              result={result}
              onRetryFailed={handleRetryFailedFromResult}
              showDetails={showTechnicalDetails}
            />
          ))}
        </div>
      )}
      
      {annotations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Error Summary by Entity</h3>
          {annotations.map(annotation => (
            <ErrorAnnotationDisplay
              key={annotation.entityId}
              annotation={annotation}
              onRetryAll={handleRetryAllForEntity}
              onResolveAll={handleResolveAllForEntity}
              showDetails={showTechnicalDetails}
            />
          ))}
        </div>
      )}
      
      {errors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Individual Errors</h3>
          {errors.map(error => (
            <ErrorItem
              key={error.id}
              error={error}
              onRetry={handleRetryError}
              onResolve={handleResolveError}
              showTechnicalDetails={showTechnicalDetails}
            />
          ))}
        </div>
      )}
    </div>
  )
} 