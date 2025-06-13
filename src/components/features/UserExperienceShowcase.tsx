// User Experience Showcase Component
// Demonstrates all Stage 5.3 enhancements: shortcuts, drag-and-drop, history, and export

'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Download, 
  History, 
  Keyboard, 
  Move, 
  BarChart3, 
  FileText,
  Clock,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react'

// Import our new hooks and utilities
import { useOrderSubmissionShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useOrderPrioritization } from '@/lib/hooks/useDragAndDrop'
import { useSubmissionHistory } from '@/lib/services/submissionHistory'
import { useDataExport } from '@/lib/utils/dataExport'

interface UserExperienceShowcaseProps {
  className?: string
}

export function UserExperienceShowcase({ className }: UserExperienceShowcaseProps) {
  // Mock data for demonstration
  const [orders, setOrders] = useState([
    { id: '1', symbol: 'AAPL', quantity: 100, priority: 1, status: 'pending' },
    { id: '2', symbol: 'GOOGL', quantity: 50, priority: 2, status: 'pending' },
    { id: '3', symbol: 'MSFT', quantity: 75, priority: 3, status: 'pending' },
    { id: '4', symbol: 'TSLA', quantity: 25, priority: 4, status: 'pending' }
  ])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false)
  const [showBatchPanel, setShowBatchPanel] = useState(false)

  // Get our new hooks
  const { 
    events, 
    summary, 
    logSubmission, 
    exportHistory 
  } = useSubmissionHistory()

  const { 
    exportRebalancePositions, 
    exportSubmissionHistory, 
    DEFAULT_COLUMNS 
  } = useDataExport()

  // Set up keyboard shortcuts
  const shortcuts = useOrderSubmissionShortcuts({
    submitAll: () => {
      logSubmission({
        orderIds: orders.map(o => o.id),
        source: 'manual'
      })
      toast.success('All orders submitted!')
    },
    submitSelected: () => {
      if (selectedOrders.length > 0) {
        logSubmission({
          orderIds: selectedOrders,
          source: 'manual'
        })
        toast.success(`${selectedOrders.length} orders submitted!`)
      } else {
        toast.error('No orders selected')
      }
    },
    selectAll: () => {
      setSelectedOrders(orders.map(o => o.id))
      toast.info('All orders selected')
    },
    clearSelection: () => {
      setSelectedOrders([])
      toast.info('Selection cleared')
    },
    deleteSelected: () => {
      if (selectedOrders.length > 0) {
        const remaining = orders.filter(o => !selectedOrders.includes(o.id))
        setOrders(remaining)
        setSelectedOrders([])
        toast.success(`${selectedOrders.length} orders deleted`)
      }
    },
    exportData: () => {
      exportSubmissionHistory(events, { format: 'csv' })
      toast.success('Data exported!')
    },
    showHistory: () => {
      document.getElementById('history-tab')?.click()
      toast.info('Showing submission history')
    },
    toggleBackgroundProcessing: () => {
      setIsBackgroundProcessing(!isBackgroundProcessing)
      toast.info(`Background processing ${!isBackgroundProcessing ? 'enabled' : 'disabled'}`)
    },
    openBatchOperations: () => {
      setShowBatchPanel(true)
      toast.info('Batch operations panel opened')
    },
    retryFailed: () => {
      toast.info('Retrying failed submissions...')
    }
  })

  // Set up drag and drop
  const { 
    dragRef, 
    dropRef, 
    isDragging, 
    dragPreview 
  } = useOrderPrioritization(orders, setOrders, (orderId, newPriority) => {
    toast.success(`Order ${orderId} moved to priority ${newPriority}`)
  })

  const handleExportOrders = (format: 'csv' | 'xlsx' | 'json') => {
    const mockPositions = orders.map(order => ({
      rebalance_id: 'REB_001',
      portfolio_id: 'PORT_001',
      security_id: order.id,
      symbol: order.symbol,
      security_name: `${order.symbol} Inc.`,
      transaction_type: 'BUY',
      trade_quantity: order.quantity,
      market_price: Math.random() * 200 + 50,
      market_value: order.quantity * (Math.random() * 200 + 50),
      weight_target: Math.random() * 10,
      weight_current: Math.random() * 10,
      created_at: new Date().toISOString()
    }))

    exportRebalancePositions(mockPositions as any, { 
      format,
      title: `Order Export - ${format.toUpperCase()}`,
      description: 'Sample order data for demonstration'
    })
  }

  const shortcutCategories = shortcuts.shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts.shortcuts>)

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Experience Enhancements</h2>
          <p className="text-muted-foreground">
            Stage 5.3: Keyboard shortcuts, drag-and-drop, submission history, and export functionality
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isBackgroundProcessing ? "default" : "secondary"}>
            Background Processing {isBackgroundProcessing ? "ON" : "OFF"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shortcuts.showHelp()}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Show Shortcuts (?)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="shortcuts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shortcuts">
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="dragdrop">
            <Move className="h-4 w-4 mr-2" />
            Drag & Drop
          </TabsTrigger>
          <TabsTrigger value="history" id="history-tab">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shortcuts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Keyboard className="h-5 w-5 mr-2" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Use keyboard shortcuts for efficient order management. Press ? to see all shortcuts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(shortcutCategories).map(([category, shortcuts]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {shortcuts.filter(s => s.enabled).map(shortcut => {
                      const modifiers = []
                      if (shortcut.ctrlKey) modifiers.push('Ctrl')
                      if (shortcut.shiftKey) modifiers.push('Shift')
                      if (shortcut.altKey) modifiers.push('Alt')
                      
                      const keyCombo = modifiers.length > 0 
                        ? `${modifiers.join('+')}+${shortcut.key}`
                        : shortcut.key

                      return (
                        <div key={`${category}-${shortcut.key}`} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{shortcut.description}</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {keyCombo}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                  {category !== Object.keys(shortcutCategories).slice(-1)[0] && <Separator />}
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Try the shortcuts:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl+A</kbd> to select all orders</p>
                  <p>• Press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl+Enter</kbd> to submit all orders</p>
                  <p>• Press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl+E</kbd> to export data</p>
                  <p>• Press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">?</kbd> to show help</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dragdrop" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Move className="h-5 w-5 mr-2" />
                Drag & Drop Order Prioritization
              </CardTitle>
              <CardDescription>
                Drag and drop orders to change their priority. Orders are processed in priority order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orders.map((order, index) => (
                  <div
                    key={order.id}
                    ref={dragRef}
                    data-drag-id={order.id}
                    data-drag-type="order"
                    data-drag-index={index}
                    data-drag-data={JSON.stringify(order)}
                    className={`
                      flex items-center justify-between p-3 border rounded-lg cursor-grab
                      hover:bg-muted transition-colors
                      ${selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''}
                      ${isDragging ? 'opacity-50' : ''}
                    `}
                    onClick={() => {
                      if (selectedOrders.includes(order.id)) {
                        setSelectedOrders(selectedOrders.filter(id => id !== order.id))
                      } else {
                        setSelectedOrders([...selectedOrders, order.id])
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-6 justify-center">
                        {order.priority}
                      </Badge>
                      <div>
                        <div className="font-medium">{order.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          Quantity: {order.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedOrders.includes(order.id) ? "default" : "secondary"}>
                        {order.status}
                      </Badge>
                      <Move className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How to use:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Click orders to select them</p>
                  <p>• Drag orders to reorder by priority</p>
                  <p>• Higher priority orders are processed first</p>
                  <p>• Use keyboard shortcuts for quick actions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drag preview (hidden by default) */}
          <div ref={dragPreview} className="hidden" />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Submission History & Audit Trail
              </CardTitle>
              <CardDescription>
                Complete audit trail of all order submission activities with detailed analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Statistics */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Activity className="h-4 w-4 mr-1" />
                      Total Submissions
                    </div>
                    <div className="text-2xl font-bold">{summary.totalSubmissions}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Success Rate
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {summary.totalSubmissions > 0 
                        ? Math.round((summary.successfulSubmissions / summary.totalSubmissions) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Total Orders
                    </div>
                    <div className="text-2xl font-bold">{summary.totalOrders}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      Avg Time
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(summary.averageProcessingTime)}ms
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Recent Events */}
              <div className="space-y-3">
                <h4 className="font-medium">Recent Activity</h4>
                {events.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {events.slice(0, 10).map(event => (
                      <div key={event.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-3">
                          <Badge variant={
                            event.status === 'success' ? 'default' :
                            event.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {event.type}
                          </Badge>
                          <div>
                            <div className="text-sm font-medium">{event.operation}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.details.itemCount || 0} items
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No submission history yet</p>
                    <p className="text-sm">Submit some orders to see activity here</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => exportSubmissionHistory(events)}
                  disabled={events.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export History
                </Button>
                <Button variant="outline" onClick={() => exportHistory({ format: 'json' })}>
                  Export JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Functionality
              </CardTitle>
              <CardDescription>
                Export order data and reports in multiple formats with customizable options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Export Orders</h4>
                  <div className="space-y-2">
                    <Button 
                      className="w-full justify-start"
                      onClick={() => handleExportOrders('csv')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleExportOrders('xlsx')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleExportOrders('json')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export as JSON
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Export History</h4>
                  <div className="space-y-2">
                    <Button 
                      className="w-full justify-start"
                      onClick={() => exportSubmissionHistory(events, { format: 'csv' })}
                      disabled={events.length === 0}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History as CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => exportSubmissionHistory(events, { format: 'xlsx' })}
                      disabled={events.length === 0}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History as Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => exportSubmissionHistory(events, { format: 'json' })}
                      disabled={events.length === 0}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History as JSON
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Export Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h5 className="font-medium text-muted-foreground">Supported Formats</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• CSV - Comma-separated values</li>
                      <li>• Excel - XLSX format</li>
                      <li>• JSON - Structured data</li>
                      <li>• PDF - Formatted reports</li>
                      <li>• TXT - Plain text format</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium text-muted-foreground">Export Options</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Custom column selection</li>
                      <li>• Advanced filtering</li>
                      <li>• Data grouping & sorting</li>
                      <li>• Metadata inclusion</li>
                      <li>• Multiple templates</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Quick Actions:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl+E</kbd> to quick export current data</p>
                  <p>• All exports include timestamps and metadata</p>
                  <p>• Files are automatically named with current date/time</p>
                  <p>• Large datasets are processed in chunks for performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 