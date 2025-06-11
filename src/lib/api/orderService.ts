import axios, { AxiosResponse, AxiosError } from 'axios'
import { 
  OrderPostDTO, 
  OrderListResponseDTO,
  OrderMappingConfig,
  RetryConfig,
  OrderSubmissionResult,
  SubmissionState 
} from '@/types/order'
import { 
  RebalancePositionWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalanceWithSubmission 
} from '@/types/rebalance'
import { mapPositionToOrder, validateOrderEligibility } from '@/lib/utils/orderMapping'
import { orderLogger } from '@/lib/utils/orderLogging'
import { 
  transformToSubmissionRebalance,
  markPositionsAsSubmitting,
  markPositionsAsSubmitted,
  markPositionsAsFailed,
  cleanupAfterSubmission 
} from '@/lib/utils/rebalanceTransform'

// Order Service configuration
const ORDER_SERVICE_HOST = process.env.NEXT_PUBLIC_ORDER_SERVICE_HOST || 'localhost'
const ORDER_SERVICE_PORT = process.env.NEXT_PUBLIC_ORDER_SERVICE_PORT || '8081'
const BASE_URL = `http://${ORDER_SERVICE_HOST}:${ORDER_SERVICE_PORT}`

// Configuration with environment variable overrides
export const getOrderServiceConfig = (): OrderMappingConfig & { 
  timeout: number
  retryConfig: RetryConfig 
} => ({
  defaultBlotterId: parseInt(process.env.NEXT_PUBLIC_ORDER_DEFAULT_BLOTTER_ID || '1', 10),
  defaultStatusId: parseInt(process.env.NEXT_PUBLIC_ORDER_DEFAULT_STATUS_ID || '1', 10),
  defaultVersion: 1,
  batchSize: parseInt(process.env.NEXT_PUBLIC_ORDER_BATCH_SIZE || '1000', 10),
  orderTypeMapping: {
    BUY: parseInt(process.env.NEXT_PUBLIC_ORDER_BUY_TYPE_ID || '2', 10),
    SELL: parseInt(process.env.NEXT_PUBLIC_ORDER_SELL_TYPE_ID || '3', 10),
  },
  timeout: parseInt(process.env.NEXT_PUBLIC_ORDER_SUBMISSION_TIMEOUT || '30000', 10),
  retryConfig: {
    maxRetries: parseInt(process.env.NEXT_PUBLIC_ORDER_RETRY_MAX_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_ORDER_RETRY_DELAY || '1000', 10),
    backoffMultiplier: parseInt(process.env.NEXT_PUBLIC_ORDER_RETRY_BACKOFF_MULTIPLIER || '2', 10),
    retryableErrorCodes: [408, 429, 500, 502, 503, 504] // Timeout, rate limit, server errors
  }
})

// Use singleton logger
const logger = orderLogger

