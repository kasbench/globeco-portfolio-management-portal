import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BatchOperationsPanel from '../BatchOperationsPanel'
import { RebalanceWithSubmission } from '@/types/rebalance'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock the API services
jest.mock('@/lib/api/orderService', () => ({
  orderServiceApi: {
    submitRebalanceOrders: jest.fn()
  }
}))

jest.mock('@/lib/api/orderGenerationService', () => ({
  orderGenerationApi: {
    deleteRebalance: jest.fn(),
    deleteRebalances: jest.fn()
  }
}))

jest.mock('@/lib/utils/rebalanceTransform', () => ({
  transformToSubmissionRebalance: jest.fn((rebalance) => rebalance)
}))

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}))

const mockRebalances: RebalanceWithSubmission[] = [
  {
    rebalance_id: 'rebal-1',
    model_id: 'model-1',
    model_name: 'Test Model 1',
    rebalance_date: '2025-01-17T10:00:00Z',
    total_portfolios: 1,
    version: 1,
    submissionState: 'pending',
    portfolios: [
      {
        portfolio_id: 'port-1',
        portfolio_name: 'Test Portfolio 1',
        total_positions: 2,
        version: 1,
        positions: [
          {
            position_id: 'pos-1',
            security_id: 'SEC001',
            symbol: 'AAPL',
            current_weight: 0.05,
            target_weight: 0.10,
            current_quantity: 100,
            target_quantity: 200,
            trade_quantity: 100,
            transaction_type: 'BUY',
            current_price: 150.00,
            market_value: 15000,
            version: 1
          },
          {
            position_id: 'pos-2',
            security_id: 'SEC002',
            symbol: 'GOOGL',
            current_weight: 0.10,
            target_weight: 0.05,
            current_quantity: 200,
            target_quantity: 100,
            trade_quantity: -100,
            transaction_type: 'SELL',
            current_price: 2500.00,
            market_value: 250000,
            version: 1
          }
        ]
      }
    ]
  },
  {
    rebalance_id: 'rebal-2',
    model_id: 'model-2',
    model_name: 'Test Model 2',
    rebalance_date: '2025-01-17T11:00:00Z',
    total_portfolios: 1,
    version: 1,
    submissionState: 'pending',
    portfolios: [
      {
        portfolio_id: 'port-2',
        portfolio_name: 'Test Portfolio 2',
        total_positions: 1,
        version: 1,
        positions: [
          {
            position_id: 'pos-3',
            security_id: 'SEC003',
            symbol: 'MSFT',
            current_weight: 0.08,
            target_weight: 0.12,
            current_quantity: 150,
            target_quantity: 225,
            trade_quantity: 75,
            transaction_type: 'BUY',
            current_price: 300.00,
            market_value: 45000,
            version: 1
          }
        ]
      }
    ]
  }
]

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe('BatchOperationsPanel', () => {
  const mockOnOperationComplete = jest.fn()
  const mockOnSelectRebalance = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    rebalances: mockRebalances,
    onOperationComplete: mockOnOperationComplete,
    selectedRebalances: new Set<string>(),
    onSelectRebalance: mockOnSelectRebalance
  }

  it('should render the component with all tabs', () => {
    render(
      <TestWrapper>
        <BatchOperationsPanel {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByText('Batch Operations')).toBeInTheDocument()
    expect(screen.getByText('Selection')).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Progress')).toBeInTheDocument()
  })

  it('should display selection summary when external selection is provided', () => {
    const selectedRebalances = new Set(['rebal-1'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Should show selection count in the summary
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
  })

  it('should validate selection correctly', () => {
    const selectedRebalances = new Set(['rebal-1', 'rebal-2'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Submit Selected button should be enabled (validation passes)
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should disable Submit Selected when no items are selected', () => {
    render(
      <TestWrapper>
        <BatchOperationsPanel {...defaultProps} />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Submit Selected button should be disabled (no selection)
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    expect(submitButton).toBeDisabled()
  })

  it('should handle batch submit with external selection', async () => {
    const { orderServiceApi } = await import('@/lib/api/orderService')
    const { orderGenerationApi } = await import('@/lib/api/orderGenerationService')

    // Mock successful order submission
    const mockOrderServiceApi = orderServiceApi as jest.Mocked<typeof orderServiceApi>
    mockOrderServiceApi.submitRebalanceOrders.mockResolvedValue({
      rebalance: mockRebalances[0],
      result: {
        totalOrders: 2,
        successfulOrders: 2,
        failedOrders: 0,
        submittedOrderIds: ['order-1', 'order-2'],
        errors: [],
        failedPositions: []
      }
    })

    // Mock successful deletion
    const mockOrderGenerationApi = orderGenerationApi as jest.Mocked<typeof orderGenerationApi>
    mockOrderGenerationApi.deleteRebalance.mockResolvedValue({
      success: true,
      message: 'Rebalance deleted successfully'
    })

    const selectedRebalances = new Set(['rebal-1'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Click Submit Selected
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOrderServiceApi.submitRebalanceOrders).toHaveBeenCalledWith(
        mockRebalances[0],
        expect.any(Function)
      )
    })

    await waitFor(() => {
      expect(mockOrderGenerationApi.deleteRebalance).toHaveBeenCalledWith(
        'rebal-1',
        1
      )
    })

    expect(mockOnOperationComplete).toHaveBeenCalledWith({
      type: 'batch_submit',
      totalProcessed: 1,
      successful: 1,
      failed: 0
    })
  })

  it('should handle batch delete with external selection', async () => {
    const { orderGenerationApi } = await import('@/lib/api/orderGenerationService')

    // Mock successful deletion
    const mockOrderGenerationApi = orderGenerationApi as jest.Mocked<typeof orderGenerationApi>
    mockOrderGenerationApi.deleteRebalances.mockResolvedValue({
      successful: ['rebal-1'],
      failed: [],
      totalDeleted: 1,
      totalFailed: 0
    })

    const selectedRebalances = new Set(['rebal-1'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Click Delete Selected
    const deleteButton = screen.getByRole('button', { name: /delete selected/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockOrderGenerationApi.deleteRebalances).toHaveBeenCalledWith([
        { rebalanceId: 'rebal-1', version: 1 }
      ])
    })

    expect(mockOnOperationComplete).toHaveBeenCalledWith({
      type: 'batch_delete',
      totalProcessed: 1,
      successful: 1,
      failed: 0
    })
  })

  it('should handle submission errors gracefully', async () => {
    const { orderServiceApi } = await import('@/lib/api/orderService')
    const { toast } = await import('sonner')

    // Mock failed order submission
    const mockOrderServiceApi = orderServiceApi as jest.Mocked<typeof orderServiceApi>
    mockOrderServiceApi.submitRebalanceOrders.mockRejectedValue(
      new Error('Network error')
    )

    const selectedRebalances = new Set(['rebal-1'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Click Submit Selected
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOrderServiceApi.submitRebalanceOrders).toHaveBeenCalled()
    })

    // Should call onOperationComplete with failure
    expect(mockOnOperationComplete).toHaveBeenCalledWith({
      type: 'batch_submit',
      totalProcessed: 1,
      successful: 0,
      failed: 1
    })
  })

  it('should calculate estimates correctly', () => {
    const selectedRebalances = new Set(['rebal-1', 'rebal-2'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Should calculate portfolios and orders correctly
    // rebal-1: 1 portfolio, 2 eligible positions (BUY + SELL)
    // rebal-2: 1 portfolio, 1 eligible position (BUY)
    // Total: 2 portfolios, 3 eligible orders

    expect(screen.getByText(/2 portfolios/i)).toBeInTheDocument()
    expect(screen.getByText(/150/i)).toBeInTheDocument() // ~3 * 50 estimated orders
  })

  it('should handle partial success scenarios', async () => {
    const { orderServiceApi } = await import('@/lib/api/orderService')
    const { orderGenerationApi } = await import('@/lib/api/orderGenerationService')
    const { toast } = await import('sonner')

    // Mock partial success
    const mockOrderServiceApi = orderServiceApi as jest.Mocked<typeof orderServiceApi>
    mockOrderServiceApi.submitRebalanceOrders
      .mockResolvedValueOnce({
        rebalance: mockRebalances[0],
        result: {
          totalOrders: 2,
          successfulOrders: 2,
          failedOrders: 0,
          submittedOrderIds: ['order-1', 'order-2'],
          errors: [],
          failedPositions: []
        }
      })
      .mockRejectedValueOnce(new Error('Network error'))

    // Mock successful deletion for first rebalance
    const mockOrderGenerationApi = orderGenerationApi as jest.Mocked<typeof orderGenerationApi>
    mockOrderGenerationApi.deleteRebalance.mockResolvedValue({
      success: true,
      message: 'Rebalance deleted successfully'
    })

    const selectedRebalances = new Set(['rebal-1', 'rebal-2'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Click Submit Selected
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOrderServiceApi.submitRebalanceOrders).toHaveBeenCalledTimes(2)
    })

    // Should call onOperationComplete with mixed results
    expect(mockOnOperationComplete).toHaveBeenCalledWith({
      type: 'batch_submit',
      totalProcessed: 2,
      successful: 1,
      failed: 1
    })

    // Should show warning toast for partial success
    const mockToast = toast as jest.Mocked<typeof toast>
    expect(mockToast.warning).toHaveBeenCalledWith(
      'Submitted 1 rebalances, 1 failed.'
    )
  })

  it('should display progress during operations', async () => {
    const { orderServiceApi } = await import('@/lib/api/orderService')

    // Mock slow order submission to test progress display
    const mockOrderServiceApi = orderServiceApi as jest.Mocked<typeof orderServiceApi>
    mockOrderServiceApi.submitRebalanceOrders.mockImplementation(
      (rebalance, progressCallback) => {
        // Simulate progress updates
        setTimeout(() => {
          progressCallback?.({
            currentPortfolio: 1,
            totalPortfolios: 1,
            submitted: 1,
            failed: 0,
            total: 2
          })
        }, 100)

        return Promise.resolve({
          rebalance,
          result: {
            totalOrders: 2,
            successfulOrders: 2,
            failedOrders: 0,
            submittedOrderIds: ['order-1', 'order-2'],
            errors: [],
            failedPositions: []
          }
        })
      }
    )

    const selectedRebalances = new Set(['rebal-1'])
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={selectedRebalances}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Click Submit Selected
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    fireEvent.click(submitButton)

    // Should show processing state
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('should prevent operations when validation fails', () => {
    // Test with over 10,000 selected items (should fail validation)
    const largeSelection = new Set(
      Array.from({ length: 10001 }, (_, i) => `rebal-${i}`)
    )
    
    render(
      <TestWrapper>
        <BatchOperationsPanel 
          {...defaultProps} 
          selectedRebalances={largeSelection}
        />
      </TestWrapper>
    )

    // Navigate to Operations tab
    fireEvent.click(screen.getByText('Operations'))

    // Submit Selected button should be disabled due to validation failure
    const submitButton = screen.getByRole('button', { name: /submit selected/i })
    expect(submitButton).toBeDisabled()

    // Should show validation warning
    expect(screen.getByText(/large selection may take significant time/i)).toBeInTheDocument()
  })
}) 