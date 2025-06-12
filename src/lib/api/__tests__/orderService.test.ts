import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import axios from 'axios'
import { orderServiceApi } from '../orderService'
import { SubmissionRebalance } from '@/types/rebalance'
import { OrderSubmissionResult } from '@/types/order'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('orderService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Mock axios.create to return the mocked axios instance
    mockedAxios.create = jest.fn().mockReturnValue(mockedAxios)
    
    // Setup default interceptors (no-op for tests)
    mockedAxios.interceptors = {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    } as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const mockSubmissionRebalance: SubmissionRebalance = {
    rebalance_id: 'rebal-123',
    model_id: 'model-456',
    model_name: 'Test Model',
    rebalance_date: '2025-01-17T10:00:00Z',
    version: 1,
    portfolios: [
      {
        portfolio_id: 'port-001',
        portfolio_name: 'Test Portfolio',
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
          }
        ]
      }
    ]
  }

  describe('submitRebalanceOrders', () => {
    it('should successfully submit orders and return results', async () => {
      const mockResponse = {
        data: {
          totalOrders: 2,
          successfulOrders: 2,
          failedOrders: 0,
          submittedOrderIds: ['order-1', 'order-2'],
          errors: [],
          failedPositions: []
        },
        status: 200
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const progressCallback = jest.fn()
      const result = await orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        progressCallback
      )

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/orders', expect.objectContaining({
        orders: expect.arrayContaining([
          expect.objectContaining({
            blotterId: 1,
            statusId: 1,
            portfolioId: 'port-001',
            orderTypeId: 1, // BUY
            securityId: 'SEC001',
            quantity: 100,
            limitPrice: null,
            orderTimestamp: expect.any(String),
            version: 1
          }),
          expect.objectContaining({
            blotterId: 1,
            statusId: 1,
            portfolioId: 'port-001',
            orderTypeId: 2, // SELL
            securityId: 'SEC002',
            quantity: 100, // Absolute value
            limitPrice: null,
            orderTimestamp: expect.any(String),
            version: 1
          })
        ])
      }))

      expect(result.result).toEqual({
        totalOrders: 2,
        successfulOrders: 2,
        failedOrders: 0,
        submittedOrderIds: ['order-1', 'order-2'],
        errors: [],
        failedPositions: []
      })

      expect(progressCallback).toHaveBeenCalledWith({
        currentPortfolio: 1,
        totalPortfolios: 1,
        submitted: 2,
        failed: 0,
        total: 2
      })
    })

    it('should handle partial success responses (HTTP 207)', async () => {
      const mockResponse = {
        data: {
          totalOrders: 2,
          successfulOrders: 1,
          failedOrders: 1,
          submittedOrderIds: ['order-1'],
          errors: ['Order validation failed for position pos-2'],
          failedPositions: ['pos-2']
        },
        status: 207
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const progressCallback = jest.fn()
      const result = await orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        progressCallback
      )

      expect(result.result.successfulOrders).toBe(1)
      expect(result.result.failedOrders).toBe(1)
      expect(result.result.errors).toContain('Order validation failed for position pos-2')
      expect(result.result.failedPositions).toContain('pos-2')
    })

    it('should handle HTTP 400 Bad Request errors', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            message: 'Invalid order data',
            details: 'Missing required field: portfolioId'
          }
        },
        config: {
          url: '/api/v1/orders',
          method: 'post'
        }
      }

      mockedAxios.post.mockRejectedValueOnce(mockError)

      await expect(orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        jest.fn()
      )).rejects.toThrow('API Error: Invalid order data')
    })

    it('should handle HTTP 413 Payload Too Large errors', async () => {
      const mockError = {
        response: {
          status: 413,
          statusText: 'Payload Too Large',
          data: {
            message: 'Request payload exceeds maximum size limit',
            maxAllowedSize: '1MB',
            receivedSize: '2MB'
          }
        },
        config: {
          url: '/api/v1/orders',
          method: 'post'
        }
      }

      mockedAxios.post.mockRejectedValueOnce(mockError)

      await expect(orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        jest.fn()
      )).rejects.toThrow('API Error: Request payload exceeds maximum size limit')
    })

    it('should handle HTTP 500 Internal Server Error', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            message: 'Database connection failed'
          }
        },
        config: {
          url: '/api/v1/orders',
          method: 'post'
        }
      }

      mockedAxios.post.mockRejectedValueOnce(mockError)

      await expect(orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        jest.fn()
      )).rejects.toThrow('API Error: Database connection failed')
    })

    it('should handle network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error',
        config: {
          url: '/api/v1/orders',
          baseURL: 'http://globeco-order-service:8081'
        }
      }

      mockedAxios.post.mockRejectedValueOnce(mockError)

      await expect(orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        jest.fn()
      )).rejects.toThrow('Network Error: Unable to connect to http://globeco-order-service:8081')
    })

    it('should handle configuration errors', async () => {
      const mockError = {
        message: 'Request failed with status code 404',
        config: {}
      }

      mockedAxios.post.mockRejectedValueOnce(mockError)

      await expect(orderServiceApi.submitRebalanceOrders(
        mockSubmissionRebalance,
        jest.fn()
      )).rejects.toThrow('Configuration Error: Request failed with status code 404')
    })

    it('should process large batches correctly', async () => {
      // Create a rebalance with many positions to test batch processing
      const largeRebalance: SubmissionRebalance = {
        ...mockSubmissionRebalance,
        portfolios: [
          {
            portfolio_id: 'port-large',
            portfolio_name: 'Large Portfolio',
            version: 1,
            positions: Array.from({ length: 1500 }, (_, i) => ({
              position_id: `pos-${i}`,
              security_id: `SEC${String(i).padStart(3, '0')}`,
              symbol: `STOCK${i}`,
              current_weight: 0.001,
              target_weight: 0.002,
              current_quantity: 10,
              target_quantity: 20,
              trade_quantity: 10,
              transaction_type: 'BUY' as const,
              current_price: 100,
              market_value: 1000,
              version: 1
            }))
          }
        ]
      }

      // Mock multiple batch responses
      const mockBatchResponse1 = {
        data: {
          totalOrders: 1000,
          successfulOrders: 1000,
          failedOrders: 0,
          submittedOrderIds: Array.from({ length: 1000 }, (_, i) => `order-${i}`),
          errors: [],
          failedPositions: []
        },
        status: 200
      }

      const mockBatchResponse2 = {
        data: {
          totalOrders: 500,
          successfulOrders: 500,
          failedOrders: 0,
          submittedOrderIds: Array.from({ length: 500 }, (_, i) => `order-${i + 1000}`),
          errors: [],
          failedPositions: []
        },
        status: 200
      }

      mockedAxios.post
        .mockResolvedValueOnce(mockBatchResponse1)
        .mockResolvedValueOnce(mockBatchResponse2)

      const progressCallback = jest.fn()
      const result = await orderServiceApi.submitRebalanceOrders(
        largeRebalance,
        progressCallback
      )

      // Should make two API calls for the batches
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
      
      // First batch should have 1000 orders
      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/v1/orders', 
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({ securityId: 'SEC000' }),
            expect.objectContaining({ securityId: 'SEC999' })
          ])
        })
      )

      // Second batch should have 500 orders
      expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/v1/orders',
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({ securityId: 'SEC1000' }),
            expect.objectContaining({ securityId: 'SEC1499' })
          ])
        })
      )

      // Aggregate results should be correct
      expect(result.result.totalOrders).toBe(1500)
      expect(result.result.successfulOrders).toBe(1500)
      expect(result.result.failedOrders).toBe(0)

      // Progress callback should be called for each batch
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          submitted: 1000,
          total: 1500
        })
      )
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          submitted: 1500,
          total: 1500
        })
      )
    })

    it('should filter out ineligible positions', async () => {
      const rebalanceWithIneligible: SubmissionRebalance = {
        rebalance_id: 'rebal-mixed',
        model_id: 'model-mixed',
        model_name: 'Mixed Model',
        rebalance_date: '2025-01-17T10:00:00Z',
        version: 1,
        portfolios: [
          {
            portfolio_id: 'port-mixed',
            portfolio_name: 'Mixed Portfolio',
            version: 1,
            positions: [
              {
                position_id: 'pos-buy',
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
                position_id: 'pos-hold',
                security_id: 'SEC002',
                symbol: 'GOOGL',
                current_weight: 0.10,
                target_weight: 0.10,
                current_quantity: 100,
                target_quantity: 100,
                trade_quantity: 0,
                transaction_type: 'HOLD',
                current_price: 2500.00,
                market_value: 250000,
                version: 1
              },
              {
                position_id: 'pos-zero',
                security_id: 'SEC003',
                symbol: 'MSFT',
                current_weight: 0.08,
                target_weight: 0.08,
                current_quantity: 150,
                target_quantity: 150,
                trade_quantity: 0,
                transaction_type: 'BUY',
                current_price: 300.00,
                market_value: 45000,
                version: 1
              }
            ]
          }
        ]
      }

      const mockResponse = {
        data: {
          totalOrders: 1,
          successfulOrders: 1,
          failedOrders: 0,
          submittedOrderIds: ['order-1'],
          errors: [],
          failedPositions: []
        },
        status: 200
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await orderServiceApi.submitRebalanceOrders(
        rebalanceWithIneligible,
        jest.fn()
      )

      // Should only submit the one eligible BUY order
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/orders', 
        expect.objectContaining({
          orders: expect.arrayContaining([
            expect.objectContaining({
              portfolioId: 'port-mixed',
              securityId: 'SEC001',
              orderTypeId: 1, // BUY
              quantity: 100
            })
          ])
        })
      )

      // Should not include HOLD or zero-quantity positions
      const submittedOrders = mockedAxios.post.mock.calls[0][1].orders
      expect(submittedOrders).toHaveLength(1)
      expect(submittedOrders.find((o: any) => o.securityId === 'SEC002')).toBeUndefined()
      expect(submittedOrders.find((o: any) => o.securityId === 'SEC003')).toBeUndefined()
    })
  })

  describe('health check endpoints', () => {
    it('should call health check endpoint', async () => {
      const mockResponse = { data: { status: 'healthy' }, status: 200 }
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderServiceApi.healthCheck()

      expect(mockedAxios.get).toHaveBeenCalledWith('/health/health')
      expect(result).toEqual({ status: 'healthy' })
    })

    it('should call liveness check endpoint', async () => {
      const mockResponse = { data: { status: 'alive' }, status: 200 }
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderServiceApi.livenessCheck()

      expect(mockedAxios.get).toHaveBeenCalledWith('/health/live')
      expect(result).toEqual({ status: 'alive' })
    })

    it('should call readiness check endpoint', async () => {
      const mockResponse = { data: { status: 'ready' }, status: 200 }
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderServiceApi.readinessCheck()

      expect(mockedAxios.get).toHaveBeenCalledWith('/health/ready')
      expect(result).toEqual({ status: 'ready' })
    })
  })
}) 