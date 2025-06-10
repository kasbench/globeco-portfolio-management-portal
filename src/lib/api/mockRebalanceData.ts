import { Rebalance, RebalancePortfolio, RebalancePosition } from '@/types/rebalance'

// Generate random ID similar to MongoDB ObjectId
const generateId = (): string => {
  return Math.random().toString(16).slice(2, 26).padEnd(24, '0')
}

// Generate random date within the last 6 months
const generateRecentDate = (): string => {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000))
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime())
  return new Date(randomTime).toISOString()
}

// Generate mock position data
const generateMockPosition = (): RebalancePosition => {
  const target = Math.random() * 0.1 // 0-10% allocation
  const drift = (Math.random() - 0.5) * 0.02 // -1% to +1% drift
  const actual = Math.max(0, target + drift)
  
  return {
    security_id: generateId(),
    price: Math.round((Math.random() * 200 + 10) * 100) / 100, // $10-$210
    original_quantity: Math.round(Math.random() * 1000),
    adjusted_quantity: Math.round(Math.random() * 1000),
    original_position_market_value: Math.round(Math.random() * 50000),
    adjusted_position_market_value: Math.round(Math.random() * 50000),
    target,
    high_drift: 0.005,
    low_drift: 0.005,
    actual,
    actual_drift: Math.abs(actual - target),
  }
}

// Generate mock portfolio data
const generateMockPortfolio = (): RebalancePortfolio => {
  const marketValue = Math.round((Math.random() * 2000000 + 100000) * 100) / 100 // $100k-$2.1M
  const positionCount = Math.floor(Math.random() * 15) + 5 // 5-20 positions
  
  return {
    portfolio_id: generateId(),
    market_value: marketValue,
    cash_before_rebalance: Math.round(marketValue * (0.02 + Math.random() * 0.08) * 100) / 100, // 2-10% cash
    cash_after_rebalance: Math.round(marketValue * (0.02 + Math.random() * 0.08) * 100) / 100,
    positions: Array.from({ length: positionCount }, generateMockPosition),
  }
}

// Generate mock rebalance data
const generateMockRebalance = (modelName?: string): Rebalance => {
  const portfolioCount = Math.floor(Math.random() * 150) + 50 // 50-200 portfolios
  const rebalanceDate = generateRecentDate()
  
  return {
    rebalance_id: generateId(),
    model_id: generateId(),
    rebalance_date: rebalanceDate,
    model_name: modelName || `Model ${Math.floor(Math.random() * 50) + 1}`,
    number_of_portfolios: portfolioCount,
    portfolios: Array.from({ length: Math.min(portfolioCount, 5) }, generateMockPortfolio), // Only include 5 for initial load
    version: 1,
    created_at: rebalanceDate,
  }
}

// Model names for variety
const MODEL_NAMES = [
  'Conservative Growth',
  'Aggressive Growth', 
  'Balanced Portfolio',
  'Income Focus',
  'Technology Sector',
  'Healthcare Sector',
  'International Equity',
  'Emerging Markets',
  'Fixed Income',
  'ESG Sustainable',
  'Small Cap Value',
  'Large Cap Growth',
  'Real Estate Focus',
  'Commodity Strategy',
  'Dividend Growth'
]

// Generate a collection of mock rebalances
export const generateMockRebalances = (count: number = 50): Rebalance[] => {
  return Array.from({ length: count }, (_, index) => {
    const modelName = MODEL_NAMES[index % MODEL_NAMES.length]
    return generateMockRebalance(modelName)
  }).sort((a, b) => new Date(b.rebalance_date).getTime() - new Date(a.rebalance_date).getTime()) // Most recent first
}

// Mock API response simulation with delay
export const mockApiDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Simulate paginated response
export const getMockRebalancesPage = async (
  offset: number = 0, 
  limit: number = 20
): Promise<Rebalance[]> => {
  await mockApiDelay()
  
  const allRebalances = generateMockRebalances(100) // Generate 100 total mock rebalances
  return allRebalances.slice(offset, offset + limit)
}

// Simulate getting a specific rebalance with full data
export const getMockRebalance = async (rebalanceId: string): Promise<Rebalance> => {
  await mockApiDelay()
  
  const rebalance = generateMockRebalance()
  rebalance.rebalance_id = rebalanceId
  // Generate full portfolio data for detailed view
  rebalance.portfolios = Array.from({ length: rebalance.number_of_portfolios }, generateMockPortfolio)
  
  return rebalance
}

// Simulate getting portfolios for a rebalance
export const getMockRebalancePortfolios = async (rebalanceId: string): Promise<RebalancePortfolio[]> => {
  await mockApiDelay()
  
  const portfolioCount = Math.floor(Math.random() * 20) + 10 // 10-30 portfolios
  return Array.from({ length: portfolioCount }, generateMockPortfolio)
}

// Simulate getting positions for a portfolio
export const getMockRebalancePortfolioPositions = async (
  rebalanceId: string, 
  portfolioId: string
): Promise<RebalancePosition[]> => {
  await mockApiDelay()
  
  const positionCount = Math.floor(Math.random() * 15) + 5 // 5-20 positions
  return Array.from({ length: positionCount }, generateMockPosition)
}

// Default export for easy importing
export default {
  generateMockRebalances,
  getMockRebalancesPage,
  getMockRebalance,
  getMockRebalancePortfolios,
  getMockRebalancePortfolioPositions,
} 