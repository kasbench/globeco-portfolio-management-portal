// Comprehensive Response Processing Service for Order Service Integration
// Handles response parsing, success/failure tracking, retry logic, and audit logging

import { AxiosResponse, AxiosError } from 'axios'
import { 
  OrderPostDTO, 
  OrderListResponseDTO,
  OrderResultDTO,
  SubmissionState,
  RetryConfig,
  OrderSubmissionResult
} from '@/types/order'
import { 
  RebalancePositionWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalanceWithSubmission 
} from '@/types/rebalance'
import { orderLogger } from '@/lib/utils/orderLogging'

/**
 * Individual order processing result
 */
export interface OrderProcessingResult {
  orderId?: number
  securityId: string
  portfolioId: string
  status: 'success' | 'failed' | 'skipped'
  message?: string
  errorCode?: string
  isRetryable: boolean
  submittedAt?: Date
  retryCount: number
  originalOrder: OrderPostDTO
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  batchIndex: number
  totalOrders: number
  successfulOrders: OrderProcessingResult[]
  failedOrders: OrderProcessingResult[]
  skippedOrders: OrderProcessingResult[]
  batchStatus: 'complete' | 'partial' | 'failed'
  processingTimeMs: number
  submissionRequestId: string
  isRetryable: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Complete submission processing result
 */
export interface SubmissionProcessingResult {
  submissionRequestId: string
  totalBatches: number
  totalOrders: number
  successfulOrders: number
  failedOrders: number
  skippedOrders: number
  overallStatus: 'success' | 'partial' | 'failed'
  batchResults: BatchProcessingResult[]
  processingTimeMs: number
  finalState: SubmissionState
  retryRecommendations: RetryRecommendation[]
  auditTrail: SubmissionAuditEntry[]
}

/**
 * Retry recommendation
 */
export interface RetryRecommendation {
  type: 'immediate' | 'delayed' | 'manual' | 'none'
  reason: string
  delayMs?: number
  orders: OrderPostDTO[]
  expectedSuccessRate: number
}

/**
 * Audit trail entry
 */
export interface SubmissionAuditEntry {
  timestamp: Date
  requestId: string
  action: 'batch_start' | 'batch_complete' | 'order_success' | 'order_fail' | 'retry_attempt' | 'final_result'
  details: Record<string, any>
  orderCount?: number
  batchIndex?: number
}

/**
 * Response Processing Service Class
 * Handles all aspects of Order Service response processing
 */
export class ResponseProcessingService {
  private logger = orderLogger
  private retryConfig: RetryConfig

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      retryableErrorCodes: [408, 429, 500, 502, 503, 504],
      ...retryConfig
    }
  }

  /**
   * Parse Order Service response for different scenarios
   */
  parseOrderServiceResponse(
    response: AxiosResponse<OrderListResponseDTO>,
    originalOrders: OrderPostDTO[],
    batchIndex: number,
    submissionRequestId: string
  ): BatchProcessingResult {
    const startTime = Date.now()
    const auditEntry: SubmissionAuditEntry = {
      timestamp: new Date(),
      requestId: submissionRequestId,
      action: 'batch_start',
      details: { batchIndex, orderCount: originalOrders.length },
      orderCount: originalOrders.length,
      batchIndex
    }

    this.logger.logAuditEntry(auditEntry)

    const result: BatchProcessingResult = {
      batchIndex,
      totalOrders: originalOrders.length,
      successfulOrders: [],
      failedOrders: [],
      skippedOrders: [],
      batchStatus: 'complete',
      processingTimeMs: 0,
      submissionRequestId,
      isRetryable: false,
      errors: [],
      warnings: []
    }

    try {
      switch (response.status) {
        case 200:
          // Complete success
          result.successfulOrders = this.processCompleteSuccess(response.data, originalOrders)
          result.batchStatus = 'complete'
          break

        case 207:
          // Partial success (Multi-Status)
          const partialResult = this.processPartialSuccess(response.data, originalOrders)
          result.successfulOrders = partialResult.successful
          result.failedOrders = partialResult.failed
          result.batchStatus = partialResult.successful.length > 0 ? 'partial' : 'failed'
          result.isRetryable = partialResult.failed.some(order => order.isRetryable)
          break

        default:
          // Unexpected success status
          result.warnings.push(`Unexpected success status: ${response.status}`)
          result.successfulOrders = this.processCompleteSuccess(response.data, originalOrders)
      }
    } catch (error) {
      result.errors.push(`Response parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.failedOrders = originalOrders.map(order => this.createFailedOrderResult(
        order, 
        'Response parsing failed', 
        'PARSE_ERROR',
        false,
        0
      ))
      result.batchStatus = 'failed'
    }

    result.processingTimeMs = Date.now() - startTime
    
    // Log completion
    const completionAuditEntry: SubmissionAuditEntry = {
      timestamp: new Date(),
      requestId: submissionRequestId,
      action: 'batch_complete',
      details: {
        batchIndex,
        batchStatus: result.batchStatus,
        successCount: result.successfulOrders.length,
        failCount: result.failedOrders.length,
        processingTimeMs: result.processingTimeMs
      },
      orderCount: originalOrders.length,
      batchIndex
    }

    this.logger.logAuditEntry(completionAuditEntry)

    return result
  }

  /**
   * Parse error responses (400, 413, 429, 500, etc.)
   */
  parseErrorResponse(
    error: AxiosError,
    originalOrders: OrderPostDTO[],
    batchIndex: number,
    submissionRequestId: string
  ): BatchProcessingResult {
    const startTime = Date.now()
    
    const result: BatchProcessingResult = {
      batchIndex,
      totalOrders: originalOrders.length,
      successfulOrders: [],
      failedOrders: [],
      skippedOrders: [],
      batchStatus: 'failed',
      processingTimeMs: 0,
      submissionRequestId,
      isRetryable: false,
      errors: [],
      warnings: []
    }

    const status = error.response?.status || 0
    const errorData = error.response?.data as any

    // Determine if this error is retryable
    result.isRetryable = this.retryConfig.retryableErrorCodes.includes(status)

    // Parse specific error scenarios
    switch (status) {
      case 400:
        result.errors.push(`Bad Request: ${errorData?.message || 'Invalid order data'}`)
        result.failedOrders = this.processBadRequestError(errorData, originalOrders)
        break

      case 413:
        result.errors.push(`Payload Too Large: Batch size ${originalOrders.length} exceeds server limit`)
        result.failedOrders = originalOrders.map(order => this.createFailedOrderResult(
          order,
          'Batch size too large',
          'BATCH_TOO_LARGE',
          false, // Not retryable as individual orders
          0
        ))
        break

      case 429:
        result.errors.push('Rate Limit Exceeded: Too many requests to Order Service')
        result.failedOrders = originalOrders.map(order => this.createFailedOrderResult(
          order,
          'Rate limit exceeded',
          'RATE_LIMITED',
          result.isRetryable, // Use the config-determined retryable status
          0
        ))
        break

      case 500:
      case 502:
      case 503:
      case 504:
        result.errors.push(`Server Error: ${errorData?.message || 'Internal server error'}`)
        result.failedOrders = originalOrders.map(order => this.createFailedOrderResult(
          order,
          `Server error: ${status}`,
          'SERVER_ERROR',
          result.isRetryable, // Use the config-determined retryable status
          0
        ))
        break

      default:
        if (error.request && !error.response) {
          result.errors.push('Network Error: Unable to connect to Order Service')
          result.failedOrders = originalOrders.map(order => this.createFailedOrderResult(
            order,
            'Network error',
            'NETWORK_ERROR',
            true, // Network errors are generally retryable regardless of config
            0
          ))
          result.isRetryable = true // Network errors are generally retryable
        } else {
          result.errors.push(`Unknown Error: ${error.message}`)
          result.failedOrders = originalOrders.map(order => this.createFailedOrderResult(
            order,
            error.message,
            'UNKNOWN_ERROR',
            false,
            0
          ))
        }
    }

    result.processingTimeMs = Date.now() - startTime

    // Log error details
    const errorAuditEntry: SubmissionAuditEntry = {
      timestamp: new Date(),
      requestId: submissionRequestId,
      action: 'batch_complete',
      details: {
        batchIndex,
        error: error.message,
        status,
        isRetryable: result.isRetryable,
        orderCount: originalOrders.length
      },
      orderCount: originalOrders.length,
      batchIndex
    }

    this.logger.logAuditEntry(errorAuditEntry)

    return result
  }

  /**
   * Track individual order success/failure across multiple batches
   */
  trackOrderResults(batchResults: BatchProcessingResult[]): Map<string, OrderProcessingResult> {
    const orderTracking = new Map<string, OrderProcessingResult>()

    for (const batch of batchResults) {
      // Track successful orders
      for (const order of batch.successfulOrders) {
        const key = `${order.portfolioId}-${order.securityId}`
        orderTracking.set(key, order)
        
        // Log individual success
        const auditEntry: SubmissionAuditEntry = {
          timestamp: new Date(),
          requestId: batch.submissionRequestId,
          action: 'order_success',
          details: {
            orderId: order.orderId,
            securityId: order.securityId,
            portfolioId: order.portfolioId,
            batchIndex: batch.batchIndex
          },
          batchIndex: batch.batchIndex
        }
        this.logger.logAuditEntry(auditEntry)
      }

      // Track failed orders
      for (const order of batch.failedOrders) {
        const key = `${order.portfolioId}-${order.securityId}`
        orderTracking.set(key, order)
        
        // Log individual failure
        const auditEntry: SubmissionAuditEntry = {
          timestamp: new Date(),
          requestId: batch.submissionRequestId,
          action: 'order_fail',
          details: {
            securityId: order.securityId,
            portfolioId: order.portfolioId,
            errorCode: order.errorCode,
            message: order.message,
            isRetryable: order.isRetryable,
            batchIndex: batch.batchIndex
          },
          batchIndex: batch.batchIndex
        }
        this.logger.logAuditEntry(auditEntry)
      }

      // Track skipped orders
      for (const order of batch.skippedOrders) {
        const key = `${order.portfolioId}-${order.securityId}`
        orderTracking.set(key, order)
      }
    }

    return orderTracking
  }

  /**
   * Generate retry recommendations based on failed orders
   */
  generateRetryRecommendations(
    batchResults: BatchProcessingResult[]
  ): RetryRecommendation[] {
    const recommendations: RetryRecommendation[] = []
    
    // Group failed orders by error type
    const errorGroups = new Map<string, OrderProcessingResult[]>()
    
    for (const batch of batchResults) {
      for (const failedOrder of batch.failedOrders) {
        const errorKey = failedOrder.errorCode || 'UNKNOWN'
        if (!errorGroups.has(errorKey)) {
          errorGroups.set(errorKey, [])
        }
        errorGroups.get(errorKey)!.push(failedOrder)
      }
    }

    // Generate recommendations for each error type
    for (const [errorCode, orders] of errorGroups.entries()) {
      const recommendation = this.createRetryRecommendation(errorCode, orders)
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }

    return recommendations
  }

  /**
   * Process complete submission results and generate comprehensive audit trail
   */
  processSubmissionResults(
    batchResults: BatchProcessingResult[],
    submissionRequestId: string,
    totalProcessingTimeMs: number
  ): SubmissionProcessingResult {
    const orderTracking = this.trackOrderResults(batchResults)
    const retryRecommendations = this.generateRetryRecommendations(batchResults)
    
    const totalOrders = batchResults.reduce((sum, batch) => sum + batch.totalOrders, 0)
    const successfulOrders = batchResults.reduce((sum, batch) => sum + batch.successfulOrders.length, 0)
    const failedOrders = batchResults.reduce((sum, batch) => sum + batch.failedOrders.length, 0)
    const skippedOrders = batchResults.reduce((sum, batch) => sum + batch.skippedOrders.length, 0)

    // Determine overall status
    let overallStatus: 'success' | 'partial' | 'failed'
    let finalState: SubmissionState

    if (successfulOrders === totalOrders) {
      overallStatus = 'success'
      finalState = SubmissionState.Submitted
    } else if (successfulOrders > 0) {
      overallStatus = 'partial'
      finalState = SubmissionState.PartiallySubmitted
    } else {
      overallStatus = 'failed'
      finalState = SubmissionState.Failed
    }

    // Generate complete audit trail
    const auditTrail: SubmissionAuditEntry[] = []
    
    // Add batch audit entries
    for (const batch of batchResults) {
      auditTrail.push({
        timestamp: new Date(),
        requestId: submissionRequestId,
        action: 'batch_complete',
        details: {
          batchIndex: batch.batchIndex,
          batchStatus: batch.batchStatus,
          successCount: batch.successfulOrders.length,
          failCount: batch.failedOrders.length,
          processingTimeMs: batch.processingTimeMs,
          errors: batch.errors,
          warnings: batch.warnings
        },
        orderCount: batch.totalOrders,
        batchIndex: batch.batchIndex
      })
    }

    // Add final result audit entry
    auditTrail.push({
      timestamp: new Date(),
      requestId: submissionRequestId,
      action: 'final_result',
      details: {
        overallStatus,
        finalState,
        totalOrders,
        successfulOrders,
        failedOrders,
        skippedOrders,
        totalProcessingTimeMs,
        retryRecommendationCount: retryRecommendations.length
      },
      orderCount: totalOrders
    })

    const result: SubmissionProcessingResult = {
      submissionRequestId,
      totalBatches: batchResults.length,
      totalOrders,
      successfulOrders,
      failedOrders,
      skippedOrders,
      overallStatus,
      batchResults,
      processingTimeMs: totalProcessingTimeMs,
      finalState,
      retryRecommendations,
      auditTrail
    }

    // Log final result
    this.logger.logSubmissionResult(result)

    return result
  }

  // Private helper methods

  private processCompleteSuccess(
    responseData: OrderListResponseDTO,
    originalOrders: OrderPostDTO[]
  ): OrderProcessingResult[] {
    const results: OrderProcessingResult[] = []
    
    if (responseData.orders && Array.isArray(responseData.orders)) {
      for (let i = 0; i < originalOrders.length; i++) {
        const originalOrder = originalOrders[i]
        const responseOrder = responseData.orders[i]
        
        results.push({
          orderId: responseOrder?.orderId,
          securityId: originalOrder.securityId,
          portfolioId: originalOrder.portfolioId,
          status: 'success',
          message: 'Order successfully submitted',
          isRetryable: false,
          submittedAt: new Date(),
          retryCount: 0,
          originalOrder
        })
      }
    } else {
      // Fallback if response structure is different
      for (const order of originalOrders) {
        results.push({
          securityId: order.securityId,
          portfolioId: order.portfolioId,
          status: 'success',
          message: 'Order successfully submitted (batch)',
          isRetryable: false,
          submittedAt: new Date(),
          retryCount: 0,
          originalOrder: order
        })
      }
    }
    
    return results
  }

  private processPartialSuccess(
    responseData: OrderListResponseDTO,
    originalOrders: OrderPostDTO[]
  ): { successful: OrderProcessingResult[], failed: OrderProcessingResult[] } {
    const successful: OrderProcessingResult[] = []
    const failed: OrderProcessingResult[] = []
    
    if (responseData.orders && Array.isArray(responseData.orders)) {
      for (let i = 0; i < originalOrders.length; i++) {
        const originalOrder = originalOrders[i]
        const responseOrder = responseData.orders[i]
        
        if (responseOrder && responseOrder.orderId) {
          successful.push({
            orderId: responseOrder.orderId,
            securityId: originalOrder.securityId,
            portfolioId: originalOrder.portfolioId,
            status: 'success',
            message: 'Order successfully submitted',
            isRetryable: false,
            submittedAt: new Date(),
            retryCount: 0,
            originalOrder
          })
        } else {
          failed.push(this.createFailedOrderResult(
            originalOrder,
            responseOrder?.message || 'Order submission failed',
            responseOrder?.errorCode || 'SUBMISSION_FAILED',
            true,
            0
          ))
        }
      }
    }
    
    return { successful, failed }
  }

  private processBadRequestError(
    errorData: any,
    originalOrders: OrderPostDTO[]
  ): OrderProcessingResult[] {
    const results: OrderProcessingResult[] = []
    
    if (errorData && errorData.errors && Array.isArray(errorData.errors)) {
      // Process individual order errors
      for (let i = 0; i < originalOrders.length; i++) {
        const order = originalOrders[i]
        const orderError = errorData.errors[i]
        
        results.push(this.createFailedOrderResult(
          order,
          orderError?.message || 'Invalid order data',
          orderError?.code || 'VALIDATION_ERROR',
          false, // Validation errors typically not retryable
          0
        ))
      }
    } else {
      // Generic bad request error for all orders
      for (const order of originalOrders) {
        results.push(this.createFailedOrderResult(
          order,
          errorData?.message || 'Invalid order data',
          'VALIDATION_ERROR',
          false,
          0
        ))
      }
    }
    
    return results
  }

  private createFailedOrderResult(
    order: OrderPostDTO,
    message: string,
    errorCode: string,
    isRetryable: boolean,
    retryCount: number
  ): OrderProcessingResult {
    return {
      securityId: order.securityId,
      portfolioId: order.portfolioId,
      status: 'failed',
      message,
      errorCode,
      isRetryable,
      retryCount,
      originalOrder: order
    }
  }

  private createRetryRecommendation(
    errorCode: string,
    orders: OrderProcessingResult[]
  ): RetryRecommendation | null {
    const retryableOrders = orders.filter(o => o.isRetryable)
    
    if (retryableOrders.length === 0) {
      return null
    }

    switch (errorCode) {
      case 'RATE_LIMITED':
        return {
          type: 'delayed',
          reason: 'Rate limit exceeded, retry after delay',
          delayMs: 5000, // 5 seconds
          orders: retryableOrders.map(o => o.originalOrder),
          expectedSuccessRate: 0.9
        }

      case 'SERVER_ERROR':
        return {
          type: 'delayed',
          reason: 'Server error, retry after brief delay',
          delayMs: 2000, // 2 seconds
          orders: retryableOrders.map(o => o.originalOrder),
          expectedSuccessRate: 0.7
        }

      case 'NETWORK_ERROR':
        return {
          type: 'immediate',
          reason: 'Network error, retry immediately',
          orders: retryableOrders.map(o => o.originalOrder),
          expectedSuccessRate: 0.8
        }

      case 'BATCH_TOO_LARGE':
        return {
          type: 'manual',
          reason: 'Batch size too large, split into smaller batches',
          orders: retryableOrders.map(o => o.originalOrder),
          expectedSuccessRate: 0.95
        }

      default:
        if (retryableOrders.length > orders.length * 0.8) {
          return {
            type: 'delayed',
            reason: 'Multiple order failures, retry after delay',
            delayMs: 3000,
            orders: retryableOrders.map(o => o.originalOrder),
            expectedSuccessRate: 0.6
          }
        }
        return null
    }
  }
}

/**
 * Default response processing service instance
 */
export const responseProcessingService = new ResponseProcessingService()

/**
 * Quick utility functions using default service instance
 */
export const quickParseResponse = (
  response: AxiosResponse<OrderListResponseDTO>,
  originalOrders: OrderPostDTO[],
  batchIndex: number,
  submissionRequestId: string
) => responseProcessingService.parseOrderServiceResponse(response, originalOrders, batchIndex, submissionRequestId)

export const quickParseError = (
  error: AxiosError,
  originalOrders: OrderPostDTO[],
  batchIndex: number,
  submissionRequestId: string
) => responseProcessingService.parseErrorResponse(error, originalOrders, batchIndex, submissionRequestId)

export const quickProcessResults = (
  batchResults: BatchProcessingResult[],
  submissionRequestId: string,
  totalProcessingTimeMs: number
) => responseProcessingService.processSubmissionResults(batchResults, submissionRequestId, totalProcessingTimeMs) 