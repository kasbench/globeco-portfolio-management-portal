// Comprehensive Data Transformation Service for Order Submission Integration
// Coordinates order mapping, validation, batch processing, and timestamp generation

import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission 
} from '@/types/rebalance'
import { 
  OrderPostDTO, 
  OrderMappingConfig,
  OrderSubmissionPreview,
  OrderBatchInfo,
  SubmissionState
} from '@/types/order'
import { 
  mapPositionToOrder,
  mapPortfolioPositionsToOrders,
  splitOrdersIntoBatches,
  generateOrderSubmissionSummary,
  validateOrderBatch,
  isPositionEligibleForSubmission,
  DEFAULT_ORDER_MAPPING_CONFIG
} from '@/lib/utils/orderMapping'
import {
  getAllEligiblePositions,
  createRebalanceSubmissionSummary,
  generateSubmissionRequestId
} from '@/lib/utils/rebalanceTransform'

/**
 * Advanced batch optimization configuration
 */
interface BatchOptimizationConfig {
  maxBatchSize: number
  targetBatchSize: number
  memoryLimitMB: number
  portfolioGrouping: boolean
  prioritizeSmallPortfolios: boolean
}

/**
 * Default batch optimization configuration
 */
const DEFAULT_BATCH_OPTIMIZATION: BatchOptimizationConfig = {
  maxBatchSize: 1000,
  targetBatchSize: 500,
  memoryLimitMB: 100,
  portfolioGrouping: true,
  prioritizeSmallPortfolios: true
}

/**
 * Order submission timeline tracking
 */
interface SubmissionTimeline {
  submissionRequestId: string
  createdAt: Date
  estimatedCompletionTime: Date
  batchCount: number
  totalOrders: number
  estimatedDurationMs: number
}

/**
 * Data Transformation Service Class
 * Provides comprehensive utilities for converting rebalance data to orders
 */
export class DataTransformationService {
  private config: OrderMappingConfig
  private batchOptimization: BatchOptimizationConfig

  constructor(
    config?: Partial<OrderMappingConfig>,
    batchOptimization?: Partial<BatchOptimizationConfig>
  ) {
    this.config = { ...DEFAULT_ORDER_MAPPING_CONFIG, ...config }
    this.batchOptimization = { ...DEFAULT_BATCH_OPTIMIZATION, ...batchOptimization }
  }

