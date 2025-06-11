// Comprehensive Tests for Status Indicator Components
// Tests all status states, progress tracking, and help system integration

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import {
  StatusIndicator,
  StatusBadge,
  ProgressIndicator,
  BatchProgressIndicator,
  OrderStatusSummary,
  RealTimeFeedback,
  AnimatedStatusIndicator,
  getStatusTooltipContent
} from '../status-indicators'
import { SubmissionState } from '@/types/order'

// Mock the HelpTooltip component
jest.mock('@/components/ui/tooltip', () => ({
  HelpTooltip: ({ children, content }: { children: React.ReactNode, content: string }) => (
    <div data-testid="help-tooltip" title={content}>
      {children}
    </div>
  )
}))

// Mock the Progress component
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, indicatorClassName }: { value: number, className?: string, indicatorClassName?: string }) => (
    <div 
      data-testid="progress-bar" 
      data-value={value}
      className={className}
    >
      <div className={indicatorClassName} style={{ width: `${value}%` }} />
    </div>
  )
}))

// Mock the Badge component
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}))

describe('StatusIndicator', () => {
  it('renders not submitted status correctly', () => {
    render(<StatusIndicator state={SubmissionState.NotSubmitted} />)
    
    expect(screen.getByText('Not Submitted')).toBeInTheDocument()
    expect(screen.getByTestId('help-tooltip')).toHaveAttribute('title', 'Ready for submission')
  })

  it('renders pending status with spinning icon', () => {
    render(<StatusIndicator state={SubmissionState.Pending} />)
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    const icon = document.querySelector('.animate-spin')
    expect(icon).toBeInTheDocument()
  })

  it('renders submitting status with spinning icon', () => {
    render(<StatusIndicator state={SubmissionState.Submitting} />)
    
    expect(screen.getByText('Submitting')).toBeInTheDocument()
    const icon = document.querySelector('.animate-spin')
    expect(icon).toBeInTheDocument()
  })

  it('renders submitted status correctly', () => {
    render(<StatusIndicator state={SubmissionState.Submitted} />)
    
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByTestId('help-tooltip')).toHaveAttribute('title', 'Successfully submitted')
  })

  it('renders failed status correctly', () => {
    render(<StatusIndicator state={SubmissionState.Failed} />)
    
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByTestId('help-tooltip')).toHaveAttribute('title', 'Submission failed')
  })

  it('renders partially submitted status correctly', () => {
    render(<StatusIndicator state={SubmissionState.PartiallySubmitted} />)
    
    expect(screen.getByText('Partial')).toBeInTheDocument()
    expect(screen.getByTestId('help-tooltip')).toHaveAttribute('title', 'Some orders failed')
  })

  it('renders without label when showLabel is false', () => {
    render(<StatusIndicator state={SubmissionState.Submitted} showLabel={false} />)
    
    expect(screen.queryByText('Submitted')).not.toBeInTheDocument()
  })

  it('renders without tooltip when showTooltip is false', () => {
    render(<StatusIndicator state={SubmissionState.Submitted} showTooltip={false} />)
    
    expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument()
  })

  it('applies different sizes correctly', () => {
    const { rerender } = render(<StatusIndicator state={SubmissionState.Submitted} size="sm" />)
    expect(document.querySelector('.h-3')).toBeInTheDocument()

    rerender(<StatusIndicator state={SubmissionState.Submitted} size="lg" />)
    expect(document.querySelector('.h-5')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<StatusIndicator state={SubmissionState.Submitted} className="custom-class" />)
    
    expect(document.querySelector('.custom-class')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('renders as badge with correct status', () => {
    render(<StatusBadge state={SubmissionState.Submitted} />)
    
    const badge = screen.getByTestId('badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-variant', 'outline')
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('applies correct colors for different states', () => {
    const { rerender } = render(<StatusBadge state={SubmissionState.Submitted} />)
    expect(document.querySelector('.text-green-600')).toBeInTheDocument()

    rerender(<StatusBadge state={SubmissionState.Failed} />)
    expect(document.querySelector('.text-red-600')).toBeInTheDocument()

    rerender(<StatusBadge state={SubmissionState.Pending} />)
    expect(document.querySelector('.text-blue-600')).toBeInTheDocument()
  })

  it('shows spinning icon for active states', () => {
    render(<StatusBadge state={SubmissionState.Pending} />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

describe('ProgressIndicator', () => {
  it('renders progress bar with correct percentage', () => {
    render(<ProgressIndicator current={75} total={100} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('data-value', '75')
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('75 / 100')).toBeInTheDocument()
  })

  it('handles zero total correctly', () => {
    render(<ProgressIndicator current={0} total={0} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('data-value', '0')
  })

  it('renders with custom label', () => {
    render(<ProgressIndicator current={50} total={100} label="Custom Progress" />)
    
    expect(screen.getByText('Custom Progress')).toBeInTheDocument()
  })

  it('hides percentage when showPercentage is false', () => {
    render(<ProgressIndicator current={50} total={100} showPercentage={false} />)
    
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('hides counts when showCounts is false', () => {
    render(<ProgressIndicator current={50} total={100} showCounts={false} />)
    
    expect(screen.queryByText('50 / 100')).not.toBeInTheDocument()
  })

  it('applies different variants correctly', () => {
    const { rerender } = render(<ProgressIndicator current={50} total={100} variant="success" />)
    expect(document.querySelector('.bg-green-600')).toBeInTheDocument()

    rerender(<ProgressIndicator current={50} total={100} variant="error" />)
    expect(document.querySelector('.bg-red-600')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    render(<ProgressIndicator current={1234} total={5678} />)
    
    expect(screen.getByText('1,234 / 5,678')).toBeInTheDocument()
  })
})

describe('BatchProgressIndicator', () => {
  it('renders batch progress information', () => {
    render(
      <BatchProgressIndicator
        currentBatch={2}
        totalBatches={5}
        currentItem="Portfolio ABC123"
        estimatedTimeRemaining={180}
        throughput={25.5}
      />
    )
    
    expect(screen.getByText('Processing Batch 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Current: Portfolio ABC123')).toBeInTheDocument()
    expect(screen.getByText('3m remaining')).toBeInTheDocument()
    expect(screen.getByText('Throughput: 25.5/sec')).toBeInTheDocument()
  })

  it('formats time correctly for different durations', () => {
    const { rerender } = render(
      <BatchProgressIndicator currentBatch={1} totalBatches={2} estimatedTimeRemaining={30} />
    )
    expect(screen.getByText('30s remaining')).toBeInTheDocument()

    rerender(
      <BatchProgressIndicator currentBatch={1} totalBatches={2} estimatedTimeRemaining={3600} />
    )
    expect(screen.getByText('1h remaining')).toBeInTheDocument()
  })

  it('formats throughput correctly for different rates', () => {
    const { rerender } = render(
      <BatchProgressIndicator currentBatch={1} totalBatches={2} throughput={0.5} />
    )
    expect(screen.getByText('Throughput: 30.0/min')).toBeInTheDocument()

    rerender(
      <BatchProgressIndicator currentBatch={1} totalBatches={2} throughput={10.25} />
    )
    expect(screen.getByText('Throughput: 10.3/sec')).toBeInTheDocument()
  })

  it('renders overall progress when provided', () => {
    render(
      <BatchProgressIndicator
        currentBatch={1}
        totalBatches={3}
        currentProgress={150}
        totalProgress={500}
      />
    )
    
    expect(screen.getByText('Overall Progress')).toBeInTheDocument()
    expect(screen.getByText('150 / 500')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <BatchProgressIndicator
        currentBatch={1}
        totalBatches={2}
        className="custom-batch-class"
      />
    )
    
    expect(document.querySelector('.custom-batch-class')).toBeInTheDocument()
  })
})

describe('OrderStatusSummary', () => {
  it('renders all status counts', () => {
    render(
      <OrderStatusSummary
        totalOrders={100}
        submittedOrders={75}
        failedOrders={15}
        pendingOrders={10}
      />
    )
    
    expect(screen.getByText('Total:')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Submitted:')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('Failed:')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Pending:')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('filters out zero counts', () => {
    render(
      <OrderStatusSummary
        totalOrders={100}
        submittedOrders={100}
        failedOrders={0}
        pendingOrders={0}
      />
    )
    
    expect(screen.getByText('Total:')).toBeInTheDocument()
    expect(screen.getByText('Submitted:')).toBeInTheDocument()
    expect(screen.queryByText('Failed:')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending:')).not.toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    render(
      <OrderStatusSummary
        totalOrders={12345}
        submittedOrders={11234}
        failedOrders={567}
        pendingOrders={544}
      />
    )
    
    expect(screen.getByText('12,345')).toBeInTheDocument()
    expect(screen.getByText('11,234')).toBeInTheDocument()
  })

  it('applies correct colors for different statuses', () => {
    render(
      <OrderStatusSummary
        totalOrders={100}
        submittedOrders={75}
        failedOrders={15}
        pendingOrders={10}
      />
    )
    
    expect(document.querySelector('.text-green-600')).toBeInTheDocument() // submitted
    expect(document.querySelector('.text-red-600')).toBeInTheDocument() // failed
    expect(document.querySelector('.text-yellow-600')).toBeInTheDocument() // pending
  })
})

describe('RealTimeFeedback', () => {
  it('renders when active', () => {
    render(
      <RealTimeFeedback
        isActive={true}
        currentAction="Submitting orders"
        details="Processing batch 1 of 3"
        progress={33}
      />
    )
    
    expect(screen.getByText('Submitting orders')).toBeInTheDocument()
    expect(screen.getByText('Processing batch 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('does not render when inactive', () => {
    render(<RealTimeFeedback isActive={false} />)
    
    expect(screen.queryByTestId('real-time-feedback')).not.toBeInTheDocument()
  })

  it('renders minimal content when only active', () => {
    render(<RealTimeFeedback isActive={true} />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<RealTimeFeedback isActive={true} className="custom-feedback-class" />)
    
    expect(document.querySelector('.custom-feedback-class')).toBeInTheDocument()
  })
})

describe('AnimatedStatusIndicator', () => {
  it('renders current status', () => {
    render(
      <AnimatedStatusIndicator
        currentState={SubmissionState.Submitted}
      />
    )
    
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('shows animation when status changes', () => {
    render(
      <AnimatedStatusIndicator
        previousState={SubmissionState.Pending}
        currentState={SubmissionState.Submitted}
      />
    )
    
    const animationElement = document.querySelector('.animate-ping')
    expect(animationElement).toBeInTheDocument()
  })

  it('does not show animation when status is the same', () => {
    render(
      <AnimatedStatusIndicator
        previousState={SubmissionState.Submitted}
        currentState={SubmissionState.Submitted}
      />
    )
    
    const animationElement = document.querySelector('.animate-ping')
    expect(animationElement).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <AnimatedStatusIndicator
        currentState={SubmissionState.Submitted}
        className="custom-animated-class"
      />
    )
    
    expect(document.querySelector('.custom-animated-class')).toBeInTheDocument()
  })
})

describe('getStatusTooltipContent', () => {
  it('returns basic tooltip content', () => {
    const content = getStatusTooltipContent(SubmissionState.Submitted)
    
    render(<div>{content}</div>)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Successfully submitted')).toBeInTheDocument()
  })

  it('includes additional information when provided', () => {
    const submittedAt = new Date('2024-01-01T12:00:00Z')
    const content = getStatusTooltipContent(SubmissionState.Submitted, {
      submittedAt,
      orderCount: 150,
      retryCount: 2
    })
    
    render(<div>{content}</div>)
    expect(screen.getByText('Orders: 150')).toBeInTheDocument()
    expect(screen.getByText('Retries: 2')).toBeInTheDocument()
    expect(screen.getByText('Submitted: 1/1/2024, 12:00:00 PM')).toBeInTheDocument()
  })

  it('includes error message for failed status', () => {
    const content = getStatusTooltipContent(SubmissionState.Failed, {
      errorMessage: 'Network timeout error'
    })
    
    render(<div>{content}</div>)
    expect(screen.getByText('Error: Network timeout error')).toBeInTheDocument()
  })

  it('does not show retry count when zero', () => {
    const content = getStatusTooltipContent(SubmissionState.Failed, {
      retryCount: 0
    })
    
    render(<div>{content}</div>)
    expect(screen.queryByText('Retries:')).not.toBeInTheDocument()
  })
})

// Integration tests
describe('Status Indicators Integration', () => {
  it('works together in a complex scenario', () => {
    render(
      <div>
        <OrderStatusSummary
          totalOrders={1000}
          submittedOrders={750}
          failedOrders={50}
          pendingOrders={200}
        />
        <BatchProgressIndicator
          currentBatch={3}
          totalBatches={5}
          currentItem="Processing large portfolio"
          estimatedTimeRemaining={120}
          throughput={15.5}
        />
        <RealTimeFeedback
          isActive={true}
          currentAction="Submitting batch"
          details="Sending to Order Service"
          progress={60}
        />
      </div>
    )
    
    // Check all components render together
    expect(screen.getByText('Total:')).toBeInTheDocument()
    expect(screen.getByText('Processing Batch 3 of 5')).toBeInTheDocument()
    expect(screen.getByText('Submitting batch')).toBeInTheDocument()
  })

  it('handles rapid status changes correctly', async () => {
    const { rerender } = render(
      <AnimatedStatusIndicator currentState={SubmissionState.NotSubmitted} />
    )
    
    rerender(
      <AnimatedStatusIndicator
        previousState={SubmissionState.NotSubmitted}
        currentState={SubmissionState.Pending}
      />
    )
    
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(document.querySelector('.animate-ping')).toBeInTheDocument()
    
    rerender(
      <AnimatedStatusIndicator
        previousState={SubmissionState.Pending}
        currentState={SubmissionState.Submitted}
      />
    )
    
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })
}) 