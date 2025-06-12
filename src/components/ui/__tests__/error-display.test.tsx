// Simple Tests for Error Display Components
// Tests basic rendering and functionality

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { 
  ErrorItem,
  ErrorDisplayContainer
} from '../error-display'
import { 
  SubmissionError 
} from '@/lib/services/errorStateService'
import { TooltipProvider } from '@/components/ui/tooltip'

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

// Mock the error state service
jest.mock('@/lib/services/errorStateService', () => ({
  getErrorStateService: jest.fn(() => ({
    getErrorsForEntity: jest.fn(() => []),
    getRetryableErrors: jest.fn(() => []),
    getErrorMetrics: jest.fn(() => ({
      totalErrors: 0,
      retryableErrors: 0,
      nonRetryableErrors: 0,
      staleErrors: 0,
      errorsByLevel: {},
      errorsByCode: {},
      averageRetryCount: 0
    })),
    addError: jest.fn(),
    incrementRetryCount: jest.fn(),
    resolveError: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}))

describe('Error Display Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockError: SubmissionError = {
    id: 'error-123',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    level: 'position',
    entityId: 'position-123',
    errorCode: 'ERR_001',
    errorMessage: 'Test error message',
    technicalDetails: 'Detailed error information',
    retryable: true,
    retryCount: 1,
    lastRetryAt: new Date('2024-01-01T12:01:00Z'),
    userMessage: 'Test error message',
    suggestedAction: 'Please retry the operation'
  }

  describe('ErrorItem', () => {
    it('renders error message and basic information', () => {
      render(<ErrorItem error={mockError} />, { wrapper: TestWrapper })
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      expect(screen.getByText('Code: ERR_001', { exact: false })).toBeInTheDocument()
    })

    it('displays error timestamp and metadata', () => {
      render(<ErrorItem error={mockError} />, { wrapper: TestWrapper })
      
      expect(screen.getByText('Jan 01, 2024 07:00:00')).toBeInTheDocument()
      expect(screen.getByText('Entity: position-123', { exact: false })).toBeInTheDocument()
    })

    it('shows retry button for retryable errors', () => {
      const onRetry = jest.fn()
      render(<ErrorItem error={mockError} onRetry={onRetry} />, { wrapper: TestWrapper })
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('hides retry button for non-retryable errors', () => {
      const nonRetryableError = { ...mockError, retryable: false }
      render(<ErrorItem error={nonRetryableError} />, { wrapper: TestWrapper })
      
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      render(<ErrorItem error={mockError} onRetry={onRetry} />, { wrapper: TestWrapper })
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      expect(onRetry).toHaveBeenCalledWith('error-123')
    })

    it('shows dismiss button when onResolve is provided', () => {
      const onResolve = jest.fn()
      render(<ErrorItem error={mockError} onResolve={onResolve} />, { wrapper: TestWrapper })
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      expect(dismissButton).toBeInTheDocument()
    })

    it('renders in compact mode', () => {
      render(<ErrorItem error={mockError} compact={true} />, { wrapper: TestWrapper })
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })
  })

  describe('ErrorDisplayContainer', () => {
    it('renders without errors', () => {
      render(<ErrorDisplayContainer />, { wrapper: TestWrapper })
      
      // Should render without throwing
      expect(document.body).toBeInTheDocument()
    })

    it('renders with entity ID filter', () => {
      render(<ErrorDisplayContainer entityId="test-entity" />, { wrapper: TestWrapper })
      
      // Should render without throwing
      expect(document.body).toBeInTheDocument()
    })
  })
}) 