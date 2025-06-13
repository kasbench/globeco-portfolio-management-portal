// Data transformation utilities for rebalance types with submission tracking

import { 
  Rebalance, 
  RebalancePortfolio, 
  RebalancePosition,
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission,
  RebalanceWithSubmissionAndUIState,
  RebalanceUIState
} from '@/types/rebalance'
import { SubmissionState, SubmissionStateInfo } from '@/types/order'
import { isPositionEligibleForSubmission, countEligibleOrders } from './orderMapping'

/**
 * Validates if a position is eligible for order submission
 * This is a simplified version of the orderMapping validation for testing purposes
 */
export function validateOrderEligibility(position: RebalancePositionWithSubmission): boolean {
  return (
    (position.transaction_type === 'BUY' || position.transaction_type === 'SELL') &&
    position.trade_quantity !== 0 &&
    position.trade_quantity !== null &&
    position.trade_quantity !== undefined
  )
}

/**
 * Transform a basic position to a submission-enhanced position
 * This function adds the required submission tracking fields
 */
export function transformPositionToSubmission(position: RebalancePosition): RebalancePositionWithSubmission {
  // Calculate transaction type based on quantity difference
  let transaction_type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  const trade_quantity = position.adjusted_quantity - position.original_quantity
  
  if (trade_quantity > 0) {
    transaction_type = 'BUY'
  } else if (trade_quantity < 0) {
    transaction_type = 'SELL'
  }
  
  const enhancedPosition: RebalancePositionWithSubmission = {
    ...position,
    transaction_type,
    trade_quantity,
    isEligibleForSubmission: false, // Will be calculated below
    submission: SubmissionState.NotSubmitted
  }
  
  // Calculate eligibility after all fields are set
  enhancedPosition.isEligibleForSubmission = validateOrderEligibility(enhancedPosition)
  
  return enhancedPosition
}

/**
 * Transform a basic portfolio to a submission-enhanced portfolio
 */
export function transformPortfolioToSubmission(portfolio: RebalancePortfolio): RebalancePortfolioWithSubmission {
  const enhancedPositions = (portfolio.positions || []).map(transformPositionToSubmission)
  const eligibleOrderCount = countEligibleOrders(enhancedPositions)
  
  return {
    ...portfolio,
    positions: enhancedPositions,
    eligibleOrderCount,
    submission: SubmissionState.NotSubmitted
  }
}

/**
 * Transform a basic rebalance to a submission-enhanced rebalance with optional filtering
 */
export function transformToSubmissionRebalance(
  rebalance: Rebalance, 
  options: { filterEligibleOnly?: boolean } = {}
): RebalanceWithSubmission {
  const enhancedPortfolios = (rebalance.portfolios || []).map(portfolio => {
    const transformedPortfolio = transformPortfolioToSubmission(portfolio)
    
    if (options.filterEligibleOnly) {
      // Filter out non-eligible positions
      const eligiblePositions = transformedPortfolio.positions.filter(pos => 
        validateOrderEligibility(pos)
      )
      return {
        ...transformedPortfolio,
        positions: eligiblePositions,
        eligibleOrderCount: eligiblePositions.length
      }
    }
    
    return transformedPortfolio
  })
  
  const totalEligibleOrders = enhancedPortfolios.reduce((sum, portfolio) => sum + portfolio.eligibleOrderCount, 0)
  
  return {
    ...rebalance,
    portfolios: enhancedPortfolios,
    totalEligibleOrders,
    submission: SubmissionState.NotSubmitted
  }
}

/**
 * Transform a basic rebalance to a submission-enhanced rebalance (legacy name for compatibility)
 */
export function transformRebalanceToSubmission(rebalance: Rebalance): RebalanceWithSubmission {
  return transformToSubmissionRebalance(rebalance)
}

/**
 * Transform multiple rebalances to submission-enhanced rebalances
 */
export function transformRebalancesToSubmission(rebalances: Rebalance[]): RebalanceWithSubmission[] {
  return rebalances.map(rebalance => transformToSubmissionRebalance(rebalance))
}

/**
 * Mark positions as submitting (for API client integration)
 */
