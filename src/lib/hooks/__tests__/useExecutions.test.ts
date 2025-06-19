import { renderHook, act, waitFor } from '@testing-library/react';
import { useExecutions } from '../useExecutions';
import { executionService } from '@/lib/api/executionService';
import { ExecutionPageDTO, ExecutionFilters } from '@/types/execution';

// Mock the execution service
jest.mock('@/lib/api/executionService');
const mockedExecutionService = executionService as jest.Mocked<typeof executionService>;

// Mock console methods to avoid noise in tests
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
};

describe('useExecutions', () => {
  const mockExecutionPage: ExecutionPageDTO = {
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
      },
      {
        id: 2,
        executionStatus: 'FILLED',
        tradeType: 'SELL',
        destination: 'NASDAQ',
        security: { securityId: 'SEC2', ticker: 'GOOGL' },
        quantity: 50,
        limitPrice: 2800.00,
        receivedTimestamp: '2024-01-01T10:05:00Z',
        sentTimestamp: '2024-01-01T10:06:00Z',
        tradeServiceExecutionId: 12345,
        quantityFilled: 50,
        averagePrice: 2795.00,
        version: 2
      }
    ],
    pagination: {
      offset: 0,
      limit: 50,
      totalElements: 2,
      totalPages: 1,
      currentPage: 0,
      hasNext: false,
      hasPrevious: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful response by default
    mockedExecutionService.getExecutions.mockResolvedValue(mockExecutionPage);
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  afterAll(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Basic Functionality', () => {
    it('should fetch executions on mount', async () => {
      const { result } = renderHook(() => useExecutions());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        sortBy: '-receivedTimestamp'
      });

      expect(result.current.executions).toEqual(mockExecutionPage.content);
      expect(result.current.data).toEqual(mockExecutionPage);
      expect(result.current.error).toBeNull();
    });

    it('should handle initial filters', async () => {
      const initialFilters: ExecutionFilters = {
        executionStatus: ['NEW'],
        tradeType: ['BUY']
      };

      const { result } = renderHook(() => 
        useExecutions({ initialFilters })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
        executionStatus: ['NEW'],
        tradeType: ['BUY'],
        limit: 50,
        offset: 0,
        sortBy: '-receivedTimestamp'
      });
    });

    it('should handle custom page size', async () => {
      const { result } = renderHook(() => 
        useExecutions({ initialPageSize: 25 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
        sortBy: '-receivedTimestamp'
      });

      expect(result.current.pagination.size).toBe(25);
    });
  });

  describe('Pagination', () => {
    it('should update pagination correctly', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updatePagination({ page: 1, size: 25 });
      });

      await waitFor(() => {
        expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
          limit: 25,
          offset: 25,
          sortBy: '-receivedTimestamp'
        });
      });

      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.size).toBe(25);
    });

    it('should reset to page 0 when changing page size', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First go to page 1
      act(() => {
        result.current.updatePagination({ page: 1 });
      });

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(1);
      });

      // Then change page size, should reset to page 0
      act(() => {
        result.current.updatePagination({ size: 25 });
      });

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(0);
        expect(result.current.pagination.size).toBe(25);
      });
    });
  });

  describe('Filtering', () => {
    it('should update filters and refetch data', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFilters: ExecutionFilters = {
        executionStatus: ['FILLED'],
        tradeType: ['SELL']
      };

      act(() => {
        result.current.updateFilters(newFilters);
      });

      await waitFor(() => {
        expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
          executionStatus: ['FILLED'],
          tradeType: ['SELL'],
          limit: 50,
          offset: 0,
          sortBy: '-receivedTimestamp'
        });
      });
    });

    it('should reset pagination when filters change', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to page 1
      act(() => {
        result.current.updatePagination({ page: 1 });
      });

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(1);
      });

      // Update filters, should reset to page 0
      act(() => {
        result.current.updateFilters({ executionStatus: ['NEW'] });
      });

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(0);
      });
    });
  });

  describe('Sorting', () => {
    it('should update sorting and refetch data', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSorting('quantity', 'ASC');
      });

      await waitFor(() => {
        expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
          limit: 50,
          offset: 0,
          sortBy: 'quantity'
        });
      });

      expect(result.current.sorting.field).toBe('quantity');
      expect(result.current.sorting.direction).toBe('ASC');
    });

    it('should handle descending sort with minus prefix', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSorting('limitPrice', 'DESC');
      });

      await waitFor(() => {
        expect(mockedExecutionService.getExecutions).toHaveBeenCalledWith({
          limit: 50,
          offset: 0,
          sortBy: '-limitPrice'
        });
      });
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto-refresh when enabled', async () => {
      const { result } = renderHook(() => 
        useExecutions({ enablePolling: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the initial call
      mockedExecutionService.getExecutions.mockClear();

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockedExecutionService.getExecutions).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-refresh when disabled', async () => {
      const { result } = renderHook(() => 
        useExecutions({ enablePolling: false })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the initial call
      mockedExecutionService.getExecutions.mockClear();

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not have made additional calls
      expect(mockedExecutionService.getExecutions).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      mockedExecutionService.getExecutions.mockRejectedValue(mockError);

      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.executions).toEqual([]);
      expect(result.current.data).toBeNull();
    });

    it('should handle refetch after error', async () => {
      const mockError = new Error('API Error');
      mockedExecutionService.getExecutions.mockRejectedValueOnce(mockError);
      mockedExecutionService.getExecutions.mockResolvedValueOnce(mockExecutionPage);

      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.executions).toEqual(mockExecutionPage.content);
      });
    });
  });

  describe('Manual Refetch', () => {
    it('should refetch data manually', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the initial call
      mockedExecutionService.getExecutions.mockClear();

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockedExecutionService.getExecutions).toHaveBeenCalledTimes(1);
      });
    });

    it('should set isRefetching during manual refetch', async () => {
      const { result } = renderHook(() => useExecutions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isRefetching).toBe(false);

      act(() => {
        result.current.refetch();
      });

      expect(result.current.isRefetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });
    });
  });
}); 