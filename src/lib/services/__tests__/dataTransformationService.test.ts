// Comprehensive tests for DataTransformationService

import { DataTransformationService, dataTransformationService } from '../dataTransformationService'
import { RebalanceWithSubmission } from '@/types/rebalance'
import { OrderPostDTO, SubmissionState } from '@/types/order'

// Mock data for testing
const createMockRebalance = (): RebalanceWithSubmission => ({
  rebalance_id: 'rebal_123',
  model_id: 'model_456',
  model_name: 'Test Model',
  rebalance_date: '2024-01-01T00:00:00Z',
  version: 1,
  portfolios: [
    {
      portfolio_id: 'port_1',
      market_value_before_rebalance: 1000000,
      market_value_after_rebalance: 1050000,
      cash_before_rebalance: 50000,
      cash_after_rebalance: 25000,
      positions: [
        {
          security_id: 'sec_1',
          price: 100,
          original_quantity: 100,
          adjusted_quantity: 150,
          original_position_market_value: 10000,
          adjusted_position_market_value: 15000,
          target_allocation: 0.15,
          actual_allocation: 0.142,
          actual_drift: 0.008,
          high_drift: 0.02,
          low_drift: 0.005,
          transaction_type: 'BUY',
          trade_quantity: 50,
          isEligibleForSubmission: true,
          submission: SubmissionState.Idle
        },
        {
          security_id: 'sec_2',
          price: 200,
          original_quantity: 50,
          adjusted_quantity: 25,
          original_position_market_value: 10000,
          adjusted_position_market_value: 5000,
          target_allocation: 0.05,
          actual_allocation: 0.048,
          actual_drift: 0.002,
          high_drift: 0.02,
          low_drift: 0.005,
          transaction_type: 'SELL',
          trade_quantity: 25,
          isEligibleForSubmission: true,
          submission: SubmissionState.Idle
        },
        {
          security_id: 'sec_3',
          price: 150,
          original_quantity: 100,
          adjusted_quantity: 100,
          original_position_market_value: 15000,
          adjusted_position_market_value: 15000,
          target_allocation: 0.15,
          actual_allocation: 0.15,
          actual_drift: 0.0,
          high_drift: 0.02,
          low_drift: 0.005,
          transaction_type: 'HOLD',
          trade_quantity: 0,
          isEligibleForSubmission: false,
          submission: SubmissionState.Idle
        }
      ],
      eligibleOrderCount: 2,
      submission: SubmissionState.Idle
    },
    {
      portfolio_id: 'port_2',
      market_value_before_rebalance: 500000,
      market_value_after_rebalance: 525000,
      cash_before_rebalance: 25000,
      cash_after_rebalance: 15000,
      positions: [
        {
          security_id: 'sec_4',
          price: 75,
          original_quantity: 200,
          adjusted_quantity: 250,
          original_position_market_value: 15000,
          adjusted_position_market_value: 18750,
          target_allocation: 0.18,
          actual_allocation: 0.175,
          actual_drift: 0.005,
          high_drift: 0.02,
          low_drift: 0.005,
          transaction_type: 'BUY',
          trade_quantity: 50,
          isEligibleForSubmission: true,
          submission: SubmissionState.Idle
        }
      ],
      eligibleOrderCount: 1,
      submission: SubmissionState.Idle
    }
  ],
  totalEligibleOrders: 3,
  submission: SubmissionState.Idle
})

