import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExecutions } from '../useExecutions';
import { ExecutionPageDTO, ExecutionFilters } from '@/types/execution';

// Mock global.fetch
const originalFetch = global.fetch;

// Create a QueryClientProvider wrapper for tests
const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientProviderWrapper';
  return Wrapper;
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
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockExecutionPage
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Basic Functionality', () => {
    it('should fetch executions on mount', async () => {
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/executions?'),
        expect.anything()
      );

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
        useExecutions({ initialFilters }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('executionStatus=NEW'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tradeType=BUY'),
        expect.anything()
      );
    });

    it('should handle custom page size', async () => {
      const { result } = renderHook(() => 
        useExecutions({ initialPageSize: 25 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=25'),
        expect.anything()
      );
      expect(result.current.pagination.size).toBe(25);
    });
  });

  describe('Pagination', () => {
    it('should update pagination correctly', async () => {
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updatePagination({ page: 1, size: 25 });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('offset=25'),
          expect.anything()
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=25'),
          expect.anything()
        );
      });

      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.size).toBe(25);
    });

    it('should reset to page 0 when changing page size', async () => {
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

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
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

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
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('executionStatus=FILLED'),
          expect.anything()
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('tradeType=SELL'),
          expect.anything()
        );
      });
    });

    it('should reset pagination when filters change', async () => {
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

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
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSorting([{ field: 'quantity', direction: 'ASC' }]);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=quantity'),
          expect.anything()
        );
      });

      expect(result.current.sorting[0].field).toBe('quantity');
      expect(result.current.sorting[0].direction).toBe('ASC');
    });

    it('should handle descending sort with minus prefix', async () => {
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSorting([{ field: 'limitPrice', direction: 'DESC' }]);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=-limitPrice'),
          expect.anything()
        );
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
      (global.fetch as jest.Mock).mockClear();

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
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
      (global.fetch as jest.Mock).mockClear();

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not have made additional calls
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'API Error' })
      });

      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.executions).toEqual([]);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle refetch after error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'API Error' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockExecutionPage });

      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
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
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the initial call
      (global.fetch as jest.Mock).mockClear();

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should set isRefetching during manual refetch', async () => {
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() });

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