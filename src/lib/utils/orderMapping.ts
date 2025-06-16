// Order mapping utilities for converting rebalance positions to Order Service format

import { RebalancePosition, RebalancePositionWithSubmission } from '@/types/rebalance'
import { 
  OrderPostDTO, 
  OrderMappingConfig,
  OrderEligibilityResult
} from '@/types/order'
import { getOrderServiceConfig } from '@/lib/api/orderService'

// Default configuration for order mapping
export const DEFAULT_ORDER_MAPPING_CONFIG: OrderMappingConfig = {
  defaultBlotterId: 1, // Default blotter
  defaultStatusId: 1, // New status
  defaultVersion: 1,
  batchSize: 1000, // Maximum allowed by Order Service
  orderTypeMapping: {
    BUY: 1, // BUY order type ID
    SELL: 2, // SELL order type ID
  }
}

/**
 * Determines if a position is eligible for order submission
 * Criteria: transaction_type must be "BUY" or "SELL" AND trade_quantity must not equal zero
 */
export function isPositionEligibleForSubmission(position: RebalancePositionWithSubmission): boolean {
  return (
    (position.transaction_type === 'BUY' || position.transaction_type === 'SELL') &&
    position.trade_quantity !== 0
  )
}

/**
 * Validates order eligibility with detailed reasons (for API client integration)
 */
export function validateOrderEligibility(position: RebalancePositionWithSubmission): OrderEligibilityResult {
  const reasons: string[] = []
  const warnings: string[] = []

  // Check transaction type
  if (position.transaction_type !== 'BUY' && position.transaction_type !== 'SELL') {
    reasons.push(`Transaction type '${position.transaction_type}' is not eligible (must be BUY or SELL)`)
  }

  // Check trade quantity
  if (position.trade_quantity === 0) {
    reasons.push('Trade quantity is zero')
  }

  // Check for required fields
  if (!position.security_id) {
    reasons.push('Security ID is missing')
  }

  // Add warnings for potential issues
  if (position.trade_quantity < 0 && position.transaction_type === 'BUY') {
    warnings.push('Negative trade quantity with BUY transaction type')
  }

  if (position.trade_quantity > 0 && position.transaction_type === 'SELL') {
    warnings.push('Positive trade quantity with SELL transaction type (will be made absolute)')
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
    warnings
  }
}

/**
 * Maps a rebalance position to an Order Service order
 * Following the field mapping rules from requirement-3.md
 */
export function mapPositionToOrder(
  position: RebalancePositionWithSubmission,
  portfolioId?: string,
  config: OrderMappingConfig = DEFAULT_ORDER_MAPPING_CONFIG
): OrderPostDTO {
  // Get portfolio ID from position if not provided as parameter
  const finalPortfolioId = portfolioId || (position as any).portfolio_id

  // Validate position eligibility
  const eligibility = validateOrderEligibility(position)
  if (!eligibility.isEligible) {
    throw new Error(`Position ${position.security_id} is not eligible for submission: ${eligibility.reasons.join(', ')}`)
  }

  // Map transaction type to order type ID
  const orderTypeId = config.orderTypeMapping[position.transaction_type as keyof typeof config.orderTypeMapping]
  if (!orderTypeId) {
    throw new Error(`Invalid transaction type: ${position.transaction_type}. Only BUY and SELL positions are eligible for order submission.`)
  }

  // Generate current timestamp in ISO 8601 format with enhanced precision
  const orderTimestamp = generateOrderTimestamp()

  return {
    blotterId: config.defaultBlotterId,
    statusId: config.defaultStatusId,
    portfolioId: finalPortfolioId,
    orderTypeId: orderTypeId,
    securityId: position.security_id,
    quantity: Math.abs(position.trade_quantity), // Always positive
    limitPrice: null, // Market orders (no limit price)
    tradeOrderId: null,
    orderTimestamp: orderTimestamp,
    version: config.defaultVersion
  }
}

/**
 * Maps multiple positions from a portfolio to orders
 */
export function mapPortfolioPositionsToOrders(
  positions: RebalancePositionWithSubmission[],
  portfolioId: string,
  config: OrderMappingConfig = DEFAULT_ORDER_MAPPING_CONFIG
): OrderPostDTO[] {
  const eligiblePositions = positions.filter(isPositionEligibleForSubmission)
  
  return eligiblePositions.map(position => 
    mapPositionToOrder(position, portfolioId, config)
  )
}

/**
 * Counts eligible orders in a portfolio
 */
export function countEligibleOrders(positions: RebalancePositionWithSubmission[]): number {
  return positions.filter(isPositionEligibleForSubmission).length
}

/**
 * Splits orders into batches for processing
 * Respects the maximum batch size limit
 */
export function splitOrdersIntoBatches(
  orders: OrderPostDTO[],
  batchSize: number = DEFAULT_ORDER_MAPPING_CONFIG.batchSize
): OrderPostDTO[][] {
  const batches: OrderPostDTO[][] = []
  
  for (let i = 0; i < orders.length; i += batchSize) {
    batches.push(orders.slice(i, i + batchSize))
  }
  
  return batches
}

/**
 * Generates a summary of orders to be submitted
 */
