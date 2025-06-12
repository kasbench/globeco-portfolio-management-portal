import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import axios from 'axios'
import { orderGenerationApi } from '../orderGenerationService'
import { Rebalance } from '@/types/rebalance'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('orderGenerationService', () => {
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

  describe('deleteRebalance', () => {
    it('should successfully delete a rebalance', async () => {
      const mockResponse = {
        data: {
          message: 'Rebalance rebal-123 deleted successfully'
        },
        status: 200
      }

      mockedAxios.delete.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.deleteRebalance('rebal-123', 1)

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        '/api/v1/rebalance/rebal-123',
        {
          params: {
            version: 1
          }
        }
      )

      expect(result).toEqual({
        success: true,
        message: 'Rebalance rebal-123 deleted successfully'
      })
    })

    it('should handle deletion failures with error response', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            message: 'Rebalance not found'
          }
        },
        config: {
          url: '/api/v1/rebalance/rebal-404',
          method: 'delete'
        }
      }

      mockedAxios.delete.mockRejectedValueOnce(mockError)

      const result = await orderGenerationApi.deleteRebalance('rebal-404', 1)

      expect(result).toEqual({
        success: false,
        message: 'API Error: Rebalance not found'
      })
    })

    it('should handle version conflicts (409 Conflict)', async () => {
      const mockError = {
        response: {
          status: 409,
          statusText: 'Conflict',
          data: {
            message: 'Version mismatch: expected 2, got 1'
          }
        },
        config: {
          url: '/api/v1/rebalance/rebal-conflict',
          method: 'delete'
        }
      }

      mockedAxios.delete.mockRejectedValueOnce(mockError)

      const result = await orderGenerationApi.deleteRebalance('rebal-conflict', 1)

      expect(result).toEqual({
        success: false,
        message: 'API Error: Version mismatch: expected 2, got 1'
      })
    })

    it('should simulate successful deletion in development mode', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockError = {
        request: {},
        message: 'Network Error',
        config: {
          url: '/api/v1/rebalance/rebal-dev',
          baseURL: 'http://localhost:8088'
        }
      }

      mockedAxios.delete.mockRejectedValueOnce(mockError)

      const result = await orderGenerationApi.deleteRebalance('rebal-dev', 1)

      expect(result).toEqual({
        success: true,
        message: 'Rebalance rebal-dev deleted successfully (simulated)'
      })

      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('deleteRebalances (batch)', () => {
    it('should successfully delete multiple rebalances', async () => {
      const deletions = [
        { rebalanceId: 'rebal-1', version: 1 },
        { rebalanceId: 'rebal-2', version: 1 },
        { rebalanceId: 'rebal-3', version: 1 }
      ]

      // Mock successful responses for all deletions
      const mockResponse = {
        data: { message: 'Rebalance deleted successfully' },
        status: 200
      }
      
      mockedAxios.delete
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.deleteRebalances(deletions)

      expect(mockedAxios.delete).toHaveBeenCalledTimes(3)
      expect(result).toEqual({
        successful: ['rebal-1', 'rebal-2', 'rebal-3'],
        failed: [],
        totalDeleted: 3,
        totalFailed: 0
      })
    })

    it('should handle mixed success and failure scenarios', async () => {
      const deletions = [
        { rebalanceId: 'rebal-success', version: 1 },
        { rebalanceId: 'rebal-fail', version: 1 },
        { rebalanceId: 'rebal-success2', version: 1 }
      ]

      const mockSuccessResponse = {
        data: { message: 'Rebalance deleted successfully' },
        status: 200
      }

      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Rebalance not found' }
        }
      }

      mockedAxios.delete
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResponse)

      const result = await orderGenerationApi.deleteRebalances(deletions)

      expect(result).toEqual({
        successful: ['rebal-success', 'rebal-success2'],
        failed: [
          {
            rebalanceId: 'rebal-fail',
            error: 'API Error: Rebalance not found'
          }
        ],
        totalDeleted: 2,
        totalFailed: 1
      })
    })

    it('should handle empty deletion list', async () => {
      const result = await orderGenerationApi.deleteRebalances([])

      expect(mockedAxios.delete).not.toHaveBeenCalled()
      expect(result).toEqual({
        successful: [],
        failed: [],
        totalDeleted: 0,
        totalFailed: 0
      })
    })
  })

  describe('verifyRebalanceExists', () => {
    it('should return true for existing rebalance', async () => {
      const mockResponse = {
        data: { rebalance_id: 'rebal-exists' },
        status: 200
      }

      // Create a silent axios instance for the verification
      const silentAxios = {
        get: jest.fn().mockResolvedValueOnce(mockResponse),
        interceptors: {
          request: { use: jest.fn() }
        }
      }

      mockedAxios.create.mockReturnValueOnce(silentAxios as any)

      const result = await orderGenerationApi.verifyRebalanceExists('rebal-exists')

      expect(result).toBe(true)
      expect(silentAxios.get).toHaveBeenCalledWith('/api/v1/rebalance/rebal-exists')
    })

    it('should return false for non-existing rebalance (404)', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      }

      const silentAxios = {
        get: jest.fn().mockRejectedValueOnce(mockError),
        interceptors: {
          request: { use: jest.fn() }
        }
      }

      mockedAxios.create.mockReturnValueOnce(silentAxios as any)

      const result = await orderGenerationApi.verifyRebalanceExists('rebal-missing')

      expect(result).toBe(false)
    })

    it('should return false for network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      }

      const silentAxios = {
        get: jest.fn().mockRejectedValueOnce(mockError),
        interceptors: {
          request: { use: jest.fn() }
        }
      }

      mockedAxios.create.mockReturnValueOnce(silentAxios as any)

      const result = await orderGenerationApi.verifyRebalanceExists('rebal-network-error')

      expect(result).toBe(false)
    })
  })

  describe('getRebalances', () => {
    it('should fetch rebalances successfully', async () => {
      const mockRebalances: Rebalance[] = [
        {
          rebalance_id: 'rebal-1',
          model_id: 'model-1',
          model_name: 'Test Model 1',
          rebalance_date: '2025-01-17T10:00:00Z',
          total_portfolios: 1,
          version: 1,
          portfolios: []
        },
        {
          rebalance_id: 'rebal-2',
          model_id: 'model-2',
          model_name: 'Test Model 2',
          rebalance_date: '2025-01-17T11:00:00Z',
          total_portfolios: 2,
          version: 1,
          portfolios: []
        }
      ]

      const mockResponse = {
        data: mockRebalances,
        status: 200
      }

      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.getRebalances({
        offset: 0,
        limit: 10,
        sort_by: 'rebalance_date'
      })

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/rebalances', {
        params: {
          offset: 0,
          limit: 10,
          sort_by: 'rebalance_date'
        }
      })

      expect(result).toEqual(mockRebalances)
    })

    it('should fall back to mock data in development when service unavailable', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockError = {
        request: {},
        message: 'Network Error'
      }

      mockedAxios.get.mockRejectedValueOnce(mockError)

      // Mock the dynamic import
      const mockGetMockRebalancesPage = jest.fn().mockResolvedValue([
        {
          rebalance_id: 'mock-rebal-1',
          model_id: 'mock-model-1',
          model_name: 'Mock Model',
          rebalance_date: '2025-01-17T10:00:00Z',
          total_portfolios: 1,
          version: 1,
          portfolios: []
        }
      ])

      // Mock the dynamic import
      jest.doMock('../mockRebalanceData', () => ({
        getMockRebalancesPage: mockGetMockRebalancesPage
      }))

      const result = await orderGenerationApi.getRebalances({ offset: 0, limit: 10 })

      expect(result).toBeDefined()
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getRebalance', () => {
    it('should fetch single rebalance successfully', async () => {
      const mockRebalance: Rebalance = {
        rebalance_id: 'rebal-123',
        model_id: 'model-456',
        model_name: 'Test Model',
        rebalance_date: '2025-01-17T10:00:00Z',
        total_portfolios: 1,
        version: 1,
        portfolios: [
          {
            portfolio_id: 'port-001',
            portfolio_name: 'Test Portfolio',
            total_positions: 1,
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
              }
            ]
          }
        ]
      }

      const mockResponse = {
        data: mockRebalance,
        status: 200
      }

      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.getRebalance('rebal-123')

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/rebalance/rebal-123')
      expect(result).toEqual(mockRebalance)
    })

    it('should fall back to mock data in development when service unavailable', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockError = {
        request: {},
        message: 'Network Error'
      }

      mockedAxios.get.mockRejectedValueOnce(mockError)

      const result = await orderGenerationApi.getRebalance('rebal-123')

      expect(result).toBeDefined()
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('health check endpoints', () => {
    it('should call health check endpoint', async () => {
      const mockResponse = { data: { status: 'healthy' }, status: 200 }
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.healthCheck()

      expect(mockedAxios.get).toHaveBeenCalledWith('/health/health')
      expect(result).toEqual({ status: 'healthy' })
    })

    it('should call liveness check endpoint', async () => {
      const mockResponse = { data: { status: 'alive' }, status: 200 }
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.livenessCheck()

      expect(mockedAxios.get).toHaveBeenCalledWith('/health/live')
      expect(result).toEqual({ status: 'alive' })
    })

    it('should call readiness check endpoint', async () => {
      const mockResponse = { data: { status: 'ready' }, status: 200 }
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.readinessCheck()

      expect(mockedAxios.get).toHaveBeenCalledWith('/health/ready')
      expect(result).toEqual({ status: 'ready' })
    })
  })
}) 