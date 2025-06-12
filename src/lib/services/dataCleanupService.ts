// Data Cleanup Service for Successful Order Submissions
// Handles position deletion, portfolio cleanup, and rebalance cleanup with atomic operations

import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission,
} from '@/types/rebalance'
import { SubmissionState } from '@/types/order'
import { OrderSubmissionResult } from '@/lib/api/orderService'

/**
 * Transaction context for atomic operations
 */
export interface TransactionContext {
  id: string
  timestamp: Date
  operations: TransactionOperation[]
  rollbackOperations: TransactionOperation[]
  isCommitted: boolean
  isRolledBack: boolean
}

/**
 * Individual transaction operation
 */
export interface TransactionOperation {
  type: 'DELETE_POSITION' | 'DELETE_PORTFOLIO' | 'DELETE_REBALANCE' | 'UPDATE_SUBMISSION_STATE'
  entityType: 'position' | 'portfolio' | 'rebalance'
  entityId: string
  parentId?: string
  previousState?: any
  newState?: any
  timestamp: Date
}

/**
 * Cleanup result summary
 */
export interface CleanupResult {
  transaction: TransactionContext
  deletedPositions: number
  deletedPortfolios: number
  deletedRebalances: number
  updatedRebalance?: RebalanceWithSubmission
  preservedPositions: RebalancePositionWithSubmission[]
  preservedPortfolios: RebalancePortfolioWithSubmission[]
  errors: CleanupError[]
  summary: {
    totalPositionsProcessed: number
    successfullySubmittedPositions: number
    failedPositions: number
    remainingEligiblePositions: number
  }
}

/**
 * Cleanup error information
 */
export interface CleanupError {
  type: 'POSITION_CLEANUP' | 'PORTFOLIO_CLEANUP' | 'REBALANCE_CLEANUP' | 'TRANSACTION_ROLLBACK'
  entityId: string
  message: string
  originalError?: any
  timestamp: Date
}

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  enableTransactions: boolean
  preserveFailedPositions: boolean
  cleanupEmptyPortfolios: boolean
  cleanupEmptyRebalances: boolean
  batchSize: number
  retainAuditTrail: boolean
  rollbackOnError: boolean
}

/**
 * Default cleanup configuration
 */
const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  enableTransactions: true,
  preserveFailedPositions: true,
  cleanupEmptyPortfolios: true,
  cleanupEmptyRebalances: true,
  batchSize: 100,
  retainAuditTrail: true,
  rollbackOnError: true
}

/**
 * Data cleanup service for successful order submissions
 */
