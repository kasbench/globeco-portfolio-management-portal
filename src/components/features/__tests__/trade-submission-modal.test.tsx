import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TradeSubmissionModal } from '../trade-submission-modal';
import { TradeOrderEnhancedResponseDTO } from '@/types/trade';

// Mock the hooks
vi.mock('@/lib/hooks/useDestinations', () => ({
  useDestinations: vi.fn()
}));

vi.mock('@/lib/hooks/useTradeSubmission', () => ({
  useTradeSubmission: vi.fn()
}));

// Mock the child components
vi.mock('../trade-submission-table', () => ({
  TradeSubmissionTable: vi.fn(() => <div data-testid="trade-submission-table">Trade Submission Table</div>)
}));

vi.mock('../submission-summary-card', () => ({
  SubmissionSummaryCard: vi.fn(() => <div data-testid="submission-summary-card">Submission Summary Card</div>)
}));

vi.mock('../bulk-actions-section', () => ({
  BulkActionsSection: vi.fn(() => <div data-testid="bulk-actions-section">Bulk Actions Section</div>)
}));

import { useDestinations } from '@/lib/hooks/useDestinations';
import { useTradeSubmission } from '@/lib/hooks/useTradeSubmission';

const mockUseDestinations = vi.mocked(useDestinations);
const mockUseTradeSubmission = vi.mocked(useTradeSubmission);

