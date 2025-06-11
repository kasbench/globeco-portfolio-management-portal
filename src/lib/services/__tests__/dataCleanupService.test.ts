import { 
  DataCleanupService, 
  processSuccessfulSubmissions,
  CleanupConfig,
  CleanupResult,
  TransactionContext,
  CleanupError,
  dataCleanupService
} from '../dataCleanupService'
import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission
} from '@/types/rebalance'
import { SubmissionState } from '@/types/order'
import { OrderSubmissionResult } from '@/lib/api/orderService'

// Mock data helpers
const createMockPosition = (
  security_id: string,
  transaction_type: 'BUY' | 'SELL' | 'HOLD' = 'BUY',
  trade_quantity: number = 100,
  submission: SubmissionState = SubmissionState.Idle
): RebalancePositionWithSubmission => ({
  security_id,
  price: 100,
  original_quantity: 500,
  adjusted_quantity: transaction_type === 'BUY' ? 600 : 400,
  original_position_market_value: 50000,
  adjusted_position_market_value: transaction_type === 'BUY' ? 60000 : 40000,
  target: 0.1,
  high_drift: 0.05,
  low_drift: 0.05,
  actual: 0.12,
  actual_drift: 0.02,
  transaction_type,
  trade_quantity,
  isEligibleForSubmission: transaction_type !== 'HOLD' && trade_quantity > 0,
  submission
})

const createMockPortfolio = (
  portfolio_id: string,
  positions: RebalancePositionWithSubmission[]
): RebalancePortfolioWithSubmission => ({
  portfolio_id,
  market_value: 1000000,
  cash_before_rebalance: 50000,
  cash_after_rebalance: 55000,
  positions,
  eligibleOrderCount: positions.filter(p => p.isEligibleForSubmission).length,
  submission: SubmissionState.Idle
})

const createMockRebalance = (
  rebalance_id: string,
  portfolios: RebalancePortfolioWithSubmission[]
): RebalanceWithSubmission => ({
  rebalance_id,
  model_id: 'model_123',
  rebalance_date: new Date().toISOString(),
  model_name: 'Test Model',
  number_of_portfolios: portfolios.length,
  portfolios,
  version: 1,
  created_at: new Date().toISOString(),
  totalEligibleOrders: portfolios.reduce((sum, p) => sum + p.eligibleOrderCount, 0),
  submission: SubmissionState.Idle
})

const createMockSubmissionResult = (
  submittedOrderIds: string[],
  successfulOrders: number,
  failedOrders: number = 0
): OrderSubmissionResult => ({
  totalOrders: successfulOrders + failedOrders,
  successfulOrders,
  failedOrders,
  errors: [],
  submittedOrderIds,
  failedPositions: []
})