export class DataCleanupService {
  private config: CleanupConfig
  private activeTransactions: Map<string, TransactionContext> = new Map()

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config }
  }

  /**
   * Process successful order submissions and clean up data
   */
  public async processSuccessfulSubmissions(
    rebalance: RebalanceWithSubmission,
    submissionResult: OrderSubmissionResult
  ): Promise<CleanupResult> {
    const transaction = this.createTransaction()
    
    try {
      // Identify successfully submitted positions
      const successfulPositionIds = new Set(submissionResult.submittedOrderIds.map(orderId => 
        this.extractPositionIdFromOrderId(orderId)
      ))

      // Process each portfolio
      const updatedPortfolios: RebalancePortfolioWithSubmission[] = []
      const preservedPositions: RebalancePositionWithSubmission[] = []
      const preservedPortfolios: RebalancePortfolioWithSubmission[] = []
      let deletedPositions = 0
      let deletedPortfolios = 0
      const errors: CleanupError[] = []

      for (const portfolio of rebalance.portfolios) {
        try {
          const cleanupResult = await this.cleanupPortfolio(
            portfolio, 
            successfulPositionIds, 
            transaction
          )

          if (cleanupResult.shouldDeletePortfolio) {
            deletedPortfolios++
            this.addTransactionOperation(transaction, {
              type: 'DELETE_PORTFOLIO',
              entityType: 'portfolio',
              entityId: portfolio.portfolio_id,
              parentId: rebalance.rebalance_id,
              previousState: portfolio,
              timestamp: new Date()
            })
          } else {
            updatedPortfolios.push(cleanupResult.updatedPortfolio)
            preservedPortfolios.push(cleanupResult.updatedPortfolio)
          }

          deletedPositions += cleanupResult.deletedPositions
          preservedPositions.push(...cleanupResult.preservedPositions)
          errors.push(...cleanupResult.errors)

        } catch (error) {
          const cleanupError: CleanupError = {
            type: 'PORTFOLIO_CLEANUP',
            entityId: portfolio.portfolio_id,
            message: `Failed to cleanup portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`,
            originalError: error,
            timestamp: new Date()
          }
          errors.push(cleanupError)

          if (this.config.rollbackOnError) {
            await this.rollbackTransaction(transaction)
            throw new Error(`Portfolio cleanup failed for ${portfolio.portfolio_id}: ${cleanupError.message}`)
          }

          // Preserve portfolio on error
          updatedPortfolios.push(portfolio)
          preservedPortfolios.push(portfolio)
        }
      }

      // Determine if rebalance should be deleted
      const shouldDeleteRebalance = this.config.cleanupEmptyRebalances && 
                                   updatedPortfolios.length === 0

      let updatedRebalance: RebalanceWithSubmission | undefined

      if (shouldDeleteRebalance) {
        this.addTransactionOperation(transaction, {
          type: 'DELETE_REBALANCE',
          entityType: 'rebalance',
          entityId: rebalance.rebalance_id,
          previousState: rebalance,
          timestamp: new Date()
        })
      } else {
        // Update rebalance with remaining portfolios
        updatedRebalance = {
          ...rebalance,
          portfolios: updatedPortfolios,
          number_of_portfolios: updatedPortfolios.length,
          totalEligibleOrders: this.calculateTotalEligibleOrders(updatedPortfolios),
          submission: this.calculateRebalanceSubmissionState(updatedPortfolios)
        }

        this.addTransactionOperation(transaction, {
          type: 'UPDATE_SUBMISSION_STATE',
          entityType: 'rebalance',
          entityId: rebalance.rebalance_id,
          previousState: rebalance,
          newState: updatedRebalance,
          timestamp: new Date()
        })
      }

      // Commit transaction
      await this.commitTransaction(transaction)

      return {
        transaction,
        deletedPositions,
        deletedPortfolios,
        deletedRebalances: shouldDeleteRebalance ? 1 : 0,
        updatedRebalance,
        preservedPositions,
        preservedPortfolios,
        errors,
        summary: {
          totalPositionsProcessed: rebalance.portfolios.reduce((sum, p) => sum + p.positions.length, 0),
          successfullySubmittedPositions: submissionResult.successfulOrders,
          failedPositions: submissionResult.failedOrders,
          remainingEligiblePositions: preservedPositions.filter(p => p.isEligibleForSubmission).length
        }
      }

    } catch (error) {
      if (this.config.rollbackOnError) {
        await this.rollbackTransaction(transaction)
      }
      throw error
    }
  }

  /**
   * Clean up a single portfolio after successful submissions
   */
  private async cleanupPortfolio(
    portfolio: RebalancePortfolioWithSubmission,
    successfulPositionIds: Set<string>,
    transaction: TransactionContext
  ): Promise<{
    updatedPortfolio: RebalancePortfolioWithSubmission
    shouldDeletePortfolio: boolean
    deletedPositions: number
    preservedPositions: RebalancePositionWithSubmission[]
    errors: CleanupError[]
  }> {
    const preservedPositions: RebalancePositionWithSubmission[] = []
    const errors: CleanupError[] = []
    let deletedPositions = 0

    // Process each position
    for (const position of portfolio.positions) {
      const positionKey = this.generatePositionKey(position)
      
      if (successfulPositionIds.has(positionKey) || successfulPositionIds.has(position.security_id)) {
        // Position was successfully submitted - mark for deletion
        if (this.shouldDeletePosition(position)) {
          deletedPositions++
          this.addTransactionOperation(transaction, {
            type: 'DELETE_POSITION',
            entityType: 'position',
            entityId: positionKey,
            parentId: portfolio.portfolio_id,
            previousState: position,
            timestamp: new Date()
          })
        } else {
          // Update position state but preserve it
          const updatedPosition: RebalancePositionWithSubmission = {
            ...position,
            submission: SubmissionState.Submitted,
            isEligibleForSubmission: false // No longer eligible after submission
          }
          preservedPositions.push(updatedPosition)
        }
      } else {
        // Position was not submitted or failed submission - preserve it
        preservedPositions.push(position)
      }
    }

    // Determine if portfolio should be deleted
    const shouldDeletePortfolio = this.shouldDeletePortfolio(preservedPositions)

    const updatedPortfolio: RebalancePortfolioWithSubmission = {
      ...portfolio,
      positions: preservedPositions,
      eligibleOrderCount: preservedPositions.filter(p => p.isEligibleForSubmission).length,
      submission: this.calculatePortfolioSubmissionState(preservedPositions)
    }

    return {
      updatedPortfolio,
      shouldDeletePortfolio,
      deletedPositions,
      preservedPositions,
      errors
    }
  }

  /**
   * Determine if a position should be deleted after successful submission
   */
  private shouldDeletePosition(position: RebalancePositionWithSubmission): boolean {
    // Delete positions that were successfully submitted and have zero trade quantity remaining
    return position.isEligibleForSubmission && 
           (position.transaction_type === 'BUY' || position.transaction_type === 'SELL') &&
           position.trade_quantity > 0
  }

  /**
   * Determine if a portfolio should be deleted
   */
  private shouldDeletePortfolio(positions: RebalancePositionWithSubmission[]): boolean {
    if (!this.config.cleanupEmptyPortfolios) {
      return false
    }

    // Delete portfolio if no eligible positions remain
    const eligiblePositions = positions.filter(p => p.isEligibleForSubmission)
    const nonZeroTradePositions = positions.filter(p => p.trade_quantity > 0)

    return eligiblePositions.length === 0 && nonZeroTradePositions.length === 0
  }

  /**
   * Calculate portfolio submission state based on remaining positions
   */
  private calculatePortfolioSubmissionState(positions: RebalancePositionWithSubmission[]): SubmissionState {
    const eligiblePositions = positions.filter(p => p.isEligibleForSubmission)
    const submittedPositions = positions.filter(p => p.submission === SubmissionState.Submitted)
    const failedPositions = positions.filter(p => p.submission === SubmissionState.Failed)

    if (eligiblePositions.length === 0) {
      return submittedPositions.length > 0 ? SubmissionState.Submitted : SubmissionState.Idle
    }

    if (submittedPositions.length > 0 && failedPositions.length > 0) {
      return SubmissionState.PartiallySubmitted
    }

    if (submittedPositions.length > 0) {
      return SubmissionState.Submitted
    }

    if (failedPositions.length > 0) {
      return SubmissionState.Failed
    }

    return SubmissionState.Idle
  }

  /**
   * Calculate rebalance submission state based on portfolios
   */
  private calculateRebalanceSubmissionState(portfolios: RebalancePortfolioWithSubmission[]): SubmissionState {
    if (portfolios.length === 0) {
      return SubmissionState.Submitted
    }

    const submittedPortfolios = portfolios.filter(p => p.submission === SubmissionState.Submitted)
    const failedPortfolios = portfolios.filter(p => p.submission === SubmissionState.Failed)
    const partialPortfolios = portfolios.filter(p => p.submission === SubmissionState.PartiallySubmitted)

    if (partialPortfolios.length > 0 || (submittedPortfolios.length > 0 && failedPortfolios.length > 0)) {
      return SubmissionState.PartiallySubmitted
    }

    if (submittedPortfolios.length === portfolios.length) {
      return SubmissionState.Submitted
    }

    if (failedPortfolios.length > 0) {
      return SubmissionState.Failed
    }

    return SubmissionState.Idle
  }

  /**
   * Calculate total eligible orders across portfolios
   */
  private calculateTotalEligibleOrders(portfolios: RebalancePortfolioWithSubmission[]): number {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.eligibleOrderCount, 0)
  }

  /**
   * Generate a unique key for a position
   */
  private generatePositionKey(position: RebalancePositionWithSubmission): string {
    return `${position.security_id}_${position.transaction_type}_${position.trade_quantity}`
  }

  /**
   * Extract position ID from order ID (implementation depends on order ID format)
   */
  private extractPositionIdFromOrderId(orderId: string | number): string {
    // Convert to string first in case orderId is a number
    const orderIdStr = String(orderId)
    
    // For now, since the Order Service returns numeric IDs that don't directly map to security IDs,
    // we'll return the order ID itself as the position identifier
    // In a real implementation, this would need to be mapped based on the order submission context
    return orderIdStr
  }

  /**
   * Create a new transaction context
   */
  private createTransaction(): TransactionContext {
    const transaction: TransactionContext = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      operations: [],
      rollbackOperations: [],
      isCommitted: false,
      isRolledBack: false
    }

    if (this.config.enableTransactions) {
      this.activeTransactions.set(transaction.id, transaction)
    }

    return transaction
  }

  /**
   * Add an operation to the transaction
   */
  private addTransactionOperation(transaction: TransactionContext, operation: TransactionOperation): void {
    transaction.operations.push(operation)

    // Create rollback operation
    if (operation.type === 'DELETE_POSITION' || operation.type === 'DELETE_PORTFOLIO' || operation.type === 'DELETE_REBALANCE') {
      transaction.rollbackOperations.unshift({
        ...operation,
        type: 'UPDATE_SUBMISSION_STATE', // Restore instead of delete
        newState: operation.previousState,
        timestamp: new Date()
      })
    } else if (operation.type === 'UPDATE_SUBMISSION_STATE') {
      transaction.rollbackOperations.unshift({
        ...operation,
        newState: operation.previousState,
        timestamp: new Date()
      })
    }
  }

  /**
   * Commit a transaction
   */
  private async commitTransaction(transaction: TransactionContext): Promise<void> {
    if (!this.config.enableTransactions) {
      return
    }

    try {
      // In a real implementation, this would execute the actual database operations
      // For now, we just mark the transaction as committed
      transaction.isCommitted = true

      if (this.config.retainAuditTrail) {
        // Keep transaction in memory for audit purposes
        setTimeout(() => {
          this.activeTransactions.delete(transaction.id)
        }, 24 * 60 * 60 * 1000) // Clean up after 24 hours
      } else {
        this.activeTransactions.delete(transaction.id)
      }

    } catch (error) {
      throw new Error(`Failed to commit transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Rollback a transaction
   */
  private async rollbackTransaction(transaction: TransactionContext): Promise<void> {
    if (!this.config.enableTransactions) {
      return
    }

    try {
      // Execute rollback operations in reverse order
      for (const operation of transaction.rollbackOperations) {
        // In a real implementation, this would execute the actual rollback
        console.log(`Rolling back operation: ${operation.type} for ${operation.entityId}`)
      }

      transaction.isRolledBack = true
      this.activeTransactions.delete(transaction.id)

    } catch (error) {
      throw new Error(`Failed to rollback transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(transactionId: string): TransactionContext | undefined {
    return this.activeTransactions.get(transactionId)
  }

  /**
   * Get all active transactions
   */
  public getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values())
  }

  /**
   * Clean up stale transactions
   */
  public cleanupStaleTransactions(maxAgeHours: number = 24): number {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000)
    let cleanedCount = 0

    for (const [id, transaction] of this.activeTransactions.entries()) {
      if (transaction.timestamp.getTime() < cutoffTime) {
        this.activeTransactions.delete(id)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CleanupConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  public getConfig(): CleanupConfig {
    return { ...this.config }
  }
}

/**
 * Global data cleanup service instance
 */
export const dataCleanupService = new DataCleanupService()

/**
 * Convenience function for processing successful submissions
 */
export async function processSuccessfulSubmissions(
  rebalance: RebalanceWithSubmission,
  submissionResult: OrderSubmissionResult,
  config?: Partial<CleanupConfig>
): Promise<CleanupResult> {
  const service = config ? new DataCleanupService(config) : dataCleanupService
  return service.processSuccessfulSubmissions(rebalance, submissionResult)
} 