// Comprehensive Error Handling Service for Order Submission
// Manages error categorization, retry logic, and recovery strategies

import { ErrorInfo, ErrorSeverity, ErrorCategory, BatchErrorSummary } from '@/components/ui/error-display'

/**
 * HTTP status code mapping to error categories and severity
 */
const HTTP_ERROR_MAPPING: Record<number, { category: ErrorCategory; severity: ErrorSeverity; retryable: boolean }> = {
  // Client errors (4xx)
  400: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.HIGH, retryable: false },
  401: { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.HIGH, retryable: false },
  403: { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.HIGH, retryable: false },
  404: { category: ErrorCategory.SERVICE_ERROR, severity: ErrorSeverity.MEDIUM, retryable: false },
  408: { category: ErrorCategory.TIMEOUT, severity: ErrorSeverity.MEDIUM, retryable: true },
  413: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.HIGH, retryable: false },
  422: { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.HIGH, retryable: false },
  429: { category: ErrorCategory.RATE_LIMIT, severity: ErrorSeverity.MEDIUM, retryable: true },
  
  // Server errors (5xx)
  500: { category: ErrorCategory.SERVICE_ERROR, severity: ErrorSeverity.CRITICAL, retryable: true },
  502: { category: ErrorCategory.SERVICE_ERROR, severity: ErrorSeverity.HIGH, retryable: true },
  503: { category: ErrorCategory.SERVICE_ERROR, severity: ErrorSeverity.HIGH, retryable: true },
  504: { category: ErrorCategory.TIMEOUT, severity: ErrorSeverity.HIGH, retryable: true }
}

/**
 * Error pattern recognition
 */
const ERROR_PATTERNS = [
  {
    pattern: /network|connection|fetch/i,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    retryable: true
  },
  {
    pattern: /timeout|timed out/i,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true
  },
  {
    pattern: /unauthorized|forbidden|access denied/i,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    retryable: false
  },
  {
    pattern: /validation|invalid|required|missing/i,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retryable: false
  },
  {
    pattern: /rate limit|too many requests/i,
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true
  },
  {
    pattern: /business rule|constraint|violation/i,
    category: ErrorCategory.BUSINESS_RULE,
    severity: ErrorSeverity.MEDIUM,
    retryable: false
  }
]

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  exponentialBackoff: boolean
  jitter: boolean
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBackoff: true,
  jitter: true
}

/**
 * Error handling statistics
 */
export interface ErrorStatistics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  retryableErrors: number
  successfulRetries: number
  failedRetries: number
  averageRetryDelay: number
}

/**
 * Error handling service
 */