// Create axios instance with configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: getOrderServiceConfig().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging and debugging
apiClient.interceptors.request.use(
  (config) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    config.metadata = { requestId }
    
    logger.logRequest({
      requestId,
      url: config.url || '',
      method: config.method?.toUpperCase() || 'UNKNOWN',
      orderCount: Array.isArray(config.data) ? config.data.length : 1,
      timestamp: new Date().toISOString()
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Order Service Request [${requestId}]: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers,
      })
    }
    return config
  },
  (error) => {
    console.error('Order Service Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for comprehensive error handling
apiClient.interceptors.response.use(
  (response) => {
    const requestId = response.config.metadata?.requestId || 'unknown'
    
    logger.logResponse({
      requestId,
      status: response.status,
      statusText: response.statusText,
      responseTime: Date.now(), // This would need to be calculated properly in a real implementation
      orderCount: Array.isArray(response.data) ? response.data.length : 1,
      timestamp: new Date().toISOString()
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Order Service Response [${requestId}]: ${response.status}`, {
        url: response.config.url,
        data: response.data,
      })
    }
    return response
  },
  (error: AxiosError) => {
    const enhancedError = enhanceError(error)
    const requestId = error.config?.metadata?.requestId || 'unknown'
    
    logger.logError({
      requestId,
      error: enhancedError.message,
      status: enhancedError.status,
      isRetryable: enhancedError.isRetryable || false,
      timestamp: new Date().toISOString()
    })
    
    console.error(`Order Service Response Error [${requestId}]:`, enhancedError)
    return Promise.reject(enhancedError)
  }
)

// Enhanced error processing
interface EnhancedError extends Error {
  status?: number
  statusText?: string
  url?: string
  method?: string
  data?: any
  isRetryable?: boolean
  requestId?: string
}

function enhanceError(error: AxiosError): EnhancedError {
  const enhanced: EnhancedError = new Error()
  const retryConfig = getOrderServiceConfig().retryConfig

  if (error.response) {
    // Server responded with error status
    enhanced.status = error.response.status
    enhanced.statusText = error.response.statusText
    enhanced.data = error.response.data
    enhanced.url = error.config?.url
    enhanced.method = error.config?.method
    enhanced.isRetryable = retryConfig.retryableErrorCodes.includes(error.response.status)
    
    // Generate user-friendly error message based on status code
    const errorData = error.response.data as any
    switch (error.response.status) {
      case 400:
        enhanced.message = errorData?.message 
          ? `Invalid order data: ${errorData.message}`
          : 'Invalid order data: Please check your order details'
        break
      case 413:
        enhanced.message = 'Order batch too large: Please reduce the number of orders per batch'
        break
      case 429:
        enhanced.message = 'Rate limit exceeded: Please wait before submitting more orders'
        break
      case 500:
        enhanced.message = 'Order Service internal error: Please try again later'
        break
      default:
        if (errorData?.message) {
          enhanced.message = `Order Service Error: ${errorData.message}`
        } else {
          enhanced.message = `Order Service Error: HTTP ${error.response.status} - ${error.response.statusText}`
        }
    }
  } else if (error.request) {
    // Request was made but no response received
    enhanced.message = `Network Error: Unable to connect to Order Service at ${BASE_URL}`
    enhanced.isRetryable = true
    enhanced.url = error.config?.url
    enhanced.method = error.config?.method
  } else {
    // Something else happened
    enhanced.message = `Configuration Error: ${error.message}`
    enhanced.isRetryable = false
  }

  // Add request ID for tracking
  enhanced.requestId = error.config?.metadata?.requestId || `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  return enhanced
}

// Retry mechanism for failed requests
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = getOrderServiceConfig().retryConfig.maxRetries,
  delay: number = getOrderServiceConfig().retryConfig.retryDelay,
  backoffMultiplier: number = getOrderServiceConfig().retryConfig.backoffMultiplier
): Promise<T> {
  let lastError: EnhancedError | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as EnhancedError
      
      // Don't retry if not retryable or on last attempt
      if (!lastError.isRetryable || attempt === maxRetries) {
        throw lastError
      }

      // Calculate delay for next attempt
      const nextDelay = delay * Math.pow(backoffMultiplier, attempt)
      console.warn(`Order Service request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${nextDelay}ms:`, lastError.message)
      
      await new Promise(resolve => setTimeout(resolve, nextDelay))
    }
  }

  throw lastError
}

// Order Service API functions
export const orderServiceApi = {
  /**
   * Submit a batch of orders to the Order Service
   * Handles up to 1000 orders per batch with comprehensive error handling
   */
  submitOrderBatch: async (orders: OrderPostDTO[]): Promise<OrderListResponseDTO> => {
    const config = getOrderServiceConfig()
    
    // Validate batch size
    if (orders.length === 0) {
      throw new Error('Cannot submit empty order batch')
    }
    
    if (orders.length > config.batchSize) {
      throw new Error(`Batch size ${orders.length} exceeds maximum allowed ${config.batchSize}`)
    }

    return retryRequest(async () => {
      const response: AxiosResponse<OrderListResponseDTO> = await apiClient.post('/api/v1/orders', orders)
      return response.data
    })
  },

  /**
   * Submit orders with automatic batching for large datasets
   * Splits large order sets into manageable batches
   */
  submitOrdersWithBatching: async (
    orders: OrderPostDTO[],
    onBatchProgress?: (batchIndex: number, totalBatches: number, result: OrderListResponseDTO) => void
  ): Promise<OrderListResponseDTO[]> => {
    const config = getOrderServiceConfig()
    const batches: OrderPostDTO[][] = []
    
    // Split into batches
    for (let i = 0; i < orders.length; i += config.batchSize) {
      batches.push(orders.slice(i, i + config.batchSize))
    }

    const results: OrderListResponseDTO[] = []
    
    // Process batches sequentially to avoid overwhelming the service
    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await orderServiceApi.submitOrderBatch(batches[i])
        results.push(result)
        
        // Call progress callback if provided
        if (onBatchProgress) {
          onBatchProgress(i + 1, batches.length, result)
        }
      } catch (error) {
        // Add batch information to error
        const enhancedError = error as EnhancedError
        enhancedError.message += ` (Batch ${i + 1}/${batches.length})`
        throw enhancedError
      }
    }

    return results
  },

  /**
   * Submit rebalance positions with integrated data transformation
   * Handles the complete workflow from rebalance positions to order submission
   */
  submitRebalancePositions: async (
    positions: RebalancePositionWithSubmission[],
    onProgress?: (progress: { submitted: number; failed: number; total: number }) => void
  ): Promise<OrderSubmissionResult> => {
    const result: OrderSubmissionResult = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      errors: [],
      submittedOrderIds: [],
      failedPositions: []
    }

    // Filter eligible positions
    const eligiblePositions = positions.filter(pos => {
      const eligibility = validateOrderEligibility(pos)
      if (!eligibility.isEligible) {
        result.errors.push(`Position ${pos.security_id} in portfolio ${pos.portfolio_id}: ${eligibility.reasons.join(', ')}`)
        return false
      }
      return true
    })

    result.totalOrders = eligiblePositions.length

    if (eligiblePositions.length === 0) {
      return result
    }

    try {
      // Transform positions to orders
      const orders = eligiblePositions.map(pos => mapPositionToOrder(pos))
      
      // Submit orders with batching
      const responses = await orderServiceApi.submitOrdersWithBatching(orders, (batchIndex, totalBatches, batchResult) => {
        // Update progress if callback provided
        if (onProgress) {
          const completed = batchIndex * getOrderServiceConfig().batchSize
          onProgress({
            submitted: Math.min(completed, result.totalOrders),
            failed: result.failedOrders,
            total: result.totalOrders
          })
        }
      })

      // Process responses
      for (const response of responses) {
        if (response.orders) {
          for (const order of response.orders) {
            if (order.orderId) {
              result.successfulOrders++
              result.submittedOrderIds.push(order.orderId)
            } else {
              result.failedOrders++
              result.errors.push(`Failed to create order: ${order.error || 'Unknown error'}`)
            }
          }
        }
      }

    } catch (error) {
      const enhancedError = error as EnhancedError
      result.errors.push(enhancedError.message)
      result.failedOrders = result.totalOrders - result.successfulOrders
    }

    return result
  },

  /**
   * Submit entire portfolio with state management
   */
  submitPortfolioOrders: async (
    portfolio: RebalancePortfolioWithSubmission,
    onProgress?: (progress: { submitted: number; failed: number; total: number }) => void
  ): Promise<{ portfolio: RebalancePortfolioWithSubmission; result: OrderSubmissionResult }> => {
    // Mark positions as submitting
    const updatedPortfolio = markPositionsAsSubmitting(portfolio)
    
    try {
      const result = await orderServiceApi.submitRebalancePositions(updatedPortfolio.positions, onProgress)
      
      // Update portfolio based on results
      const finalPortfolio = result.successfulOrders > 0 
        ? markPositionsAsSubmitted(updatedPortfolio, result.submittedOrderIds)
        : markPositionsAsFailed(updatedPortfolio, result.errors)

      return { portfolio: finalPortfolio, result }
    } catch (error) {
      const failedPortfolio = markPositionsAsFailed(updatedPortfolio, [(error as Error).message])
      throw { portfolio: failedPortfolio, error }
    }
  },

  /**
   * Submit entire rebalance with state management
   */
  submitRebalanceOrders: async (
    rebalance: RebalanceWithSubmission,
    onProgress?: (progress: { 
      currentPortfolio: number; 
      totalPortfolios: number; 
      submitted: number; 
      failed: number; 
      total: number 
    }) => void
  ): Promise<{ rebalance: RebalanceWithSubmission; result: OrderSubmissionResult }> => {
    const aggregatedResult: OrderSubmissionResult = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      errors: [],
      submittedOrderIds: [],
      failedPositions: []
    }

    const updatedPortfolios: RebalancePortfolioWithSubmission[] = []

    for (let i = 0; i < rebalance.portfolios.length; i++) {
      const portfolio = rebalance.portfolios[i]
      
      try {
        const { portfolio: updatedPortfolio, result } = await orderServiceApi.submitPortfolioOrders(
          portfolio,
          (portfolioProgress) => {
            if (onProgress) {
              onProgress({
                currentPortfolio: i + 1,
                totalPortfolios: rebalance.portfolios.length,
                submitted: aggregatedResult.successfulOrders + portfolioProgress.submitted,
                failed: aggregatedResult.failedOrders + portfolioProgress.failed,
                total: aggregatedResult.totalOrders + portfolioProgress.total
              })
            }
          }
        )

        updatedPortfolios.push(updatedPortfolio)
        
        // Aggregate results
        aggregatedResult.totalOrders += result.totalOrders
        aggregatedResult.successfulOrders += result.successfulOrders
        aggregatedResult.failedOrders += result.failedOrders
        aggregatedResult.errors.push(...result.errors)
        aggregatedResult.submittedOrderIds.push(...result.submittedOrderIds)
        aggregatedResult.failedPositions.push(...result.failedPositions)

      } catch (error) {
        const errorData = error as { portfolio: RebalancePortfolioWithSubmission; error: Error }
        updatedPortfolios.push(errorData.portfolio)
        aggregatedResult.errors.push(`Portfolio ${portfolio.portfolio_id}: ${errorData.error.message}`)
      }
    }

    const updatedRebalance: RebalanceWithSubmission = {
      ...rebalance,
      portfolios: updatedPortfolios,
      submissionState: {
        state: aggregatedResult.failedOrders === 0 ? SubmissionState.Submitted : 
               aggregatedResult.successfulOrders > 0 ? SubmissionState.PartiallySubmitted : 
               SubmissionState.Failed,
        submittedAt: aggregatedResult.successfulOrders > 0 ? new Date().toISOString() : undefined,
        error: aggregatedResult.errors.length > 0 ? aggregatedResult.errors.join('; ') : undefined
      }
    }

    return { rebalance: updatedRebalance, result: aggregatedResult }
  },

  /**
   * Health check for Order Service
   */
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    return retryRequest(async () => {
      const response = await apiClient.get('/health')
      return response.data
    })
  },

  /**
   * Get service configuration for debugging
   */
  getConfiguration: () => getOrderServiceConfig(),

  /**
   * Get detailed logging statistics
   */
  getLoggingStats: () => logger.getStatistics(),

  /**
   * Clear logging history (useful for testing)
   */
  clearLogs: () => logger.clearLogs(),
}

// Export configuration for use in other modules
export { getOrderServiceConfig as getConfig }
export default orderServiceApi 