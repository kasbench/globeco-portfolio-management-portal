import React, { useState, useMemo } from 'react'
import { 
  Filter, 
  Play, 
  Trash2, 
  RotateCcw, 
  Settings, 
  Download, 
  Upload,
  CheckSquare,
  Square,
  Minus,
  X,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  Target,
  List
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TooltipProvider, HelpTooltip } from '@/components/ui/tooltip'
import { toast } from 'sonner'

import { useBatchOperations, type SmartFilter, type FilterCriteria, type RetryStrategy } from '@/lib/hooks/useBatchOperations'
import { RebalanceWithSubmission } from '@/types/rebalance'
import { SubmissionState, OrderSubmissionResult } from '@/types/order'
import { formatCurrency, formatNumber, formatDuration } from '@/lib/utils/formatters'

interface BatchOperationsPanelProps {
  rebalances: RebalanceWithSubmission[]
  selectedRebalances?: Set<string>
  onSelectRebalance?: (rebalanceId: string, selected: boolean) => void
  onOperationComplete?: (results: any) => void
  className?: string
}

interface SmartSelectionPreset {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

const BatchOperationsPanel: React.FC<BatchOperationsPanelProps> = ({
  rebalances,
  selectedRebalances: externalSelectedRebalances,
  onSelectRebalance: externalOnSelectRebalance,
  onOperationComplete,
  className = ''
}) => {
  const batchOps = useBatchOperations(rebalances)
  const [activeTab, setActiveTab] = useState('selection')
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [showRetryDialog, setShowRetryDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [customFilterName, setCustomFilterName] = useState('')
  const [customFilterCriteria, setCustomFilterCriteria] = useState<FilterCriteria>({})
  const [retryStrategy, setRetryStrategy] = useState<RetryStrategy>({
    retryFailedOnly: true,
    retryPartialOnly: false,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    skipPermanentFailures: true
  })
  const [previousResults, setPreviousResults] = useState<OrderSubmissionResult[]>([])

  const {
    selectionState: internalSelectionState,
    availableFilters,
    getFilteredItems,
    selectAll: internalSelectAll,
    selectNone: internalSelectNone,
    selectEligibleOnly,
    selectByValue,
    invertSelection,
    applyFilter,
    clearFilter,
    createFilter,
    batchSubmit,
    batchDelete,
    batchRetry,
    progress,
    isProcessing,
    canCancel,
    cancelOperation,
    estimateProcessingTime,
    validateSelection,
    exportSelection,
    importSelection
  } = batchOps

  // Use external selection state if provided, otherwise use internal state
  const selectedRebalancesSet = externalSelectedRebalances || internalSelectionState.selectedRebalances
  
  // Create wrapper functions for selection that work with external or internal state
  const selectAll = React.useCallback((itemType?: 'rebalance' | 'portfolio' | 'position', filtered = true) => {
    if (externalSelectedRebalances && externalOnSelectRebalance && itemType === 'rebalance') {
      // Use external selection for rebalances
      const items = filtered ? getFilteredItems() : { rebalances }
      items.rebalances.forEach(rebalance => {
        if (!selectedRebalancesSet.has(rebalance.rebalance_id)) {
          externalOnSelectRebalance(rebalance.rebalance_id, true)
        }
      })
    } else {
      // Fall back to internal selection
      internalSelectAll(itemType, filtered)
    }
  }, [externalSelectedRebalances, externalOnSelectRebalance, getFilteredItems, rebalances, selectedRebalancesSet, internalSelectAll])

  const selectNone = React.useCallback((itemType?: 'rebalance' | 'portfolio' | 'position') => {
    if (externalSelectedRebalances && externalOnSelectRebalance && itemType === 'rebalance') {
      // Use external selection for rebalances
      selectedRebalancesSet.forEach(rebalanceId => {
        externalOnSelectRebalance(rebalanceId, false)
      })
    } else {
      // Fall back to internal selection
      internalSelectNone(itemType)
    }
  }, [externalSelectedRebalances, externalOnSelectRebalance, selectedRebalancesSet, internalSelectNone])

  // Calculate summary statistics using the correct selection state
  const filteredItems = getFilteredItems()
  const selectedCount = selectedRebalancesSet.size
  const totalCount = filteredItems.rebalances.length
  const allSelected = selectedCount > 0 && selectedCount === totalCount
  const someSelected = selectedCount > 0 && selectedCount < totalCount
  
  // Estimate values and counts
  const estimatedPortfolios = filteredItems.rebalances
    .filter(r => selectedRebalancesSet.has(r.rebalance_id))
    .reduce((sum, r) => sum + (r.portfolios?.length || 0), 0)
  
  const estimatedOrders = estimatedPortfolios * 50 // Rough estimate
  const estimatedValue = estimatedOrders * 10000 // $10k average per order

  // Custom validation for external selection state
  const externalValidationResults = React.useMemo(() => {
    if (externalSelectedRebalances) {
      const errors: string[] = []
      const warnings: string[] = []
      
      if (externalSelectedRebalances.size === 0) {
        errors.push('No items selected for processing')
      }
      
      if (externalSelectedRebalances.size > 10000) {
        warnings.push('Large selection may take significant time to process')
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      }
    }
    return null
  }, [externalSelectedRebalances])

  // Validation results
  const validationResults = useMemo(() => validateSelection(), [validateSelection])

  // Use external validation if available, otherwise use internal validation
  const effectiveValidationResults = externalValidationResults || validationResults

  // Smart selection presets
  const smartSelectionPresets: SmartSelectionPreset[] = [
    {
      id: 'eligible-only',
      name: 'Eligible Only',
      description: 'Select only positions that can be submitted',
      icon: CheckSquare,
      action: selectEligibleOnly
    },
    {
      id: 'large-positions',
      name: 'Large Positions',
      description: 'Select positions > $10,000',
      icon: Target,
      action: () => selectByValue(10000)
    },
    {
      id: 'invert',
      name: 'Invert Selection',
      description: 'Invert current selection',
      icon: RotateCcw,
      action: () => invertSelection('rebalance')
    }
  ]
  const estimatedTime = useMemo(() => estimateProcessingTime(), [estimateProcessingTime])

  // Custom handlers that work with external selection state when provided
  const handleBatchSubmit = async () => {
    try {
      // If using external selection state, we need to handle submission differently
      if (externalSelectedRebalances && externalSelectedRebalances.size > 0) {
        // Use a custom submission approach with external selection
        const selectedRebalancesArray = rebalances.filter(r => 
          externalSelectedRebalances.has(r.rebalance_id)
        )
        
        if (selectedRebalancesArray.length === 0) {
          throw new Error('No rebalances selected for submission')
        }

        // Use the same submission logic as the main "Submit All" button
        // Import the necessary functions at the top of the file and implement here
        console.log(`Submitting ${selectedRebalancesArray.length} selected rebalances:`, 
          selectedRebalancesArray.map(r => r.rebalance_id))
        
        // For now, let's use the OrderService API directly for each selected rebalance
        // import { orderServiceApi } from '@/lib/api/orderService'
        // import { transformToSubmissionRebalance } from '@/lib/utils/rebalanceTransform'
        
        let successfulSubmissions = 0
        let failedSubmissions = 0
        
        // import { orderGenerationApi } from '@/lib/api/orderGenerationService'
        
        for (const rebalance of selectedRebalancesArray) {
          try {
            const submissionRebalance = rebalance // Assuming rebalance object itself is the submission data
            const res = await fetch('/api/rebalances/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(submissionRebalance)
            });
            if (!res.ok) throw new Error('Failed to submit rebalance');
            const { result } = await res.json();
            
            if (result.successfulOrders > 0) {
              successfulSubmissions++
              
              // If all orders were successful and no orders failed, delete the rebalance from backend
              if (result.failedOrders === 0) {
                try {
                  const delRes = await fetch(`/api/rebalances/${rebalance.rebalance_id}?version=${rebalance.version}`, {
                    method: 'DELETE'
                  });
                  const deleteResult = await delRes.json();
                  if (deleteResult.success) {
                    console.log(`Rebalance ${rebalance.rebalance_id} deleted from backend after successful submission`)
                  } else {
                    console.warn(`Backend deletion reported failure for ${rebalance.rebalance_id}, but continuing`)
                  }
                } catch (deleteError) {
                  console.warn(`Failed to delete rebalance ${rebalance.rebalance_id} from backend:`, deleteError)
                  // Don't fail the entire operation since orders were submitted successfully
                }
              }
              
              console.log(`Processing complete for ${rebalance.rebalance_id}:`, {
                successfulOrders: result.successfulOrders,
                failedOrders: result.failedOrders,
                deletedFromBackend: result.failedOrders === 0
              })
            }
            if (result.failedOrders > 0) {
              failedSubmissions++
            }
          } catch (error) {
            console.error(`Failed to submit rebalance ${rebalance.rebalance_id}:`, error)
            failedSubmissions++
          }
        }
        
        // Show completion message
        if (successfulSubmissions > 0) {
          if (failedSubmissions === 0) {
            console.log(`Successfully submitted ${successfulSubmissions} rebalances.`)
            toast.success(`Successfully submitted ${successfulSubmissions} rebalances.`)
          } else {
            console.log(`Submitted ${successfulSubmissions} rebalances, ${failedSubmissions} failed.`)
            toast.warning(`Submitted ${successfulSubmissions} rebalances, ${failedSubmissions} failed.`)
          }
        } else {
          console.error(`No rebalances were successfully submitted. ${failedSubmissions} failed.`)
          toast.error(`No rebalances were successfully submitted. ${failedSubmissions} failed.`)
        }
        
        // Trigger completion callback
        if (onOperationComplete) {
          onOperationComplete({
            type: 'batch_submit',
            totalProcessed: selectedRebalancesArray.length,
            successful: successfulSubmissions,
            failed: failedSubmissions
          })
        }
      } else {
        // Fall back to internal batch submit
        const result = await batchSubmit()
        if (onOperationComplete) {
          onOperationComplete(result)
        }
      }
    } catch (error) {
      console.error('Batch submit failed:', error)
    }
  }

  const handleBatchDelete = async () => {
    try {
      // If using external selection state, we need to handle deletion differently
      if (externalSelectedRebalances && externalSelectedRebalances.size > 0) {
        const selectedRebalancesArray = rebalances.filter(r => 
          externalSelectedRebalances.has(r.rebalance_id)
        )
        
        if (selectedRebalancesArray.length === 0) {
          throw new Error('No rebalances selected for deletion')
        }

        console.log(`Deleting ${selectedRebalancesArray.length} selected rebalances:`, 
          selectedRebalancesArray.map(r => r.rebalance_id))
        
        // Use the Order Generation API for deletion
        // import { orderGenerationApi } from '@/lib/api/orderGenerationService'
        
        const deletionRequests = selectedRebalancesArray.map(rebalance => ({
          rebalanceId: rebalance.rebalance_id,
          version: rebalance.version
        }));
        const delRes = await fetch('/api/rebalances/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deletionRequests)
        });
        const deletionResult = await delRes.json();
        
        console.log(`Deletion complete: ${deletionResult.totalDeleted} successful, ${deletionResult.totalFailed} failed`)
        
        // Show completion message
        if (deletionResult.totalDeleted > 0) {
          if (deletionResult.totalFailed === 0) {
            toast.success(`Successfully deleted ${deletionResult.totalDeleted} rebalances.`)
          } else {
            toast.warning(`Deleted ${deletionResult.totalDeleted} rebalances, ${deletionResult.totalFailed} failed.`)
          }
        } else {
          toast.error(`No rebalances were deleted. ${deletionResult.totalFailed} failed.`)
        }
        
        // Trigger completion callback
        if (onOperationComplete) {
          onOperationComplete({
            type: 'batch_delete',
            totalProcessed: deletionRequests.length,
            successful: deletionResult.totalDeleted,
            failed: deletionResult.totalFailed
          })
        }
      } else {
        // Fall back to internal batch delete
        const result = await batchDelete()
        if (onOperationComplete) {
          onOperationComplete(result)
        }
      }
    } catch (error) {
      console.error('Batch delete failed:', error)
    }
  }

