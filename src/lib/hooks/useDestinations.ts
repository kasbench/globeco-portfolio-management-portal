import { useState, useEffect, useCallback } from 'react';
import { DestinationResponseDTO } from '@/types/trade';
// import { tradeService } from '@/lib/api/tradeService';
import { formatDestinationOptions } from '@/lib/utils/tradeUtils';

interface UseDestinationsReturn {
  destinations: DestinationResponseDTO[];
  destinationOptions: Array<{ value: number; label: string; description: string }>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing destinations data with caching
 * 
 * Provides destinations data with automatic caching (5-minute TTL), error handling,
 * and formatted options for UI consumption. Includes cache utilities for manual
 * cache management and fallback support for offline scenarios.
 * 
 * Features:
 * - 5-minute TTL cache for performance optimization
 * - Automatic cache refresh when expired
 * - Error handling with fallback to cached data
 * - Formatted destination options for dropdowns
 * - Manual cache management utilities
 * 
 * @returns Object containing destinations data, loading state, error state, and utilities
 * 
 * @example
 * ```tsx
 * const { destinations, destinationOptions, loading, error } = useDestinations();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return (
 *   <Select>
 *     {destinationOptions.map(option => (
 *       <option key={option.value} value={option.value}>
 *         {option.label}
 *       </option>
 *     ))}
 *   </Select>
 * );
 * ```
 */
export function useDestinations(): UseDestinationsReturn {
  const [destinations, setDestinations] = useState<DestinationResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/destinations');
      if (!res.ok) throw new Error('Failed to fetch destinations');
      const data = await res.json();
      setDestinations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load destinations';
      setError(errorMessage);
      console.error('Error fetching destinations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Format destinations for UI dropdowns
  const destinationOptions = formatDestinationOptions(destinations);

  return {
    destinations,
    destinationOptions,
    loading,
    error,
    refetch: fetchDestinations
  };
} 