export function markPositionsAsSubmitting(
  portfolio: RebalancePortfolioWithSubmission
): RebalancePortfolioWithSubmission {
  const updatedPositions = portfolio.positions.map(position => ({
    ...position,
    submission: SubmissionState.Submitting
  }))
  
  return {
    ...portfolio,
    positions: updatedPositions,
    submission: SubmissionState.Submitting
  }
}

/**
 * Mark positions as submitted with order IDs (for API client integration)
 */
export function markPositionsAsSubmitted(
  portfolio: RebalancePortfolioWithSubmission,
  submittedOrderIds: number[]
): RebalancePortfolioWithSubmission {
  const submittedCount = submittedOrderIds.length
  const updatedPositions = portfolio.positions.map((position, index) => {
    if (index < submittedCount) {
      return {
        ...position,
        submission: SubmissionState.Submitted
      }
    }
    return position
  })
  
  return {
    ...portfolio,
    positions: updatedPositions,
    submission: submittedCount === portfolio.positions.length ? SubmissionState.Submitted : SubmissionState.PartiallySubmitted
  }
}

/**
 * Mark positions as failed (for API client integration)
 */
export function markPositionsAsFailed(
  portfolio: RebalancePortfolioWithSubmission,
  errors: string[]
): RebalancePortfolioWithSubmission {
  const updatedPositions = portfolio.positions.map(position => ({
    ...position,
    submission: SubmissionState.Failed
  }))
  
  return {
    ...portfolio,
    positions: updatedPositions,
    submission: SubmissionState.Failed
  }
}

/**
 * Clean up after successful submission (for API client integration)
 */
export function cleanupAfterSubmission(
  rebalance: RebalanceWithSubmission,
  submittedOrderIds: number[]
): RebalanceWithSubmission {
  // This is a placeholder implementation
  // In practice, you'd remove submitted positions and empty portfolios
  return {
    ...rebalance,
    submission: submittedOrderIds.length > 0 ? SubmissionState.Submitted : SubmissionState.Failed
  }
}

/**
 * Update submission state for a specific position (legacy API)
 */
export function updatePositionSubmissionState(
  position: RebalancePositionWithSubmission,
  submissionState: SubmissionState,
  requestId?: string
): RebalancePositionWithSubmission {
  return {
    ...position,
    submission: submissionState,
    submissionRequestId: requestId
  }
}

/**
 * Update submission state for a specific portfolio (legacy API)
 */
export function updatePortfolioSubmissionState(
  portfolio: RebalancePortfolioWithSubmission,
  submissionState: SubmissionState,
  requestId?: string
): RebalancePortfolioWithSubmission {
  return {
    ...portfolio,
    submission: submissionState,
    submissionRequestId: requestId
  }
}

/**
 * Update submission state for a specific rebalance (legacy API)
 */
export function updateRebalanceSubmissionState(
  rebalance: RebalanceWithSubmission,
  submissionState: SubmissionState,
  requestId?: string
): RebalanceWithSubmission {
  return {
    ...rebalance,
    submission: submissionState,
    submissionRequestId: requestId
  }
}

/**
 * Update multiple positions with submission results (legacy API)
 * Used after order submission to update individual position states
 */
export function updatePositionsWithSubmissionResults(
  positions: RebalancePositionWithSubmission[],
  results: { securityId: string; success: boolean; message?: string; orderId?: number }[],
  requestId: string
): RebalancePositionWithSubmission[] {
  const resultMap = new Map(results.map(r => [r.securityId, r]))
  
  return positions.map(position => {
    const result = resultMap.get(position.security_id)
    if (!result) {
      return position // No result for this position
    }
    
    const submissionState = result.success ? SubmissionState.Submitted : SubmissionState.Failed
    
    return updatePositionSubmissionState(position, submissionState, requestId)
  })
}

/**
 * Check if a portfolio has any eligible orders for submission
 */
export function portfolioHasEligibleOrders(portfolio: RebalancePortfolioWithSubmission): boolean {
  return portfolio.eligibleOrderCount > 0
}

/**
 * Check if a rebalance has any eligible orders for submission
 */