describe('DataCleanupService', () => {
  let service: DataCleanupService

  beforeEach(() => {
    service = new DataCleanupService()
  })

  afterEach(() => {
    // Clean up any active transactions
    service.cleanupStaleTransactions(0)
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig()
      expect(config.enableTransactions).toBe(true)
      expect(config.preserveFailedPositions).toBe(true)
      expect(config.cleanupEmptyPortfolios).toBe(true)
      expect(config.cleanupEmptyRebalances).toBe(true)
      expect(config.batchSize).toBe(100)
      expect(config.retainAuditTrail).toBe(true)
      expect(config.rollbackOnError).toBe(true)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<CleanupConfig> = {
        enableTransactions: false,
        batchSize: 50,
        rollbackOnError: false
      }
      const customService = new DataCleanupService(customConfig)
      const config = customService.getConfig()
      
      expect(config.enableTransactions).toBe(false)
      expect(config.batchSize).toBe(50)
      expect(config.rollbackOnError).toBe(false)
      expect(config.preserveFailedPositions).toBe(true) // Should keep defaults
    })

    it('should update configuration', () => {
      service.updateConfig({ batchSize: 200, enableTransactions: false })
      const config = service.getConfig()
      
      expect(config.batchSize).toBe(200)
      expect(config.enableTransactions).toBe(false)
      expect(config.preserveFailedPositions).toBe(true) // Unchanged
    })
  })

  describe('Transaction Management', () => {
    it('should create and track transactions', () => {
      const position = createMockPosition('SEC001')
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      service.processSuccessfulSubmissions(rebalance, submissionResult)

      const activeTransactions = service.getActiveTransactions()
      expect(activeTransactions.length).toBe(1)
      expect(activeTransactions[0].operations.length).toBeGreaterThan(0)
    })

    it('should clean up stale transactions', () => {
      // Create a service with transactions
      const position = createMockPosition('SEC001')
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      service.processSuccessfulSubmissions(rebalance, submissionResult)
      expect(service.getActiveTransactions().length).toBe(1)

      // Clean up with 0 max age - should remove all
      const cleanedCount = service.cleanupStaleTransactions(0)
      expect(cleanedCount).toBe(1)
      expect(service.getActiveTransactions().length).toBe(0)
    })

    it('should handle transactions with disabled configuration', () => {
      const serviceWithoutTransactions = new DataCleanupService({ enableTransactions: false })
      const position = createMockPosition('SEC001')
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      serviceWithoutTransactions.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(serviceWithoutTransactions.getActiveTransactions().length).toBe(0)
    })
  })

  describe('Position Cleanup', () => {
    it('should delete successfully submitted eligible positions', async () => {
      const submittedPosition = createMockPosition('SEC001', 'BUY', 100)
      const notSubmittedPosition = createMockPosition('SEC002', 'SELL', 50)
      const portfolio = createMockPortfolio('PORT001', [submittedPosition, notSubmittedPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPositions).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions[0].security_id).toBe('SEC002')
    })

    it('should preserve HOLD positions', async () => {
      const holdPosition = createMockPosition('SEC001', 'HOLD', 0)
      const buyPosition = createMockPosition('SEC002', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [holdPosition, buyPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001', 'SEC002'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      // HOLD position should be preserved even if "submitted"
      expect(result.updatedRebalance?.portfolios[0].positions.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions[0].security_id).toBe('SEC001')
      expect(result.deletedPositions).toBe(1) // Only BUY position deleted
    })

    it('should preserve zero-quantity positions', async () => {
      const zeroQuantityPosition = createMockPosition('SEC001', 'BUY', 0)
      const normalPosition = createMockPosition('SEC002', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [zeroQuantityPosition, normalPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001', 'SEC002'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      // Zero quantity position should be preserved
      expect(result.updatedRebalance?.portfolios[0].positions.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions[0].security_id).toBe('SEC001')
      expect(result.deletedPositions).toBe(1) // Only normal position deleted
    })

    it('should update submission state of preserved positions', async () => {
      const submittedPosition = createMockPosition('SEC001', 'HOLD', 0) // Will be preserved
      const portfolio = createMockPortfolio('PORT001', [submittedPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      const preservedPosition = result.updatedRebalance?.portfolios[0].positions[0]
      expect(preservedPosition?.submission).toBe(SubmissionState.Submitted)
      expect(preservedPosition?.isEligibleForSubmission).toBe(false)
    })
  })

  describe('Portfolio Cleanup', () => {
    it('should delete portfolio when all eligible positions are submitted', async () => {
      const position1 = createMockPosition('SEC001', 'BUY', 100)
      const position2 = createMockPosition('SEC002', 'SELL', 50)
      const portfolio = createMockPortfolio('PORT001', [position1, position2])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001', 'SEC002'], 2)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPortfolios).toBe(1)
      expect(result.updatedRebalance?.portfolios.length).toBe(0)
    })

    it('should preserve portfolio when some eligible positions remain', async () => {
      const submittedPosition = createMockPosition('SEC001', 'BUY', 100)
      const remainingPosition = createMockPosition('SEC002', 'SELL', 50)
      const portfolio = createMockPortfolio('PORT001', [submittedPosition, remainingPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPortfolios).toBe(0)
      expect(result.updatedRebalance?.portfolios.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions[0].security_id).toBe('SEC002')
    })

    it('should preserve portfolio with only HOLD positions', async () => {
      const holdPosition1 = createMockPosition('SEC001', 'HOLD', 0)
      const holdPosition2 = createMockPosition('SEC002', 'HOLD', 0)
      const portfolio = createMockPortfolio('PORT001', [holdPosition1, holdPosition2])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001', 'SEC002'], 0)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPortfolios).toBe(0)
      expect(result.updatedRebalance?.portfolios.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions.length).toBe(2)
    })

    it('should not delete portfolio when cleanup is disabled', async () => {
      const serviceNoCleanup = new DataCleanupService({ cleanupEmptyPortfolios: false })
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await serviceNoCleanup.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPortfolios).toBe(0)
      expect(result.updatedRebalance?.portfolios.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].positions.length).toBe(0) // Positions still deleted
    })

    it('should update portfolio submission state correctly', async () => {
      const submittedPosition = createMockPosition('SEC001', 'BUY', 100)
      const failedPosition = createMockPosition('SEC002', 'SELL', 50, SubmissionState.Failed)
      const portfolio = createMockPortfolio('PORT001', [submittedPosition, failedPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1, 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.updatedRebalance?.portfolios[0].submission).toBe(SubmissionState.PartiallySubmitted)
    })
  })

  describe('Rebalance Cleanup', () => {
    it('should delete rebalance when all portfolios are deleted', async () => {
      const position1 = createMockPosition('SEC001', 'BUY', 100)
      const position2 = createMockPosition('SEC002', 'SELL', 50)
      const portfolio1 = createMockPortfolio('PORT001', [position1])
      const portfolio2 = createMockPortfolio('PORT002', [position2])
      const rebalance = createMockRebalance('REB001', [portfolio1, portfolio2])
      const submissionResult = createMockSubmissionResult(['SEC001', 'SEC002'], 2)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedRebalances).toBe(1)
      expect(result.updatedRebalance).toBeUndefined()
    })

    it('should preserve rebalance when some portfolios remain', async () => {
      const submittedPosition = createMockPosition('SEC001', 'BUY', 100)
      const remainingPosition = createMockPosition('SEC002', 'SELL', 50)
      const emptyPortfolio = createMockPortfolio('PORT001', [submittedPosition])
      const remainingPortfolio = createMockPortfolio('PORT002', [remainingPosition])
      const rebalance = createMockRebalance('REB001', [emptyPortfolio, remainingPortfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedRebalances).toBe(0)
      expect(result.updatedRebalance?.portfolios.length).toBe(1)
      expect(result.updatedRebalance?.portfolios[0].portfolio_id).toBe('PORT002')
      expect(result.updatedRebalance?.number_of_portfolios).toBe(1)
    })

    it('should not delete rebalance when cleanup is disabled', async () => {
      const serviceNoCleanup = new DataCleanupService({ cleanupEmptyRebalances: false })
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await serviceNoCleanup.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedRebalances).toBe(0)
      expect(result.updatedRebalance?.portfolios.length).toBe(0) // Portfolio still deleted
      expect(result.updatedRebalance?.number_of_portfolios).toBe(0)
    })

    it('should update rebalance submission state correctly', async () => {
      const submittedPosition = createMockPosition('SEC001', 'BUY', 100)
      const remainingPosition = createMockPosition('SEC002', 'SELL', 50)
      const portfolio1 = createMockPortfolio('PORT001', [submittedPosition])
      const portfolio2 = createMockPortfolio('PORT002', [remainingPosition])
      const rebalance = createMockRebalance('REB001', [portfolio1, portfolio2])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.updatedRebalance?.submission).toBe(SubmissionState.PartiallySubmitted)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully when rollback is disabled', async () => {
      const serviceNoRollback = new DataCleanupService({ rollbackOnError: false })
      
      // Mock a scenario that would cause an error during portfolio processing
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await serviceNoRollback.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.errors.length).toBe(0) // No errors in this simple case
      expect(result.updatedRebalance).toBeDefined()
    })

    it('should preserve failed positions when configured', async () => {
      const successPosition = createMockPosition('SEC001', 'BUY', 100)
      const failedPosition = createMockPosition('SEC002', 'SELL', 50, SubmissionState.Failed)
      const portfolio = createMockPortfolio('PORT001', [successPosition, failedPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1, 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.preservedPositions.length).toBe(1)
      expect(result.preservedPositions[0].security_id).toBe('SEC002')
      expect(result.preservedPositions[0].submission).toBe(SubmissionState.Failed)
    })

    it('should handle empty submission results', async () => {
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult([], 0)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPositions).toBe(0)
      expect(result.deletedPortfolios).toBe(0)
      expect(result.deletedRebalances).toBe(0)
      expect(result.updatedRebalance?.portfolios.length).toBe(1)
    })
  })

  describe('Batch Processing', () => {
    it('should handle large numbers of positions efficiently', async () => {
      const positions = Array.from({ length: 1000 }, (_, i) => 
        createMockPosition(`SEC${i.toString().padStart(3, '0')}`, 'BUY', 100)
      )
      const portfolio = createMockPortfolio('PORT001', positions)
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submittedIds = positions.map(p => p.security_id)
      const submissionResult = createMockSubmissionResult(submittedIds, 1000)

      const startTime = Date.now()
      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)
      const processingTime = Date.now() - startTime

      expect(result.deletedPositions).toBe(1000)
      expect(result.deletedPortfolios).toBe(1)
      expect(processingTime).toBeLessThan(1000) // Should be fast
    })

    it('should handle multiple portfolios with many positions', async () => {
      const portfolios = Array.from({ length: 10 }, (_, portfolioIndex) => {
        const positions = Array.from({ length: 100 }, (_, positionIndex) => 
          createMockPosition(`SEC${portfolioIndex}_${positionIndex}`, 'BUY', 100)
        )
        return createMockPortfolio(`PORT${portfolioIndex}`, positions)
      })
      
      const rebalance = createMockRebalance('REB001', portfolios)
      const submittedIds = portfolios.flatMap(p => p.positions.map(pos => pos.security_id))
      const submissionResult = createMockSubmissionResult(submittedIds, 1000)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPositions).toBe(1000)
      expect(result.deletedPortfolios).toBe(10)
      expect(result.deletedRebalances).toBe(1)
    })
  })

  describe('Summary and Statistics', () => {
    it('should provide accurate summary statistics', async () => {
      const submittedPosition = createMockPosition('SEC001', 'BUY', 100)
      const failedPosition = createMockPosition('SEC002', 'SELL', 50, SubmissionState.Failed)
      const holdPosition = createMockPosition('SEC003', 'HOLD', 0)
      const portfolio = createMockPortfolio('PORT001', [submittedPosition, failedPosition, holdPosition])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1, 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.summary.totalPositionsProcessed).toBe(3)
      expect(result.summary.successfullySubmittedPositions).toBe(1)
      expect(result.summary.failedPositions).toBe(1)
      expect(result.summary.remainingEligiblePositions).toBe(1) // Only failed position remains eligible
    })

    it('should preserve portfolio and position references', async () => {
      const position1 = createMockPosition('SEC001', 'BUY', 100)
      const position2 = createMockPosition('SEC002', 'SELL', 50)
      const portfolio1 = createMockPortfolio('PORT001', [position1])
      const portfolio2 = createMockPortfolio('PORT002', [position2])
      const rebalance = createMockRebalance('REB001', [portfolio1, portfolio2])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await service.processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.preservedPositions.length).toBe(1)
      expect(result.preservedPositions[0].security_id).toBe('SEC002')
      expect(result.preservedPortfolios.length).toBe(1)
      expect(result.preservedPortfolios[0].portfolio_id).toBe('PORT002')
    })
  })

  describe('Convenience Functions', () => {
    it('should work with processSuccessfulSubmissions function', async () => {
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      const result = await processSuccessfulSubmissions(rebalance, submissionResult)

      expect(result.deletedPositions).toBe(1)
      expect(result.deletedPortfolios).toBe(1)
      expect(result.deletedRebalances).toBe(1)
    })

    it('should work with custom configuration via convenience function', async () => {
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)
      
      const customConfig = { cleanupEmptyPortfolios: false, cleanupEmptyRebalances: false }
      const result = await processSuccessfulSubmissions(rebalance, submissionResult, customConfig)

      expect(result.deletedPositions).toBe(1)
      expect(result.deletedPortfolios).toBe(0) // Should be preserved due to config
      expect(result.deletedRebalances).toBe(0) // Should be preserved due to config
    })
  })

  describe('Global Service Instance', () => {
    it('should have a global service instance', () => {
      expect(dataCleanupService).toBeInstanceOf(DataCleanupService)
      expect(dataCleanupService.getConfig()).toBeDefined()
    })

    it('should maintain state across calls', () => {
      const initialTransactionCount = dataCleanupService.getActiveTransactions().length
      
      const position = createMockPosition('SEC001', 'BUY', 100)
      const portfolio = createMockPortfolio('PORT001', [position])
      const rebalance = createMockRebalance('REB001', [portfolio])
      const submissionResult = createMockSubmissionResult(['SEC001'], 1)

      dataCleanupService.processSuccessfulSubmissions(rebalance, submissionResult)
      
      const newTransactionCount = dataCleanupService.getActiveTransactions().length
      expect(newTransactionCount).toBeGreaterThan(initialTransactionCount)
    })
  })
}) 