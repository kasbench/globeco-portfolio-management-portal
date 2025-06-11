// Data Export Utilities for Order Reports and Analytics
// Provides comprehensive export functionality with multiple formats and customization

'use client'

import { RebalancePosition } from '@/types/rebalance'

export interface ExportColumn {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean'
  format?: (value: any) => string
  width?: number
  alignment?: 'left' | 'center' | 'right'
}

export interface ExportFilter {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in'
  value: any
  value2?: any // For 'between' operator
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'pdf' | 'txt'
  columns?: ExportColumn[]
  filters?: ExportFilter[]
  groupBy?: string[]
  sortBy?: { field: string; direction: 'asc' | 'desc' }[]
  includeHeaders: boolean
  includeFooters: boolean
  includeMetadata: boolean
  pageSize?: number
  template?: 'default' | 'summary' | 'detailed' | 'executive'
  title?: string
  description?: string
  author?: string
  customStyles?: Record<string, any>
}

export interface ExportMetadata {
  title: string
  description?: string
  author?: string
  createdAt: Date
  source: string
  filters: string[]
  recordCount: number
  columns: string[]
}

export interface ExportResult {
  data: string | Blob
  filename: string
  mimeType: string
  size: number
  metadata: ExportMetadata
}

// Default column configurations for different data types
export const DEFAULT_COLUMNS: Record<string, ExportColumn[]> = {
  rebalancePositions: [
    { key: 'rebalance_id', label: 'Rebalance ID', type: 'string', width: 120 },
    { key: 'portfolio_id', label: 'Portfolio ID', type: 'string', width: 120 },
    { key: 'security_id', label: 'Security ID', type: 'string', width: 100 },
    { key: 'symbol', label: 'Symbol', type: 'string', width: 80 },
    { key: 'security_name', label: 'Security Name', type: 'string', width: 200 },
    { key: 'transaction_type', label: 'Action', type: 'string', width: 80 },
    { key: 'trade_quantity', label: 'Quantity', type: 'number', width: 100, alignment: 'right' },
    { key: 'market_price', label: 'Market Price', type: 'currency', width: 100, alignment: 'right' },
    { key: 'market_value', label: 'Market Value', type: 'currency', width: 120, alignment: 'right' },
    { key: 'weight_target', label: 'Target Weight', type: 'percentage', width: 100, alignment: 'right' },
    { key: 'weight_current', label: 'Current Weight', type: 'percentage', width: 100, alignment: 'right' },
    { key: 'created_at', label: 'Created At', type: 'date', width: 140 }
  ],
  
  submissionHistory: [
    { key: 'id', label: 'Event ID', type: 'string', width: 150 },
    { key: 'timestamp', label: 'Timestamp', type: 'date', width: 140 },
    { key: 'type', label: 'Type', type: 'string', width: 100 },
    { key: 'operation', label: 'Operation', type: 'string', width: 150 },
    { key: 'status', label: 'Status', type: 'string', width: 100 },
    { key: 'source', label: 'Source', type: 'string', width: 100 },
    { key: 'itemCount', label: 'Items', type: 'number', width: 80, alignment: 'right' },
    { key: 'duration', label: 'Duration (ms)', type: 'number', width: 100, alignment: 'right' },
    { key: 'errorMessage', label: 'Error Message', type: 'string', width: 250 }
  ]
}