export class ErrorHandlingService {
  private errors: Map<string, ErrorInfo> = new Map()
  private batchErrors: Map<string, ErrorInfo[]> = new Map()
  private retryConfig: RetryConfig
  private statistics: ErrorStatistics

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
    this.statistics = this.initializeStatistics()
  }

  /**
   * Initialize error statistics
   */
  private initializeStatistics(): ErrorStatistics {
    return {
      totalErrors: 0,
      errorsByCategory: Object.values(ErrorCategory).reduce((acc, category) => {
        acc[category] = 0
        return acc
      }, {} as Record<ErrorCategory, number>),
      errorsBySeverity: Object.values(ErrorSeverity).reduce((acc, severity) => {
        acc[severity] = 0
        return acc
      }, {} as Record<ErrorSeverity, number>),
      retryableErrors: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0
    }
  }

  /**
   * Create error information from various error sources
   */
  public createError(
    error: any,
    context?: {
      itemId?: string
      batchId?: string
      operation?: string
      additionalContext?: Record<string, any>
    }
  ): ErrorInfo {
    const errorId = this.generateErrorId()
    const timestamp = new Date()

    // Determine error details based on error type
    let message: string
    let code: string | undefined
    let details: string | undefined
    let category: ErrorCategory
    let severity: ErrorSeverity
    let retryable: boolean

    if (error instanceof Response) {
      // HTTP Response error
      const httpMapping = HTTP_ERROR_MAPPING[error.status] || {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        retryable: false
      }
      
      message = `HTTP ${error.status}: ${error.statusText}`
      code = error.status.toString()
      category = httpMapping.category
      severity = httpMapping.severity
      retryable = httpMapping.retryable
      details = `Request failed with status ${error.status}`

    } else if (error instanceof Error) {
      // JavaScript Error
      message = error.message
      details = error.stack
      
      // Pattern matching for categorization
      const matchedPattern = ERROR_PATTERNS.find(pattern => 
        pattern.pattern.test(error.message)
      )
      
      if (matchedPattern) {
        category = matchedPattern.category
        severity = matchedPattern.severity
        retryable = matchedPattern.retryable
      } else {
        category = ErrorCategory.UNKNOWN
        severity = ErrorSeverity.MEDIUM
        retryable = false
      }

    } else if (typeof error === 'string') {
      // String error
      message = error
      
      const matchedPattern = ERROR_PATTERNS.find(pattern => 
        pattern.pattern.test(error)
      )
      
      if (matchedPattern) {
        category = matchedPattern.category
        severity = matchedPattern.severity
        retryable = matchedPattern.retryable
      } else {
        category = ErrorCategory.UNKNOWN
        severity = ErrorSeverity.LOW
        retryable = false
      }

    } else {
      // Unknown error type
      message = 'Unknown error occurred'
      details = JSON.stringify(error, null, 2)
      category = ErrorCategory.UNKNOWN
      severity = ErrorSeverity.MEDIUM
      retryable = false
    }

    // Generate suggested action
    const suggestedAction = this.generateSuggestedAction(category, severity, error)

    // Determine help topic ID
    const helpTopicId = this.getHelpTopicId(category, severity)

    const errorInfo: ErrorInfo = {
      id: errorId,
      message,
      code,
      severity,
      category,
      timestamp,
      details,
      context: {
        ...context?.additionalContext,
        itemId: context?.itemId,
        batchId: context?.batchId,
        operation: context?.operation
      },
      retryable,
      retryCount: 0,
      suggestedAction,
      helpTopicId,
      affectedItems: context?.itemId ? [context.itemId] : undefined,
      originalError: error
    }

    // Store error and update statistics
    this.errors.set(errorId, errorInfo)
    this.updateStatistics(errorInfo)

    // Add to batch errors if batchId is provided
    if (context?.batchId) {
      this.addToBatchErrors(context.batchId, errorInfo)
    }

    return errorInfo
  }

  /**
   * Add error to batch tracking
   */
  private addToBatchErrors(batchId: string, error: ErrorInfo) {
    const batchErrors = this.batchErrors.get(batchId) || []
    batchErrors.push(error)
    this.batchErrors.set(batchId, batchErrors)
  }

  /**
   * Update error statistics
   */
  private updateStatistics(error: ErrorInfo) {
    this.statistics.totalErrors++
    this.statistics.errorsByCategory[error.category]++
    this.statistics.errorsBySeverity[error.severity]++
    
    if (error.retryable) {
      this.statistics.retryableErrors++
    }
  }

  /**
   * Generate suggested action based on error
   */
  private generateSuggestedAction(
    category: ErrorCategory, 
    severity: ErrorSeverity, 
    originalError: any
  ): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Check your internet connection and try again'
      
      case ErrorCategory.TIMEOUT:
        return 'Try again with a smaller batch size or wait a moment'
      
      case ErrorCategory.RATE_LIMIT:
        return 'Wait a few moments before retrying'
      
      case ErrorCategory.AUTHORIZATION:
        return 'Check your permissions or contact your administrator'
      
      case ErrorCategory.VALIDATION:
        return 'Review the data and correct any validation errors'
      
      case ErrorCategory.BUSINESS_RULE:
        return 'Review business rules and adjust your request'
      
      case ErrorCategory.SERVICE_ERROR:
        if (severity === ErrorSeverity.CRITICAL) {
          return 'The service is experiencing issues. Please try again later or contact support'
        }
        return 'The service may be temporarily unavailable. Try again in a moment'
      
      default:
        return 'Review the error details and try again, or contact support if the problem persists'
    }
  }

  /**
   * Get help topic ID for error
   */
  private getHelpTopicId(category: ErrorCategory, severity: ErrorSeverity): string | undefined {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.SERVICE_ERROR:
        return 'common-errors'
      
      case ErrorCategory.VALIDATION:
        return 'order-eligibility'
      
      case ErrorCategory.RATE_LIMIT:
        return 'batch-processing'
      
      default:
        return 'error-recovery'
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  public calculateRetryDelay(retryCount: number): number {
    let delay = this.retryConfig.baseDelay

    if (this.retryConfig.exponentialBackoff) {
      delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, retryCount),
        this.retryConfig.maxDelay
      )
    }

    if (this.retryConfig.jitter) {
      // Add ±25% jitter
      const jitterRange = delay * 0.25
      delay += (Math.random() - 0.5) * 2 * jitterRange
    }

    return Math.max(delay, 0)
  }

  /**
   * Check if error can be retried
   */
  public canRetry(errorId: string): boolean {
    const error = this.errors.get(errorId)
    if (!error) return false

    return error.retryable && (error.retryCount || 0) < this.retryConfig.maxRetries
  }

  /**
   * Mark retry attempt
   */
  public markRetryAttempt(errorId: string): void {
    const error = this.errors.get(errorId)
    if (!error) return

    error.retryCount = (error.retryCount || 0) + 1
    error.lastRetryAt = new Date()
    
    this.errors.set(errorId, error)
  }

  /**
   * Mark retry success
   */
  public markRetrySuccess(errorId: string): void {
    const error = this.errors.get(errorId)
    if (!error) return

    this.statistics.successfulRetries++
    this.removeError(errorId)
  }

  /**
   * Mark retry failure
   */
  public markRetryFailure(errorId: string, newError?: any): void {
    const error = this.errors.get(errorId)
    if (!error) return

    this.statistics.failedRetries++
    
    if (newError) {
      // Update error with new information
      const updatedError = this.createError(newError, {
        itemId: error.context?.itemId,
        batchId: error.context?.batchId,
        operation: error.context?.operation,
        additionalContext: error.context
      })
      
      // Preserve retry count
      updatedError.retryCount = error.retryCount
      updatedError.lastRetryAt = error.lastRetryAt
      
      this.errors.set(errorId, updatedError)
    }
  }

  /**
   * Get error by ID
   */
  public getError(errorId: string): ErrorInfo | undefined {
    return this.errors.get(errorId)
  }

  /**
   * Get all errors
   */
  public getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values())
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): ErrorInfo[] {
    return this.getAllErrors().filter(error => error.category === category)
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorSeverity): ErrorInfo[] {
    return this.getAllErrors().filter(error => error.severity === severity)
  }

  /**
   * Get retryable errors
   */
  public getRetryableErrors(): ErrorInfo[] {
    return this.getAllErrors().filter(error => 
      error.retryable && (error.retryCount || 0) < this.retryConfig.maxRetries
    )
  }

  /**
   * Get batch error summary
   */
  public getBatchErrorSummary(batchId: string): BatchErrorSummary | undefined {
    const batchErrors = this.batchErrors.get(batchId)
    if (!batchErrors || batchErrors.length === 0) return undefined

    const totalErrors = batchErrors.length
    const retryableErrors = batchErrors.filter(error => error.retryable).length
    const nonRetryableErrors = totalErrors - retryableErrors

    // Group by category
    const errorsByCategory = batchErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<ErrorCategory, number>)

    // Group by severity
    const errorsBySeverity = batchErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<ErrorSeverity, number>)

    // Get affected items
    const affectedItems = Array.from(new Set(
      batchErrors.flatMap(error => error.affectedItems || [])
    ))

    // Get time range
    const timestamps = batchErrors.map(error => error.timestamp)
    const firstError = new Date(Math.min(...timestamps.map(t => t.getTime())))
    const lastError = new Date(Math.max(...timestamps.map(t => t.getTime())))

    return {
      batchId,
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      retryableErrors,
      nonRetryableErrors,
      firstError,
      lastError,
      affectedItems
    }
  }

  /**
   * Remove error
   */
  public removeError(errorId: string): boolean {
    return this.errors.delete(errorId)
  }

  /**
   * Clear all errors
   */
  public clearAllErrors(): void {
    this.errors.clear()
    this.batchErrors.clear()
    this.statistics = this.initializeStatistics()
  }

  /**
   * Clear batch errors
   */
  public clearBatchErrors(batchId: string): void {
    const batchErrors = this.batchErrors.get(batchId) || []
    
    // Remove individual errors
    batchErrors.forEach(error => this.removeError(error.id))
    
    // Remove batch tracking
    this.batchErrors.delete(batchId)
  }

  /**
   * Get error statistics
   */
  public getStatistics(): ErrorStatistics {
    return { ...this.statistics }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Export errors to JSON
   */
  public exportErrors(errors?: ErrorInfo[]): string {
    const errorsToExport = errors || this.getAllErrors()
    
    const exportData = {
      timestamp: new Date().toISOString(),
      totalErrors: errorsToExport.length,
      statistics: this.getStatistics(),
      errors: errorsToExport.map(error => ({
        ...error,
        timestamp: error.timestamp.toISOString(),
        lastRetryAt: error.lastRetryAt?.toISOString()
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import errors from JSON
   */
  public importErrors(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((errorData: any) => {
          const error: ErrorInfo = {
            ...errorData,
            timestamp: new Date(errorData.timestamp),
            lastRetryAt: errorData.lastRetryAt ? new Date(errorData.lastRetryAt) : undefined
          }
          
          this.errors.set(error.id, error)
          this.updateStatistics(error)
        })
      }
    } catch (error) {
      console.error('Failed to import errors:', error)
    }
  }
}

/**
 * Global error handling service instance
 */
export const errorHandlingService = new ErrorHandlingService() 