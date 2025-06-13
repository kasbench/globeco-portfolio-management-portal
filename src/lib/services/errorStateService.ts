/**
 * Error State Management Service
 * 
 * Handles error states for order submission failures, including:
 * - Error annotation and persistence
 * - Partial success state management  
 * - Error recovery mechanisms
 * - Stale error cleanup utilities
 * 
 * Part of KASBench GlobeCo Portfolio Management Portal
 * Stage 4.3: Error State Management
 */

import { EventEmitter } from 'events'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SubmissionError {
  id: string
  timestamp: Date
  level: 'position' | 'portfolio' | 'rebalance' | 'global'
  entityId: string // position/portfolio/rebalance ID
  errorCode: string
  errorMessage: string
  technicalDetails?: string
  retryable: boolean
  retryCount: number
  lastRetryAt?: Date
  userMessage: string
  suggestedAction?: string
}

export interface PartialSuccessResult {
  id: string
  timestamp: Date
  level: 'portfolio' | 'rebalance' | 'global'
  entityId: string
  successCount: number
  failureCount: number
  totalCount: number
  successRate: number // 0-1
  errors: SubmissionError[]
  completedIds: string[]
  failedIds: string[]
}

export interface ErrorAnnotation {
  entityId: string
  entityType: 'position' | 'portfolio' | 'rebalance' | 'global'
  errors: SubmissionError[]
  isRetryable: boolean
  lastErrorAt: Date
  errorCount: number
}

export interface ErrorRecoveryOptions {
  retryFailedOnly: boolean
  excludeNonRetryable: boolean
  maxRetryAttempts: number
  retryDelay: number // milliseconds
  batchSize: number
}

export interface ErrorCleanupConfig {
  maxErrorAge: number // milliseconds (default: 24 hours)
  maxRetryAge: number // milliseconds (default: 1 hour)
  cleanupInterval: number // milliseconds (default: 5 minutes)
  maxErrorsPerEntity: number // default: 10
  enableAutoCleanup: boolean
}

export interface ErrorStateMetrics {
  totalErrors: number
  retryableErrors: number
  nonRetryableErrors: number
  staleErrors: number
  errorsByLevel: Record<string, number>
  errorsByCode: Record<string, number>
  averageRetryCount: number
  oldestError?: Date
  newestError?: Date
}

// ============================================================================
// Error State Management Service
// ============================================================================

export class ErrorStateService extends EventEmitter {
  private errors = new Map<string, SubmissionError>()
  private partialResults = new Map<string, PartialSuccessResult>()
  private annotations = new Map<string, ErrorAnnotation>()
  private cleanupTimer?: NodeJS.Timeout
  private config: ErrorCleanupConfig
  private isInitialized = false

  // Default configuration
  private static readonly DEFAULT_CONFIG: ErrorCleanupConfig = {
    maxErrorAge: 24 * 60 * 60 * 1000, // 24 hours
    maxRetryAge: 60 * 60 * 1000, // 1 hour
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    maxErrorsPerEntity: 10,
    enableAutoCleanup: true
  }

  // Error message mappings
  private static readonly ERROR_MESSAGES: Record<string, { user: string; action?: string }> = {
    'NETWORK_ERROR': {
      user: 'Network connection failed. Please check your internet connection.',
      action: 'Retry the submission or contact support if the problem persists.'
    },
    'TIMEOUT_ERROR': {
      user: 'The request timed out due to high server load.',
      action: 'Wait a moment and try again. Consider submitting smaller batches.'
    },
    'VALIDATION_ERROR': {
      user: 'Some order data is invalid and cannot be processed.',
      action: 'Review the position details and correct any invalid values.'
    },
    'INSUFFICIENT_FUNDS': {
      user: 'Insufficient funds available for this order.',
      action: 'Check portfolio cash balance or reduce order quantities.'
    },
    'SECURITY_NOT_FOUND': {
      user: 'One or more securities could not be found in the system.',
      action: 'Verify security symbols and update if necessary.'
    },
    'DUPLICATE_ORDER': {
      user: 'This order has already been submitted.',
      action: 'Check order history or refresh the page to see current status.'
    },
    'SERVICE_UNAVAILABLE': {
      user: 'The order service is temporarily unavailable.',
      action: 'Wait a few minutes and try again, or contact support.'
    },
    'RATE_LIMIT_EXCEEDED': {
      user: 'Too many requests sent in a short time.',
      action: 'Wait before submitting more orders or reduce batch sizes.'
    },
    'AUTHORIZATION_FAILED': {
      user: 'You do not have permission to submit these orders.',
      action: 'Contact your administrator to verify your access permissions.'
    },
    'INTERNAL_ERROR': {
      user: 'An internal system error occurred.',
      action: 'Contact support with the error details if the problem persists.'
    }
  }

