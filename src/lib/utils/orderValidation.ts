// Advanced validation utilities for order eligibility and submission validation

import { 
  RebalancePositionWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalanceWithSubmission 
} from '@/types/rebalance'
import { 
  OrderPostDTO,
  ValidationError,
  PositionValidationResult,
  OrderValidationResult,
  OrderMappingConfig
} from '@/types/order'
import { getOrderServiceConfig } from '@/lib/api/orderService'
import { validateOrder, validateOrderBatch } from './orderMapping'

/**
 * Comprehensive position eligibility validation
 * Checks all criteria for order submission eligibility
 */
export function validatePositionEligibility(
  position: RebalancePositionWithSubmission
): PositionValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Check transaction type
  if (!['BUY', 'SELL'].includes(position.transaction_type)) {
    if (position.transaction_type === 'HOLD') {
      warnings.push({
        field: 'transaction_type',
        message: 'HOLD positions are not eligible for order submission',
        value: position.transaction_type
      })
    } else {
      errors.push({
        field: 'transaction_type',
        message: 'Transaction type must be BUY or SELL for order submission',
        value: position.transaction_type
      })
    }
  }

  // Check trade quantity
  if (position.trade_quantity === 0) {
    warnings.push({
      field: 'trade_quantity',
      message: 'Zero trade quantity positions are not eligible for order submission',
      value: position.trade_quantity
    })
  } else if (position.trade_quantity < 0) {
    errors.push({
      field: 'trade_quantity',
      message: 'Trade quantity cannot be negative',
      value: position.trade_quantity
    })
  }

  // Check security ID
  if (!position.security_id || position.security_id.trim().length === 0) {
    errors.push({
      field: 'security_id',
      message: 'Security ID is required for order submission',
      value: position.security_id
    })
  }

  // Check price
  if (position.price <= 0) {
    errors.push({
      field: 'price',
      message: 'Security price must be positive',
      value: position.price
    })
  }

  // Business logic validations
  if (position.transaction_type === 'SELL' && position.original_quantity === 0) {
    warnings.push({
      field: 'original_quantity',
      message: 'Cannot sell security with zero original quantity',
      value: position.original_quantity
    })
  }

  if (position.transaction_type === 'SELL' && position.trade_quantity > position.original_quantity) {
    errors.push({
      field: 'trade_quantity',
      message: 'Cannot sell more than original quantity',
      value: position.trade_quantity
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate a portfolio for order submission
 */
export function validatePortfolioForSubmission(
  portfolio: RebalancePortfolioWithSubmission
): {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  positionResults: { [securityId: string]: PositionValidationResult }
} {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const positionResults: { [securityId: string]: PositionValidationResult } = {}

  // Check portfolio ID
  if (!portfolio.portfolio_id || portfolio.portfolio_id.trim().length === 0) {
    errors.push({
      field: 'portfolio_id',
      message: 'Portfolio ID is required',
      value: portfolio.portfolio_id
    })
  } else if (portfolio.portfolio_id.length > 24) {
    errors.push({
      field: 'portfolio_id',
      message: 'Portfolio ID must be 24 characters or less',
      value: portfolio.portfolio_id
    })
  }

  // Validate each position
  let hasEligiblePositions = false
  portfolio.positions.forEach(position => {
    const result = validatePositionEligibility(position)
    positionResults[position.security_id] = result
    
    if (position.isEligibleForSubmission) {
      hasEligiblePositions = true
    }
    
    // Aggregate position errors
    result.errors.forEach(error => {
      errors.push({
        ...error,
        field: `position[${position.security_id}].${error.field}`,
        message: `Position ${position.security_id}: ${error.message}`
      })
    })
  })

  // Check if portfolio has any eligible positions
  if (!hasEligiblePositions) {
    warnings.push({
      field: 'positions',
      message: 'Portfolio has no eligible positions for order submission',
      value: portfolio.positions.length
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    positionResults
  }
}

/**
 * Validate a rebalance for order submission
 */
export function validateRebalanceForSubmission(
  rebalance: RebalanceWithSubmission
): {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  portfolioResults: { [portfolioId: string]: ReturnType<typeof validatePortfolioForSubmission> }
} {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const portfolioResults: { [portfolioId: string]: ReturnType<typeof validatePortfolioForSubmission> } = {}

  // Check rebalance ID
  if (!rebalance.rebalance_id || rebalance.rebalance_id.trim().length === 0) {
    errors.push({
      field: 'rebalance_id',
      message: 'Rebalance ID is required',
      value: rebalance.rebalance_id
    })
  }

  // Validate each portfolio
  let hasEligiblePortfolios = false
  rebalance.portfolios.forEach(portfolio => {
    const result = validatePortfolioForSubmission(portfolio)
    portfolioResults[portfolio.portfolio_id] = result
    
    if (portfolio.eligibleOrderCount > 0) {
      hasEligiblePortfolios = true
    }
    
    // Aggregate portfolio errors
    result.errors.forEach(error => {
      errors.push({
        ...error,
        field: `portfolio[${portfolio.portfolio_id}].${error.field}`,
        message: `Portfolio ${portfolio.portfolio_id}: ${error.message}`
      })
    })
  })

  // Check if rebalance has any eligible portfolios
  if (!hasEligiblePortfolios) {
    warnings.push({
      field: 'portfolios',
      message: 'Rebalance has no eligible portfolios for order submission',
      value: rebalance.portfolios.length
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    portfolioResults
  }
}

/**
 * Validate order mapping from position to order
 */
export function validateOrderMapping(
  position: RebalancePositionWithSubmission,
  portfolioId: string,
  config?: OrderMappingConfig
): OrderValidationResult {
  const mappingConfig = config || getOrderServiceConfig()
  
  try {
    // First validate position eligibility
    const eligibilityResult = validatePositionEligibility(position)
    if (!eligibilityResult.isValid) {
      return {
        isValid: false,
        errors: eligibilityResult.errors
      }
    }

    // Create the order object
    const order: OrderPostDTO = {
      blotterId: mappingConfig.defaultBlotterId,
      statusId: mappingConfig.defaultStatusId,
      portfolioId: portfolioId,
      orderTypeId: mappingConfig.orderTypeMapping[position.transaction_type],
      securityId: position.security_id,
      quantity: Math.abs(position.trade_quantity),
      limitPrice: null,
      tradeOrderId: null,
      orderTimestamp: new Date().toISOString(),
      version: mappingConfig.defaultVersion
    }

    // Validate the generated order
    const orderErrors = validateOrder(order)
    
    return {
      isValid: orderErrors.length === 0,
      errors: orderErrors,
      order: orderErrors.length === 0 ? order : undefined
    }
    
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: 'mapping',
        message: `Order mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: position
      }]
    }
  }
}

/**
 * Validate submission state consistency
 */
export function validateSubmissionState(
  rebalance: RebalanceWithSubmission
): {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
} {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Check for inconsistent submission states
  rebalance.portfolios.forEach(portfolio => {
    portfolio.positions.forEach(position => {
      // Check if position is marked as eligible but has failed submission
      if (position.isEligibleForSubmission && 
          position.submission && 
          position.submission.status === 'failed') {
        warnings.push({
          field: 'submission_state',
          message: `Position ${position.security_id} is eligible but has failed submission status`,
          value: position.submission.status
        })
      }

      // Check if position is not eligible but has pending/success submission
      if (!position.isEligibleForSubmission && 
          position.submission && 
          ['pending', 'success'].includes(position.submission.status)) {
        errors.push({
          field: 'submission_state',
          message: `Position ${position.security_id} is not eligible but has ${position.submission.status} submission status`,
          value: position.submission.status
        })
      }
    })
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate batch size constraints
 */
export function validateBatchSizeConstraints(
  positions: RebalancePositionWithSubmission[],
  config?: OrderMappingConfig
): {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  recommendedBatches: number
} {
  const mappingConfig = config || getOrderServiceConfig()
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  const eligiblePositions = positions.filter(p => p.isEligibleForSubmission)
  const recommendedBatches = Math.ceil(eligiblePositions.length / mappingConfig.batchSize)

  if (eligiblePositions.length === 0) {
    warnings.push({
      field: 'batch_size',
      message: 'No eligible positions for batch processing',
      value: 0
    })
  } else if (eligiblePositions.length > mappingConfig.batchSize) {
    warnings.push({
      field: 'batch_size',
      message: `Large dataset detected: ${eligiblePositions.length} positions will require ${recommendedBatches} batches`,
      value: eligiblePositions.length
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendedBatches
  }
}

/**
 * Generate a comprehensive validation report
 */
export function generateValidationReport(
  rebalance: RebalanceWithSubmission
): {
  overall: {
    isValid: boolean
    canSubmit: boolean
    totalErrors: number
    totalWarnings: number
  }
  rebalance: ReturnType<typeof validateRebalanceForSubmission>
  submissionState: ReturnType<typeof validateSubmissionState>
  batchConstraints: ReturnType<typeof validateBatchSizeConstraints>
  summary: {
    totalPositions: number
    eligiblePositions: number
    validPositions: number
    estimatedBatches: number
    recommendedAction: string
  }
} {
  const rebalanceValidation = validateRebalanceForSubmission(rebalance)
  const submissionStateValidation = validateSubmissionState(rebalance)
  const allEligiblePositions = rebalance.portfolios.flatMap(p => 
    p.positions.filter(pos => pos.isEligibleForSubmission)
  )
  const batchValidation = validateBatchSizeConstraints(allEligiblePositions)

  const totalErrors = rebalanceValidation.errors.length + 
                     submissionStateValidation.errors.length + 
                     batchValidation.errors.length
  const totalWarnings = rebalanceValidation.warnings.length + 
                       submissionStateValidation.warnings.length + 
                       batchValidation.warnings.length

  const validPositions = allEligiblePositions.filter(pos => {
    const validation = validatePositionEligibility(pos)
    return validation.isValid
  }).length

  let recommendedAction = 'Ready for submission'
  if (totalErrors > 0) {
    recommendedAction = 'Fix errors before submission'
  } else if (allEligiblePositions.length === 0) {
    recommendedAction = 'No eligible positions to submit'
  } else if (totalWarnings > 0) {
    recommendedAction = 'Review warnings before submission'
  }

  return {
    overall: {
      isValid: totalErrors === 0,
      canSubmit: totalErrors === 0 && allEligiblePositions.length > 0,
      totalErrors,
      totalWarnings
    },
    rebalance: rebalanceValidation,
    submissionState: submissionStateValidation,
    batchConstraints: batchValidation,
    summary: {
      totalPositions: rebalance.portfolios.reduce((sum, p) => sum + p.positions.length, 0),
      eligiblePositions: allEligiblePositions.length,
      validPositions,
      estimatedBatches: batchValidation.recommendedBatches,
      recommendedAction
    }
  }
} 