class DataExportService {
  // Main export function
  exportData<T = any>(data: T[], options: ExportOptions): ExportResult {
    const processedData = this.processData(data, options)
    const metadata = this.generateMetadata(data, options)
    
    switch (options.format) {
      case 'csv':
        return this.exportAsCSV(processedData, options, metadata)
      case 'xlsx':
        return this.exportAsXLSX(processedData, options, metadata)
      case 'json':
        return this.exportAsJSON(processedData, options, metadata)
      case 'pdf':
        return this.exportAsPDF(processedData, options, metadata)
      case 'txt':
        return this.exportAsText(processedData, options, metadata)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  // Process and filter data
  private processData<T = any>(data: T[], options: ExportOptions): T[] {
    let processedData = [...data]
    
    // Apply filters
    if (options.filters?.length) {
      processedData = this.applyFilters(processedData, options.filters)
    }
    
    // Apply sorting
    if (options.sortBy?.length) {
      processedData = this.applySorting(processedData, options.sortBy)
    }
    
    // Apply grouping
    if (options.groupBy?.length) {
      processedData = this.applyGrouping(processedData, options.groupBy)
    }
    
    return processedData
  }

  // Apply filters to data
  private applyFilters<T = any>(data: T[], filters: ExportFilter[]): T[] {
    return data.filter(item => {
      return filters.every(filter => {
        const value = this.getNestedValue(item, filter.field)
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'startsWith':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase())
          case 'endsWith':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase())
          case 'greaterThan':
            return Number(value) > Number(filter.value)
          case 'lessThan':
            return Number(value) < Number(filter.value)
          case 'between':
            return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2)
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value)
          default:
            return true
        }
      })
    })
  }

  // Apply sorting to data
  private applySorting<T = any>(data: T[], sortBy: { field: string; direction: 'asc' | 'desc' }[]): T[] {
    return data.sort((a, b) => {
      for (const sort of sortBy) {
        const aValue = this.getNestedValue(a, sort.field)
        const bValue = this.getNestedValue(b, sort.field)
        
        let comparison = 0
        if (aValue < bValue) comparison = -1
        else if (aValue > bValue) comparison = 1
        
        if (sort.direction === 'desc') comparison *= -1
        
        if (comparison !== 0) return comparison
      }
      return 0
    })
  }

  // Apply grouping to data
  private applyGrouping<T = any>(data: T[], groupBy: string[]): T[] {
    // For simplicity, we'll just sort by the grouping fields
    // In a real implementation, you'd create nested structures
    return this.applySorting(data, groupBy.map(field => ({ field, direction: 'asc' as const })))
  }

  // CSV Export
  private exportAsCSV<T = any>(data: T[], options: ExportOptions, metadata: ExportMetadata): ExportResult {
    const columns = options.columns || []
    const lines: string[] = []
    
    // Add metadata comments
    if (options.includeMetadata) {
      lines.push(`# ${metadata.title}`)
      if (metadata.description) lines.push(`# ${metadata.description}`)
      lines.push(`# Generated: ${metadata.createdAt.toISOString()}`)
      lines.push(`# Records: ${metadata.recordCount}`)
      lines.push('')
    }
    
    // Add headers
    if (options.includeHeaders) {
      const headers = columns.map(col => this.escapeCSVValue(col.label))
      lines.push(headers.join(','))
    }
    
    // Add data rows
    data.forEach(item => {
      const values = columns.map(col => {
        const value = this.getNestedValue(item, col.key)
        const formatted = this.formatValue(value, col)
        return this.escapeCSVValue(formatted)
      })
      lines.push(values.join(','))
    })
    
    // Add footers
    if (options.includeFooters) {
      lines.push('')
      lines.push(`Total Records: ${data.length}`)
    }
    
    const csvContent = lines.join('\n')
    const filename = this.generateFilename(options.title || 'export', 'csv')
    
    return {
      data: csvContent,
      filename,
      mimeType: 'text/csv',
      size: new Blob([csvContent]).size,
      metadata
    }
  }

  // Excel Export (simplified - would use a library like ExcelJS in production)
  private exportAsXLSX<T = any>(data: T[], options: ExportOptions, metadata: ExportMetadata): ExportResult {
    // For this implementation, we'll create a tab-separated format
    // In production, use libraries like exceljs or xlsx
    const columns = options.columns || []
    const lines: string[] = []
    
    // Add headers
    if (options.includeHeaders) {
      const headers = columns.map(col => col.label)
      lines.push(headers.join('\t'))
    }
    
    // Add data rows
    data.forEach(item => {
      const values = columns.map(col => {
        const value = this.getNestedValue(item, col.key)
        return this.formatValue(value, col)
      })
      lines.push(values.join('\t'))
    })
    
    const content = lines.join('\n')
    const filename = this.generateFilename(options.title || 'export', 'xlsx')
    
    // Create blob with Excel MIME type
    const blob = new Blob([content], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    return {
      data: blob,
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: blob.size,
      metadata
    }
  }

  // JSON Export
  private exportAsJSON<T = any>(data: T[], options: ExportOptions, metadata: ExportMetadata): ExportResult {
    const exportData = {
      metadata: options.includeMetadata ? metadata : undefined,
      data: data.map(item => {
        if (options.columns?.length) {
          const filtered: any = {}
          options.columns.forEach(col => {
            filtered[col.key] = this.getNestedValue(item, col.key)
          })
          return filtered
        }
        return item
      })
    }
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const filename = this.generateFilename(options.title || 'export', 'json')
    
    return {
      data: jsonContent,
      filename,
      mimeType: 'application/json',
      size: new Blob([jsonContent]).size,
      metadata
    }
  }

  // PDF Export (simplified - would use jsPDF or similar in production)
  private exportAsPDF<T = any>(data: T[], options: ExportOptions, metadata: ExportMetadata): ExportResult {
    // For this implementation, we'll create a simple text-based PDF
    // In production, use libraries like jsPDF, PDFKit, or puppeteer
    const lines: string[] = []
    
    // Add title and metadata
    if (options.includeMetadata) {
      lines.push(metadata.title)
      lines.push('='.repeat(metadata.title.length))
      if (metadata.description) lines.push(metadata.description)
      lines.push(`Generated: ${metadata.createdAt.toLocaleString()}`)
      lines.push(`Records: ${metadata.recordCount}`)
      lines.push('')
    }
    
    // Add table content (simplified)
    const columns = options.columns || []
    if (options.includeHeaders) {
      const headers = columns.map(col => col.label.padEnd(col.width || 15))
      lines.push(headers.join(' '))
      lines.push('-'.repeat(headers.join(' ').length))
    }
    
    data.forEach(item => {
      const values = columns.map(col => {
        const value = this.getNestedValue(item, col.key)
        const formatted = this.formatValue(value, col)
        return String(formatted).padEnd(col.width || 15)
      })
      lines.push(values.join(' '))
    })
    
    const content = lines.join('\n')
    const filename = this.generateFilename(options.title || 'export', 'pdf')
    
    // Create blob with PDF MIME type
    const blob = new Blob([content], { type: 'application/pdf' })
    
    return {
      data: blob,
      filename,
      mimeType: 'application/pdf',
      size: blob.size,
      metadata
    }
  }

  // Text Export
  private exportAsText<T = any>(data: T[], options: ExportOptions, metadata: ExportMetadata): ExportResult {
    const columns = options.columns || []
    const lines: string[] = []
    
    // Add metadata
    if (options.includeMetadata) {
      lines.push(metadata.title)
      lines.push('='.repeat(metadata.title.length))
      if (metadata.description) lines.push(metadata.description)
      lines.push(`Generated: ${metadata.createdAt.toLocaleString()}`)
      lines.push(`Records: ${metadata.recordCount}`)
      lines.push('')
    }
    
    // Add data in readable format
    data.forEach((item, index) => {
      lines.push(`Record ${index + 1}:`)
      columns.forEach(col => {
        const value = this.getNestedValue(item, col.key)
        const formatted = this.formatValue(value, col)
        lines.push(`  ${col.label}: ${formatted}`)
      })
      lines.push('')
    })
    
    const content = lines.join('\n')
    const filename = this.generateFilename(options.title || 'export', 'txt')
    
    return {
      data: content,
      filename,
      mimeType: 'text/plain',
      size: new Blob([content]).size,
      metadata
    }
  }

  // Utility methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((value, key) => value?.[key], obj)
  }

  private formatValue(value: any, column: ExportColumn): string {
    if (value == null) return ''
    
    if (column.format) {
      return column.format(value)
    }
    
    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value))
      
      case 'percentage':
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: 2
        }).format(Number(value) / 100)
      
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value))
      
      case 'date':
        return new Date(value).toLocaleString()
      
      case 'boolean':
        return value ? 'Yes' : 'No'
      
      default:
        return String(value)
    }
  }

  private escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private generateFilename(title: string, extension: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_')
    return `${sanitizedTitle}_${timestamp}.${extension}`
  }

  private generateMetadata<T = any>(data: T[], options: ExportOptions): ExportMetadata {
    return {
      title: options.title || 'Data Export',
      description: options.description,
      author: options.author || 'GlobeCo Portfolio Management Portal',
      createdAt: new Date(),
      source: 'GlobeCo Portfolio Management Portal',
      filters: options.filters?.map(f => `${f.field} ${f.operator} ${f.value}`) || [],
      recordCount: data.length,
      columns: options.columns?.map(c => c.label) || []
    }
  }
}

