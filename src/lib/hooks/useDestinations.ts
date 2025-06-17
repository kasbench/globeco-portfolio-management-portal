import { useState, useEffect, useCallback } from 'react';
import { DestinationResponseDTO } from '@/types/trade';
import { tradeService } from '@/lib/api/tradeService';
import { formatDestinationOptions } from '@/lib/utils/tradeUtils';

interface UseDestinationsReturn {
  destinations: DestinationResponseDTO[];
  destinationOptions: Array<{ value: number; label: string; description: string }>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing destinations data
 * Provides caching, loading states, and formatted options for UI consumption
 */
export function useDestinations(): UseDestinationsReturn {
  const [destinations, setDestinations] = useState<DestinationResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tradeService.getDestinations();
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