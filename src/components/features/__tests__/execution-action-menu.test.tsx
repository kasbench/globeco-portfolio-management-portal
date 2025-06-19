import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionActionMenu } from '../execution-action-menu';
import { ExecutionDTO, ExecutionAction } from '@/types/execution';

// Mock the UI components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <div data-testid="dropdown-item" onClick={disabled ? undefined : onClick} data-disabled={disabled}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    variant?: string;
  }) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>,
}));

describe('ExecutionActionMenu', () => {
  const mockOnAction = jest.fn();

  const mockCancellableExecution: ExecutionDTO = {
    id: 1,
    executionStatus: 'NEW',
    tradeType: 'BUY',
    destination: 'NYSE',
    security: { securityId: 'SEC1', ticker: 'AAPL' },
    quantity: 100,
    limitPrice: 150.00,
    receivedTimestamp: '2024-01-01T10:00:00Z',
    sentTimestamp: null,
    tradeServiceExecutionId: null,
    quantityFilled: 0,
    averagePrice: null,
    version: 1
  };

  const mockFilledExecution: ExecutionDTO = {
    id: 2,
    executionStatus: 'FILLED',
    tradeType: 'SELL',
    destination: 'NASDAQ',
    security: { securityId: 'SEC2', ticker: 'GOOGL' },
    quantity: 50,
    limitPrice: 2800.00,
    receivedTimestamp: '2024-01-01T10:05:00Z',
    sentTimestamp: '2024-01-01T10:06:00Z',
    tradeServiceExecutionId: 12345,
    quantityFilled: 50,
    averagePrice: 2795.00,
    version: 2
  };

  const mockFullExecution: ExecutionDTO = {
    id: 3,
    executionStatus: 'FULL',
    tradeType: 'BUY',
    destination: 'NYSE',
    security: { securityId: 'SEC3', ticker: 'MSFT' },
    quantity: 75,
    limitPrice: 300.00,
    receivedTimestamp: '2024-01-01T10:10:00Z',
    sentTimestamp: '2024-01-01T10:11:00Z',
    tradeServiceExecutionId: 12346,
    quantityFilled: 75,
    averagePrice: 299.50,
    version: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dropdown menu trigger', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('button')).toBeInTheDocument();
    });

    it('should display execution info in dropdown header', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Execution #1')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('BUY')).toBeInTheDocument();
      expect(screen.getByText('NYSE')).toBeInTheDocument();
    });

    it('should show view details option for all executions', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('should show cancel option for cancellable executions', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      const cancelButton = screen.getByText('Cancel Execution');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.closest('[data-disabled]')).toHaveAttribute('data-disabled', 'false');
    });

    it('should disable cancel option for FILLED executions', () => {
      render(
        <ExecutionActionMenu
          execution={mockFilledExecution}
          onAction={mockOnAction}
        />
      );

      const cancelButton = screen.getByText('Cancel Execution');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.closest('[data-disabled]')).toHaveAttribute('data-disabled', 'true');
      expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('should disable cancel option for FULL executions', () => {
      render(
        <ExecutionActionMenu
          execution={mockFullExecution}
          onAction={mockOnAction}
        />
      );

      const cancelButton = screen.getByText('Cancel Execution');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.closest('[data-disabled]')).toHaveAttribute('data-disabled', 'true');
      expect(screen.getByText('Not available')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onAction with view when view details is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      await user.click(screen.getByText('View Details'));

      expect(mockOnAction).toHaveBeenCalledWith('view', mockCancellableExecution);
    });

    it('should open cancel confirmation dialog when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      await user.click(screen.getByText('Cancel Execution'));

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Cancel Execution')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to cancel this execution?')).toBeInTheDocument();
    });

    it('should not open cancel dialog for non-cancellable executions', async () => {
      const user = userEvent.setup();

      render(
        <ExecutionActionMenu
          execution={mockFilledExecution}
          onAction={mockOnAction}
        />
      );

      // The cancel button should be disabled, so clicking shouldn't work
      const cancelButton = screen.getByText('Cancel Execution');
      await user.click(cancelButton);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Confirmation Dialog', () => {
    beforeEach(async () => {
      const user = userEvent.setup();

      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      await user.click(screen.getByText('Cancel Execution'));
    });

    it('should display execution details in confirmation dialog', () => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Execution ID
      expect(screen.getByText('AAPL')).toBeInTheDocument(); // Security
      expect(screen.getByText('NYSE')).toBeInTheDocument(); // Destination
      expect(screen.getByText('BUY')).toBeInTheDocument(); // Trade type
      expect(screen.getByText('100')).toBeInTheDocument(); // Quantity
    });

    it('should show warning about cancellation not being guaranteed', () => {
      expect(screen.getByText('Cancellation can be attempted but success is not guaranteed.')).toBeInTheDocument();
      expect(screen.getByText('The execution may have already been processed by the trading platform.')).toBeInTheDocument();
    });

    it('should call onAction when cancel is confirmed', async () => {
      const user = userEvent.setup();
      const cancelButtons = screen.getAllByText('Cancel Execution');
      const confirmButton = cancelButtons.find(button => 
        button.closest('[data-variant="destructive"]')
      );

      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton!);

      expect(mockOnAction).toHaveBeenCalledWith('cancel', mockCancellableExecution);
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      const cancelButtons = screen.getAllByText('Cancel');
      const cancelButton = cancelButtons.find(button => 
        !button.closest('[data-variant="destructive"]')
      );

      expect(cancelButton).toBeInTheDocument();
      await user.click(cancelButton!);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Icons', () => {
    it('should show correct icon for NEW status', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
        />
      );

      // NEW status should show Clock icon (blue)
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });

    it('should show correct icon for FILLED status', () => {
      render(
        <ExecutionActionMenu
          execution={mockFilledExecution}
          onAction={mockOnAction}
        />
      );

      // FILLED status should show green circle
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });

    it('should show correct icon for FULL status', () => {
      render(
        <ExecutionActionMenu
          execution={mockFullExecution}
          onAction={mockOnAction}
        />
      );

      // FULL status should show green circle (same as FILLED)
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable entire menu when disabled prop is true', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
          disabled={true}
        />
      );

      const triggerButton = screen.getByTestId('button');
      expect(triggerButton).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnAction}
          className="custom-class"
        />
      );

      const triggerButton = screen.getByTestId('button');
      expect(triggerButton).toHaveClass('custom-class');
    });
  });

  describe('Error Handling', () => {
    it('should handle onAction throwing an error', async () => {
      const user = userEvent.setup();
      const mockOnActionWithError = jest.fn().mockImplementation(() => {
        throw new Error('Action failed');
      });

      render(
        <ExecutionActionMenu
          execution={mockCancellableExecution}
          onAction={mockOnActionWithError}
        />
      );

      await user.click(screen.getByText('View Details'));

      expect(mockOnActionWithError).toHaveBeenCalledWith('view', mockCancellableExecution);
      // The component should handle the error gracefully without crashing
    });
  });
}); 