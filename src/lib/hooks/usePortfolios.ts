import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Portfolio, PortfolioMap, PortfolioOption } from '@/types/portfolio'
import { orderGenerationApi } from '@/lib/api/orderGenerationService'

// Custom hook for portfolio management and mapping
export function usePortfolios() {
  // Fetch all portfolios with caching
  const {
    data: portfolios = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const res = await fetch('/api/portfolios')
      if (!res.ok) throw new Error('Failed to fetch portfolios')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Create portfolio mapping for efficient lookups
  const portfolioMap: PortfolioMap = useMemo(() => {
    const map: PortfolioMap = {}
    portfolios.forEach((portfolio: Portfolio) => {
      map[portfolio.id] = portfolio.name
    })
    return map
  }, [portfolios])

  // Create portfolio options for form selects
  const portfolioOptions: PortfolioOption[] = useMemo(() => {
    return portfolios.map((portfolio: Portfolio) => ({
      value: portfolio.id,
      label: portfolio.name
    }))
  }, [portfolios])

  // Utility function to get portfolio name by ID
  const getPortfolioName = (portfolioId: string): string => {
    return portfolioMap[portfolioId] || portfolioId
  }

  // Utility function to get portfolio ID by name
  const getPortfolioId = (portfolioName: string): string | null => {
    const portfolio = portfolios.find((p: Portfolio) => p.name === portfolioName)
    return portfolio?.id || null
  }

  // Utility function to get multiple portfolio names
  const getPortfolioNames = (portfolioIds: string[]): string[] => {
    return portfolioIds.map(id => getPortfolioName(id))
  }

  // Utility function to get multiple portfolio IDs
  const getPortfolioIds = (portfolioNames: string[]): string[] => {
    return portfolioNames
      .map(name => getPortfolioId(name))
      .filter((id): id is string => id !== null)
  }

  // Utility function to validate if a portfolio name exists
  const isValidPortfolioName = (portfolioName: string): boolean => {
    return portfolios.some((p: Portfolio) => p.name === portfolioName)
  }

  // Utility function to validate if a portfolio ID exists
  const isValidPortfolioId = (portfolioId: string): boolean => {
    return portfolioId in portfolioMap
  }

  return {
    // Data
    portfolios,
    portfolioMap,
    portfolioOptions,
    isLoading,
    isError,
    error,
    
    // Utility functions
    getPortfolioName,
    getPortfolioId,
    getPortfolioNames,
    getPortfolioIds,
    isValidPortfolioName,
    isValidPortfolioId,
    
    // Refetch
    refetch,
  }
}

// Custom hook for a single portfolio
export function usePortfolio(portfolioId: string) {
  const { data: portfolio, isLoading, isError, error } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${portfolioId}`)
      if (!res.ok) throw new Error('Failed to fetch portfolio')
      return res.json()
    },
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    portfolio,
    isLoading,
    isError,
    error,
  }
}

// Hook for loading portfolios for a specific rebalance
export function useRebalancePortfolios(rebalanceId: string, enabled: boolean = true) {
  // This still uses orderGenerationApi, which should be migrated in a later step
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

export default usePortfolios 