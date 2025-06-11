// Comprehensive Tests for Error Display Components
// Tests error handling, retry functionality, and user interactions

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'
import { 
  ErrorDisplay, 
  ErrorList, 
  BatchErrorSummary, 
  ErrorLogViewer,
  ErrorInfo, 
  ErrorSeverity, 
  ErrorCategory,
  BatchErrorSummary as BatchSummary
} from '../error-display'

// Mock the help content utility
vi.mock('@/lib/utils/helpContent', () => ({
  getHelpContent: vi.fn(() => ({
    title: 'Mock Help',
    content: 'Mock help content',
    category: 'ERRORS',
    severity: 'INFO'
  })),
  formatHelpTooltip: vi.fn(() => 'Mock tooltip content')
}))

// Mock the tooltip component
vi.mock('@/components/ui/tooltip', () => ({
  HelpTooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div title={content}>{children}</div>
  )
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock URL.createObjectURL and revokeObjectURL
global.URL = {
  ...global.URL,
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
}

describe('Error Display Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockError: ErrorInfo = {
    id: 'error-123',
    message: 'Test error message',
    code: 'ERR_001',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.VALIDATION,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    details: 'Detailed error information',
    context: { userId: '123', operation: 'submit' },
    retryable: true,
    retryCount: 1,
    lastRetryAt: new Date('2024-01-01T12:01:00Z'),
    suggestedAction: 'Please retry the operation',
    helpTopicId: 'validation-errors',
    affectedItems: ['item1', 'item2', 'item3'],
    originalError: new Error('Original error')
  }

  const mockBatchSummary: BatchSummary = {
    batchId: 'batch-456',
    totalErrors: 5,
    errorsByCategory: {
      [ErrorCategory.VALIDATION]: 3,
      [ErrorCategory.NETWORK]: 2,
      [ErrorCategory.AUTHORIZATION]: 0,
      [ErrorCategory.BUSINESS_RULE]: 0,
      [ErrorCategory.SERVICE_ERROR]: 0,
      [ErrorCategory.TIMEOUT]: 0,
      [ErrorCategory.RATE_LIMIT]: 0,
      [ErrorCategory.UNKNOWN]: 0
    },
    errorsBySeverity: {
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.CRITICAL]: 0
    },
    retryableErrors: 4,
    nonRetryableErrors: 1,
    firstError: new Date('2024-01-01T12:00:00Z'),
    lastError: new Date('2024-01-01T12:05:00Z'),
    affectedItems: ['item1', 'item2', 'item3', 'item4', 'item5']
  }

  describe('ErrorDisplay', () => {
    it('renders error message and basic information', () => {
      render(<ErrorDisplay error={mockError} />)
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      expect(screen.getByText('Validation Error')).toBeInTheDocument()
      expect(screen.getByText('ERR_001')).toBeInTheDocument()
      expect(screen.getByText('Please retry the operation')).toBeInTheDocument()
    })

    it('displays error timestamp and metadata', () => {
      render(<ErrorDisplay error={mockError} />)
      
      expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument()
      expect(screen.getByText('Retries: 1')).toBeInTheDocument()
      expect(screen.getByText('Affected: 3 items')).toBeInTheDocument()
    })

    it('shows retry button for retryable errors', () => {
      const onRetry = vi.fn()
      render(<ErrorDisplay error={mockError} onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).not.toBeDisabled()
    })

    it('hides retry button for non-retryable errors', () => {
      const nonRetryableError = { ...mockError, retryable: false }
      render(<ErrorDisplay error={nonRetryableError} />)
      
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn().mockResolvedValue(undefined)
      render(<ErrorDisplay error={mockError} onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      expect(onRetry).toHaveBeenCalledWith('error-123')
    })

    it('disables retry button during retry attempt', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<ErrorDisplay error={mockError} onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      expect(retryButton).toBeDisabled()
      
      await waitFor(() => {
        expect(retryButton).not.toBeDisabled()
      })
    })

    it('expands to show error details when expand button is clicked', async () => {
      const user = userEvent.setup()
      render(<ErrorDisplay error={mockError} />)
      
      expect(screen.queryByText('Details')).not.toBeInTheDocument()
      
      const expandButton = screen.getByRole('button', { name: '' }) // Expand button has no text
      await user.click(expandButton)
      
      expect(screen.getByText('Details')).toBeInTheDocument()
      expect(screen.getByText('Detailed error information')).toBeInTheDocument()
    })

    it('shows context information when expanded', async () => {
      const user = userEvent.setup()
      render(<ErrorDisplay error={mockError} />)
      
      const expandButton = screen.getByRole('button', { name: '' })
      await user.click(expandButton)
      
      expect(screen.getByText('Context')).toBeInTheDocument()
      expect(screen.getByText(/"userId": "123"/)).toBeInTheDocument()
    })

    it('displays affected items when expanded', async () => {
      const user = userEvent.setup()
      render(<ErrorDisplay error={mockError} />)
      
      const expandButton = screen.getByRole('button', { name: '' })
      await user.click(expandButton)
      
      expect(screen.getByText('Affected Items (3)')).toBeInTheDocument()
      expect(screen.getByText('item1')).toBeInTheDocument()
      expect(screen.getByText('item2')).toBeInTheDocument()
      expect(screen.getByText('item3')).toBeInTheDocument()
    })

    it('copies error information to clipboard', async () => {
      const user = userEvent.setup()
      render(<ErrorDisplay error={mockError} />)
      
      const copyButton = screen.getByRole('button', { name: '' }) // Copy button
      await user.click(copyButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Error ID: error-123')
      )
    })

    it('calls onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<ErrorDisplay error={mockError} onDismiss={onDismiss} />)
      
      const dismissButton = screen.getByRole('button', { name: '' }) // Dismiss button
      await user.click(dismissButton)
      
      expect(onDismiss).toHaveBeenCalledWith('error-123')
    })

    it('renders different severity levels with correct styling', () => {
      const { rerender } = render(<ErrorDisplay error={mockError} />)
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      
      // Test critical severity
      const criticalError = { ...mockError, severity: ErrorSeverity.CRITICAL }
      rerender(<ErrorDisplay error={criticalError} />)
      
      // Test low severity
      const lowError = { ...mockError, severity: ErrorSeverity.LOW }
      rerender(<ErrorDisplay error={lowError} />)
      
      // All should render without error
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('handles errors without optional fields', () => {
      const minimalError: ErrorInfo = {
        id: 'minimal-error',
        message: 'Minimal error',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.UNKNOWN,
        timestamp: new Date(),
        retryable: false
      }
      
      render(<ErrorDisplay error={minimalError} />)
      
      expect(screen.getByText('Minimal error')).toBeInTheDocument()
      expect(screen.getByText('Unknown Error')).toBeInTheDocument()
    })
  })

  describe('ErrorList', () => {
    const mockErrors: ErrorInfo[] = [
      mockError,
      {
        id: 'error-456',
        message: 'Second error',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.NETWORK,
        timestamp: new Date('2024-01-01T12:02:00Z'),
        retryable: true
      },
      {
        id: 'error-789',
        message: 'Third error',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.TIMEOUT,
        timestamp: new Date('2024-01-01T12:03:00Z'),
        retryable: false
      }
    ]

    it('renders list of errors', () => {
      render(<ErrorList errors={mockErrors} />)
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      expect(screen.getByText('Second error')).toBeInTheDocument()
      expect(screen.getByText('Third error')).toBeInTheDocument()
    })

    it('displays bulk action controls', () => {
      render(<ErrorList errors={mockErrors} showBulkActions={true} />)
      
      expect(screen.getByText('Select all 3 errors')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: '' })).toBeInTheDocument()
    })

    it('selects all errors when select all checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<ErrorList errors={mockErrors} showBulkActions={true} />)
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)
      
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument()
    })

    it('shows bulk action buttons when errors are selected', async () => {
      const user = userEvent.setup()
      const onRetryAll = vi.fn()
      const onDismissAll = vi.fn()
      
      render(
        <ErrorList 
          errors={mockErrors} 
          showBulkActions={true}
          onRetryAll={onRetryAll}
          onDismissAll={onDismissAll}
        />
      )
      
      // Select one error
      const errorCheckbox = screen.getAllByRole('checkbox')[1] // First error checkbox
      await user.click(errorCheckbox)
      
      expect(screen.getByText('Retry Selected')).toBeInTheDocument()
      expect(screen.getByText('Dismiss Selected')).toBeInTheDocument()
    })

    it('calls onRetryAll when retry selected button is clicked', async () => {
      const user = userEvent.setup()
      const onRetryAll = vi.fn().mockResolvedValue(undefined)
      
      render(
        <ErrorList 
          errors={mockErrors} 
          showBulkActions={true}
          onRetryAll={onRetryAll}
        />
      )
      
      // Select first error
      const errorCheckbox = screen.getAllByRole('checkbox')[1]
      await user.click(errorCheckbox)
      
      const retryButton = screen.getByText('Retry Selected')
      await user.click(retryButton)
      
      expect(onRetryAll).toHaveBeenCalledWith(['error-123'])
    })

    it('exports selected errors when export button is clicked', async () => {
      const user = userEvent.setup()
      const onExport = vi.fn()
      
      render(
        <ErrorList 
          errors={mockErrors} 
          showBulkActions={true}
          onExport={onExport}
        />
      )
      
      // Select first error
      const errorCheckbox = screen.getAllByRole('checkbox')[1]
      await user.click(errorCheckbox)
      
      const exportButton = screen.getByText('Export')
      await user.click(exportButton)
      
      expect(onExport).toHaveBeenCalledWith([mockError])
    })

    it('displays empty state when no errors', () => {
      render(<ErrorList errors={[]} />)
      
      expect(screen.getByText('No errors to display')).toBeInTheDocument()
    })

    it('hides bulk actions when showBulkActions is false', () => {
      render(<ErrorList errors={mockErrors} showBulkActions={false} />)
      
      expect(screen.queryByText('Select all')).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('BatchErrorSummary', () => {
    it('renders batch summary information', () => {
      render(<BatchErrorSummary summary={mockBatchSummary} errors={[]} />)
      
      expect(screen.getByText('Batch batch-456 - 5 Errors')).toBeInTheDocument()
      expect(screen.getByText('4 retryable, 1 permanent')).toBeInTheDocument()
    })

    it('displays summary statistics', () => {
      render(<BatchErrorSummary summary={mockBatchSummary} errors={[]} />)
      
      expect(screen.getByText('5')).toBeInTheDocument() // Total errors
      expect(screen.getByText('4')).toBeInTheDocument() // Retryable errors
      expect(screen.getByText('300s')).toBeInTheDocument() // Duration (5 minutes)
    })

    it('shows severity breakdown badges', () => {
      render(<BatchErrorSummary summary={mockBatchSummary} errors={[]} />)
      
      expect(screen.getByText('High: 3')).toBeInTheDocument()
      expect(screen.getByText('Medium: 2')).toBeInTheDocument()
    })

    it('shows retry batch button for retryable errors', () => {
      const onRetryBatch = vi.fn()
      render(<BatchErrorSummary summary={mockBatchSummary} errors={[]} onRetryBatch={onRetryBatch} />)
      
      expect(screen.getByText('Retry Batch')).toBeInTheDocument()
    })

    it('calls onRetryBatch when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetryBatch = vi.fn().mockResolvedValue(undefined)
      
      render(<BatchErrorSummary summary={mockBatchSummary} errors={[]} onRetryBatch={onRetryBatch} />)
      
      const retryButton = screen.getByText('Retry Batch')
      await user.click(retryButton)
      
      expect(onRetryBatch).toHaveBeenCalledWith('batch-456')
    })

    it('expands to show detailed error list', async () => {
      const user = userEvent.setup()
      const errors = [mockError]
      
      render(<BatchErrorSummary summary={mockBatchSummary} errors={errors} />)
      
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument()
      
      const detailsButton = screen.getByText('Details')
      await user.click(detailsButton)
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('hides retry button when no retryable errors', () => {
      const noRetryableSummary = { ...mockBatchSummary, retryableErrors: 0 }
      render(<BatchErrorSummary summary={noRetryableSummary} errors={[]} />)
      
      expect(screen.queryByText('Retry Batch')).not.toBeInTheDocument()
    })
  })

  describe('ErrorLogViewer', () => {
    it('renders error log with search and filters', () => {
      render(<ErrorLogViewer errors={[mockError]} />)
      
      expect(screen.getByText('Error Log (1 of 1)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search errors...')).toBeInTheDocument()
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('filters errors based on search term', async () => {
      const user = userEvent.setup()
      const errors = [
        mockError,
        { ...mockError, id: 'error-2', message: 'Different message' }
      ]
      
      render(<ErrorLogViewer errors={errors} />)
      
      expect(screen.getByText('Error Log (2 of 2)')).toBeInTheDocument()
      
      const searchInput = screen.getByPlaceholderText('Search errors...')
      await user.type(searchInput, 'Different')
      
      expect(screen.getByText('Error Log (1 of 2)')).toBeInTheDocument()
      expect(screen.getByText('Different message')).toBeInTheDocument()
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument()
    })

    it('exports error log as JSON file', async () => {
      const user = userEvent.setup()
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      const mockClick = vi.fn()
      
      // Mock document methods
      const mockElement = {
        href: '',
        download: '',
        click: mockClick
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
      
      render(<ErrorLogViewer errors={[mockError]} />)
      
      const exportButton = screen.getByText('Export')
      await user.click(exportButton)
      
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('disables search when searchable is false', () => {
      render(<ErrorLogViewer errors={[mockError]} searchable={false} />)
      
      expect(screen.queryByPlaceholderText('Search errors...')).not.toBeInTheDocument()
    })

    it('disables export when exportable is false', () => {
      render(<ErrorLogViewer errors={[mockError]} exportable={false} />)
      
      expect(screen.queryByText('Export')).not.toBeInTheDocument()
    })

    it('applies custom max height', () => {
      const { container } = render(
        <ErrorLogViewer errors={[mockError]} maxHeight="600px" />
      )
      
      const scrollContainer = container.querySelector('[style*="max-height"]')
      expect(scrollContainer).toHaveStyle({ maxHeight: '600px' })
    })

    it('calls onRetry for individual errors', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn().mockResolvedValue(undefined)
      
      render(<ErrorLogViewer errors={[mockError]} onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      expect(onRetry).toHaveBeenCalledWith('error-123')
    })
  })

  describe('Error Severity and Category Mapping', () => {
    it('renders all severity levels correctly', () => {
      const severities = [
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL
      ]
      
      severities.forEach(severity => {
        const error = { ...mockError, severity }
        const { unmount } = render(<ErrorDisplay error={error} />)
        expect(screen.getByText('Test error message')).toBeInTheDocument()
        unmount()
      })
    })

    it('renders all error categories correctly', () => {
      const categories = Object.values(ErrorCategory)
      
      categories.forEach(category => {
        const error = { ...mockError, category }
        const { unmount } = render(<ErrorDisplay error={error} />)
        expect(screen.getByText('Test error message')).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles errors with very long messages', () => {
      const longError = {
        ...mockError,
        message: 'This is a very long error message that should be handled gracefully without breaking the layout or causing display issues in the component'
      }
      
      render(<ErrorDisplay error={longError} />)
      expect(screen.getByText(longError.message)).toBeInTheDocument()
    })

    it('handles errors with many affected items', () => {
      const manyItemsError = {
        ...mockError,
        affectedItems: Array.from({ length: 20 }, (_, i) => `item${i + 1}`)
      }
      
      render(<ErrorDisplay error={manyItemsError} showDetails={true} />)
      expect(screen.getByText('Affected Items (20)')).toBeInTheDocument()
      expect(screen.getByText('+10 more')).toBeInTheDocument()
    })

    it('handles failed retry attempts gracefully', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<ErrorDisplay error={mockError} onRetry={onRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      expect(onRetry).toHaveBeenCalledWith('error-123')
      
      // Button should be re-enabled after failed retry
      await waitFor(() => {
        expect(retryButton).not.toBeDisabled()
      })
      
      consoleSpy.mockRestore()
    })

    it('handles empty error lists gracefully', () => {
      render(<ErrorList errors={[]} />)
      expect(screen.getByText('No errors to display')).toBeInTheDocument()
    })

    it('handles batch summary with zero errors in some categories', () => {
      const emptyCategorySummary = {
        ...mockBatchSummary,
        errorsByCategory: {
          ...mockBatchSummary.errorsByCategory,
          [ErrorCategory.VALIDATION]: 0
        }
      }
      
      render(<BatchErrorSummary summary={emptyCategorySummary} errors={[]} />)
      
      // Should not show categories with zero errors
      expect(screen.queryByText('Validation Error: 0')).not.toBeInTheDocument()
    })
  })
}) 