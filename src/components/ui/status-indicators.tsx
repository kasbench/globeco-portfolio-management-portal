// Comprehensive Status Indicators for Order Submission System
// Handles submission states, progress tracking, and real-time feedback

'use client'

import React from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertTriangle,
  Info,
  TrendingUp,
  Send,
  Target,
  Activity,
  Zap,
  AlertCircle,
  Pause
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { HelpTooltip } from '@/components/ui/tooltip'
import { SubmissionState } from '@/types/order'

/**
 * Base status indicator props
 */
export interface StatusIndicatorProps {
  state: SubmissionState
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showTooltip?: boolean
  className?: string
}

/**
 * Progress indicator props
 */
export interface ProgressIndicatorProps {
  current: number
  total: number
  label?: string
  showPercentage?: boolean
  showCounts?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

/**
 * Batch progress props
 */
export interface BatchProgressProps {
  currentBatch: number
  totalBatches: number
  currentItem?: string
  currentProgress?: number
  totalProgress?: number
  estimatedTimeRemaining?: number
  throughput?: number
  className?: string
}

/**
 * Order status summary props
 */
export interface OrderStatusSummaryProps {
  totalOrders: number
  submittedOrders: number
  failedOrders: number
  pendingOrders: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Real-time feedback props
 */
export interface RealTimeFeedbackProps {
  isActive: boolean
  currentAction?: string
  details?: string
  progress?: number
  className?: string
}

/**
 * Status colors and icons mapping
 */
const statusConfig = {
  [SubmissionState.NotSubmitted]: {
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    icon: Clock,
    label: 'Not Submitted',
    description: 'Ready for submission'
  },
  [SubmissionState.Pending]: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Loader2,
    label: 'Pending',
    description: 'Submission in progress'
  },
  [SubmissionState.Submitting]: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Send,
    label: 'Submitting',
    description: 'Currently being submitted'
  },
  [SubmissionState.Submitted]: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2,
    label: 'Submitted',
    description: 'Successfully submitted'
  },
  [SubmissionState.Failed]: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Failed',
    description: 'Submission failed'
  },
  [SubmissionState.PartiallySubmitted]: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    label: 'Partial',
    description: 'Some orders failed'
  }
}

/**
 * Size configurations
 */
const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    text: 'text-xs',
    badge: 'text-xs px-1.5 py-0.5',
    spacing: 'space-x-1'
  },
  md: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    badge: 'text-sm px-2 py-1',
    spacing: 'space-x-2'
  },
  lg: {
    icon: 'h-5 w-5',
    text: 'text-base',
    badge: 'text-base px-3 py-1.5',
    spacing: 'space-x-2'
  }
}

/**
 * Basic status indicator component
 */
export function StatusIndicator({ 
  state, 
  size = 'md', 
  showLabel = true,
  showTooltip = true,
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[state]
  const sizeClasses = sizeConfig[size]
  const Icon = config.icon

  const indicator = (
    <div className={cn(
      'flex items-center',
      sizeClasses.spacing,
      className
    )}>
      <Icon 
        className={cn(
          sizeClasses.icon,
          config.color,
          state === SubmissionState.Pending || state === SubmissionState.Submitting 
            ? 'animate-spin' : ''
        )} 
      />
      {showLabel && (
        <span className={cn(sizeClasses.text, config.color)}>
          {config.label}
        </span>
      )}
    </div>
  )

  if (showTooltip) {
    return (
      <HelpTooltip content={config.description}>
        {indicator}
      </HelpTooltip>
    )
  }

  return indicator
}

/**
 * Status badge component
 */
export function StatusBadge({ 
  state, 
  size = 'md',
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[state]
  const sizeClasses = sizeConfig[size]
  const Icon = config.icon

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center space-x-1',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses.badge,
        className
      )}
    >
      <Icon 
        className={cn(
          sizeClasses.icon,
          state === SubmissionState.Pending || state === SubmissionState.Submitting 
            ? 'animate-spin' : ''
        )} 
      />
      <span>{config.label}</span>
    </Badge>
  )
}

/**
 * Progress indicator with customizable appearance
 */
export function ProgressIndicator({
  current,
  total,
  label,
  showPercentage = true,
  showCounts = true,
  size = 'md',
  variant = 'default',
  className
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  const sizeClasses = sizeConfig[size]

  const variantConfig = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  }

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage || showCounts) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className={cn('font-medium', sizeClasses.text)}>
              {label}
            </span>
          )}
          <div className="flex items-center space-x-2">
            {showCounts && (
              <span className={cn('text-slate-600', sizeClasses.text)}>
                {current.toLocaleString()} / {total.toLocaleString()}
              </span>
            )}
            {showPercentage && (
              <span className={cn('font-medium', sizeClasses.text)}>
                {percentage}%
              </span>
            )}
          </div>
        </div>
      )}
      <Progress 
        value={percentage} 
        className={cn(
          size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3',
          className,
          variantConfig[variant]
        )}
      />
    </div>
  )
}