export function rebalanceHasEligibleOrders(rebalance: RebalanceWithSubmission): boolean {
  return rebalance.totalEligibleOrders > 0
}

/**
 * Get eligible positions from a portfolio
 */
export function getEligiblePositions(portfolio: RebalancePortfolioWithSubmission): RebalancePositionWithSubmission[] {
  return portfolio.positions.filter(position => position.isEligibleForSubmission)
}

/**
 * Get all eligible positions from a rebalance
 */
export function getAllEligiblePositions(rebalance: RebalanceWithSubmission): RebalancePositionWithSubmission[] {
  return rebalance.portfolios.flatMap(portfolio => getEligiblePositions(portfolio))
}

/**
 * Remove successfully submitted positions from a portfolio
 * Used for data cleanup after successful order submission
 */
export function removeSubmittedPositions(
  portfolio: RebalancePortfolioWithSubmission,
  submittedSecurityIds: string[]
): RebalancePortfolioWithSubmission {
  const submittedSet = new Set(submittedSecurityIds)
  const remainingPositions = portfolio.positions.filter(
    position => !submittedSet.has(position.security_id) || position.submission !== SubmissionState.Submitted
  )
  
  return {
    ...portfolio,
    positions: remainingPositions,
    eligibleOrderCount: countEligibleOrders(remainingPositions)
  }
}

/**
 * Check if a portfolio should be removed after position cleanup
 * A portfolio is removed if it has no remaining eligible positions
 */
export function shouldRemovePortfolio(portfolio: RebalancePortfolioWithSubmission): boolean {
  return portfolio.eligibleOrderCount === 0 && 
         portfolio.positions.every(p => p.trade_quantity === 0 || p.submission === SubmissionState.Submitted)
}

/**
 * Remove empty portfolios from a rebalance
 * Used for data cleanup after successful order submission
 */
export function removeEmptyPortfolios(rebalance: RebalanceWithSubmission): RebalanceWithSubmission {
  const remainingPortfolios = rebalance.portfolios.filter(portfolio => !shouldRemovePortfolio(portfolio))
  
  return {
    ...rebalance,
    portfolios: remainingPortfolios,
    number_of_portfolios: remainingPortfolios.length,
    totalEligibleOrders: remainingPortfolios.reduce((sum, p) => sum + p.eligibleOrderCount, 0)
  }
}

/**
 * Create a submission summary for a rebalance
 */
export function createRebalanceSubmissionSummary(rebalance: RebalanceWithSubmission): {
  rebalanceId: string
  totalPortfolios: number
  portfoliosWithOrders: number
  totalEligiblePositions: number
  estimatedOrders: number
  buyOrders: number
  sellOrders: number
} {
  const eligiblePositions = getAllEligiblePositions(rebalance)
  const portfoliosWithOrders = rebalance.portfolios.filter(portfolioHasEligibleOrders).length
  
  const buyOrders = eligiblePositions.filter(p => p.transaction_type === 'BUY').length
  const sellOrders = eligiblePositions.filter(p => p.transaction_type === 'SELL').length
  
  return {
    rebalanceId: rebalance.rebalance_id,
    totalPortfolios: rebalance.number_of_portfolios,
    portfoliosWithOrders,
    totalEligiblePositions: eligiblePositions.length,
    estimatedOrders: eligiblePositions.length,
    buyOrders,
    sellOrders
  }
}

/**
 * Add UI state to a submission-enhanced rebalance
 */
export function addUIStateToRebalance(
  rebalance: RebalanceWithSubmission,
  uiState?: Partial<RebalanceUIState>
): RebalanceWithSubmissionAndUIState {
  const defaultUIState: RebalanceUIState = {
    isExpanded: false,
    isLoadingPortfolios: false,
    portfoliosLoaded: false,
    expandedPortfolios: new Set(),
    loadingPositions: new Set(),
    ...uiState
  }
  
  return {
    ...rebalance,
    uiState: defaultUIState
  }
}

/**
 * Generate a unique request ID for submission tracking
 */
export function generateSubmissionRequestId(prefix: string = 'sub'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
} 