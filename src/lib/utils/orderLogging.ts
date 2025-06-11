// Logging infrastructure for order submission operations

import { 
  OrderPostDTO, 
  OrderListResponseDTO, 
  OrderResultDTO,
  SubmissionState,
  BatchSubmissionResult
} from '@/types/order'

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Log entry interface
export interface OrderLogEntry {
  timestamp: string
  level: LogLevel
  operation: string
  requestId?: string
  portfolioId?: string
  rebalanceId?: string
  message: string
  data?: any
  error?: any
  duration?: number
}

// Logger class for order operations
class OrderLogger {
  private logs: OrderLogEntry[] = []
  private maxLogs: number = 1000 // Keep last 1000 log entries

  /**
   * Add a log entry
   */
  private log(level: LogLevel, operation: string, message: string, data?: any, error?: any): void {
    const entry: OrderLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      data,
      error,
      ...data // Spread any additional fields like requestId, portfolioId, etc.
    }

    this.logs.push(entry)

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === LogLevel.ERROR ? 'error' : 
                           level === LogLevel.WARN ? 'warn' : 
                           level === LogLevel.DEBUG ? 'debug' : 'log'
      
      console[consoleMethod](`[OrderLogger] ${operation}: ${message}`, { entry })
    }
  }

  /**
   * Log order submission start
   */
  logSubmissionStart(
    operation: string,
    orders: OrderPostDTO[],
    requestId: string,
    portfolioId?: string,
    rebalanceId?: string
  ): void {
    this.log(LogLevel.INFO, operation, 'Order submission started', {
      requestId,
      portfolioId,
      rebalanceId,
      orderCount: orders.length,
      orderTypes: this.summarizeOrderTypes(orders)
    })
  }

  /**
   * Log order submission success
   */
  logSubmissionSuccess(
    operation: string,
    result: OrderListResponseDTO,
    requestId: string,
    duration: number,
    portfolioId?: string,
    rebalanceId?: string
  ): void {
    this.log(LogLevel.INFO, operation, 'Order submission completed successfully', {
      requestId,
      portfolioId,
      rebalanceId,
      duration,
      totalReceived: result.totalReceived,
      successful: result.successful,
      failed: result.failed,
      status: result.status
    })
  }

  /**
   * Log order submission failure
   */
  logSubmissionFailure(
    operation: string,
    error: any,
    requestId: string,
    duration: number,
    portfolioId?: string,
    rebalanceId?: string
  ): void {
    this.log(LogLevel.ERROR, operation, 'Order submission failed', {
      requestId,
      portfolioId,
      rebalanceId,
      duration,
      errorMessage: error.message,
      errorStatus: error.status,
      isRetryable: error.isRetryable
    }, error)
  }

  /**
   * Log batch processing progress
   */
  logBatchProgress(
    operation: string,
    batchIndex: number,
    totalBatches: number,
    result: OrderListResponseDTO,
    requestId: string
  ): void {
    this.log(LogLevel.INFO, operation, `Batch ${batchIndex}/${totalBatches} completed`, {
      requestId,
      batchIndex,
      totalBatches,
      batchStatus: result.status,
      batchSuccessful: result.successful,
      batchFailed: result.failed
    })
  }

  /**
   * Log retry attempt
   */
  logRetryAttempt(
    operation: string,
    attempt: number,
    maxAttempts: number,
    error: any,
    requestId: string,
    delay: number
  ): void {
    this.log(LogLevel.WARN, operation, `Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
      requestId,
      attempt,
      maxAttempts,
      delay,
      errorMessage: error.message,
      errorStatus: error.status
    })
  }

  /**
   * Log data cleanup operations
   */
  logDataCleanup(
    operation: string,
    cleanupType: 'position' | 'portfolio' | 'rebalance',
    itemId: string,
    reason: string,
    requestId?: string
  ): void {
    this.log(LogLevel.INFO, operation, `Data cleanup: ${cleanupType} removed`, {
      requestId,
      cleanupType,
      itemId,
      reason
    })
  }

  /**
   * Log audit entry for response processing service
   */
  logAuditEntry(auditEntry: any): void {
    this.log(LogLevel.INFO, 'audit', `Audit: ${auditEntry.action}`, {
      requestId: auditEntry.requestId,
      auditAction: auditEntry.action,
      batchIndex: auditEntry.batchIndex,
      orderCount: auditEntry.orderCount,
      auditDetails: auditEntry.details,
      auditTimestamp: auditEntry.timestamp
    })
  }

  /**
   * Log submission result for response processing service
   */
  logSubmissionResult(submissionResult: any): void {
    this.log(LogLevel.INFO, 'submission_result', 'Complete submission processing result', {
      requestId: submissionResult.submissionRequestId,
      overallStatus: submissionResult.overallStatus,
      totalOrders: submissionResult.totalOrders,
      successfulOrders: submissionResult.successfulOrders,
      failedOrders: submissionResult.failedOrders,
      totalBatches: submissionResult.totalBatches,
      processingTimeMs: submissionResult.processingTimeMs,
      finalState: submissionResult.finalState,
      retryRecommendationCount: submissionResult.retryRecommendations.length
    })
  }

  /**
   * Log API request details
   */
  logRequest(requestData: {
    requestId: string
    url: string
    method: string
    orderCount: number
    timestamp: string
  }): void {
    this.log(LogLevel.DEBUG, 'api_request', `${requestData.method} ${requestData.url}`, {
      requestId: requestData.requestId,
      method: requestData.method,
      url: requestData.url,
      orderCount: requestData.orderCount,
      apiTimestamp: requestData.timestamp
    })
  }

  /**
   * Log API response details
   */
  logResponse(responseData: {
    requestId: string
    status: number
    statusText: string
    responseTime: number
    orderCount: number
    timestamp: string
  }): void {
    this.log(LogLevel.DEBUG, 'api_response', `Response: ${responseData.status} ${responseData.statusText}`, {
      requestId: responseData.requestId,
      status: responseData.status,
      statusText: responseData.statusText,
      responseTime: responseData.responseTime,
      orderCount: responseData.orderCount,
      apiTimestamp: responseData.timestamp
    })
  }

  /**
   * Log API error details
   */
  logError(errorData: {
    requestId: string
    error: string
    status?: number
    isRetryable: boolean
    timestamp: string
  }): void {
    this.log(LogLevel.ERROR, 'api_error', `API Error: ${errorData.error}`, {
      requestId: errorData.requestId,
      errorMessage: errorData.error,
      status: errorData.status,
      isRetryable: errorData.isRetryable,
      apiTimestamp: errorData.timestamp
    })
  }

  /**
   * Log validation errors
   */
  logValidationError(
    operation: string,
    validationErrors: any[],
    requestId: string,
    portfolioId?: string
  ): void {
    this.log(LogLevel.ERROR, operation, 'Validation failed', {
      requestId,
      portfolioId,
      errorCount: validationErrors.length,
      errors: validationErrors
    })
  }

  /**
   * Get logs for debugging
   */
  getLogs(level?: LogLevel, operation?: string, limit?: number): OrderLogEntry[] {
    let filteredLogs = this.logs

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level)
    }

    if (operation) {
      filteredLogs = filteredLogs.filter(log => log.operation.includes(operation))
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit)
    }

    return filteredLogs
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): OrderLogEntry[] {
    return this.getLogs(LogLevel.ERROR, undefined, limit)
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    totalSubmissions: number
    averageSubmissionTime: number
    successRate: number
    mostCommonErrors: string[]
  } {
    const submissions = this.logs.filter(log => 
      log.operation.includes('submission') && 
      (log.level === LogLevel.INFO || log.level === LogLevel.ERROR)
    )

    const successfulSubmissions = submissions.filter(log => 
      log.message.includes('completed successfully')
    )

    const totalSubmissions = submissions.length / 2 // Start and end logs
    const successRate = totalSubmissions > 0 ? (successfulSubmissions.length / totalSubmissions) * 100 : 0

    const submissionsWithDuration = submissions.filter(log => log.duration !== undefined)
    const averageSubmissionTime = submissionsWithDuration.length > 0 
      ? submissionsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / submissionsWithDuration.length
      : 0

    const errors = this.logs.filter(log => log.level === LogLevel.ERROR)
    const errorMessages = errors.map(log => log.message)
    const errorCounts = errorMessages.reduce((acc, msg) => {
      acc[msg] = (acc[msg] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostCommonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([msg]) => msg)

    return {
      totalSubmissions: Math.floor(totalSubmissions),
      averageSubmissionTime: Math.round(averageSubmissionTime),
      successRate: Math.round(successRate * 100) / 100,
      mostCommonErrors
    }
  }

  /**
   * Helper method to summarize order types
   */
  private summarizeOrderTypes(orders: OrderPostDTO[]): Record<string, number> {
    return orders.reduce((acc, order) => {
      const type = order.orderTypeId === 2 ? 'BUY' : order.orderTypeId === 3 ? 'SELL' : 'OTHER'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

// Singleton logger instance
export const orderLogger = new OrderLogger()

// Convenience functions for common logging operations
export const logOrderSubmission = {
  start: (operation: string, orders: OrderPostDTO[], requestId: string, portfolioId?: string, rebalanceId?: string) =>
    orderLogger.logSubmissionStart(operation, orders, requestId, portfolioId, rebalanceId),

  success: (operation: string, result: OrderListResponseDTO, requestId: string, duration: number, portfolioId?: string, rebalanceId?: string) =>
    orderLogger.logSubmissionSuccess(operation, result, requestId, duration, portfolioId, rebalanceId),

  failure: (operation: string, error: any, requestId: string, duration: number, portfolioId?: string, rebalanceId?: string) =>
    orderLogger.logSubmissionFailure(operation, error, requestId, duration, portfolioId, rebalanceId),

  batchProgress: (operation: string, batchIndex: number, totalBatches: number, result: OrderListResponseDTO, requestId: string) =>
    orderLogger.logBatchProgress(operation, batchIndex, totalBatches, result, requestId),

  retry: (operation: string, attempt: number, maxAttempts: number, error: any, requestId: string, delay: number) =>
    orderLogger.logRetryAttempt(operation, attempt, maxAttempts, error, requestId, delay),

  cleanup: (operation: string, cleanupType: 'position' | 'portfolio' | 'rebalance', itemId: string, reason: string, requestId?: string) =>
    orderLogger.logDataCleanup(operation, cleanupType, itemId, reason, requestId),

  validation: (operation: string, validationErrors: any[], requestId: string, portfolioId?: string) =>
    orderLogger.logValidationError(operation, validationErrors, requestId, portfolioId)
}

export default orderLogger 