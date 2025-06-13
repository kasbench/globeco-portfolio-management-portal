// Comprehensive tests for SubmissionControls components

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

import { 
  GlobalSubmissionControls, 
  RebalanceControls, 
  PortfolioControls 
} from '../SubmissionControls'
import { RebalanceWithSubmission, RebalancePortfolioWithSubmission } from '@/types/rebalance'
import { SubmissionState } from '@/types/order'

// Mock the data transformation service
jest.mock('@/lib/services/dataTransformationService', () => ({
  dataTransformationService: {
    generateSubmissionPreview: jest.fn().mockResolvedValue({
      orderCount: 100,
      portfolioCount: 5,
      summary: {
        estimatedBatches: 1,
        eligiblePositions: 100,
        portfoliosAffected: ['PORT1', 'PORT2'],
        buyOrders: 60,
        sellOrders: 40,
        totalQuantity: 1000
      }
    })
  }
}))

// Mock data
const createMockRebalance = (id: string, portfolioCount: number = 2): RebalanceWithSubmission => ({
  rebalance_id: id,
  model_id: `model_${id}`,
  model_name: `Test Model ${id}`,
  rebalance_date: '2024-01-01T00:00:00Z',
  version: 1,
  portfolios: Array.from({ length: portfolioCount }, (_, i) => ({
    portfolio_id: `${id}_port_${i}`,
    market_value_before_rebalance: 1000000,
    market_value_after_rebalance: 1050000,
    cash_before_rebalance: 50000,
    cash_after_rebalance: 25000,
    positions: [
      {
        security_id: `SEC${i}_1`,
        transaction_type: 'BUY' as const,
        trade_quantity: 100,
        market_value_before_rebalance: 50000,
        market_value_after_rebalance: 55000,
        weight_before_rebalance: 0.05,
        weight_after_rebalance: 0.055,
        submissionState: SubmissionState.NotSubmitted
      },
      {
        security_id: `SEC${i}_2`,
        transaction_type: 'SELL' as const,
        trade_quantity: 50,
        market_value_before_rebalance: 30000,
        market_value_after_rebalance: 25000,
        weight_before_rebalance: 0.03,
        weight_after_rebalance: 0.025,
        submissionState: SubmissionState.NotSubmitted
      },
      {
        security_id: `SEC${i}_3`,
        transaction_type: 'HOLD' as const,
        trade_quantity: 0,
        market_value_before_rebalance: 20000,
        market_value_after_rebalance: 20000,
        weight_before_rebalance: 0.02,
        weight_after_rebalance: 0.02,
        submissionState: SubmissionState.NotSubmitted
      }
    ]
  }))
})

const mockRebalances = [
  createMockRebalance('rebal_1'),
  createMockRebalance('rebal_2'),
  createMockRebalance('rebal_3')
]

// Create wrapper with QueryClient and TooltipProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  )
  
  return TestWrapper
}

