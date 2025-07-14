'use client'

import React, { useState, useMemo, Suspense, useEffect } from 'react'
import { Activity, Filter, RefreshCw, X, Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExecutionFilterPills } from '@/components/ui/execution-filter-pills'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useExecutions } from '@/lib/hooks/useExecutions'
import { ExecutionListTable } from '@/components/tables/ExecutionListTable'
import { EnhancedExecutionDTO, ExecutionAction, ExecutionFilters, ExecutionSortField, SortDirection } from '@/types/execution'
import { ExecutionDetailsModal } from '@/components/features/execution-details-modal'
import { executionService } from '@/lib/api/executionService'
import { saveFilters, loadFilters, cleanupExpiredFilters } from '@/lib/utils/filterPersistence'
import { exportExecutions, getExportSummary } from '@/lib/utils/exportUtils'
import ExecutionManagementPageContent from './ExecutionManagementPageContent'

// Enhanced filter configuration for Executions
const ENHANCED_FILTER_FIELDS = [
  {
    field: 'ticker' as keyof ExecutionFilters,
    label: 'Security Ticker',
    placeholder: 'Enter ticker symbol (e.g. AAPL)',
    type: 'text' as const
  },
  {
    field: 'executionStatus' as keyof ExecutionFilters,
    label: 'Status',
    placeholder: 'Select execution status',
    type: 'multiselect' as const
  },
  {
    field: 'tradeType' as keyof ExecutionFilters,
    label: 'Trade Type',
    placeholder: 'Select trade type',
    type: 'multiselect' as const
  },
  {
    field: 'destination' as keyof ExecutionFilters,
    label: 'Destination',
    placeholder: 'Enter destination',
    type: 'text' as const
  },
  {
    field: 'receivedTimestamp' as keyof ExecutionFilters,
    label: 'Received Date',
    placeholder: 'Select date range',
    type: 'daterange' as const
  },
  {
    field: 'sentTimestamp' as keyof ExecutionFilters,
    label: 'Sent Date',
    placeholder: 'Select date range',
    type: 'daterange' as const
  }
]

const FILTER_PERSISTENCE_KEY = 'execution_management'

interface ExecutionManagementPageContentProps {}

const ExecutionManagementPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    }>
      <ExecutionManagementPageContent />
    </Suspense>
  )
}

// Only export the default page component for Next.js App Router
export default ExecutionManagementPage 