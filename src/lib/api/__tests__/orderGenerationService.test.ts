import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import axios from 'axios'

// Mock axios completely
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock the dynamic import for getMockRebalance
const mockGetMockRebalance = jest.fn()
const mockGetMockRebalancesPage = jest.fn()
jest.mock('../mockRebalanceData', () => ({
  getMockRebalance: mockGetMockRebalance,
  getMockRebalancesPage: mockGetMockRebalancesPage
}))

// Create a mock axios instance that we'll control
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    baseURL: 'http://localhost:8088',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  },
  interceptors: {
    request: { 
      use: jest.fn().mockImplementation((fn) => fn),
      eject: jest.fn()
    },
    response: { 
      use: jest.fn().mockImplementation((fn) => fn),
      eject: jest.fn()
    }
  }
}

// Mock axios.create to return our controlled instance
mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance)

import { orderGenerationApi } from '../orderGenerationService'
import { Rebalance } from '@/types/rebalance'

describe('orderGenerationService', () => {
  let originalEnv: string | undefined
  
  beforeAll(() => {
    originalEnv = process.env.NODE_ENV
  })
  
  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Reset the mock axios instance methods
    mockAxiosInstance.get.mockReset()
    mockAxiosInstance.post.mockReset()
    mockAxiosInstance.put.mockReset()
    mockAxiosInstance.delete.mockReset()
    
    // Reset mock functions
    mockGetMockRebalance.mockReset()
    mockGetMockRebalancesPage.mockReset()
    
    // Ensure axios.create returns our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
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

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.deleteRebalance('rebal-123', 1)

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
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
            message: 'Rebalance not found',
            detail: 'Invalid rebalance ID format'
          }
        },
        config: {
          url: '/api/v1/rebalance/rebal-404',
          method: 'delete'
        }
      }

      mockAxiosInstance.delete.mockRejectedValueOnce(mockError)

      const result = await orderGenerationApi.deleteRebalance('rebal-404', 1)

      expect(result).toEqual({
        success: false,
        message: 'API Error: Invalid rebalance ID format'
      })
    })

    it('should handle version conflicts (409 Conflict)', async () => {
      const mockError = {
        response: {
          status: 409,
          statusText: 'Conflict',
          data: {
            message: 'Version mismatch: expected 2, got 1',
            detail: 'Invalid rebalance ID format'
          }
        },
        config: {
          url: '/api/v1/rebalance/rebal-conflict',
          method: 'delete'
        }
      }

      mockAxiosInstance.delete.mockRejectedValueOnce(mockError)

      const result = await orderGenerationApi.deleteRebalance('rebal-conflict', 1)

      expect(result).toEqual({
        success: false,
        message: 'API Error: Invalid rebalance ID format'
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

      mockAxiosInstance.delete.mockRejectedValueOnce(mockError)

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
      
      mockAxiosInstance.delete
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)

      const result = await orderGenerationApi.deleteRebalances(deletions)

      expect(mockAxiosInstance.delete).toHaveBeenCalledTimes(3)
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
          data: { 
            message: 'Rebalance not found',
            detail: 'Invalid rebalance ID format'
          }
        },
        config: {
          url: '/api/v1/rebalance/rebal-fail',
          method: 'delete'
        }
      }

      mockAxiosInstance.delete
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResponse)

      const result = await orderGenerationApi.deleteRebalances(deletions)

      expect(result).toEqual({
        successful: ['rebal-success', 'rebal-success2'],
        failed: [
          {
            rebalanceId: 'rebal-fail',
            error: 'API Error: Invalid rebalance ID format'
          }
        ],
        totalDeleted: 2,
        totalFailed: 1
      })
    })

    it('should handle empty deletion list', async () => {
      const result = await orderGenerationApi.deleteRebalances([])

      expect(mockAxiosInstance.delete).not.toHaveBeenCalled()
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
      const mockResponse = {
        data: [{ rebalance_id: 'rebal-1' }, { rebalance_id: 'rebal-2' }],
        status: 200
      }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)
      const result = await orderGenerationApi.getRebalances({ offset: 0, limit: 10, sort_by: 'rebalance_date' })
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/rebalances', {
        params: {
          offset: 0,
          limit: 10,
          sort_by: 'rebalance_date'
        }
      })
      expect(result).toEqual([{ rebalance_id: 'rebal-1' }, { rebalance_id: 'rebal-2' }])
    })

    it('should fall back to mock data in development when service unavailable', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockError = {
        request: {},
        message: 'Network Error'
      }

      mockAxiosInstance.get.mockRejectedValueOnce(mockError)

      // Mock the getMockRebalancesPage function to return expected data
      const mockData = [
        {
          rebalance_id: 'mock-rebal-1',
          model_id: 'mock-model-1',
          model_name: 'Mock Model',
          rebalance_date: '2025-01-17T10:00:00Z',
          total_portfolios: 1,
          version: 1,
          portfolios: []
        }
      ]
      
      mockGetMockRebalancesPage.mockResolvedValueOnce(mockData)

      const result = await orderGenerationApi.getRebalances({ offset: 0, limit: 10 })

      expect(result).toEqual(mockData)
      expect(mockGetMockRebalancesPage).toHaveBeenCalledWith(0, 10)
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getRebalance', () => {
    it('should fetch single rebalance successfully', async () => {
      const mockResponse = {
        data: { rebalance_id: 'rebal-123' },
        status: 200
      }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)
      const result = await orderGenerationApi.getRebalance('rebal-123')
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/rebalance/rebal-123')
      expect(result).toEqual({ rebalance_id: 'rebal-123' })
    })

    it('should fall back to mock data in development when service unavailable', async () => {
      process.env.NODE_ENV = 'development'
      const mockError = {
        request: {},
        message: 'Network Error',
        config: {
          url: '/api/v1/rebalance/rebal-123',
          baseURL: 'http://localhost:8088'
        }
      }
      mockAxiosInstance.get.mockRejectedValueOnce(mockError)
      
      // Mock the getMockRebalance function to return expected data
      mockGetMockRebalance.mockResolvedValueOnce({ rebalance_id: 'rebal-123' })
      
      const result = await orderGenerationApi.getRebalance('rebal-123')
      expect(result.rebalance_id).toBe('rebal-123')
      expect(mockGetMockRebalance).toHaveBeenCalledWith('rebal-123')
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('health check endpoints', () => {
    it('should call health check endpoint', async () => {
      const mockResponse = { data: { status: 'healthy' }, status: 200 }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)
      const result = await orderGenerationApi.healthCheck()
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health/health')
      expect(result).toEqual({ status: 'healthy' })
    })

    it('should call liveness check endpoint', async () => {
      const mockResponse = { data: { status: 'alive' }, status: 200 }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)
      const result = await orderGenerationApi.livenessCheck()
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health/live')
      expect(result).toEqual({ status: 'alive' })
    })

    it('should call readiness check endpoint', async () => {
      const mockResponse = { data: { status: 'ready' }, status: 200 }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)
      const result = await orderGenerationApi.readinessCheck()
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health/ready')
      expect(result).toEqual({ status: 'ready' })
    })
  })
}) 