// Create singleton instance
export const dataExportService = new DataExportService()

// React hook for data export
export function useDataExport() {
  const downloadFile = (result: ExportResult) => {
    const url = typeof result.data === 'string' 
      ? URL.createObjectURL(new Blob([result.data], { type: result.mimeType }))
      : URL.createObjectURL(result.data as Blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportRebalancePositions = (
    positions: RebalancePosition[],
    options: Partial<ExportOptions> = {}
  ) => {
    const result = dataExportService.exportData(positions, {
      format: 'csv',
      columns: DEFAULT_COLUMNS.rebalancePositions,
      includeHeaders: true,
      includeFooters: true,
      includeMetadata: true,
      title: 'Rebalance Positions Export',
      ...options
    })
    
    downloadFile(result)
    return result
  }

  const exportSubmissionHistory = (
    events: any[],
    options: Partial<ExportOptions> = {}
  ) => {
    const result = dataExportService.exportData(events, {
      format: 'csv',
      columns: DEFAULT_COLUMNS.submissionHistory,
      includeHeaders: true,
      includeFooters: true,
      includeMetadata: true,
      title: 'Submission History Export',
      ...options
    })
    
    downloadFile(result)
    return result
  }

  const exportCustomData = <T = any>(
    data: T[],
    options: ExportOptions
  ) => {
    const result = dataExportService.exportData(data, options)
    downloadFile(result)
    return result
  }

  return {
    exportRebalancePositions,
    exportSubmissionHistory,
    exportCustomData,
    downloadFile,
    DEFAULT_COLUMNS
  }
} 