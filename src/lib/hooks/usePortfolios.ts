import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { portfolioApi } from '@/lib/api/portfolioService'
import { Portfolio, PortfolioMap, PortfolioOption } from '@/types/portfolio'

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
    queryFn: portfolioApi.getPortfolios,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Create portfolio mapping for efficient lookups
  const portfolioMap: PortfolioMap = useMemo(() => {
    const map: PortfolioMap = {}
    portfolios.forEach(portfolio => {
      map[portfolio.id] = portfolio.name
    })
    return map
  }, [portfolios])

  // Create portfolio options for form selects
  const portfolioOptions: PortfolioOption[] = useMemo(() => {
    return portfolios.map(portfolio => ({
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
    const portfolio = portfolios.find(p => p.name === portfolioName)
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
    return portfolios.some(p => p.name === portfolioName)
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
    queryFn: () => portfolioApi.getPortfolio(portfolioId),
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