describe('TradeSubmissionModal', () => {
  const mockTradeOrders: TradeOrderEnhancedResponseDTO[] = [
    {
      id: 1,
      quantity: 100,
      quantitySent: 20,
      orderType: 'BUY',
      status: 'OPEN',
      security: { id: 1, ticker: 'AAPL', name: 'Apple Inc' },
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      quantity: 200,
      quantitySent: 50,
      orderType: 'SELL',
      status: 'OPEN',
      security: { id: 2, ticker: 'GOOGL', name: 'Alphabet Inc' },
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  const mockDestinations = [
    { id: 1, abbreviation: 'NYSE', description: 'New York Stock Exchange', version: 1 },
    { id: 2, abbreviation: 'NASDAQ', description: 'NASDAQ Stock Market', version: 1 }
  ];

  const mockDestinationOptions = [
    { value: 1, label: 'NYSE', description: 'New York Stock Exchange', disabled: false },
    { value: 2, label: 'NASDAQ', description: 'NASDAQ Stock Market', disabled: false }
  ];

  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    tradeOrders: mockTradeOrders,
    onSubmissionComplete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful state for destinations
    mockUseDestinations.mockReturnValue({
      destinations: mockDestinations,
      destinationOptions: mockDestinationOptions,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    // Default successful state for trade submission
    mockUseTradeSubmission.mockReturnValue({
      submissions: {},
      loading: false,
      error: null,
      setSubmissionQuantity: vi.fn(),
      setSubmissionDestination: vi.fn(),
      setAllDestinations: vi.fn(),
      setAllRemainingQuantities: vi.fn(),
      resetSubmissions: vi.fn(),
      getSubmissionData: vi.fn().mockReturnValue([]),
      getValidationSummary: vi.fn().mockReturnValue({
        isValid: false,
        errors: [],
        validCount: 0,
        invalidCount: 0
      }),
      submitBatch: vi.fn(),
      getSubmissionForOrder: vi.fn().mockReturnValue(null),
      isOrderConfigured: vi.fn().mockReturnValue(false)
    });
  });

  it('should render loading state when destinations are loading', () => {
    mockUseDestinations.mockReturnValue({
      destinations: [],
      destinationOptions: [],
      loading: true,
      error: null,
      refetch: vi.fn()
    });

    render(<TradeSubmissionModal {...mockProps} />);

    expect(screen.getByText('Submit Trade Orders')).toBeInTheDocument();
    expect(screen.getByText('Loading destinations...')).toBeInTheDocument();
  });

  it('should render error state when destinations fail to load', () => {
    mockUseDestinations.mockReturnValue({
      destinations: [],
      destinationOptions: [],
      loading: false,
      error: 'Failed to load destinations',
      refetch: vi.fn()
    });

    render(<TradeSubmissionModal {...mockProps} />);

    expect(screen.getByText('Failed to load submission destinations')).toBeInTheDocument();
    expect(screen.getByText('Failed to load destinations')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should render configure step by default', () => {
    render(<TradeSubmissionModal {...mockProps} />);

    expect(screen.getByText('Submit Trade Orders')).toBeInTheDocument();
    expect(screen.getByText('Configure quantity and destination for each trade order')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-actions-section')).toBeInTheDocument();
    expect(screen.getByTestId('trade-submission-table')).toBeInTheDocument();
  });

  it('should show validation errors when present', () => {
    mockUseTradeSubmission.mockReturnValue({
      ...mockUseTradeSubmission(),
      getValidationSummary: vi.fn().mockReturnValue({
        isValid: false,
        errors: ['Invalid quantity', 'Missing destination'],
        validCount: 0,
        invalidCount: 2
      })
    });

    render(<TradeSubmissionModal {...mockProps} />);

    expect(screen.getByText('Invalid quantity, Missing destination')).toBeInTheDocument();
  });

  it('should show submission error when present', () => {
    mockUseTradeSubmission.mockReturnValue({
      ...mockUseTradeSubmission(),
      error: 'Submission failed'
    });

    render(<TradeSubmissionModal {...mockProps} />);

    expect(screen.getByText('Submission failed')).toBeInTheDocument();
  });

  it('should enable Review button when validation is successful', () => {
    mockUseTradeSubmission.mockReturnValue({
      ...mockUseTradeSubmission(),
      getSubmissionData: vi.fn().mockReturnValue([{ /* mock submission data */ }]),
      getValidationSummary: vi.fn().mockReturnValue({
        isValid: true,
        errors: [],
        validCount: 2,
        invalidCount: 0
      })
    });

    render(<TradeSubmissionModal {...mockProps} />);

    const reviewButton = screen.getByText('Review Submission');
    expect(reviewButton).toBeEnabled();
  });

  it('should disable Review button when validation fails', () => {
    render(<TradeSubmissionModal {...mockProps} />);

    const reviewButton = screen.getByText('Review Submission');
    expect(reviewButton).toBeDisabled();
  });

  it('should navigate to review step when Review button is clicked', async () => {
    mockUseTradeSubmission.mockReturnValue({
      ...mockUseTradeSubmission(),
      getSubmissionData: vi.fn().mockReturnValue([{ /* mock submission data */ }]),
      getValidationSummary: vi.fn().mockReturnValue({
        isValid: true,
        errors: [],
        validCount: 2,
        invalidCount: 0
      })
    });

    render(<TradeSubmissionModal {...mockProps} />);

    const reviewButton = screen.getByText('Review Submission');
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(screen.getByText('Review your submission before proceeding')).toBeInTheDocument();
      expect(screen.getByTestId('submission-summary-card')).toBeInTheDocument();
    });
  });

  it('should show back button in review step', async () => {
    mockUseTradeSubmission.mockReturnValue({
      ...mockUseTradeSubmission(),
      getSubmissionData: vi.fn().mockReturnValue([{ /* mock submission data */ }]),
      getValidationSummary: vi.fn().mockReturnValue({
        isValid: true,
        errors: [],
        validCount: 2,
        invalidCount: 0
      })
    });

    render(<TradeSubmissionModal {...mockProps} />);

    // Navigate to review step
    const reviewButton = screen.getByText('Review Submission');
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Submit Orders')).toBeInTheDocument();
    });
  });

  it('should call onOpenChange when Cancel is clicked', () => {
    render(<TradeSubmissionModal {...mockProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should display order count badge', () => {
    render(<TradeSubmissionModal {...mockProps} />);

    expect(screen.getByText('2 orders')).toBeInTheDocument();
  });

  it('should not render when modal is closed', () => {
    render(<TradeSubmissionModal {...mockProps} open={false} />);

    expect(screen.queryByText('Submit Trade Orders')).not.toBeInTheDocument();
  });
}); 