describe('DataTransformationService', () => {
  let service: DataTransformationService
  let mockRebalance: RebalanceWithSubmission

  beforeEach(() => {
    service = new DataTransformationService()
    mockRebalance = createMockRebalance()
  })

  describe('generateOrderTimestamp', () => {
    it('should generate ISO timestamp by default', () => {
      const timestamp = service.generateOrderTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should handle timezone conversion', () => {
      const timestamp = service.generateOrderTimestamp('America/New_York')
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should fallback to UTC for invalid timezone', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const timestamp = service.generateOrderTimestamp('Invalid/Timezone')
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid timezone Invalid/Timezone, using UTC')
      consoleWarnSpy.mockRestore()
    })
  })

  describe('mapRebalanceToOrders', () => {
    it('should map eligible positions to orders', () => {
      const result = service.mapRebalanceToOrders(mockRebalance)

      expect(result.orders).toHaveLength(3)
      expect(result.summary.eligiblePositions).toBe(3)
      expect(result.summary.buyOrders).toBe(2)
      expect(result.summary.sellOrders).toBe(1)
      expect(result.warnings).toEqual([])
    })

    it('should include validation when requested', () => {
      const result = service.mapRebalanceToOrders(mockRebalance, {
        validateBeforeMapping: true
      })

      expect(result.validationResults.isValid).toBe(true)
      expect(result.validationResults.errors).toHaveLength(0)
    })

    it('should generate fresh timestamps when requested', () => {
      const result = service.mapRebalanceToOrders(mockRebalance, {
        generateTimestamps: true
      })

      const timestamps = result.orders.map(order => order.orderTimestamp)
      expect(timestamps.every(ts => typeof ts === 'string')).toBe(true)
      expect(timestamps.every(ts => ts.match(/^\d{4}-\d{2}-\d{2}T/))).toBe(true)
    })

    it('should handle rebalance with no eligible positions', () => {
      const emptyRebalance: RebalanceWithSubmission = {
        ...mockRebalance,
        portfolios: [],
        totalEligibleOrders: 0
      }

      const result = service.mapRebalanceToOrders(emptyRebalance)

      expect(result.orders).toHaveLength(0)
      expect(result.warnings).toContain('No eligible positions found for order submission')
    })

    it('should include timeline information', () => {
      const result = service.mapRebalanceToOrders(mockRebalance)

      expect(result.timeline).toBeDefined()
      expect(result.timeline.submissionRequestId).toMatch(/^order_\d{8}_[a-f0-9]{8}$/)
      expect(result.timeline.createdAt).toBeInstanceOf(Date)
      expect(result.timeline.estimatedCompletionTime).toBeInstanceOf(Date)
      expect(result.timeline.totalOrders).toBe(3)
      expect(result.timeline.batchCount).toBe(1)
    })
  })

  describe('optimizedBatchSplitting', () => {
    it('should split orders into optimized batches', () => {
      // Create many orders to test batching
      const orders: OrderPostDTO[] = Array.from({ length: 1200 }, (_, i) => ({
        blotterId: 1,
        statusId: 1,
        portfolioId: `port_${i % 3}`,
        orderTypeId: 1,
        securityId: `sec_${i}`,
        quantity: 100,
        limitPrice: null,
        tradeOrderId: null,
        orderTimestamp: new Date().toISOString(),
        version: 1
      }))

      const result = service.optimizedBatchSplitting(orders)

      expect(result.batches.length).toBeGreaterThan(1)
      expect(result.batchInfo).toHaveLength(result.batches.length)
      expect(result.optimizationMetrics.totalBatches).toBe(result.batches.length)
      expect(result.optimizationMetrics.averageBatchSize).toBeGreaterThan(0)
    })

    it('should preserve portfolio groups when requested', () => {
      const orders: OrderPostDTO[] = [
        {
          blotterId: 1,
          statusId: 1,
          portfolioId: 'port_1',
          orderTypeId: 1,
          securityId: 'sec_1',
          quantity: 100,
          limitPrice: null,
          tradeOrderId: null,
          orderTimestamp: new Date().toISOString(),
          version: 1
        },
        {
          blotterId: 1,
          statusId: 1,
          portfolioId: 'port_1',
          orderTypeId: 1,
          securityId: 'sec_2',
          quantity: 100,
          limitPrice: null,
          tradeOrderId: null,
          orderTimestamp: new Date().toISOString(),
          version: 1
        }
      ]

      const result = service.optimizedBatchSplitting(orders, {
        preservePortfolioGroups: true
      })

      // All orders from same portfolio should be in same batch
      expect(result.batches[0]).toHaveLength(2)
      expect(result.batchInfo[0].portfolioIds).toEqual(['port_1'])
    })

    it('should provide detailed batch information', () => {
      const orders: OrderPostDTO[] = Array.from({ length: 10 }, (_, i) => ({
        blotterId: 1,
        statusId: 1,
        portfolioId: 'port_1',
        orderTypeId: 1,
        securityId: `sec_${i}`,
        quantity: 100,
        limitPrice: null,
        tradeOrderId: null,
        orderTimestamp: new Date().toISOString(),
        version: 1
      }))

      const result = service.optimizedBatchSplitting(orders)

      expect(result.batchInfo[0]).toHaveProperty('batchIndex', 0)
      expect(result.batchInfo[0]).toHaveProperty('orderCount', 10)
      expect(result.batchInfo[0]).toHaveProperty('portfolioIds', ['port_1'])
      expect(result.batchInfo[0]).toHaveProperty('estimatedSizeKB')
      expect(result.batchInfo[0]).toHaveProperty('estimatedProcessingTimeMs')
    })
  })

  describe('generateSubmissionPreview', () => {
    it('should generate comprehensive submission preview', () => {
      const preview = service.generateSubmissionPreview(mockRebalance)

      expect(preview.rebalanceId).toBe('rebal_123')
      expect(preview.orderCount).toBe(3)
      expect(preview.portfolioCount).toBe(2)
      expect(preview.summary.eligiblePositions).toBe(3)
      expect(preview.rebalanceSummary.totalPortfolios).toBe(2)
      expect(preview.warnings).toEqual([])
      expect(preview.isReady).toBe(true)
    })

    it('should include batch details when requested', () => {
      const preview = service.generateSubmissionPreview(mockRebalance, {
        includeBatchDetails: true
      })

      expect(preview.batchDetails).toBeDefined()
      expect(preview.batchDetails!.batchCount).toBe(1)
      expect(preview.batchDetails!.averageBatchSize).toBe(3)
    })

    it('should include validation when requested', () => {
      const preview = service.generateSubmissionPreview(mockRebalance, {
        includeValidation: true
      })

      expect(preview.validation).toBeDefined()
      expect(preview.validation!.isValid).toBe(true)
    })

    it('should include timeline when requested', () => {
      const preview = service.generateSubmissionPreview(mockRebalance, {
        includeTimeline: true
      })

      expect(preview.timeline).toBeDefined()
      expect(preview.timeline!.totalOrders).toBe(3)
    })

    it('should mark as not ready when no eligible orders', () => {
      const emptyRebalance: RebalanceWithSubmission = {
        ...mockRebalance,
        portfolios: [],
        totalEligibleOrders: 0
      }

      const preview = service.generateSubmissionPreview(emptyRebalance)

      expect(preview.isReady).toBe(false)
      expect(preview.orderCount).toBe(0)
    })
  })

  describe('validateLargeDatasetCapabilities', () => {
    it('should validate small datasets as supported', () => {
      const result = service.validateLargeDatasetCapabilities(100)

      expect(result.isSupported).toBe(true)
      expect(result.estimatedBatches).toBe(1)
      expect(result.warnings).toHaveLength(0)
      expect(result.recommendations).toHaveLength(0)
    })

    it('should identify memory limitations', () => {
      const result = service.validateLargeDatasetCapabilities(500000) // Very large dataset

      expect(result.isSupported).toBe(false)
      expect(result.warnings.some(w => w.includes('memory usage'))).toBe(true)
      expect(result.recommendations.some(r => r.includes('reducing batch size'))).toBe(true)
    })

    it('should identify processing time concerns', () => {
      const result = service.validateLargeDatasetCapabilities(100000)

      expect(result.warnings.some(w => w.includes('processing time'))).toBe(true)
      expect(result.recommendations.some(r => r.includes('background processing'))).toBe(true)
    })

    it('should identify batch count limitations', () => {
      const result = service.validateLargeDatasetCapabilities(100000, {
        maxBatchCount: 10
      })

      expect(result.isSupported).toBe(false)
      expect(result.warnings.some(w => w.includes('batch count'))).toBe(true)
    })

    it('should provide recommendations for very large datasets', () => {
      const result = service.validateLargeDatasetCapabilities(15000)

      expect(result.recommendations.some(r => r.includes('progress indicators'))).toBe(true)
    })
  })

  describe('default service instance', () => {
    it('should provide working default service instance', () => {
      expect(dataTransformationService).toBeInstanceOf(DataTransformationService)
    })

    it('should have working quick utility functions', () => {
      const { quickTransformRebalanceToOrders } = require('../dataTransformationService')
      
      const result = quickTransformRebalanceToOrders(mockRebalance)
      expect(result.orders).toHaveLength(3)
      expect(result.summary.eligiblePositions).toBe(3)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle positions without portfolio_id gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const invalidRebalance = {
        ...mockRebalance,
        portfolios: [{
          ...mockRebalance.portfolios[0],
          positions: [{
            ...mockRebalance.portfolios[0].positions[0],
            // Remove portfolio_id reference
          }]
        }]
      }

      // Remove the portfolio_id property entirely
      delete (invalidRebalance.portfolios[0].positions[0] as any).portfolio_id

      const result = service.mapRebalanceToOrders(invalidRebalance)

      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(result.orders).toHaveLength(0) // Should skip positions without portfolio_id
      consoleWarnSpy.mockRestore()
    })

    it('should handle mapping errors gracefully', () => {
      const invalidRebalance = {
        ...mockRebalance,
        portfolios: [{
          ...mockRebalance.portfolios[0],
          positions: [{
            ...mockRebalance.portfolios[0].positions[0],
            transaction_type: 'INVALID' as any // Invalid transaction type
          }]
        }]
      }

      const result = service.mapRebalanceToOrders(invalidRebalance)

      expect(result.warnings.some(w => w.includes('Failed to map positions'))).toBe(true)
    })

    it('should handle empty batches in optimization', () => {
      const result = service.optimizedBatchSplitting([])

      expect(result.batches).toHaveLength(0)
      expect(result.batchInfo).toHaveLength(0)
      expect(result.optimizationMetrics.totalBatches).toBe(0)
    })
  })
}) 