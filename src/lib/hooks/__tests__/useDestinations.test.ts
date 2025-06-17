import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDestinations } from '../useDestinations';
import { tradeService } from '@/lib/api/tradeService';
import { DestinationResponseDTO } from '@/types/trade';

// Mock the tradeService
vi.mock('@/lib/api/tradeService', () => ({
  tradeService: {
    getDestinations: vi.fn()
  }
}));

const mockTradeService = vi.mocked(tradeService);

describe('useDestinations', () => {
  const mockDestinations: DestinationResponseDTO[] = [
    {
      id: 1,
      abbreviation: 'NYSE',
      description: 'New York Stock Exchange',
      version: 1
    },
    {
      id: 2,
      abbreviation: 'NASDAQ',
      description: 'NASDAQ Stock Market',
      version: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch destinations on mount', async () => {
    mockTradeService.getDestinations.mockResolvedValueOnce(mockDestinations);

    const { result } = renderHook(() => useDestinations());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.destinations).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.destinations).toEqual(mockDestinations);
    expect(result.current.destinationOptions).toHaveLength(2);
    expect(result.current.destinationOptions[0]).toEqual({
      value: 1,
      label: 'NYSE',
      description: 'New York Stock Exchange',
      disabled: false
    });
    expect(result.current.error).toBe(null);
    expect(mockTradeService.getDestinations).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch destinations';
    mockTradeService.getDestinations.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useDestinations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.destinations).toEqual([]);
    expect(result.current.destinationOptions).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle empty destinations array', async () => {
    mockTradeService.getDestinations.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useDestinations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.destinations).toEqual([]);
    expect(result.current.destinationOptions).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should refetch destinations when refetch is called', async () => {
    // First call
    mockTradeService.getDestinations.mockResolvedValueOnce(mockDestinations);

    const { result } = renderHook(() => useDestinations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockTradeService.getDestinations).toHaveBeenCalledTimes(1);

    // Second call via refetch
    const updatedDestinations = [
      ...mockDestinations,
      { id: 3, abbreviation: 'LSE', description: 'London Stock Exchange', version: 1 }
    ];
    mockTradeService.getDestinations.mockResolvedValueOnce(updatedDestinations);

    await result.current.refetch();

    expect(mockTradeService.getDestinations).toHaveBeenCalledTimes(2);
    expect(result.current.destinations).toEqual(updatedDestinations);
    expect(result.current.destinationOptions).toHaveLength(3);
  });

  it('should handle non-Error objects in catch block', async () => {
    mockTradeService.getDestinations.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => useDestinations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load destinations');
  });

  it('should reset error state when refetching', async () => {
    // First call fails
    mockTradeService.getDestinations.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDestinations());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    // Second call succeeds
    mockTradeService.getDestinations.mockResolvedValueOnce(mockDestinations);

    await result.current.refetch();

    expect(result.current.error).toBe(null);
    expect(result.current.destinations).toEqual(mockDestinations);
  });

  it('should format destination options correctly', async () => {
    mockTradeService.getDestinations.mockResolvedValueOnce(mockDestinations);

    const { result } = renderHook(() => useDestinations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.destinationOptions).toEqual([
      {
        value: 1,
        label: 'NYSE',
        description: 'New York Stock Exchange',
        disabled: false
      },
      {
        value: 2,
        label: 'NASDAQ',
        description: 'NASDAQ Stock Market',
        disabled: false
      }
    ]);
  });
}); 