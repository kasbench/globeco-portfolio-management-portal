import { describe, it, expect } from '@jest/globals'
import { transformToSubmissionRebalance, validateOrderEligibility } from '../rebalanceTransform'
import { Rebalance, RebalancePosition } from '@/types/rebalance'

describe('rebalanceTransform', () => {
  describe('validateOrderEligibility', () => {
    it('should validate BUY positions with non-zero quantities', () => {
      const position: RebalancePosition = {
        position_id: 'pos-1',
        security_id: 'SEC001',
        symbol: 'AAPL',
        current_weight: 0.05,
        target_weight: 0.10,
        current_quantity: 100,
        target_quantity: 200,
        trade_quantity: 100,
        transaction_type: 'BUY',
        current_price: 150.00,
        market_value: 15000,
        version: 1
      }

      expect(validateOrderEligibility(position)).toBe(true)
    })

    it('should validate SELL positions with non-zero quantities', () => {
      const position: RebalancePosition = {
        position_id: 'pos-2',
        security_id: 'SEC002',
        symbol: 'GOOGL',
        current_weight: 0.10,
        target_weight: 0.05,
        current_quantity: 200,
        target_quantity: 100,
        trade_quantity: -100,
        transaction_type: 'SELL',
        current_price: 2500.00,
        market_value: 250000,
        version: 1
      }

      expect(validateOrderEligibility(position)).toBe(true)
    })

    it('should reject HOLD positions', () => {
      const position: RebalancePosition = {
        position_id: 'pos-3',
        security_id: 'SEC003',
        symbol: 'MSFT',
        current_weight: 0.08,
        target_weight: 0.08,
        current_quantity: 150,
        target_quantity: 150,
        trade_quantity: 0,
        transaction_type: 'HOLD',
        current_price: 300.00,
        market_value: 45000,
        version: 1
      }

      expect(validateOrderEligibility(position)).toBe(false)
    })

    it('should reject positions with zero trade quantities', () => {
      const position: RebalancePosition = {
        position_id: 'pos-4',
        security_id: 'SEC004',
        symbol: 'TSLA',
        current_weight: 0.06,
        target_weight: 0.06,
        current_quantity: 50,
        target_quantity: 50,
        trade_quantity: 0,
        transaction_type: 'BUY',
        current_price: 800.00,
        market_value: 40000,
        version: 1
      }

      expect(validateOrderEligibility(position)).toBe(false)
    })

    it('should reject positions with undefined transaction_type', () => {
      const position: RebalancePosition = {
        position_id: 'pos-5',
        security_id: 'SEC005',
        symbol: 'AMZN',
        current_weight: 0.07,
        target_weight: 0.09,
        current_quantity: 30,
        target_quantity: 40,
        trade_quantity: 10,
        transaction_type: undefined as any,
        current_price: 3000.00,
        market_value: 90000,
        version: 1
      }

      expect(validateOrderEligibility(position)).toBe(false)
    })

    it('should reject positions with null trade_quantity', () => {
      const position: RebalancePosition = {
        position_id: 'pos-6',
        security_id: 'SEC006',
        symbol: 'NFLX',
        current_weight: 0.04,
        target_weight: 0.06,
        current_quantity: 20,
        target_quantity: 30,
        trade_quantity: null as any,
        transaction_type: 'BUY',
        current_price: 400.00,
        market_value: 8000,
        version: 1
      }

      expect(validateOrderEligibility(position)).toBe(false)
    })
  })

  describe('transformToSubmissionRebalance', () => {
    const mockRebalance: Rebalance = {
      rebalance_id: 'rebal-123',
      model_id: 'model-456',
      model_name: 'Growth Model',
      rebalance_date: '2025-01-17T10:00:00Z',
      total_portfolios: 2,
      version: 1,
      portfolios: [
        {
          portfolio_id: 'port-001',
          portfolio_name: 'Growth Portfolio 1',
          total_positions: 3,
          version: 1,
          positions: [
            {
              position_id: 'pos-1',
              security_id: 'SEC001',
              symbol: 'AAPL',
              current_weight: 0.05,
              target_weight: 0.10,
              current_quantity: 100,
              target_quantity: 200,
              trade_quantity: 100,
              transaction_type: 'BUY',
              current_price: 150.00,
              market_value: 15000,
              version: 1
            },
            {
              position_id: 'pos-2',
              security_id: 'SEC002',
              symbol: 'GOOGL',
              current_weight: 0.10,
              target_weight: 0.05,
              current_quantity: 200,
              target_quantity: 100,
              trade_quantity: -100,
              transaction_type: 'SELL',
              current_price: 2500.00,
              market_value: 250000,
              version: 1
            },
            {
              position_id: 'pos-3',
              security_id: 'SEC003',
              symbol: 'MSFT',
              current_weight: 0.08,
              target_weight: 0.08,
              current_quantity: 150,
              target_quantity: 150,
              trade_quantity: 0,
              transaction_type: 'HOLD',
              current_price: 300.00,
              market_value: 45000,
              version: 1
            }
          ]
        },
        {
          portfolio_id: 'port-002',
          portfolio_name: 'Growth Portfolio 2',
          total_positions: 1,
          version: 1,
          positions: [
            {
              position_id: 'pos-4',
              security_id: 'SEC004',
              symbol: 'TSLA',
              current_weight: 0.06,
              target_weight: 0.12,
              current_quantity: 50,
              target_quantity: 100,
              trade_quantity: 50,
              transaction_type: 'BUY',
              current_price: 800.00,
              market_value: 40000,
              version: 1
            }
          ]
        }
      ]
    }

    it('should transform rebalance to submission format', () => {
      const result = transformToSubmissionRebalance(mockRebalance)

      expect(result).toEqual({
        rebalance_id: 'rebal-123',
        model_id: 'model-456',
        model_name: 'Growth Model',
        rebalance_date: '2025-01-17T10:00:00Z',
        total_portfolios: 2,
        version: 1,
        submission: 'not_submitted',
        totalEligibleOrders: 3,
        portfolios: [
          {
            portfolio_id: 'port-001',
            portfolio_name: 'Growth Portfolio 1',
            total_positions: 3,
            version: 1,
            submission: 'not_submitted',
            eligibleOrderCount: 2,
            positions: [
              {
                position_id: 'pos-1',
                security_id: 'SEC001',
                symbol: 'AAPL',
                current_weight: 0.05,
                target_weight: 0.10,
                current_quantity: 100,
                target_quantity: 200,
                trade_quantity: 100,
                transaction_type: 'BUY',
                current_price: 150.00,
                market_value: 15000,
                version: 1,
                isEligibleForSubmission: true,
                submission: 'not_submitted'
              },
              {
                position_id: 'pos-2',
                security_id: 'SEC002',
                symbol: 'GOOGL',
                current_weight: 0.10,
                target_weight: 0.05,
                current_quantity: 200,
                target_quantity: 100,
                trade_quantity: -100,
                transaction_type: 'SELL',
                current_price: 2500.00,
                market_value: 250000,
                version: 1,
                isEligibleForSubmission: true,
                submission: 'not_submitted'
              },
              {
                position_id: 'pos-3',
                security_id: 'SEC003',
                symbol: 'MSFT',
                current_weight: 0.08,
                target_weight: 0.08,
                current_quantity: 150,
                target_quantity: 150,
                trade_quantity: 0,
                transaction_type: 'HOLD',
                current_price: 300.00,
                market_value: 45000,
                version: 1,
                isEligibleForSubmission: false,
                submission: 'not_submitted'
              }
            ]
          },
          {
            portfolio_id: 'port-002',
            portfolio_name: 'Growth Portfolio 2',
            total_positions: 1,
            version: 1,
            submission: 'not_submitted',
            eligibleOrderCount: 1,
            positions: [
              {
                position_id: 'pos-4',
                security_id: 'SEC004',
                symbol: 'TSLA',
                current_weight: 0.06,
                target_weight: 0.12,
                current_quantity: 50,
                target_quantity: 100,
                trade_quantity: 50,
                transaction_type: 'BUY',
                current_price: 800.00,
                market_value: 40000,
                version: 1,
                isEligibleForSubmission: true,
                submission: 'not_submitted'
              }
            ]
          }
        ]
      })
    })

    it('should filter out eligible positions when requested', () => {
      const result = transformToSubmissionRebalance(mockRebalance, { filterEligibleOnly: true })

      expect(result.portfolios[0].positions).toHaveLength(2) // Excludes HOLD position
      expect(result.portfolios[0].positions[0].transaction_type).toBe('BUY')
      expect(result.portfolios[0].positions[1].transaction_type).toBe('SELL')
      expect(result.portfolios[1].positions).toHaveLength(1) // Includes BUY position
    })

    it('should count eligible orders correctly', () => {
      const eligibleCount = mockRebalance.portfolios!
        .flatMap(p => p.positions || [])
        .filter(validateOrderEligibility)
        .length

      expect(eligibleCount).toBe(3) // 2 BUY + 1 SELL, excludes 1 HOLD
    })

    it('should handle empty portfolios gracefully', () => {
      const emptyRebalance: Rebalance = {
        rebalance_id: 'rebal-empty',
        model_id: 'model-empty',
        model_name: 'Empty Model',
        rebalance_date: '2025-01-17T10:00:00Z',
        total_portfolios: 0,
        version: 1,
        portfolios: []
      }

      const result = transformToSubmissionRebalance(emptyRebalance)
      expect(result.portfolios).toHaveLength(0)
    })

    it('should handle portfolios without positions gracefully', () => {
      const rebalanceWithoutPositions: Rebalance = {
        rebalance_id: 'rebal-no-pos',
        model_id: 'model-no-pos',
        model_name: 'No Positions Model',
        rebalance_date: '2025-01-17T10:00:00Z',
        total_portfolios: 1,
        version: 1,
        portfolios: [
          {
            portfolio_id: 'port-no-pos',
            portfolio_name: 'Portfolio Without Positions',
            total_positions: 0,
            version: 1,
            positions: []
          }
        ]
      }

      const result = transformToSubmissionRebalance(rebalanceWithoutPositions)
      expect(result.portfolios[0].positions).toHaveLength(0)
    })
  })
}) 