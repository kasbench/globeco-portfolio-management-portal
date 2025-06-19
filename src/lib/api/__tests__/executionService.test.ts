import axios from 'axios';
import { ExecutionService } from '../executionService';
import { ExecutionDTO, ExecutionPostDTO, ExecutionPutDTO } from '@/types/execution';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods to avoid noise in tests
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
};

describe('ExecutionService', () => {
  let executionService: ExecutionService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock axios.create
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create service instance
    executionService = new ExecutionService();
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  afterAll(() => {
    // Restore console methods completely
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Constructor and Setup', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8084',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getExecutions', () => {
    const mockExecutionPage = {
      content: [
        {
          id: 1,
          executionStatus: 'NEW',
          tradeType: 'BUY',
          destination: 'NYSE',
          security: { securityId: 'SEC1', ticker: 'AAPL' },
          quantity: 100,
          limitPrice: 150.00,
          receivedTimestamp: '2024-01-01T10:00:00Z',
          sentTimestamp: null,
          tradeServiceExecutionId: null,
          quantityFilled: 0,
          averagePrice: null,
          version: 1
        }
      ],
      pagination: {
        offset: 0,
        limit: 50,
        totalElements: 1,
        totalPages: 1,
        currentPage: 0,
        hasNext: false,
        hasPrevious: false
      }
    };

    it('should fetch executions successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockExecutionPage });

      const result = await executionService.getExecutions();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/executions', {
        params: {},
      });
      expect(result).toEqual(mockExecutionPage);
    });

    it('should build query parameters correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockExecutionPage });

      await executionService.getExecutions({
        executionStatus: ['NEW', 'SENT'],
        tradeType: ['BUY'],
        limit: 25,
        offset: 0,
        sortBy: '-receivedTimestamp'
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/executions', {
        params: {
          executionStatus: 'NEW,SENT',
          tradeType: 'BUY',
          limit: '25',
          offset: '0',
          sortBy: '-receivedTimestamp'
        },
      });
    });
  });

  describe('getExecution', () => {
    const mockExecution: ExecutionDTO = {
      id: 1,
      executionStatus: 'FILLED',
      tradeType: 'BUY',
      destination: 'NYSE',
      security: { securityId: 'SEC1', ticker: 'AAPL' },
      quantity: 100,
      limitPrice: 150.00,
      receivedTimestamp: '2024-01-01T10:00:00Z',
      sentTimestamp: '2024-01-01T10:01:00Z',
      tradeServiceExecutionId: 12345,
      quantityFilled: 100,
      averagePrice: 149.50,
      version: 2
    };

    it('should fetch individual execution successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockExecution });

      const result = await executionService.getExecution(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/execution/1');
      expect(result).toEqual(mockExecution);
    });
  });

  describe('cancelExecution', () => {
    const mockCancelledExecution: ExecutionDTO = {
      id: 1,
      executionStatus: 'CANCEL',
      tradeType: 'BUY',
      destination: 'NYSE',
      security: { securityId: 'SEC1', ticker: 'AAPL' },
      quantity: 100,
      limitPrice: 150.00,
      receivedTimestamp: '2024-01-01T10:00:00Z',
      sentTimestamp: '2024-01-01T10:01:00Z',
      tradeServiceExecutionId: 12345,
      quantityFilled: 0,
      averagePrice: null,
      version: 2
    };

    it('should cancel execution successfully', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockCancelledExecution });

      const result = await executionService.cancelExecution(1, 1);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/v1/execution/1', {
        executionStatus: 'CANCEL',
        version: 1
      });
      expect(result).toEqual(mockCancelledExecution);
    });
  });

  describe('cancelExecutionsBatch', () => {
    const mockBatchResult = {
      successful: 2,
      failed: 0,
      totalCount: 2,
      results: [
        { executionId: 1, success: true, message: 'Cancelled successfully' },
        { executionId: 2, success: true, message: 'Cancelled successfully' }
      ]
    };

    it('should cancel multiple executions successfully', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce({ data: { executionStatus: 'CANCEL' } });
      mockAxiosInstance.put.mockResolvedValueOnce({ data: { executionStatus: 'CANCEL' } });

      const executions = [
        { id: 1, version: 1 },
        { id: 2, version: 1 }
      ];

      const result = await executionService.cancelExecutionsBatch(executions);

      expect(mockAxiosInstance.put).toHaveBeenCalledTimes(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.totalCount).toBe(2);
    });

    it('should handle partial failures in batch cancellation', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce({ data: { executionStatus: 'CANCEL' } });
      mockAxiosInstance.put.mockRejectedValueOnce(new Error('Cancellation failed'));

      const executions = [
        { id: 1, version: 1 },
        { id: 2, version: 1 }
      ];

      const result = await executionService.cancelExecutionsBatch(executions);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.totalCount).toBe(2);
    });
  });

  describe('canCancel', () => {
    it('should return true for cancellable execution', async () => {
      const mockExecution: ExecutionDTO = {
        id: 1,
        executionStatus: 'NEW',
        tradeType: 'BUY',
        destination: 'NYSE',
        security: { securityId: 'SEC1', ticker: 'AAPL' },
        quantity: 100,
        limitPrice: 150.00,
        receivedTimestamp: '2024-01-01T10:00:00Z',
        sentTimestamp: null,
        tradeServiceExecutionId: null,
        quantityFilled: 0,
        averagePrice: null,
        version: 1
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockExecution });

      const result = await executionService.canCancel(1);

      expect(result).toBe(true);
    });

    it('should return false for FILLED execution', async () => {
      const mockExecution: ExecutionDTO = {
        id: 1,
        executionStatus: 'FILLED',
        tradeType: 'BUY',
        destination: 'NYSE',
        security: { securityId: 'SEC1', ticker: 'AAPL' },
        quantity: 100,
        limitPrice: 150.00,
        receivedTimestamp: '2024-01-01T10:00:00Z',
        sentTimestamp: '2024-01-01T10:01:00Z',
        tradeServiceExecutionId: 12345,
        quantityFilled: 100,
        averagePrice: 149.50,
        version: 2
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockExecution });

      const result = await executionService.canCancel(1);

      expect(result).toBe(false);
    });

    it('should return false for FULL execution', async () => {
      const mockExecution: ExecutionDTO = {
        id: 1,
        executionStatus: 'FULL',
        tradeType: 'BUY',
        destination: 'NYSE',
        security: { securityId: 'SEC1', ticker: 'AAPL' },
        quantity: 100,
        limitPrice: 150.00,
        receivedTimestamp: '2024-01-01T10:00:00Z',
        sentTimestamp: '2024-01-01T10:01:00Z',
        tradeServiceExecutionId: 12345,
        quantityFilled: 100,
        averagePrice: 149.50,
        version: 2
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockExecution });

      const result = await executionService.canCancel(1);

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors appropriately', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Execution not found' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(executionService.getExecution(999)).rejects.toThrow('Execution not found');
    });

    it('should handle 409 conflicts appropriately', async () => {
      const mockError = {
        response: {
          status: 409,
          data: { message: 'Version conflict' }
        }
      };

      mockAxiosInstance.put.mockRejectedValue(mockError);

      await expect(executionService.cancelExecution(1, 1)).rejects.toThrow(
        'Conflict: Execution has been modified by another user. Please refresh and try again.'
      );
    });

    it('should handle network errors appropriately', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(executionService.getExecutions()).rejects.toThrow(
        'Network error: Unable to connect to Execution Service'
      );
    });
  });
}); 