export interface OrderSubmissionSummary {
  totalPositions: number
  eligiblePositions: number
  buyOrders: number
  sellOrders: number
  totalQuantity: number
  portfoliosAffected: string[]
  estimatedBatches: number
}

export function generateOrderSubmissionSummary(
  positions: RebalancePositionWithSubmission[],
  portfolioIds: string[],
  config: OrderMappingConfig = DEFAULT_ORDER_MAPPING_CONFIG
): OrderSubmissionSummary {
  const eligiblePositions = positions.filter(isPositionEligibleForSubmission)
  
  const buyOrders = eligiblePositions.filter(p => p.transaction_type === 'BUY').length
  const sellOrders = eligiblePositions.filter(p => p.transaction_type === 'SELL').length
  const totalQuantity = eligiblePositions.reduce((sum, p) => sum + Math.abs(p.trade_quantity), 0)
  
  return {
    totalPositions: positions.length,
    eligiblePositions: eligiblePositions.length,
    buyOrders,
    sellOrders,
    totalQuantity,
    portfoliosAffected: portfolioIds,
    estimatedBatches: Math.ceil(eligiblePositions.length / config.batchSize)
  }
}

/**
 * Enhanced order timestamp generation with timezone support
 */
export function generateOrderTimestamp(timezone?: string): string {
  const now = new Date()
  
  if (timezone) {
    try {
      // Convert to specified timezone and format properly
      return now.toLocaleString('sv-SE', { 
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(' ', 'T') + 'Z'
    } catch (error) {
      console.warn(`Invalid timezone ${timezone}, using UTC`)
    }
  }
  
  return now.toISOString()
}

/**
 * Validates order data before submission
 */
export interface OrderValidationError {
  field: string
  message: string
  value: any
}

export function validateOrder(order: OrderPostDTO): OrderValidationError[] {
  const errors: OrderValidationError[] = []

  // Required field validations
  if (!order.blotterId || order.blotterId <= 0) {
    errors.push({ field: 'blotterId', message: 'Blotter ID must be a positive integer', value: order.blotterId })
  }

  if (!order.statusId || order.statusId <= 0) {
    errors.push({ field: 'statusId', message: 'Status ID must be a positive integer', value: order.statusId })
  }

  if (!order.portfolioId || order.portfolioId.length === 0 || order.portfolioId.length > 24) {
    errors.push({ field: 'portfolioId', message: 'Portfolio ID must be 1-24 characters', value: order.portfolioId })
  }

  if (!order.orderTypeId || order.orderTypeId <= 0) {
    errors.push({ field: 'orderTypeId', message: 'Order type ID must be a positive integer', value: order.orderTypeId })
  }

  if (!order.securityId || order.securityId.length === 0) {
    errors.push({ field: 'securityId', message: 'Security ID is required', value: order.securityId })
  }

  if (!order.quantity || order.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be a positive number', value: order.quantity })
  }

  if (order.limitPrice !== null && order.limitPrice !== undefined && order.limitPrice <= 0) {
    errors.push({ field: 'limitPrice', message: 'Limit price must be positive if specified', value: order.limitPrice })
  }

  if (!order.orderTimestamp) {
    errors.push({ field: 'orderTimestamp', message: 'Order timestamp is required', value: order.orderTimestamp })
  } else {
    // Validate ISO 8601 format
    const timestamp = new Date(order.orderTimestamp)
    if (isNaN(timestamp.getTime())) {
      errors.push({ field: 'orderTimestamp', message: 'Order timestamp must be valid ISO 8601 format', value: order.orderTimestamp })
    }
  }

  if (!order.version || order.version <= 0) {
    errors.push({ field: 'version', message: 'Version must be a positive integer', value: order.version })
  }

  return errors
}

/**
 * Validates a batch of orders
 */
export function validateOrderBatch(orders: OrderPostDTO[]): {
  isValid: boolean
  errors: { orderIndex: number, errors: OrderValidationError[] }[]
  batchErrors: string[]
} {
  const errors: { orderIndex: number, errors: OrderValidationError[] }[] = []
  const batchErrors: string[] = []

  // Check batch size
  const maxBatchSize = DEFAULT_ORDER_MAPPING_CONFIG.batchSize
  if (orders.length > maxBatchSize) {
    batchErrors.push(`Batch size ${orders.length} exceeds maximum allowed ${maxBatchSize}`)
  }

  if (orders.length === 0) {
    batchErrors.push('Batch is empty')
  }

  // Validate individual orders
  orders.forEach((order, index) => {
    const orderErrors = validateOrder(order)
    if (orderErrors.length > 0) {
      errors.push({ orderIndex: index, errors: orderErrors })
    }
  })

  return {
    isValid: errors.length === 0 && batchErrors.length === 0,
    errors,
    batchErrors
  }
}

/**
 * Gets the current order mapping configuration with environment overrides
 */
export function getOrderMappingConfig(): OrderMappingConfig {
  try {
    // Try to get configuration from order service
    return getOrderServiceConfig()
  } catch (error) {
    // Fallback to default configuration
    console.warn('Failed to get order service configuration, using defaults:', error)
    return DEFAULT_ORDER_MAPPING_CONFIG
  }
} 