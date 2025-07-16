'use client'

import React, { useState, useMemo, Suspense } from 'react'
import { TrendingUp, Filter, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterPills } from '@/components/ui/filter-pills'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useTradeOrders } from '@/lib/hooks/useTradeOrders'
import TradeOrderListTable from '@/components/tables/TradeOrderListTable'
import { TradeOrderEnhancedResponseDTO, TradeOrderAction, TradeOrderFilters } from '@/types/trade'
import { TradeOrderActionMenu } from '@/components/features/trade-order-action-menu'
import TradeOrderDetailsModal from '@/components/features/trade-order-details-modal'
import { TradeSubmissionModal } from '@/components/features/trade-submission-modal'

import TradeManagementPageContent from './TradeManagementPageContent'

// Filter configuration for Trade Orders
const FILTER_FIELDS = [
  {
    field: 'securityTickers',
    label: 'Security Ticker',
    placeholder: 'Enter ticker symbol (e.g. AAPL)'
  },
  {
    field: 'portfolioNames',
    label: 'Portfolio',
    placeholder: 'Enter portfolio name'
  },
  {
    field: 'blotterAbbreviation',
    label: 'Blotter',
    placeholder: 'Enter blotter abbreviation (e.g. EQ)'
  },
  {
    field: 'orderType',
    label: 'Order Type',
    placeholder: 'BUY, SELL, or SHORT'
  },
  {
    field: 'submitted',
    label: 'Submitted',
    placeholder: 'true or false'
  }
]


const TradeManagementPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Trade Management...</p>
        </div>
      </div>
    }>
      <TradeManagementPageContent />
    </Suspense>
  )
}

export default TradeManagementPage 