  const handleBatchRetry = async () => {
    try {
      const result = await batchRetry(previousResults, retryStrategy)
      if (onOperationComplete) {
        onOperationComplete(result)
      }
    } catch (error) {
      console.error('Batch retry failed:', error)
    }
  }

  const handleCreateCustomFilter = () => {
    if (customFilterName.trim()) {
      createFilter(customFilterName, customFilterCriteria)
      setCustomFilterName('')
      setCustomFilterCriteria({})
      setShowFilterDialog(false)
    }
  }

  const handleExportSelection = () => {
    const exported = exportSelection()
    const dataStr = JSON.stringify(exported, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `batch-selection-${Date.now()}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleImportSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          importSelection(imported)
        } catch (error) {
          console.error('Failed to import selection:', error)
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <TooltipProvider>
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <List className="h-5 w-5" />
              <span>Batch Operations</span>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  Processing...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <HelpTooltip content="Advanced batch operations for processing multiple rebalances at once">
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </HelpTooltip>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Operations</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExportSelection}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Selection
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => document.getElementById('import-file')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Selection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <input
                id="import-file"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportSelection}
              />
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="selection">Selection</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
            </TabsList>

            {/* Selection Tab */}
            <TabsContent value="selection" className="space-y-4">
              {/* Master Selection Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={() => allSelected ? selectNone('rebalance') : selectAll('rebalance')}
                  />
                  <span className="text-sm text-gray-700">
                    {selectedCount === 0 
                      ? `Select rebalances (${totalCount} available)`
                      : `${selectedCount} of ${totalCount} rebalances selected`
                    }
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll('rebalance', true)}
                    disabled={totalCount === 0}
                  >
                    All Filtered
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectNone('rebalance')}
                    disabled={selectedCount === 0}
                  >
                    None
                  </Button>
                </div>
              </div>

              {/* Smart Selection Presets */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Smart Selection</Label>
                <div className="grid grid-cols-3 gap-2">
                  {smartSelectionPresets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      onClick={preset.action}
                      className="flex items-center space-x-2 h-auto p-2"
                    >
                      <preset.icon className="h-4 w-4" />
                      <div className="text-left">
                        <div className="text-xs font-medium">{preset.name}</div>
                        <div className="text-xs text-gray-500">{preset.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selection Summary */}
              {selectedCount > 0 && (
                <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{estimatedPortfolios}</div>
                    <div className="text-xs text-blue-700">Portfolios</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">~{formatNumber(estimatedOrders)}</div>
                    <div className="text-xs text-blue-700">Est. Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(estimatedValue)}</div>
                    <div className="text-xs text-blue-700">Est. Value</div>
                  </div>
                </div>
              )}

              {/* Validation Results */}
              {!effectiveValidationResults?.valid && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Validation Issues:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {effectiveValidationResults?.errors.map((error, i) => (
                        <li key={i} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {effectiveValidationResults?.warnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {effectiveValidationResults.warnings.map((warning, i) => (
                        <li key={i} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Available Filters</Label>
                <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Create Filter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Custom Filter</DialogTitle>
                      <DialogDescription>
                        Create a custom filter to narrow down your selection
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="filter-name">Filter Name</Label>
                        <Input
                          id="filter-name"
                          value={customFilterName}
                          onChange={(e) => setCustomFilterName(e.target.value)}
                          placeholder="Enter filter name..."
                        />
                      </div>
                      {/* Add more filter criteria inputs here */}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCustomFilter}>
                        Create Filter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {availableFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      internalSelectionState.activeFilterId === filter.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => 
                      internalSelectionState.activeFilterId === filter.id 
                        ? clearFilter() 
                        : applyFilter(filter.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{filter.name}</div>
                        <div className="text-xs text-gray-500">{filter.description}</div>
                      </div>
                      {internalSelectionState.activeFilterId === filter.id && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Operations Tab */}
            <TabsContent value="operations" className="space-y-4">
              <div className="space-y-4">
                {/* Primary Operations */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Primary Operations</Label>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={handleBatchSubmit}
                      disabled={selectedCount === 0 || !effectiveValidationResults?.valid || isProcessing}
                      className="flex items-center justify-between p-4 h-auto"
                    >
                      <div className="flex items-center space-x-3">
                        <Play className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Submit Selected</div>
                          <div className="text-xs opacity-80">
                            Submit {selectedCount} rebalances to Order Service
                          </div>
                        </div>
                      </div>
                      {estimatedTime > 0 && (
                        <div className="text-xs opacity-80">
                          ~{formatDuration(estimatedTime)}
                        </div>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={handleBatchDelete}
                      disabled={selectedCount === 0 || isProcessing}
                      className="flex items-center justify-between p-4 h-auto"
                    >
                      <div className="flex items-center space-x-3">
                        <Trash2 className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Delete Selected</div>
                          <div className="text-xs opacity-80">
                            Permanently delete {selectedCount} rebalances
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Retry Operations */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Retry Operations</Label>
                  
                  <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={previousResults.length === 0 || isProcessing}
                        className="flex items-center justify-between p-4 h-auto w-full"
                      >
                        <div className="flex items-center space-x-3">
                          <RotateCcw className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Retry Failed Operations</div>
                            <div className="text-xs text-gray-500">
                              Configure retry strategy for failed submissions
                            </div>
                          </div>
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Retry Configuration</DialogTitle>
                        <DialogDescription>
                          Configure how failed operations should be retried
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={retryStrategy.retryFailedOnly}
                              onCheckedChange={(checked) => 
                                setRetryStrategy(prev => ({ ...prev, retryFailedOnly: !!checked }))
                              }
                            />
                            <Label>Only retry failed operations</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={retryStrategy.skipPermanentFailures}
                              onCheckedChange={(checked) => 
                                setRetryStrategy(prev => ({ ...prev, skipPermanentFailures: !!checked }))
                              }
                            />
                            <Label>Skip permanent failures</Label>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="max-attempts">Max Attempts</Label>
                            <Input
                              id="max-attempts"
                              type="number"
                              value={retryStrategy.maxRetryAttempts}
                              onChange={(e) => 
                                setRetryStrategy(prev => ({ 
                                  ...prev, 
                                  maxRetryAttempts: parseInt(e.target.value) || 3 
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
                            <Input
                              id="retry-delay"
                              type="number"
                              value={retryStrategy.retryDelay}
                              onChange={(e) => 
                                setRetryStrategy(prev => ({ 
                                  ...prev, 
                                  retryDelay: parseInt(e.target.value) || 1000 
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRetryDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => { handleBatchRetry(); setShowRetryDialog(false); }}>
                          Start Retry
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              {progress ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{progress.statusMessage}</div>
                      <div className="text-sm text-gray-500">
                        {progress.currentPhase} • {progress.processedItems}/{progress.totalItems} items
                      </div>
                    </div>
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelOperation}
                        className="flex items-center space-x-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </Button>
                    )}
                  </div>

                  <Progress 
                    value={(progress.processedItems / progress.totalItems) * 100} 
                    className="w-full"
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{progress.successCount}</div>
                      <div className="text-xs text-gray-500">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{progress.failureCount}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {progress.estimatedCompletionTime ? (
                          formatDuration(progress.estimatedCompletionTime.getTime() - Date.now())
                        ) : (
                          '--:--'
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Est. Remaining</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Started: {progress.startTime.toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <div>No operations in progress</div>
                  <div className="text-xs">Progress information will appear here during batch operations</div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export default BatchOperationsPanel 