/**
 * Batch progress indicator with detailed feedback
 */
export function BatchProgressIndicator({
  currentBatch,
  totalBatches,
  currentItem,
  currentProgress,
  totalProgress,
  estimatedTimeRemaining,
  throughput,
  className
}: BatchProgressProps) {
  const batchPercentage = totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0
  const overallPercentage = totalProgress || batchPercentage

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const formatThroughput = (rate: number) => {
    if (rate < 1) return `${(rate * 60).toFixed(1)}/min`
    return `${rate.toFixed(1)}/sec`
  }

  return (
    <div className={cn('space-y-3 p-4 bg-slate-50 rounded-lg border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-slate-900">
            Processing Batch {currentBatch} of {totalBatches}
          </span>
        </div>
        {estimatedTimeRemaining && (
          <div className="flex items-center space-x-1 text-sm text-slate-600">
            <Clock className="h-3 w-3" />
            <span>{formatTime(estimatedTimeRemaining)} remaining</span>
          </div>
        )}
      </div>

      {/* Current Item */}
      {currentItem && (
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Target className="h-3 w-3" />
          <span>Current: {currentItem}</span>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-2">
        {/* Batch Progress */}
        <ProgressIndicator
          current={currentBatch}
          total={totalBatches}
          label="Batch Progress"
          variant="default"
          size="sm"
        />

        {/* Overall Progress */}
        {currentProgress !== undefined && totalProgress !== undefined && (
          <ProgressIndicator
            current={currentProgress}
            total={totalProgress}
            label="Overall Progress"
            variant="success"
            size="sm"
          />
        )}
      </div>

      {/* Statistics */}
      {throughput && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>Throughput: {formatThroughput(throughput)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3" />
            <span>{overallPercentage}% Complete</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Order status summary component
 */
export function OrderStatusSummary({
  totalOrders,
  submittedOrders,
  failedOrders,
  pendingOrders,
  size = 'md',
  className
}: OrderStatusSummaryProps) {
  const sizeClasses = sizeConfig[size]

  const statusItems = [
    {
      label: 'Total',
      count: totalOrders,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100'
    },
    {
      label: 'Submitted',
      count: submittedOrders,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Failed',
      count: failedOrders,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      label: 'Pending',
      count: pendingOrders,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ].filter(item => item.count > 0)

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {statusItems.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center space-x-1 px-2 py-1 rounded-md',
            item.bgColor,
            sizeClasses.text
          )}
        >
          <span className={item.color}>{item.label}:</span>
          <span className={cn('font-medium', item.color)}>
            {item.count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Real-time feedback indicator
 */
export function RealTimeFeedback({
  isActive,
  currentAction,
  details,
  progress,
  className
}: RealTimeFeedbackProps) {
  if (!isActive) return null

  return (
    <div className={cn(
      'flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg',
      className
    )}>
      <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {currentAction && (
          <div className="font-medium text-blue-900 truncate">
            {currentAction}
          </div>
        )}
        {details && (
          <div className="text-sm text-blue-700 truncate">
            {details}
          </div>
        )}
      </div>
      {progress !== undefined && (
        <div className="text-sm font-medium text-blue-900">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  )
}

/**
 * Status tooltip content generator
 */
export function getStatusTooltipContent(
  state: SubmissionState,
  additionalInfo?: {
    submittedAt?: Date
    errorMessage?: string
    orderCount?: number
    retryCount?: number
  }
): React.ReactNode {
  const config = statusConfig[state]
  
  return (
    <div className="space-y-2">
      <div className="font-medium">{config.label}</div>
      <div className="text-sm text-slate-600">{config.description}</div>
      
      {additionalInfo && (
        <div className="space-y-1 text-xs">
          {additionalInfo.orderCount && (
            <div>Orders: {additionalInfo.orderCount}</div>
          )}
          {additionalInfo.submittedAt && (
            <div>
              Submitted: {additionalInfo.submittedAt.toLocaleString()}
            </div>
          )}
          {additionalInfo.errorMessage && (
            <div className="text-red-600">
              Error: {additionalInfo.errorMessage}
            </div>
          )}
          {additionalInfo.retryCount && additionalInfo.retryCount > 0 && (
            <div>Retries: {additionalInfo.retryCount}</div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Animated status transition component
 */
export function AnimatedStatusIndicator({
  previousState,
  currentState,
  size = 'md',
  className
}: {
  previousState?: SubmissionState
  currentState: SubmissionState
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {previousState && previousState !== currentState && (
        <div className="absolute inset-0 animate-ping">
          <StatusIndicator
            state={previousState}
            size={size}
            showLabel={false}
            showTooltip={false}
          />
        </div>
      )}
      <StatusIndicator
        state={currentState}
        size={size}
        showTooltip={true}
      />
    </div>
  )
} 