  constructor(config: Partial<ErrorCleanupConfig> = {}) {
    super()
    this.config = { ...ErrorStateService.DEFAULT_CONFIG, ...config }
    this.initialize()
  }

  // ============================================================================
  // Initialization and Lifecycle
  // ============================================================================

  private async initialize(): Promise<void> {
    try {
      // Load persisted error states
      await this.loadPersistedErrors()
      
      // Start cleanup timer if enabled
      if (this.config.enableAutoCleanup) {
        this.startCleanupTimer()
      }

      this.isInitialized = true
      this.emit('initialized')
    } catch (error) {
      console.error('Failed to initialize ErrorStateService:', error)
      this.emit('error', { type: 'initialization', error })
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.performStaleCleanup()
    }, this.config.cleanupInterval)
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    
    this.removeAllListeners()
    this.errors.clear()
    this.partialResults.clear()
    this.annotations.clear()
    this.isInitialized = false
  }

  // ============================================================================
  // Error Registration and Management
  // ============================================================================

  public addError(error: Omit<SubmissionError, 'id' | 'timestamp' | 'userMessage'>): string {
    const errorId = this.generateErrorId()
    const timestamp = new Date()
    
    // Get user-friendly message
    const messageInfo = ErrorStateService.ERROR_MESSAGES[error.errorCode] || {
      user: 'An unexpected error occurred during submission.',
      action: 'Please try again or contact support if the problem persists.'
    }

    const submissionError: SubmissionError = {
      ...error,
      id: errorId,
      timestamp,
      userMessage: messageInfo.user,
      suggestedAction: messageInfo.action
    }

    this.errors.set(errorId, submissionError)
    this.updateEntityAnnotation(error.entityId, error.level, submissionError)
    
    // Persist to storage
    this.persistError(submissionError)
    
    this.emit('errorAdded', submissionError)
    return errorId
  }

  public recordPartialSuccess(result: Omit<PartialSuccessResult, 'id' | 'timestamp' | 'successRate'>): string {
    const resultId = this.generateResultId()
    const timestamp = new Date()
    const successRate = result.totalCount > 0 ? result.successCount / result.totalCount : 0

    const partialResult: PartialSuccessResult = {
      ...result,
      id: resultId,
      timestamp,
      successRate
    }

    this.partialResults.set(resultId, partialResult)
    
    // Add errors from partial result
    partialResult.errors.forEach(error => {
      this.errors.set(error.id, error)
      this.updateEntityAnnotation(error.entityId, error.level, error)
    })

    // Persist to storage
    this.persistPartialResult(partialResult)
    
    this.emit('partialSuccess', partialResult)
    return resultId
  }

  public incrementRetryCount(errorId: string): boolean {
    const error = this.errors.get(errorId)
    if (!error) return false

    error.retryCount++
    error.lastRetryAt = new Date()
    
    // Update annotation
    const annotation = this.annotations.get(error.entityId)
    if (annotation) {
      const errorIndex = annotation.errors.findIndex(e => e.id === errorId)
      if (errorIndex >= 0) {
        annotation.errors[errorIndex] = error
        annotation.lastErrorAt = new Date()
      }
    }

    this.persistError(error)
    this.emit('errorRetried', { errorId, error })
    return true
  }

  // ============================================================================
  // Error Retrieval and Querying
  // ============================================================================

  public getError(errorId: string): SubmissionError | undefined {
    return this.errors.get(errorId)
  }

  public getErrorsForEntity(entityId: string): SubmissionError[] {
    return Array.from(this.errors.values()).filter(error => error.entityId === entityId)
  }

  public getRetryableErrors(): SubmissionError[] {
    return Array.from(this.errors.values()).filter(error => error.retryable)
  }

  public getErrorsByLevel(level: SubmissionError['level']): SubmissionError[] {
    return Array.from(this.errors.values()).filter(error => error.level === level)
  }

  public getPartialResults(): PartialSuccessResult[] {
    return Array.from(this.partialResults.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
  }

  public getEntityAnnotation(entityId: string): ErrorAnnotation | undefined {
    return this.annotations.get(entityId)
  }

  public getAllAnnotations(): ErrorAnnotation[] {
    return Array.from(this.annotations.values())
  }

  public getErrorMetrics(): ErrorStateMetrics {
    const errors = Array.from(this.errors.values())
    const now = Date.now()
    
    const metrics: ErrorStateMetrics = {
      totalErrors: errors.length,
      retryableErrors: errors.filter(e => e.retryable).length,
      nonRetryableErrors: errors.filter(e => !e.retryable).length,
      staleErrors: errors.filter(e => now - e.timestamp.getTime() > this.config.maxErrorAge).length,
      errorsByLevel: {},
      errorsByCode: {},
      averageRetryCount: 0
    }

    // Calculate metrics by level and code
    errors.forEach(error => {
      metrics.errorsByLevel[error.level] = (metrics.errorsByLevel[error.level] || 0) + 1
      metrics.errorsByCode[error.errorCode] = (metrics.errorsByCode[error.errorCode] || 0) + 1
    })

    // Calculate average retry count
    if (errors.length > 0) {
      metrics.averageRetryCount = errors.reduce((sum, e) => sum + e.retryCount, 0) / errors.length
    }

    // Find oldest and newest errors
    if (errors.length > 0) {
      const sortedByTime = errors.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      metrics.oldestError = sortedByTime[0].timestamp
      metrics.newestError = sortedByTime[sortedByTime.length - 1].timestamp
    }

    return metrics
  }

  // ============================================================================
  // Error Recovery Operations
  // ============================================================================

  public async retryErrors(
    errorIds: string[], 
    options: Partial<ErrorRecoveryOptions> = {}
  ): Promise<{ attempted: string[]; skipped: string[]; errors: string[] }> {
    const recoveryOptions: ErrorRecoveryOptions = {
      retryFailedOnly: true,
      excludeNonRetryable: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      batchSize: 100,
      ...options
    }

    const attempted: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const errorId of errorIds) {
      const error = this.errors.get(errorId)
      if (!error) {
        skipped.push(errorId)
        continue
      }

      // Check if error is retryable
      if (recoveryOptions.excludeNonRetryable && !error.retryable) {
        skipped.push(errorId)
        continue
      }

      // Check retry attempts
      if (error.retryCount >= recoveryOptions.maxRetryAttempts) {
        skipped.push(errorId)
        continue
      }

      try {
        await this.delayRetry(recoveryOptions.retryDelay)
        this.incrementRetryCount(errorId)
        attempted.push(errorId)
        
        this.emit('errorRetried', { errorId, error })
      } catch (retryError) {
        errors.push(errorId)
        console.error(`Failed to retry error ${errorId}:`, retryError)
      }
    }

    return { attempted, skipped, errors }
  }

  public resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId)
    if (!error) return false

    // Remove from errors map
    this.errors.delete(errorId)
    
    // Update entity annotation
    const annotation = this.annotations.get(error.entityId)
    if (annotation) {
      annotation.errors = annotation.errors.filter(e => e.id !== errorId)
      if (annotation.errors.length === 0) {
        this.annotations.delete(error.entityId)
      } else {
        annotation.errorCount = annotation.errors.length
        annotation.isRetryable = annotation.errors.some(e => e.retryable)
        annotation.lastErrorAt = new Date(Math.max(...annotation.errors.map(e => e.timestamp.getTime())))
      }
    }

    // Remove from persistence
    this.removePersistedError(errorId)
    
    this.emit('errorResolved', error)
    return true
  }

  public resolveErrorsForEntity(entityId: string): number {
    const entityErrors = this.getErrorsForEntity(entityId)
    let resolvedCount = 0

    entityErrors.forEach(error => {
      if (this.resolveError(error.id)) {
        resolvedCount++
      }
    })

    return resolvedCount
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  public performStaleCleanup(): {
    removedErrors: number
    removedResults: number
    cleanedAnnotations: number
  } {
    const now = Date.now()
    let removedErrors = 0
    let removedResults = 0
    let cleanedAnnotations = 0

    // Clean stale errors
    for (const [errorId, error] of this.errors.entries()) {
      const errorAge = now - error.timestamp.getTime()
      const retryAge = error.lastRetryAt ? now - error.lastRetryAt.getTime() : errorAge

      if (errorAge > this.config.maxErrorAge || retryAge > this.config.maxRetryAge) {
        this.errors.delete(errorId)
        this.removePersistedError(errorId)
        removedErrors++
      }
    }

    // Clean stale partial results
    for (const [resultId, result] of this.partialResults.entries()) {
      const resultAge = now - result.timestamp.getTime()
      if (resultAge > this.config.maxErrorAge) {
        this.partialResults.delete(resultId)
        this.removePersistedPartialResult(resultId)
        removedResults++
      }
    }

    // Clean annotations
    for (const [entityId, annotation] of this.annotations.entries()) {
      // Remove stale errors from annotation
      const originalLength = annotation.errors.length
      annotation.errors = annotation.errors.filter(error => {
        const errorAge = now - error.timestamp.getTime()
        return errorAge <= this.config.maxErrorAge
      })

      if (annotation.errors.length === 0) {
        this.annotations.delete(entityId)
        cleanedAnnotations++
      } else if (annotation.errors.length !== originalLength) {
        annotation.errorCount = annotation.errors.length
        annotation.isRetryable = annotation.errors.some(e => e.retryable)
        annotation.lastErrorAt = new Date(Math.max(...annotation.errors.map(e => e.timestamp.getTime())))
      }

      // Limit errors per entity
      if (annotation.errors.length > this.config.maxErrorsPerEntity) {
        annotation.errors = annotation.errors
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, this.config.maxErrorsPerEntity)
        annotation.errorCount = annotation.errors.length
      }
    }

    const result = { removedErrors, removedResults, cleanedAnnotations }
    this.emit('cleanupCompleted', result)
    return result
  }

  public clearAllErrors(): void {
    const errorCount = this.errors.size
    const resultCount = this.partialResults.size
    const annotationCount = this.annotations.size

    this.errors.clear()
    this.partialResults.clear()
    this.annotations.clear()
    
    this.clearPersistedData()
    
    this.emit('allErrorsCleared', { errorCount, resultCount, annotationCount })
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private updateEntityAnnotation(
    entityId: string, 
    entityType: SubmissionError['level'], 
    error: SubmissionError
  ): void {
    let annotation = this.annotations.get(entityId)
    
    if (!annotation) {
      annotation = {
        entityId,
        entityType,
        errors: [],
        isRetryable: false,
        lastErrorAt: new Date(),
        errorCount: 0
      }
      this.annotations.set(entityId, annotation)
    }

    // Add or update error
    const existingIndex = annotation.errors.findIndex(e => e.id === error.id)
    if (existingIndex >= 0) {
      annotation.errors[existingIndex] = error
    } else {
      annotation.errors.push(error)
    }

    // Update annotation metadata
    annotation.errorCount = annotation.errors.length
    annotation.isRetryable = annotation.errors.some(e => e.retryable)
    annotation.lastErrorAt = new Date(Math.max(...annotation.errors.map(e => e.timestamp.getTime())))

    // Limit errors per entity
    if (annotation.errors.length > this.config.maxErrorsPerEntity) {
      annotation.errors = annotation.errors
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.config.maxErrorsPerEntity)
      annotation.errorCount = annotation.errors.length
    }
  }

  private async delayRetry(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============================================================================
  // Persistence Operations
  // ============================================================================

  private async loadPersistedErrors(): Promise<void> {
    try {
      const errorData = localStorage.getItem('globeco_error_states')
      if (errorData) {
        const parsed = JSON.parse(errorData)
        
        // Load errors
        if (parsed.errors) {
          for (const [id, errorData] of Object.entries(parsed.errors)) {
            const error = this.deserializeError(errorData as any)
            if (error) {
              this.errors.set(id, error)
            }
          }
        }

        // Load partial results
        if (parsed.partialResults) {
          for (const [id, resultData] of Object.entries(parsed.partialResults)) {
            const result = this.deserializePartialResult(resultData as any)
            if (result) {
              this.partialResults.set(id, result)
            }
          }
        }

        // Load annotations
        if (parsed.annotations) {
          for (const [id, annotationData] of Object.entries(parsed.annotations)) {
            const annotation = this.deserializeAnnotation(annotationData as any)
            if (annotation) {
              this.annotations.set(id, annotation)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted errors:', error)
    }
  }

  private persistError(error: SubmissionError): void {
    try {
      const currentData = this.loadPersistedData()
      currentData.errors[error.id] = this.serializeError(error)
      this.savePersistedData(currentData)
    } catch (error) {
      console.error('Failed to persist error:', error)
    }
  }

  private persistPartialResult(result: PartialSuccessResult): void {
    try {
      const currentData = this.loadPersistedData()
      currentData.partialResults[result.id] = this.serializePartialResult(result)
      this.savePersistedData(currentData)
    } catch (error) {
      console.error('Failed to persist partial result:', error)
    }
  }

  private removePersistedError(errorId: string): void {
    try {
      const currentData = this.loadPersistedData()
      delete currentData.errors[errorId]
      this.savePersistedData(currentData)
    } catch (error) {
      console.error('Failed to remove persisted error:', error)
    }
  }

  private removePersistedPartialResult(resultId: string): void {
    try {
      const currentData = this.loadPersistedData()
      delete currentData.partialResults[resultId]
      this.savePersistedData(currentData)
    } catch (error) {
      console.error('Failed to remove persisted partial result:', error)
    }
  }

  private clearPersistedData(): void {
    try {
      localStorage.removeItem('globeco_error_states')
    } catch (error) {
      console.error('Failed to clear persisted data:', error)
    }
  }

  private loadPersistedData(): any {
    try {
      const data = localStorage.getItem('globeco_error_states')
      return data ? JSON.parse(data) : { errors: {}, partialResults: {}, annotations: {} }
    } catch (error) {
      return { errors: {}, partialResults: {}, annotations: {} }
    }
  }

  private savePersistedData(data: any): void {
    try {
      localStorage.setItem('globeco_error_states', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save persisted data:', error)
    }
  }

  // ============================================================================
  // Serialization Helpers
  // ============================================================================

  private serializeError(error: SubmissionError): any {
    return {
      ...error,
      timestamp: error.timestamp.toISOString(),
      lastRetryAt: error.lastRetryAt?.toISOString()
    }
  }

  private deserializeError(data: any): SubmissionError | null {
    try {
      return {
        ...data,
        timestamp: new Date(data.timestamp),
        lastRetryAt: data.lastRetryAt ? new Date(data.lastRetryAt) : undefined
      }
    } catch (error) {
      return null
    }
  }

  private serializePartialResult(result: PartialSuccessResult): any {
    return {
      ...result,
      timestamp: result.timestamp.toISOString(),
      errors: result.errors.map(error => this.serializeError(error))
    }
  }

  private deserializePartialResult(data: any): PartialSuccessResult | null {
    try {
      return {
        ...data,
        timestamp: new Date(data.timestamp),
        errors: data.errors.map((errorData: any) => this.deserializeError(errorData)).filter(Boolean)
      }
    } catch (error) {
      return null
    }
  }

  private serializeAnnotation(annotation: ErrorAnnotation): any {
    return {
      ...annotation,
      lastErrorAt: annotation.lastErrorAt.toISOString(),
      errors: annotation.errors.map(error => this.serializeError(error))
    }
  }

  private deserializeAnnotation(data: any): ErrorAnnotation | null {
    try {
      return {
        ...data,
        lastErrorAt: new Date(data.lastErrorAt),
        errors: data.errors.map((errorData: any) => this.deserializeError(errorData)).filter(Boolean)
      }
    } catch (error) {
      return null
    }
  }
}

// ============================================================================
// Singleton Instance and Factory
// ============================================================================

let errorStateServiceInstance: ErrorStateService | null = null

export function getErrorStateService(config?: Partial<ErrorCleanupConfig>): ErrorStateService {
  if (!errorStateServiceInstance) {
    errorStateServiceInstance = new ErrorStateService(config)
  }
  return errorStateServiceInstance
}

export function resetErrorStateService(): void {
  if (errorStateServiceInstance) {
    errorStateServiceInstance.destroy()
    errorStateServiceInstance = null
  }
}

// ============================================================================
// Exports
// ============================================================================

export default ErrorStateService 