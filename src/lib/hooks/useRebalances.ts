import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { orderGenerationApi } from '@/lib/api/orderGenerationService'
import { 
  Rebalance,
  RebalancePortfolio,
  RebalancePosition,
  RebalancesQueryParams,
  RebalanceSortField,
  RebalanceSortConfig 
} from '@/types/rebalance'

const REBALANCES_PER_PAGE = 20
const REBALANCES_ADDITIONAL_PAGE_SIZE = 10

// Custom hook for rebalance management with infinite scrolling
export function useRebalances() {
  const queryClient = useQueryClient()
  const [sortConfig, setSortConfig] = useState<RebalanceSortConfig>({
    field: 'rebalance_date',
    direction: 'desc' // Most recent first by default
  })

  // Generate sort string for API
  const sortString = useMemo(() => {
    const prefix = sortConfig.direction === 'desc' ? '-' : ''
    return `${prefix}${sortConfig.field}`
  }, [sortConfig])

  // Infinite query for rebalances with pagination and sorting
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['rebalances', sortString],
    queryFn: async ({ pageParam = 0 }) => {
      const params: RebalancesQueryParams = {
        offset: pageParam,
        limit: pageParam === 0 ? REBALANCES_PER_PAGE : REBALANCES_ADDITIONAL_PAGE_SIZE,
        sort_by: sortString
      }
      return orderGenerationApi.getRebalances(params)
    },
    getNextPageParam: (lastPage, pages) => {
      // If the last page has fewer items than expected, we've reached the end
      const expectedSize = pages.length === 1 ? REBALANCES_PER_PAGE : REBALANCES_ADDITIONAL_PAGE_SIZE
      if (lastPage.length < expectedSize) {
        return undefined
      }
      // Calculate next offset
      const totalLoaded = REBALANCES_PER_PAGE + ((pages.length - 1) * REBALANCES_ADDITIONAL_PAGE_SIZE)
      return totalLoaded
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: false, // Use cached data if available
    retry: 3, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })

  // Flatten all pages into a single array
  const rebalances = useMemo(() => {
    return data?.pages.flat() || []
  }, [data])

  // Sort functionality
  const handleSort = (field: RebalanceSortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Load more functionality for infinite scroll
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return {
    // Data
    rebalances,
    isLoading,
    isError,
    error,
    
    // Pagination
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    
    // Sorting
    sortConfig,
    handleSort,
    
    // Refetch
    refetch,
  }
}

// Hook for getting a specific rebalance with full nested data
export function useRebalance(rebalanceId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['rebalance', rebalanceId],
    queryFn: () => orderGenerationApi.getRebalance(rebalanceId),
    enabled: enabled && !!rebalanceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Hook for lazy loading portfolios when a rebalance is expanded
export function useRebalancePortfolios(rebalanceId: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['rebalance-portfolios', rebalanceId],
    queryFn: () => orderGenerationApi.getRebalancePortfolios(rebalanceId),
    enabled: enabled && !!rebalanceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Hook for lazy loading positions when a portfolio is expanded
export function useRebalancePortfolioPositions(
  rebalanceId: string, 
  portfolioId: string, 
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['rebalance-portfolio-positions', rebalanceId, portfolioId],
    queryFn: () => orderGenerationApi.getRebalancePortfolioPositions(rebalanceId, portfolioId),
    enabled: enabled && !!rebalanceId && !!portfolioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Prefetch helper for improved UX
export function usePrefetchRebalanceData() {
  const queryClient = useQueryClient()

  const prefetchRebalancePortfolios = (rebalanceId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['rebalance-portfolios', rebalanceId],
      queryFn: () => orderGenerationApi.getRebalancePortfolios(rebalanceId),
      staleTime: 5 * 60 * 1000,
    })
  }

  const prefetchPortfolioPositions = (rebalanceId: string, portfolioId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['rebalance-portfolio-positions', rebalanceId, portfolioId],
      queryFn: () => orderGenerationApi.getRebalancePortfolioPositions(rebalanceId, portfolioId),
      staleTime: 5 * 60 * 1000,
    })
  }

  return {
    prefetchRebalancePortfolios,
    prefetchPortfolioPositions,
  }
} 