describe('GlobalSubmissionControls', () => {
  const mockProps = {
    rebalances: mockRebalances,
    selectedRebalanceIds: new Set<string>(),
    selectedPortfolioIds: new Set<string>(),
    onRebalanceSelectionChange: jest.fn(),
    onPortfolioSelectionChange: jest.fn(),
    onSubmitAll: jest.fn(),
    onSubmitRebalances: jest.fn(),
    onSubmitPortfolios: jest.fn(),
    onDeleteRebalances: jest.fn(),
    onDeletePortfolios: jest.fn(),
    isSubmitting: false,
    isDeleting: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with no selections', () => {
    render(<GlobalSubmissionControls {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Select All')).toBeInTheDocument()
    expect(screen.getByText('0 rebalances')).toBeInTheDocument()
    expect(screen.getByText('0 portfolios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit selected/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /delete selected/i })).toBeDisabled()
  })

  it('updates selection counts correctly', () => {
    const propsWithSelections = {
      ...mockProps,
      selectedRebalanceIds: new Set(['rebal_1', 'rebal_2']),
      selectedPortfolioIds: new Set(['rebal_1_port_0', 'rebal_1_port_1', 'rebal_2_port_0'])
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    expect(screen.getByText('2 rebalances')).toBeInTheDocument()
    expect(screen.getByText('3 portfolios')).toBeInTheDocument()
    expect(screen.getByText('Submit Selected')).toBeEnabled()
    expect(screen.getByText('Delete Selected')).toBeEnabled()
  })

  it('shows eligible orders count', () => {
    const propsWithSelections = {
      ...mockProps,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0', 'rebal_1_port_1'])
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    // Each portfolio has 2 eligible orders (BUY and SELL), so 2 portfolios = 4 orders
    expect(screen.getByText('4 orders')).toBeInTheDocument()
  })

  it('shows warning when no eligible orders in selection', () => {
    // Create rebalances with only HOLD positions
    const rebalancesWithHoldOnly = [
      {
        ...mockRebalances[0],
        portfolios: mockRebalances[0].portfolios.map(p => ({
          ...p,
          positions: p.positions.map(pos => ({
            ...pos,
            transaction_type: 'HOLD' as const,
            trade_quantity: 0
          }))
        }))
      }
    ]

    const propsWithHoldOnly = {
      ...mockProps,
      rebalances: rebalancesWithHoldOnly,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0'])
    }

    render(<GlobalSubmissionControls {...propsWithHoldOnly} />, { wrapper: createWrapper() })

    expect(screen.getByText(/No eligible orders found in selected items/)).toBeInTheDocument()
  })

  it('handles select all functionality', async () => {
    const user = userEvent.setup()
    render(<GlobalSubmissionControls {...mockProps} />, { wrapper: createWrapper() })

    const selectAllCheckbox = screen.getByLabelText('Select All')
    await user.click(selectAllCheckbox)

    expect(mockProps.onRebalanceSelectionChange).toHaveBeenCalledWith(
      new Set(['rebal_1', 'rebal_2', 'rebal_3'])
    )
    expect(mockProps.onPortfolioSelectionChange).toHaveBeenCalledWith(
      new Set([
        'rebal_1_port_0', 'rebal_1_port_1',
        'rebal_2_port_0', 'rebal_2_port_1',
        'rebal_3_port_0', 'rebal_3_port_1'
      ])
    )
  })

  it('opens submission confirmation dialog', async () => {
    const user = userEvent.setup()
    const propsWithSelections = {
      ...mockProps,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0', 'rebal_1_port_1'])
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText('Submit Selected')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Confirm Order Submission')).toBeInTheDocument()
    })
  })

  it('opens delete confirmation dialog', async () => {
    const user = userEvent.setup()
    const propsWithSelections = {
      ...mockProps,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0'])
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    const deleteButton = screen.getByText('Delete Selected')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
    })
  })

  it('disables buttons during submission', () => {
    const propsWithSubmission = {
      ...mockProps,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0']),
      isSubmitting: true
    }

    render(<GlobalSubmissionControls {...propsWithSubmission} />, { wrapper: createWrapper() })

    expect(screen.getByRole('button', { name: /submit selected/i })).toBeDisabled()
  })

  it('disables buttons during deletion', () => {
    const propsWithDeletion = {
      ...mockProps,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0']),
      isDeleting: true
    }

    render(<GlobalSubmissionControls {...propsWithDeletion} />, { wrapper: createWrapper() })

    expect(screen.getByRole('button', { name: /delete selected/i })).toBeDisabled()
  })
})

describe('RebalanceControls', () => {
  const mockRebalance = mockRebalances[0]
  const mockProps = {
    rebalance: mockRebalance,
    isSelected: false,
    onSelectionChange: jest.fn(),
    onSubmit: jest.fn(),
    onDelete: jest.fn(),
    isSubmitting: false,
    isDeleting: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<RebalanceControls {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByText('Submit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument() // Eligible orders count badge
  })

  it('shows selected state', () => {
    render(<RebalanceControls {...mockProps} isSelected={true} />, { wrapper: createWrapper() })

    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('handles selection change', async () => {
    const user = userEvent.setup()
    render(<RebalanceControls {...mockProps} />, { wrapper: createWrapper() })

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(mockProps.onSelectionChange).toHaveBeenCalledWith(true)
  })

  it('opens submission dialog', async () => {
    const user = userEvent.setup()
    render(<RebalanceControls {...mockProps} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText('Submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(`Submit Rebalance: ${mockRebalance.model_name}`)).toBeInTheDocument()
    })
  })

  it('opens delete dialog', async () => {
    const user = userEvent.setup()
    render(<RebalanceControls {...mockProps} />, { wrapper: createWrapper() })

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(`Delete Rebalance: ${mockRebalance.model_name}`)).toBeInTheDocument()
    })
  })

  it('disables submit when no eligible orders', () => {
    const rebalanceWithNoOrders = {
      ...mockRebalance,
      portfolios: mockRebalance.portfolios.map(p => ({
        ...p,
        positions: p.positions.map(pos => ({
          ...pos,
          transaction_type: 'HOLD' as const,
          trade_quantity: 0
        }))
      }))
    }

    render(
      <RebalanceControls {...mockProps} rebalance={rebalanceWithNoOrders} />, 
      { wrapper: createWrapper() }
    )

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('shows loading state during submission', () => {
    render(<RebalanceControls {...mockProps} isSubmitting={true} />, { wrapper: createWrapper() })

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })
})

describe('PortfolioControls', () => {
  const mockPortfolio = mockRebalances[0].portfolios[0]
  const mockProps = {
    portfolio: mockPortfolio,
    rebalanceId: 'rebal_1',
    isSelected: false,
    onSelectionChange: jest.fn(),
    onSubmit: jest.fn(),
    onDelete: jest.fn(),
    isSubmitting: false,
    isDeleting: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<PortfolioControls {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByText('Submit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Eligible orders count badge
  })

  it('handles selection change', async () => {
    const user = userEvent.setup()
    render(<PortfolioControls {...mockProps} />, { wrapper: createWrapper() })

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(mockProps.onSelectionChange).toHaveBeenCalledWith(true)
  })

  it('opens submission dialog', async () => {
    const user = userEvent.setup()
    render(<PortfolioControls {...mockProps} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText('Submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(`Submit Portfolio: ${mockPortfolio.portfolio_id}`)).toBeInTheDocument()
    })
  })

  it('opens delete dialog', async () => {
    const user = userEvent.setup()
    render(<PortfolioControls {...mockProps} />, { wrapper: createWrapper() })

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(`Delete Portfolio: ${mockPortfolio.portfolio_id}`)).toBeInTheDocument()
    })
  })

  it('disables submit when no eligible orders', () => {
    const portfolioWithNoOrders = {
      ...mockPortfolio,
      positions: mockPortfolio.positions.map(pos => ({
        ...pos,
        transaction_type: 'HOLD' as const,
        trade_quantity: 0
      }))
    }

    render(
      <PortfolioControls {...mockProps} portfolio={portfolioWithNoOrders} />, 
      { wrapper: createWrapper() }
    )

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })
})

describe('Confirmation Dialog', () => {
  it('shows submission preview in confirmation dialog', async () => {
    const user = userEvent.setup()
    const propsWithSelections = {
      rebalances: mockRebalances,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0', 'rebal_1_port_1']),
      onRebalanceSelectionChange: jest.fn(),
      onPortfolioSelectionChange: jest.fn(),
      onSubmitAll: jest.fn(),
      onSubmitRebalances: jest.fn(),
      onSubmitPortfolios: jest.fn(),
      onDeleteRebalances: jest.fn(),
      onDeletePortfolios: jest.fn(),
      isSubmitting: false,
      isDeleting: false
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText('Submit Selected')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Submission Summary')).toBeInTheDocument()
      expect(screen.getByText('Total Orders:')).toBeInTheDocument()
      expect(screen.getByText('Buy Orders:')).toBeInTheDocument()
      expect(screen.getByText('Sell Orders:')).toBeInTheDocument()
    })
  })

  it('calls onConfirm when confirmed', async () => {
    const user = userEvent.setup()
    const mockSubmit = jest.fn()
    const propsWithSelections = {
      rebalances: mockRebalances,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0']),
      onRebalanceSelectionChange: jest.fn(),
      onPortfolioSelectionChange: jest.fn(),
      onSubmitAll: jest.fn(),
      onSubmitRebalances: mockSubmit,
      onSubmitPortfolios: jest.fn(),
      onDeleteRebalances: jest.fn(),
      onDeletePortfolios: jest.fn(),
      isSubmitting: false,
      isDeleting: false
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText('Submit Selected')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Confirm Order Submission')).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /submit orders/i })
    await user.click(confirmButton)

    expect(mockSubmit).toHaveBeenCalledWith(['rebal_1'])
  })

  it('closes dialog when cancelled', async () => {
    const user = userEvent.setup()
    const propsWithSelections = {
      rebalances: mockRebalances,
      selectedRebalanceIds: new Set(['rebal_1']),
      selectedPortfolioIds: new Set(['rebal_1_port_0']),
      onRebalanceSelectionChange: jest.fn(),
      onPortfolioSelectionChange: jest.fn(),
      onSubmitAll: jest.fn(),
      onSubmitRebalances: jest.fn(),
      onSubmitPortfolios: jest.fn(),
      onDeleteRebalances: jest.fn(),
      onDeletePortfolios: jest.fn(),
      isSubmitting: false,
      isDeleting: false
    }

    render(<GlobalSubmissionControls {...propsWithSelections} />, { wrapper: createWrapper() })

    const submitButton = screen.getByText('Submit Selected')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Confirm Order Submission')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Confirm Order Submission')).not.toBeInTheDocument()
    })
  })
}) 