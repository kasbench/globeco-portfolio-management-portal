// Comprehensive tests for ResponseProcessingService

import { ResponseProcessingService } from '../responseProcessingService'
import { AxiosResponse, AxiosError } from 'axios'
import { OrderPostDTO, OrderListResponseDTO, RetryConfig } from '@/types/order'

// Mock OrderLogger
jest.mock('@/lib/utils/orderLogging', () => ({
  OrderLogger: jest.fn().mockImplementation(() => ({
    logAuditEntry: jest.fn(),
    logSubmissionResult: jest.fn()
  }))
}))

describe('ResponseProcessingService', () => {
  let service: ResponseProcessingService
  let mockOrders: OrderPostDTO[]

  beforeEach(() => {
    service = new ResponseProcessingService()
    mockOrders = [
      {
        blotterId: 1,
        statusId: 1,
        portfolioId: 'PORT1',
        orderTypeId: 2,
        securityId: 'SEC1',
        quantity: 100,
        limitPrice: null,
        tradeOrderId: null,
        orderTimestamp: '2024-01-01T12:00:00Z',
        version: 1
      },
      {
        blotterId: 1,
        statusId: 1,
        portfolioId: 'PORT1',
        orderTypeId: 3,
        securityId: 'SEC2',
        quantity: 50,
        limitPrice: null,
        tradeOrderId: null,
        orderTimestamp: '2024-01-01T12:00:00Z',
        version: 1
      }
    ]
  })

  describe('parseOrderServiceResponse', () => {
    it('should handle complete success (200) response', () => {
      const mockResponse: AxiosResponse<OrderListResponseDTO> = {
        status: 200,
        statusText: 'OK',
        data: {
          totalReceived: 2,
          successful: 2,
          failed: 0,
          status: 'SUCCESS',
          orders: [
            {
              orderId: 1001,
              blotterId: 1,
              statusId: 1,
              portfolioId: 'PORT1',
              orderTypeId: 2,
              securityId: 'SEC1',
              quantity: 100,
              limitPrice: null,
              tradeOrderId: null,
              orderTimestamp: '2024-01-01T12:00:00Z',
              version: 1
            },
            {
              orderId: 1002,
              blotterId: 1,
              statusId: 1,
              portfolioId: 'PORT1',
              orderTypeId: 3,
              securityId: 'SEC2',
              quantity: 50,
              limitPrice: null,
              tradeOrderId: null,
              orderTimestamp: '2024-01-01T12:00:00Z',
              version: 1
            }
          ]
        },
        headers: {},
        config: {} as any
      }

      const result = service.parseOrderServiceResponse(
        mockResponse,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('complete')
      expect(result.successfulOrders).toHaveLength(2)
      expect(result.failedOrders).toHaveLength(0)
      expect(result.successfulOrders[0].orderId).toBe(1001)
      expect(result.successfulOrders[1].orderId).toBe(1002)
      expect(result.isRetryable).toBe(false)
    })

    it('should handle partial success (207) response', () => {
      const mockResponse: AxiosResponse<OrderListResponseDTO> = {
        status: 207,
        statusText: 'Multi-Status',
        data: {
          totalReceived: 2,
          successful: 1,
          failed: 1,
          status: 'PARTIAL',
          orders: [
            {
              orderId: 1001,
              blotterId: 1,
              statusId: 1,
              portfolioId: 'PORT1',
              orderTypeId: 2,
              securityId: 'SEC1',
              quantity: 100,
              limitPrice: null,
              tradeOrderId: null,
              orderTimestamp: '2024-01-01T12:00:00Z',
              version: 1
            },
            {
              orderId: undefined,
              blotterId: 1,
              statusId: 1,
              portfolioId: 'PORT1',
              orderTypeId: 3,
              securityId: 'SEC2',
              quantity: 50,
              limitPrice: null,
              tradeOrderId: null,
              orderTimestamp: '2024-01-01T12:00:00Z',
              version: 1,
              message: 'Insufficient funds',
              errorCode: 'INSUFFICIENT_FUNDS'
            }
          ]
        },
        headers: {},
        config: {} as any
      }

      const result = service.parseOrderServiceResponse(
        mockResponse,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('partial')
      expect(result.successfulOrders).toHaveLength(1)
      expect(result.failedOrders).toHaveLength(1)
      expect(result.successfulOrders[0].orderId).toBe(1001)
      expect(result.failedOrders[0].message).toBe('Insufficient funds')
      expect(result.failedOrders[0].errorCode).toBe('INSUFFICIENT_FUNDS')
      expect(result.isRetryable).toBe(true)
    })

    it('should handle response parsing errors gracefully', () => {
      const mockResponse: AxiosResponse<OrderListResponseDTO> = {
        status: 200,
        statusText: 'OK',
        data: null as any, // Invalid response data
        headers: {},
        config: {} as any
      }

      const result = service.parseOrderServiceResponse(
        mockResponse,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('failed')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Response parsing error')
      expect(result.failedOrders).toHaveLength(2)
      expect(result.failedOrders[0].errorCode).toBe('PARSE_ERROR')
    })
  })

  describe('parseErrorResponse', () => {
    it('should handle 400 Bad Request errors', () => {
      const mockError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            message: 'Invalid order data',
            errors: [
              { message: 'Invalid security ID', code: 'INVALID_SECURITY' },
              { message: 'Invalid quantity', code: 'INVALID_QUANTITY' }
            ]
          },
          headers: {},
          config: {} as any
        },
        config: {} as any,
        isAxiosError: true
      }

      const result = service.parseErrorResponse(
        mockError,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('failed')
      expect(result.isRetryable).toBe(false)
      expect(result.errors[0]).toContain('Bad Request')
      expect(result.failedOrders).toHaveLength(2)
      expect(result.failedOrders[0].errorCode).toBe('INVALID_SECURITY')
      expect(result.failedOrders[1].errorCode).toBe('INVALID_QUANTITY')
    })

    it('should handle 413 Payload Too Large errors', () => {
      const mockError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 413',
        response: {
          status: 413,
          statusText: 'Payload Too Large',
          data: { message: 'Batch size exceeds limit' },
          headers: {},
          config: {} as any
        },
        config: {} as any,
        isAxiosError: true
      }

      const result = service.parseErrorResponse(
        mockError,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('failed')
      expect(result.isRetryable).toBe(false) // Not retryable as individual orders
      expect(result.errors[0]).toContain('Payload Too Large')
      expect(result.failedOrders).toHaveLength(2)
      expect(result.failedOrders[0].errorCode).toBe('BATCH_TOO_LARGE')
    })

    it('should handle 429 Rate Limit errors', () => {
      const mockError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 429',
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { message: 'Rate limit exceeded' },
          headers: {},
          config: {} as any
        },
        config: {} as any,
        isAxiosError: true
      }

      const result = service.parseErrorResponse(
        mockError,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('failed')
      expect(result.isRetryable).toBe(true)
      expect(result.errors[0]).toContain('Rate Limit Exceeded')
      expect(result.failedOrders).toHaveLength(2)
      expect(result.failedOrders[0].errorCode).toBe('RATE_LIMITED')
      expect(result.failedOrders[0].isRetryable).toBe(true)
    })

    it('should handle 500 Server Error', () => {
      const mockError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Database connection failed' },
          headers: {},
          config: {} as any
        },
        config: {} as any,
        isAxiosError: true
      }

      const result = service.parseErrorResponse(
        mockError,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('failed')
      expect(result.isRetryable).toBe(true)
      expect(result.errors[0]).toContain('Server Error')
      expect(result.failedOrders).toHaveLength(2)
      expect(result.failedOrders[0].errorCode).toBe('SERVER_ERROR')
      expect(result.failedOrders[0].isRetryable).toBe(true)
    })

    it('should handle network errors', () => {
      const mockError: AxiosError = {
        name: 'AxiosError',
        message: 'Network Error',
        request: {},
        config: {} as any,
        isAxiosError: true
      }

      const result = service.parseErrorResponse(
        mockError,
        mockOrders,
        0,
        'test-request-123'
      )

      expect(result.batchStatus).toBe('failed')
      expect(result.isRetryable).toBe(true)
      expect(result.errors[0]).toContain('Network Error')
      expect(result.failedOrders).toHaveLength(2)
      expect(result.failedOrders[0].errorCode).toBe('NETWORK_ERROR')
      expect(result.failedOrders[0].isRetryable).toBe(true)
    })
  })

  describe('trackOrderResults', () => {
    it('should track order results across multiple batches', () => {
      const batchResults = [
        {
          batchIndex: 0,
          totalOrders: 2,
          successfulOrders: [
            {
              orderId: 1001,
              securityId: 'SEC1',
              portfolioId: 'PORT1',
              status: 'success' as const,
              isRetryable: false,
              submittedAt: new Date(),
              retryCount: 0,
              originalOrder: mockOrders[0]
            }
          ],
          failedOrders: [
            {
              securityId: 'SEC2',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              message: 'Insufficient funds',
              errorCode: 'INSUFFICIENT_FUNDS',
              isRetryable: true,
              retryCount: 0,
              originalOrder: mockOrders[1]
            }
          ],
          skippedOrders: [],
          batchStatus: 'partial' as const,
          processingTimeMs: 100,
          submissionRequestId: 'test-request-123',
          isRetryable: true,
          errors: [],
          warnings: []
        }
      ]

      const tracking = service.trackOrderResults(batchResults)

      expect(tracking.size).toBe(2)
      expect(tracking.get('PORT1-SEC1')?.status).toBe('success')
      expect(tracking.get('PORT1-SEC1')?.orderId).toBe(1001)
      expect(tracking.get('PORT1-SEC2')?.status).toBe('failed')
      expect(tracking.get('PORT1-SEC2')?.errorCode).toBe('INSUFFICIENT_FUNDS')
    })
  })

  describe('generateRetryRecommendations', () => {
    it('should generate appropriate retry recommendations for different error types', () => {
      const batchResults = [
        {
          batchIndex: 0,
          totalOrders: 3,
          successfulOrders: [],
          failedOrders: [
            {
              securityId: 'SEC1',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              errorCode: 'RATE_LIMITED',
              isRetryable: true,
              retryCount: 0,
              originalOrder: mockOrders[0]
            },
            {
              securityId: 'SEC2',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              errorCode: 'SERVER_ERROR',
              isRetryable: true,
              retryCount: 0,
              originalOrder: mockOrders[1]
            }
          ],
          skippedOrders: [],
          batchStatus: 'failed' as const,
          processingTimeMs: 100,
          submissionRequestId: 'test-request-123',
          isRetryable: true,
          errors: [],
          warnings: []
        }
      ]

      const recommendations = service.generateRetryRecommendations(batchResults)

      expect(recommendations).toHaveLength(2)
      
      const rateLimitRec = recommendations.find(r => r.reason.includes('Rate limit'))
      expect(rateLimitRec?.type).toBe('delayed')
      expect(rateLimitRec?.delayMs).toBe(5000)
      expect(rateLimitRec?.expectedSuccessRate).toBe(0.9)

      const serverErrorRec = recommendations.find(r => r.reason.includes('Server error'))
      expect(serverErrorRec?.type).toBe('delayed')
      expect(serverErrorRec?.delayMs).toBe(2000)
      expect(serverErrorRec?.expectedSuccessRate).toBe(0.7)
    })

    it('should not generate recommendations for non-retryable errors', () => {
      const batchResults = [
        {
          batchIndex: 0,
          totalOrders: 1,
          successfulOrders: [],
          failedOrders: [
            {
              securityId: 'SEC1',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              errorCode: 'VALIDATION_ERROR',
              isRetryable: false,
              retryCount: 0,
              originalOrder: mockOrders[0]
            }
          ],
          skippedOrders: [],
          batchStatus: 'failed' as const,
          processingTimeMs: 100,
          submissionRequestId: 'test-request-123',
          isRetryable: false,
          errors: [],
          warnings: []
        }
      ]

      const recommendations = service.generateRetryRecommendations(batchResults)

      expect(recommendations).toHaveLength(0)
    })
  })

  describe('processSubmissionResults', () => {
    it('should process complete submission results and determine overall status', () => {
      const batchResults = [
        {
          batchIndex: 0,
          totalOrders: 2,
          successfulOrders: [
            {
              orderId: 1001,
              securityId: 'SEC1',
              portfolioId: 'PORT1',
              status: 'success' as const,
              isRetryable: false,
              submittedAt: new Date(),
              retryCount: 0,
              originalOrder: mockOrders[0]
            }
          ],
          failedOrders: [
            {
              securityId: 'SEC2',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              errorCode: 'INSUFFICIENT_FUNDS',
              isRetryable: true,
              retryCount: 0,
              originalOrder: mockOrders[1]
            }
          ],
          skippedOrders: [],
          batchStatus: 'partial' as const,
          processingTimeMs: 100,
          submissionRequestId: 'test-request-123',
          isRetryable: true,
          errors: [],
          warnings: []
        }
      ]

      const result = service.processSubmissionResults(
        batchResults,
        'test-request-123',
        150
      )

      expect(result.overallStatus).toBe('partial')
      expect(result.totalOrders).toBe(2)
      expect(result.successfulOrders).toBe(1)
      expect(result.failedOrders).toBe(1)
      expect(result.totalBatches).toBe(1)
      expect(result.processingTimeMs).toBe(150)
      expect(result.auditTrail).toHaveLength(2) // batch_complete + final_result
    })

    it('should determine success status when all orders succeed', () => {
      const batchResults = [
        {
          batchIndex: 0,
          totalOrders: 2,
          successfulOrders: [
            {
              orderId: 1001,
              securityId: 'SEC1',
              portfolioId: 'PORT1',
              status: 'success' as const,
              isRetryable: false,
              submittedAt: new Date(),
              retryCount: 0,
              originalOrder: mockOrders[0]
            },
            {
              orderId: 1002,
              securityId: 'SEC2',
              portfolioId: 'PORT1',
              status: 'success' as const,
              isRetryable: false,
              submittedAt: new Date(),
              retryCount: 0,
              originalOrder: mockOrders[1]
            }
          ],
          failedOrders: [],
          skippedOrders: [],
          batchStatus: 'complete' as const,
          processingTimeMs: 100,
          submissionRequestId: 'test-request-123',
          isRetryable: false,
          errors: [],
          warnings: []
        }
      ]

      const result = service.processSubmissionResults(
        batchResults,
        'test-request-123',
        150
      )

      expect(result.overallStatus).toBe('success')
      expect(result.finalState).toBe('Submitted')
    })

    it('should determine failed status when no orders succeed', () => {
      const batchResults = [
        {
          batchIndex: 0,
          totalOrders: 2,
          successfulOrders: [],
          failedOrders: [
            {
              securityId: 'SEC1',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              errorCode: 'SERVER_ERROR',
              isRetryable: true,
              retryCount: 0,
              originalOrder: mockOrders[0]
            },
            {
              securityId: 'SEC2',
              portfolioId: 'PORT1',
              status: 'failed' as const,
              errorCode: 'SERVER_ERROR',
              isRetryable: true,
              retryCount: 0,
              originalOrder: mockOrders[1]
            }
          ],
          skippedOrders: [],
          batchStatus: 'failed' as const,
          processingTimeMs: 100,
          submissionRequestId: 'test-request-123',
          isRetryable: true,
          errors: [],
          warnings: []
        }
      ]

      const result = service.processSubmissionResults(
        batchResults,
        'test-request-123',
        150
      )

      expect(result.overallStatus).toBe('failed')
      expect(result.finalState).toBe('Failed')
    })
  })

  describe('Custom retry configuration', () => {
    it('should use custom retry configuration', () => {
      const customRetryConfig: Partial<RetryConfig> = {
        maxRetries: 5,
        retryDelay: 2000,
        backoffMultiplier: 3,
        retryableErrorCodes: [429, 500]
      }

      const customService = new ResponseProcessingService(customRetryConfig)

      const mockError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 503',
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          headers: {},
          config: {} as any
        },
        config: {} as any,
        isAxiosError: true
      }

      const result = customService.parseErrorResponse(
        mockError,
        mockOrders,
        0,
        'test-request-123'
      )

      // 503 should not be retryable with custom config (only 429, 500)
      expect(result.isRetryable).toBe(false)
    })
  })
}) 