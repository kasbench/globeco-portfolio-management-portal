'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { ChevronRight, Loader2, DollarSign, TrendingUp, AlertTriangle, RefreshCw, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import PositionTable from '@/components/tables/PositionTable'

import { RebalancePortfolio } from '@/types/rebalance'
import { useRebalancePortfolioPositions } from '@/lib/hooks/useRebalances'

interface PortfolioTableProps {
  portfolios: RebalancePortfolio[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  rebalanceId: string
  onRetry?: () => void
}

// Component for handling position data within expanded portfolio
const ExpandedPortfolioContent = ({ 
  portfolio, 
  rebalanceId, 
  cashChange 
}: { 
  portfolio: RebalancePortfolio
  rebalanceId: string
  cashChange: { amount: number; isPositive: boolean; percentage: number }
}) => {
  const [isSubmittingPositions, setIsSubmittingPositions] = useState(false)
  
  // Format currency values to 2 decimal places
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Use the position data hook for lazy loading
  const {
    data: positions,
    isLoading: positionsLoading,
    isError: positionsError,
    error: positionsErrorData,
  } = useRebalancePortfolioPositions(rebalanceId, portfolio.portfolio_id, true)

  // Handler for submitting just this portfolio's positions
  const handleSubmitPortfolioPositions = async () => {
    setIsSubmittingPositions(true)
    try {
      // TODO: Implement portfolio position submission logic
      console.log('Submitting portfolio positions:', portfolio.portfolio_id)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // TODO: Handle success/failure and update UI
    } catch (error) {
      console.error('Failed to submit portfolio positions:', error)
    } finally {
      setIsSubmittingPositions(false)
    }
  }

  // Calculate eligible positions (BUY/SELL with non-zero quantities)
  const getEligiblePositionsCount = () => {
    if (!positions) return 0
    return positions.filter((p: any) => 
      (p.transaction_type === 'BUY' || p.transaction_type === 'SELL') && 
      p.trade_quantity !== 0
    ).length
  }

  return (
    <TableRow key={`${portfolio.portfolio_id}-expanded`}>
      <TableCell colSpan={7} className="p-0">
        <div className="p-6 bg-slate-25 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h6 className="text-lg font-semibold text-slate-900">
              Position Details
            </h6>
            <div className="text-sm text-slate-500">
              Portfolio: {portfolio.portfolio_id.slice(0, 12)}...
            </div>
          </div>
          
          {/* Position Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm font-medium text-slate-600 mb-1">Portfolio Summary</div>
              <div className="text-lg font-bold text-slate-900">
                {formatCurrency(portfolio.market_value)}
              </div>
              <div className="text-xs text-slate-500">Total market value</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm font-medium text-slate-600 mb-1">Cash Impact</div>
              <div className={`text-lg font-bold ${
                cashChange.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {cashChange.isPositive ? '+' : ''}{formatCurrency(cashChange.amount)}
              </div>
              <div className="text-xs text-slate-500">
                {cashChange.percentage.toFixed(2)}% change
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-sm font-medium text-slate-600 mb-1">Position Count</div>
              <div className="text-lg font-bold text-slate-900">
                {positionsLoading ? '...' : positions?.length || 0}
              </div>
              <div className="text-xs text-slate-500">
                {positionsLoading ? 'Loading...' : 'Security positions'}
              </div>
            </div>
          </div>

          {/* Portfolio Submit Section */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Send className="h-4 w-4 text-purple-600" />
                  <h6 className="font-medium text-purple-900">Submit Portfolio Positions</h6>
                </div>
                <p className="text-sm text-purple-800 mb-2">
                  Submit all eligible positions in this portfolio to the Order Service for execution.
                </p>
                <div className="flex items-center space-x-4 text-xs text-purple-700">
                  <span>• {positionsLoading ? '...' : positions?.length || 0} total positions</span>
                  <span>• {positionsLoading ? '...' : getEligiblePositionsCount()} eligible orders</span>
                  <span>• Portfolio value: {formatCurrency(portfolio.market_value)}</span>
                </div>
              </div>
              <div className="ml-4">
                <Button 
                  onClick={handleSubmitPortfolioPositions}
                  disabled={isSubmittingPositions || positionsLoading || getEligiblePositionsCount() === 0}
                  size="sm"
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmittingPositions ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Positions</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Position Table - Real Data */}
          <PositionTable
            positions={positions || []}
            isLoading={positionsLoading}
            isError={positionsError}
            error={positionsErrorData}
            portfolioId={portfolio.portfolio_id}
            rebalanceId={rebalanceId}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

const PortfolioTable = React.memo(function PortfolioTable({
  portfolios,
  isLoading,
  isError,
  error,
  rebalanceId,
  onRetry,
}: PortfolioTableProps) {
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set())
  const [submittingPortfolios, setSubmittingPortfolios] = useState<Set<string>>(new Set())

  // Format currency values to 2 decimal places
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Handle portfolio expansion for positions (Phase 3, Step 6)
  const togglePortfolioExpansion = (portfolioId: string) => {
    setExpandedPortfolios(prev => {
      const newSet = new Set(prev)
      if (newSet.has(portfolioId)) {
        newSet.delete(portfolioId)
      } else {
        newSet.add(portfolioId)
      }
      return newSet
    })
  }

  // Handle individual portfolio submission
  const handleSubmitPortfolio = async (portfolioId: string) => {
    setSubmittingPortfolios(prev => new Set(prev).add(portfolioId))
    try {
      // TODO: Implement portfolio submission logic
      console.log('Submitting portfolio:', portfolioId)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: Handle success/failure and update UI
    } catch (error) {
      console.error('Failed to submit portfolio:', error)
    } finally {
      setSubmittingPortfolios(prev => {
        const newSet = new Set(prev)
        newSet.delete(portfolioId)
        return newSet
      })
    }
  }

  // Calculate cash change for each portfolio
  const getCashChange = (portfolio: RebalancePortfolio) => {
    const change = portfolio.cash_after_rebalance - portfolio.cash_before_rebalance
    return {
      amount: change,
      isPositive: change >= 0,
      percentage: portfolio.cash_before_rebalance !== 0 
        ? (change / portfolio.cash_before_rebalance) * 100 
        : 0
    }
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <h6 className="text-lg font-medium text-slate-900 mb-2">
              Loading Portfolio Data...
            </h6>
            <p className="text-slate-600">
              Fetching {portfolios.length || 'portfolio'} portfolios for rebalance
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (isError) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center border-red-200 bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-3" />
          <p className="text-red-800 mb-4">
            Failed to load portfolio data: {error?.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Loading
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <Loader2 className="h-4 w-4 mr-1" />
              Refresh Page
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Render empty state
  if (portfolios.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h6 className="text-lg font-medium text-slate-900 mb-2">
            No Portfolios Found
          </h6>
          <p className="text-slate-600">
            This rebalance does not contain any portfolio data.
          </p>
        </div>
      </div>
    )
  }

  // Render portfolio table
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-12">
              {/* Expand/Collapse Column */}
            </TableHead>
            
            <TableHead className="min-w-[180px]">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Portfolio ID</span>
              </div>
            </TableHead>
            
            <TableHead className="min-w-[140px] text-right">
              Market Value
            </TableHead>
            
            <TableHead className="min-w-[140px] text-right">
              Cash Before
            </TableHead>
            
            <TableHead className="min-w-[140px] text-right">
              Cash After
            </TableHead>
            
            <TableHead className="min-w-[120px] text-right">
              Cash Change
            </TableHead>

            <TableHead className="min-w-[140px] text-center">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {portfolios.map((portfolio) => {
            const cashChange = getCashChange(portfolio)
            const isExpanded = expandedPortfolios.has(portfolio.portfolio_id)
            const isSubmitting = submittingPortfolios.has(portfolio.portfolio_id)
            
            return (
              <React.Fragment key={portfolio.portfolio_id}>
                <TableRow 
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* Expand/Collapse Button */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePortfolioExpansion(portfolio.portfolio_id)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight 
                        className={`h-4 w-4 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    </Button>
                  </TableCell>
                  
                  {/* Portfolio ID */}
                  <TableCell className="font-mono text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {portfolio.portfolio_id.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-slate-500">
                        Full ID: {portfolio.portfolio_id.slice(-8)}
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Market Value */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(portfolio.market_value)}
                      </span>
                      <span className="text-xs text-slate-500">
                        market value
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Cash Before Rebalance */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(portfolio.cash_before_rebalance)}
                      </span>
                      <span className="text-xs text-slate-500">
                        before
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Cash After Rebalance */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(portfolio.cash_after_rebalance)}
                      </span>
                      <span className="text-xs text-slate-500">
                        after
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Cash Change */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center space-x-1 ${
                        cashChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className={`h-3 w-3 ${
                          cashChange.isPositive ? '' : 'rotate-180'
                        }`} />
                        <span className="font-medium">
                          {formatCurrency(Math.abs(cashChange.amount))}
                        </span>
                      </div>
                      <span className={`text-xs ${
                        cashChange.isPositive ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {cashChange.isPositive ? '+' : '-'}{Math.abs(cashChange.percentage).toFixed(2)}%
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions Column - Submit Button */}
                  <TableCell className="text-center">
                    <Button
                      onClick={() => handleSubmitPortfolio(portfolio.portfolio_id)}
                      disabled={isSubmitting}
                      size="sm"
                      className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Submit</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* Expanded Content Row - Position Table (Phase 3, Step 6) */}
                {isExpanded && (
                  <ExpandedPortfolioContent 
                    portfolio={portfolio} 
                    rebalanceId={rebalanceId}
                    cashChange={cashChange}
                  />
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
      
      {/* Portfolio Summary Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {portfolios.length} portfolios in this rebalance
          </span>
          <span className="text-slate-900 font-medium">
            Total Value: {formatCurrency(
              portfolios.reduce((sum, p) => sum + p.market_value, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  )
})

export default PortfolioTable 