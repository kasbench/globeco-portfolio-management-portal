// Types for Order Service Integration

// Order Service API Types (from OpenAPI spec)
export interface OrderPostDTO {
  blotterId: number // Must exist in database, nullable
  statusId: number // Must exist in database  
  portfolioId: string // String, maximum 24 characters
  orderTypeId: number // Must exist in database (1=BUY, 2=SELL)
  securityId: string // String identifier
  quantity: number // Positive decimal number
  limitPrice?: number | null // Optional positive decimal number
  tradeOrderId?: number | null // Optional trade order ID
  orderTimestamp: string // ISO 8601 format (e.g., "2024-06-01T12:00:00Z")
  version: number // Integer version number
}

export interface OrderWithDetailsDTO {
  id: number
  blotter: {
    id: number
    name: string
    version: number
  }
  status: {
    id: number
    abbreviation: string
    description: string
    version: number
  }
  portfolioId: string
  orderType: {
    id: number
    abbreviation: string
    description: string
    version: number
  }
  securityId: string
  quantity: number
  limitPrice?: number | null
  tradeOrderId?: number | null
  orderTimestamp: string
  version: number
}

/**
 * Individual order result from Order Service response
 */
export interface OrderResultDTO {
  orderId?: number
  blotterId: number
  statusId: number
  portfolioId: string
  orderTypeId: number
  securityId: string
  quantity: number
  limitPrice?: number | null
  tradeOrderId?: number | null
  orderTimestamp: string
  version: number
  message?: string
  errorCode?: string
}

export interface OrderListResponseDTO {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILURE'
  message: string
  totalReceived: number
  successful: number
  failed: number
  orders: OrderResultDTO[]
}

// Submission State Management Types
export enum SubmissionState {
  Idle = 'idle',
  Submitting = 'submitting', 
  Submitted = 'submitted',
  PartiallySubmitted = 'partially_submitted',
  Failed = 'failed'
}

export type SubmissionStatus = 'idle' | 'pending' | 'success' | 'failed' | 'partial'

export interface SubmissionStateInfo {
  state: SubmissionState
  submittedAt?: string
  completedAt?: string
  error?: string
  submittedOrderIds?: number[]
  failedOrderCount?: number
}

// Order submission result type for API operations
export interface OrderSubmissionResult {
  totalOrders: number
  successfulOrders: number
  failedOrders: number
  errors: string[]
  submittedOrderIds: number[]
  failedPositions: any[] // Type can be more specific if needed
}

// Eligibility checking types
export interface OrderEligibilityResult {
  isEligible: boolean
  reasons: string[]
  warnings?: string[]
}

// Note: RebalancePositionWithSubmission, RebalancePortfolioWithSubmission, 
// and RebalanceWithSubmission types have been moved to src/types/rebalance.ts 
// to avoid circular dependencies and maintain better organization.

// Batch operation types
export interface BatchSubmissionRequest {
  type: 'global' | 'rebalance' | 'portfolio'
  rebalanceIds?: string[]
  portfolioIds?: string[]
  batchSize?: number
}

export interface BatchSubmissionResult {
  request: {
    requestId: string
    type: 'batch_submit' | 'batch_delete' | 'batch_retry'
    rebalanceIds: string[]
    submittedAt: Date
  }
  overallStatus: SubmissionStatus
  results: {
    rebalanceId: string
    portfolioId?: string
    status: SubmissionStatus
    message?: string
    orderResults?: OrderResultDTO[]
  }[]
  totalProcessed: number
  totalSuccessful: number
  totalFailed: number
}

// Order mapping configuration
export interface OrderMappingConfig {
  defaultBlotterId: number
  defaultStatusId: number
  defaultVersion: number
  batchSize: number
  orderTypeMapping: {
    BUY: number
    SELL: number
  }
}

// Validation result types
export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface PositionValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface OrderValidationResult {
  isValid: boolean
  errors: ValidationError[]
  order?: OrderPostDTO
}

// Retry mechanism types
export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
  retryableErrorCodes: number[]
}

export interface RetryState {
  attemptCount: number
  lastAttemptAt?: string
  nextRetryAt?: string
  canRetry: boolean
}

/**
 * Order batch information for processing optimization
 */
export interface OrderBatchInfo {
  batchIndex: number
  orderCount: number
  portfolioIds: string[]
  estimatedSizeKB: number
  estimatedProcessingTimeMs: number
}

/**
 * Comprehensive order submission preview
 */
export interface OrderSubmissionPreview {
  rebalanceId: string
  submissionRequestId: string
  orderCount: number
  portfolioCount: number
  summary: {
    totalPositions: number
    eligiblePositions: number
    buyOrders: number
    sellOrders: number
    totalQuantity: number
    portfoliosAffected: string[]
    estimatedBatches: number
  }
  rebalanceSummary: {
    rebalanceId: string
    totalPortfolios: number
    portfoliosWithOrders: number
    totalEligiblePositions: number
    estimatedOrders: number
    buyOrders: number
    sellOrders: number
  }
  validation?: {
    isValid: boolean
    errors: { orderIndex: number, errors: OrderValidationError[] }[]
    batchErrors: string[]
  }
  batchDetails?: {
    batchCount: number
    averageBatchSize: number
    memoryEstimateKB: number
    estimatedDurationMs: number
  }
  timeline?: {
    submissionRequestId: string
    createdAt: Date
    estimatedCompletionTime: Date
    batchCount: number
    totalOrders: number
    estimatedDurationMs: number
  }
  warnings: string[]
  isReady: boolean
}

/**
 * Order validation error details
 */
export interface OrderValidationError {
  field: string
  message: string
  value: any
} 