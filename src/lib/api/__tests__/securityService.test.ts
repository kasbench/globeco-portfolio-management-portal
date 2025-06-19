import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import axios from 'axios'
import { SecurityService, securityService } from '../securityService'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as {
  create: Mock
  request: Mock
}

describe('SecurityService', () => {
  let mockAxiosInstance: {
    get: Mock
    interceptors: {
      request: { use: Mock }
      response: { use: Mock }
    }
  }

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    
    // Clear cache before each test
    securityService.clearCache()
  })

  describe('getSecurity', () => {
    it('should fetch security data successfully', async () => {
      const mockSecurity = {
        securityId: 'SEC001',
        ticker: 'AAPL',
        description: 'Apple Inc.',
        securityTypeId: 'STOCK',
        version: 1,
        securityType: {
          securityTypeId: 'STOCK',
          abbreviation: 'STK',
          description: 'Stock'
        }
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockSecurity })

      const result = await securityService.getSecurity('SEC001')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/security/SEC001')
      expect(result).toEqual(mockSecurity)
    })

    it('should use cached data when available', async () => {
      const mockSecurity = {
        securityId: 'SEC001',
        ticker: 'AAPL',
        description: 'Apple Inc.',
        securityTypeId: 'STOCK',
        version: 1,
        securityType: {
          securityTypeId: 'STOCK',
          abbreviation: 'STK',
          description: 'Stock'
        }
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockSecurity })

      // First call should fetch from API
      await securityService.getSecurity('SEC001')
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await securityService.getSecurity('SEC001')
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
    })

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 404,
          data: {
            detail: [{ msg: 'Security not found' }]
          }
        }
      })

      await expect(securityService.getSecurity('INVALID')).rejects.toThrow('Security not found')
    })
  })

  describe('getTicker', () => {
    it('should return ticker for valid security ID', async () => {
      const mockSecurity = {
        securityId: 'SEC001',
        ticker: 'AAPL',
        description: 'Apple Inc.',
        securityTypeId: 'STOCK',
        version: 1,
        securityType: {
          securityTypeId: 'STOCK',
          abbreviation: 'STK',
          description: 'Stock'
        }
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockSecurity })

      const ticker = await securityService.getTicker('SEC001')
      expect(ticker).toBe('AAPL')
    })

    it('should return null for invalid security ID', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 404,
          data: {
            detail: [{ msg: 'Security not found' }]
          }
        }
      })

      const ticker = await securityService.getTicker('INVALID')
      expect(ticker).toBeNull()
    })
  })

  describe('getTickers', () => {
    it('should return ticker map for multiple security IDs', async () => {
      const mockSecurities = [
        {
          securityId: 'SEC001',
          ticker: 'AAPL',
          description: 'Apple Inc.',
          securityTypeId: 'STOCK',
          version: 1,
          securityType: {
            securityTypeId: 'STOCK',
            abbreviation: 'STK',
            description: 'Stock'
          }
        },
        {
          securityId: 'SEC002',
          ticker: 'MSFT',
          description: 'Microsoft Corp.',
          securityTypeId: 'STOCK',
          version: 1,
          securityType: {
            securityTypeId: 'STOCK',
            abbreviation: 'STK',
            description: 'Stock'
          }
        }
      ]

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockSecurities[0] })
        .mockResolvedValueOnce({ data: mockSecurities[1] })

      const tickers = await securityService.getTickers(['SEC001', 'SEC002'])
      
      expect(tickers.get('SEC001')).toBe('AAPL')
      expect(tickers.get('SEC002')).toBe('MSFT')
      expect(tickers.size).toBe(2)
    })

    it('should handle mixed success/failure for multiple securities', async () => {
      const mockSecurity = {
        securityId: 'SEC001',
        ticker: 'AAPL',
        description: 'Apple Inc.',
        securityTypeId: 'STOCK',
        version: 1,
        securityType: {
          securityTypeId: 'STOCK',
          abbreviation: 'STK',
          description: 'Stock'
        }
      }

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockSecurity })
        .mockRejectedValueOnce({
          response: {
            status: 404,
            data: {
              detail: [{ msg: 'Security not found' }]
            }
          }
        })

      const tickers = await securityService.getTickers(['SEC001', 'INVALID'])
      
      expect(tickers.get('SEC001')).toBe('AAPL')
      expect(tickers.has('INVALID')).toBe(false)
      expect(tickers.size).toBe(1)
    })
  })
}) 