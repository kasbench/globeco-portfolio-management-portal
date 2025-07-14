/**
 * Utility functions for exporting execution data
 */

import { ExecutionDTO } from '@/types/execution'
import { formatDate, formatTime, formatCurrency, formatNumber } from '@/lib/utils'

export interface ExportOptions {
  includeAllFields?: boolean
  selectedOnly?: boolean
  filename?: string
}

/**
 * Convert executions to CSV format
 */
export function executionsToCSV(executions: ExecutionDTO[], options: ExportOptions = {}): string {
  if (executions.length === 0) {
    return 'No data to export'
  }

  const { includeAllFields = false } = options

  // Define CSV headers
  const baseHeaders = [
    'ID',
    'Status',
    'Trade Type',
    'Security Ticker',
    'Security ID',
    'Destination',
    'Quantity',
    'Quantity Filled',
    'Fill Progress (%)',
    'Limit Price',
    'Average Price',
    'Received Date',
    'Received Time',
    'Sent Date',
    'Sent Time'
  ]

  const extendedHeaders = [
    ...baseHeaders,
    'Trade Service Execution ID',
    'Security Name',
    'Security Type',
    'Security Exchange'
  ]

  const headers = includeAllFields ? extendedHeaders : baseHeaders

  // Convert executions to CSV rows
  const rows = executions.map(execution => {
    const fillProgress = execution.quantity > 0 
      ? ((execution.quantityFilled / execution.quantity) * 100).toFixed(1)
      : '0.0'

    const receivedDate = execution.receivedTimestamp 
      ? formatDate(execution.receivedTimestamp)
      : ''
    const receivedTime = execution.receivedTimestamp 
      ? formatTime(execution.receivedTimestamp)
      : ''
    const sentDate = execution.sentTimestamp 
      ? formatDate(execution.sentTimestamp)
      : ''
    const sentTime = execution.sentTimestamp 
      ? formatTime(execution.sentTimestamp)
      : ''

    const baseRow = [
      execution.id.toString(),
      execution.executionStatus,
      execution.tradeType,
      hasSecurityWithTicker(execution) && execution.security.ticker ? execution.security.ticker : execution.securityId || '',
      hasSecurityWithTicker(execution) && execution.security.securityId ? execution.security.securityId : execution.securityId || '',
      execution.destination || '',
      formatNumber(execution.quantity),
      formatNumber(execution.quantityFilled),
      fillProgress,
      execution.limitPrice ? formatCurrency(execution.limitPrice) : '',
      execution.averagePrice ? formatCurrency(execution.averagePrice) : '',
      receivedDate,
      receivedTime,
      sentDate,
      sentTime
    ]

    if (includeAllFields) {
      const extendedRow = [
        ...baseRow,
        execution.tradeServiceExecutionId || '',
        hasSecurityWithTicker(execution) && execution.security.name ? execution.security.name : execution.securityId || '',
        hasSecurityWithTicker(execution) && execution.security.securityType ? execution.security.securityType : '',
        hasSecurityWithTicker(execution) && execution.security.exchange ? execution.security.exchange : ''
      ]
      return extendedRow
    }

    return baseRow
  })

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string = 'executions', includeTimestamp: boolean = true): string {
  const timestamp = includeTimestamp 
    ? new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    : ''
  
  return `${prefix}${timestamp ? '_' + timestamp : ''}.csv`
}

/**
 * Export executions to CSV and download
 */
export function exportExecutions(
  executions: ExecutionDTO[], 
  selectedExecutionIds?: Set<number>,
  options: ExportOptions = {}
): void {
  const { 
    includeAllFields = false, 
    selectedOnly = false,
    filename 
  } = options

  // Filter executions if selectedOnly is true
  const executionsToExport = selectedOnly && selectedExecutionIds 
    ? executions.filter(execution => selectedExecutionIds.has(execution.id))
    : executions

  if (executionsToExport.length === 0) {
    throw new Error('No executions to export')
  }

  // Generate CSV content
  const csvContent = executionsToCSV(executionsToExport, { includeAllFields })

  // Generate filename
  const exportFilename = filename || generateExportFilename(
    selectedOnly ? 'selected_executions' : 'executions'
  )

  // Download the file
  downloadCSV(csvContent, exportFilename)
}

/**
 * Get export summary for user confirmation
 */
export function getExportSummary(
  totalExecutions: number,
  selectedExecutionIds?: Set<number>,
  selectedOnly: boolean = false
): string {
  if (selectedOnly && selectedExecutionIds) {
    const selectedCount = selectedExecutionIds.size
    return `Export ${selectedCount} selected execution${selectedCount !== 1 ? 's' : ''}`
  }
  
  return `Export all ${totalExecutions} execution${totalExecutions !== 1 ? 's' : ''}`
} 

// Helper type guard for EnhancedExecutionDTO
function hasSecurityWithTicker(execution: any): execution is { security: { ticker?: string, securityId?: string, name?: string, securityType?: string, exchange?: string } } {
  return execution && typeof execution.security === 'object' && execution.security !== null;
} 