  /**
   * Generate enhanced order timestamp with timezone handling
   */
  generateOrderTimestamp(timezone?: string): string {
    const now = new Date()
    
    if (timezone) {
      // Convert to specified timezone
      try {
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
   * Advanced rebalance position to order mapping with enhanced validation
   */
  mapRebalanceToOrders(
    rebalance: RebalanceWithSubmission,
    options?: {
      includeWarnings?: boolean
      validateBeforeMapping?: boolean
      generateTimestamps?: boolean
      timezone?: string
    }
  ): {
    orders: OrderPostDTO[]
    summary: ReturnType<typeof generateOrderSubmissionSummary>
    validationResults: ReturnType<typeof validateOrderBatch>
    warnings: string[]
    timeline: SubmissionTimeline
  } {
    const opts = {
      includeWarnings: true,
      validateBeforeMapping: true,
      generateTimestamps: true,
      ...options
    }

    const warnings: string[] = []
    const orders: OrderPostDTO[] = []
    const requestId = generateSubmissionRequestId('order')

    // Get all eligible positions across all portfolios
    const allEligiblePositions = getAllEligiblePositions(rebalance)
    
    if (allEligiblePositions.length === 0) {
      warnings.push('No eligible positions found for order submission')
    }

    // Group positions by portfolio for better batch organization
    const portfolioGroups = this.groupPositionsByPortfolio(allEligiblePositions)
    
    // Generate orders for each portfolio group
    for (const [portfolioId, positions] of portfolioGroups.entries()) {
      try {
        const portfolioOrders = positions.map(position => {
          const order = mapPositionToOrder(position, portfolioId)
          
          // Generate fresh timestamp if requested
          if (opts.generateTimestamps) {
            order.orderTimestamp = this.generateOrderTimestamp(opts.timezone)
          }
          
          return order
        })
        
        orders.push(...portfolioOrders)
      } catch (error) {
        warnings.push(`Failed to map positions for portfolio ${portfolioId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Generate summary
    const portfolioIds = Array.from(portfolioGroups.keys())
    const summary = generateOrderSubmissionSummary(allEligiblePositions, portfolioIds)

    // Validate orders if requested
    let validationResults: ReturnType<typeof validateOrderBatch> = { isValid: true, errors: [], batchErrors: [] }
    if (opts.validateBeforeMapping && orders.length > 0) {
      validationResults = validateOrderBatch(orders)
      
      if (!validationResults.isValid) {
        warnings.push(`Order validation found ${validationResults.errors.length} errors`)
      }
    }

    // Generate timeline
    const timeline = this.generateSubmissionTimeline(requestId, orders.length)

    return {
      orders,
      summary,
      validationResults,
      warnings,
      timeline
    }
  }

  /**
   * Advanced batch splitting with optimization
   */
  optimizedBatchSplitting(
    orders: OrderPostDTO[],
    options?: {
      preservePortfolioGroups?: boolean
      optimizeForMemory?: boolean
      prioritizeSpeed?: boolean
    }
  ): {
    batches: OrderPostDTO[][]
    batchInfo: OrderBatchInfo[]
    optimizationMetrics: {
      totalBatches: number
      averageBatchSize: number
      memoryEstimateKB: number
      estimatedProcessingTimeMs: number
    }
  } {
    const opts = {
      preservePortfolioGroups: this.batchOptimization.portfolioGrouping,
      optimizeForMemory: true,
      prioritizeSpeed: false,
      ...options
    }

    let batches: OrderPostDTO[][]
    
    if (opts.preservePortfolioGroups) {
      batches = this.splitOrdersPreservingPortfolios(orders)
    } else {
      batches = splitOrdersIntoBatches(orders, this.batchOptimization.targetBatchSize)
    }

    // Generate batch information
    const batchInfo: OrderBatchInfo[] = batches.map((batch, index) => ({
      batchIndex: index,
      orderCount: batch.length,
      portfolioIds: [...new Set(batch.map(order => order.portfolioId))],
      estimatedSizeKB: this.estimateBatchSizeKB(batch),
      estimatedProcessingTimeMs: this.estimateBatchProcessingTime(batch)
    }))

    // Calculate optimization metrics
    const optimizationMetrics = {
      totalBatches: batches.length,
      averageBatchSize: Math.round(orders.length / batches.length),
      memoryEstimateKB: batchInfo.reduce((sum, info) => sum + info.estimatedSizeKB, 0),
      estimatedProcessingTimeMs: batchInfo.reduce((sum, info) => sum + info.estimatedProcessingTimeMs, 0)
    }

    return {
      batches,
      batchInfo,
      optimizationMetrics
    }
  }

  /**
   * Generate comprehensive order submission preview
   */
  generateSubmissionPreview(
    rebalance: RebalanceWithSubmission,
    options?: {
      includeBatchDetails?: boolean
      includeValidation?: boolean
      includeTimeline?: boolean
    }
  ): OrderSubmissionPreview {
    const opts = {
      includeBatchDetails: true,
      includeValidation: true,
      includeTimeline: true,
      ...options
    }

    const mappingResult = this.mapRebalanceToOrders(rebalance, {
      validateBeforeMapping: opts.includeValidation
    })

    let batchDetails: ReturnType<typeof this.optimizedBatchSplitting> | undefined
    if (opts.includeBatchDetails && mappingResult.orders.length > 0) {
      batchDetails = this.optimizedBatchSplitting(mappingResult.orders)
    }

    const rebalanceSummary = createRebalanceSubmissionSummary(rebalance)

    return {
      rebalanceId: rebalance.rebalance_id,
      submissionRequestId: mappingResult.timeline.submissionRequestId,
      orderCount: mappingResult.orders.length,
      portfolioCount: mappingResult.summary.portfoliosAffected.length,
      summary: mappingResult.summary,
      rebalanceSummary,
      validation: opts.includeValidation ? mappingResult.validationResults : undefined,
      batchDetails: batchDetails ? {
        batchCount: batchDetails.batches.length,
        averageBatchSize: batchDetails.optimizationMetrics.averageBatchSize,
        memoryEstimateKB: batchDetails.optimizationMetrics.memoryEstimateKB,
        estimatedDurationMs: batchDetails.optimizationMetrics.estimatedProcessingTimeMs
      } : undefined,
      timeline: opts.includeTimeline ? mappingResult.timeline : undefined,
      warnings: mappingResult.warnings,
      isReady: mappingResult.orders.length > 0 && (!opts.includeValidation || mappingResult.validationResults.isValid)
    }
  }

  /**
   * Validate large dataset processing capabilities
   */
  validateLargeDatasetCapabilities(
    orderCount: number,
    options?: {
      maxMemoryMB?: number
      maxProcessingTimeMs?: number
      maxBatchCount?: number
    }
  ): {
    isSupported: boolean
    estimatedBatches: number
    estimatedMemoryMB: number
    estimatedTimeMs: number
    warnings: string[]
    recommendations: string[]
  } {
    const opts = {
      maxMemoryMB: this.batchOptimization.memoryLimitMB,
      maxProcessingTimeMs: 300000, // 5 minutes
      maxBatchCount: 100,
      ...options
    }

    const warnings: string[] = []
    const recommendations: string[] = []

    const estimatedBatches = Math.ceil(orderCount / this.batchOptimization.targetBatchSize)
    const estimatedMemoryMB = (orderCount * 0.5) / 1024 // Rough estimate: 0.5KB per order
    const estimatedTimeMs = estimatedBatches * 2000 // Rough estimate: 2s per batch

    let isSupported = true

    if (estimatedMemoryMB > opts.maxMemoryMB) {
      isSupported = false
      warnings.push(`Estimated memory usage (${estimatedMemoryMB.toFixed(1)}MB) exceeds limit (${opts.maxMemoryMB}MB)`)
      recommendations.push('Consider reducing batch size or processing in smaller chunks')
    }

    if (estimatedTimeMs > opts.maxProcessingTimeMs) {
      warnings.push(`Estimated processing time (${(estimatedTimeMs / 1000).toFixed(1)}s) is very long`)
      recommendations.push('Consider background processing or user cancellation options')
    }

    if (estimatedBatches > opts.maxBatchCount) {
      isSupported = false
      warnings.push(`Estimated batch count (${estimatedBatches}) exceeds limit (${opts.maxBatchCount})`)
      recommendations.push('Increase batch size or implement streaming processing')
    }

    if (orderCount > 10000) {
      recommendations.push('Consider implementing progress indicators and background processing')
    }

    return {
      isSupported,
      estimatedBatches,
      estimatedMemoryMB,
      estimatedTimeMs,
      warnings,
      recommendations
    }
  }

  // Private helper methods

  private groupPositionsByPortfolio(positions: RebalancePositionWithSubmission[]): Map<string, RebalancePositionWithSubmission[]> {
    const groups = new Map<string, RebalancePositionWithSubmission[]>()
    
    for (const position of positions) {
      const portfolioId = (position as any).portfolio_id
      if (!portfolioId) {
        console.warn('Position missing portfolio_id:', position.security_id)
        continue
      }
      
      if (!groups.has(portfolioId)) {
        groups.set(portfolioId, [])
      }
      groups.get(portfolioId)!.push(position)
    }
    
    return groups
  }

  private splitOrdersPreservingPortfolios(orders: OrderPostDTO[]): OrderPostDTO[][] {
    const portfolioGroups = new Map<string, OrderPostDTO[]>()
    
    // Group orders by portfolio
    for (const order of orders) {
      if (!portfolioGroups.has(order.portfolioId)) {
        portfolioGroups.set(order.portfolioId, [])
      }
      portfolioGroups.get(order.portfolioId)!.push(order)
    }

    const batches: OrderPostDTO[][] = []
    let currentBatch: OrderPostDTO[] = []

    // Add complete portfolios to batches, never splitting a portfolio
    for (const [portfolioId, portfolioOrders] of portfolioGroups.entries()) {
      if (currentBatch.length + portfolioOrders.length > this.batchOptimization.maxBatchSize) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch)
          currentBatch = []
        }
        
        // If single portfolio exceeds batch size, it gets its own batch
        if (portfolioOrders.length > this.batchOptimization.maxBatchSize) {
          batches.push(portfolioOrders)
        } else {
          currentBatch = [...portfolioOrders]
        }
      } else {
        currentBatch.push(...portfolioOrders)
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    return batches
  }

  private estimateBatchSizeKB(batch: OrderPostDTO[]): number {
    // Rough estimate: JSON stringified order is about 200-300 bytes
    return Math.round((batch.length * 250) / 1024)
  }

  private estimateBatchProcessingTime(batch: OrderPostDTO[]): number {
    // Rough estimate: 1ms per order + 500ms API overhead
    return (batch.length * 1) + 500
  }

  private generateSubmissionTimeline(requestId: string, orderCount: number): SubmissionTimeline {
    const now = new Date()
    const estimatedDurationMs = (Math.ceil(orderCount / this.batchOptimization.targetBatchSize) * 2000) + 1000
    const estimatedCompletionTime = new Date(now.getTime() + estimatedDurationMs)

    return {
      submissionRequestId: requestId,
      createdAt: now,
      estimatedCompletionTime,
      batchCount: Math.ceil(orderCount / this.batchOptimization.targetBatchSize),
      totalOrders: orderCount,
      estimatedDurationMs
    }
  }
}

/**
 * Default data transformation service instance
 */
export const dataTransformationService = new DataTransformationService()

/**
 * Quick utility functions that use the default service instance
 */
export const quickTransformRebalanceToOrders = (rebalance: RebalanceWithSubmission) => 
  dataTransformationService.mapRebalanceToOrders(rebalance)

export const quickGenerateSubmissionPreview = (rebalance: RebalanceWithSubmission) =>
  dataTransformationService.generateSubmissionPreview(rebalance)

export const quickOptimizedBatchSplitting = (orders: OrderPostDTO[]) =>
  dataTransformationService.optimizedBatchSplitting(orders)

export const quickValidateLargeDataset = (orderCount: number) =>
  dataTransformationService.validateLargeDatasetCapabilities(orderCount) 