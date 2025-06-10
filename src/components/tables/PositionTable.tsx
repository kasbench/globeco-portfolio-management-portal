'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Target, Loader2, AlertTriangle, DollarSign } from 'lucide-react'

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { RebalancePosition } from '@/types/rebalance'

interface PositionTableProps {
  positions: RebalancePosition[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  portfolioId: string
  rebalanceId: string
}

export default function PositionTable({
  positions,
  isLoading,
  isError,
  error,
  portfolioId,
  rebalanceId,
}: PositionTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    field: keyof RebalancePosition | null
    direction: 'asc' | 'desc'
  }>({ field: null, direction: 'asc' })

  // Format currency values to 2 decimal places
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Format percentages/decimals to 3 decimal places
  const formatPercentage = (value: number, asPercentage: boolean = true): string => {
    if (asPercentage) {
      return `${(value * 100).toFixed(3)}%`
    }
    return value.toFixed(3)
  }

  // Format quantities to 2 decimal places
  const formatQuantity = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  // Calculate drift severity for color coding
  const getDriftSeverity = (drift: number): 'low' | 'medium' | 'high' => {
    const absDrift = Math.abs(drift)
    if (absDrift <= 0.005) return 'low'    // ≤ 0.5%
    if (absDrift <= 0.02) return 'medium'  // ≤ 2%
    return 'high'                          // > 2%
  }

  // Get drift color based on severity
  const getDriftColor = (drift: number) => {
    const severity = getDriftSeverity(drift)
    const isPositive = drift >= 0
    
    switch (severity) {
      case 'low':
        return isPositive ? 'text-green-600' : 'text-green-700'
      case 'medium':
        return isPositive ? 'text-yellow-600' : 'text-yellow-700'
      case 'high':
        return isPositive ? 'text-red-600' : 'text-red-700'
      default:
        return 'text-slate-600'
    }
  }

  // Handle sorting
  const handleSort = (field: keyof RebalancePosition) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Sort positions
  const sortedPositions = [...positions].sort((a, b) => {
    if (!sortConfig.field) return 0
    
    const aValue = a[sortConfig.field]
    const bValue = b[sortConfig.field]
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    const aStr = String(aValue).toLowerCase()
    const bStr = String(bValue).toLowerCase()
    
    if (sortConfig.direction === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
    }
  })

  // Calculate position statistics
  const positionStats = {
    totalPositions: positions.length,
    totalAdjustedValue: positions.reduce((sum, p) => sum + p.adjusted_position_market_value, 0),
    totalOriginalValue: positions.reduce((sum, p) => sum + p.original_position_market_value, 0),
    averageDrift: positions.length > 0 
      ? positions.reduce((sum, p) => sum + Math.abs(p.actual_drift), 0) / positions.length 
      : 0,
    highDriftCount: positions.filter(p => getDriftSeverity(p.actual_drift) === 'high').length
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <h6 className="text-lg font-medium text-slate-900 mb-2">
              Loading Position Data...
            </h6>
            <p className="text-slate-600">
              Fetching security positions for portfolio {portfolioId.slice(0, 8)}...
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
            Failed to load position data: {error?.message}
          </p>
          <Button variant="outline" size="sm">
            <Loader2 className="h-4 w-4 mr-1" />
            Retry Loading
          </Button>
        </Card>
      </div>
    )
  }

  // Render empty state
  if (positions.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h6 className="text-lg font-medium text-slate-900 mb-2">
            No Positions Found
          </h6>
          <p className="text-slate-600">
            This portfolio does not contain any security positions.
          </p>
        </div>
      </div>
    )
  }

  // Render position table
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Position Statistics Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{positionStats.totalPositions}</div>
            <div className="text-sm text-slate-600">Total Positions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(positionStats.totalAdjustedValue)}
            </div>
            <div className="text-sm text-slate-600">Adjusted Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {formatPercentage(positionStats.averageDrift)}
            </div>
            <div className="text-sm text-slate-600">Avg Drift</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{positionStats.highDriftCount}</div>
            <div className="text-sm text-slate-600">High Drift</div>
          </div>
        </div>
      </div>

      {/* Position Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead 
                className="min-w-[140px] cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('security_id')}
              >
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Security ID</span>
                  {sortConfig.field === 'security_id' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
              
              <TableHead 
                className="min-w-[100px] text-right cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Price</span>
                  {sortConfig.field === 'price' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
              
              <TableHead 
                className="min-w-[110px] text-right cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('original_quantity')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Original Qty</span>
                  {sortConfig.field === 'original_quantity' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
              
              <TableHead 
                className="min-w-[110px] text-right cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('adjusted_quantity')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Adjusted Qty</span>
                  {sortConfig.field === 'adjusted_quantity' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
              
              <TableHead 
                className="min-w-[100px] text-right cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('target')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Target</span>
                  {sortConfig.field === 'target' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
              
              <TableHead 
                className="min-w-[100px] text-right cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('actual')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Actual</span>
                  {sortConfig.field === 'actual' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
              
              <TableHead 
                className="min-w-[120px] text-right cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('actual_drift')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Actual Drift</span>
                  {sortConfig.field === 'actual_drift' && (
                    <div className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </div>
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {sortedPositions.map((position) => {
              const driftSeverity = getDriftSeverity(position.actual_drift)
              const driftColor = getDriftColor(position.actual_drift)
              const quantityChange = position.adjusted_quantity - position.original_quantity
              const valueChange = position.adjusted_position_market_value - position.original_position_market_value
              
              return (
                <TableRow 
                  key={position.security_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* Security ID */}
                  <TableCell className="font-mono text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {position.security_id.slice(0, 12)}...
                      </span>
                      <span className="text-xs text-slate-500">
                        ID: {position.security_id.slice(-8)}
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Price */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(position.price)}
                      </span>
                      <span className="text-xs text-slate-500">
                        per share
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Original Quantity */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatQuantity(position.original_quantity)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatCurrency(position.original_position_market_value)}
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Adjusted Quantity */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatQuantity(position.adjusted_quantity)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {quantityChange !== 0 && (
                          <div className={`flex items-center text-xs ${
                            quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {quantityChange > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(quantityChange).toFixed(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Target Allocation */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-900">
                        {formatPercentage(position.target)}
                      </span>
                      <span className="text-xs text-slate-500">
                        target
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Actual Allocation */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-900">
                        {formatPercentage(position.actual)}
                      </span>
                      <span className="text-xs text-slate-500">
                        actual
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Actual Drift */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={driftSeverity === 'high' ? 'destructive' : 
                                  driftSeverity === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {driftSeverity.toUpperCase()}
                        </Badge>
                        <span className={`font-bold ${driftColor}`}>
                          {position.actual_drift >= 0 ? '+' : ''}{formatPercentage(position.actual_drift)}
                        </span>
                      </div>
                      <div className={`text-xs ${
                        Math.abs(position.actual_drift) > 0.01 ? 'text-orange-600' : 'text-slate-500'
                      }`}>
                        {Math.abs(position.actual_drift) > 0.01 ? 'Needs attention' : 'Within tolerance'}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Position Summary Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-slate-600">
              {positions.length} security positions
            </span>
            <span className="text-slate-900 font-medium">
              Value Change: {formatCurrency(positionStats.totalAdjustedValue - positionStats.totalOriginalValue)}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-600">
              Portfolio: {portfolioId.slice(0, 8)}...
            </span>
            <span className="text-slate-600">
              Rebalance: {rebalanceId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 