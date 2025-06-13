// Comprehensive Help Content System for Order Submission
// Provides detailed tooltips, explanations, and guidance

import React from 'react'
import { 
  Send, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Info,
  HelpCircle,
  Zap,
  BarChart3
} from 'lucide-react'

/**
 * Help content categories
 */
export enum HelpCategory {
  SUBMISSION = 'submission',
  STATUS = 'status',
  PROGRESS = 'progress',
  ERRORS = 'errors',
  WORKFLOW = 'workflow',
  PERFORMANCE = 'performance'
}

/**
 * Help content severity levels
 */
export enum HelpSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

/**
 * Help content interface
 */
export interface HelpContent {
  id: string
  category: HelpCategory
  severity: HelpSeverity
  title: string
  description: string
  detailedExplanation?: string
  examples?: string[]
  relatedTopics?: string[]
  icon?: React.ComponentType<any>
  action?: {
    label: string
    callback: () => void
  }
}

/**
 * Help content registry
 */
export const helpContentRegistry: Record<string, HelpContent> = {
  // Submission Help Content
  'submission-overview': {
    id: 'submission-overview',
    category: HelpCategory.SUBMISSION,
    severity: HelpSeverity.INFO,
    title: 'Order Submission Process',
    description: 'Submit rebalance positions as tradable orders to the Order Service.',
    detailedExplanation: `
      The order submission process converts portfolio rebalancing recommendations into actionable orders that can be executed in the trading system. Only eligible positions (BUY/SELL with non-zero quantities) will be submitted.
    `,
    examples: [
      'Select rebalances or portfolios to submit',
      'Review the submission preview',
      'Confirm submission to Order Service',
      'Monitor progress and status'
    ],
    relatedTopics: ['order-eligibility', 'batch-processing'],
    icon: Send
  },

  'order-eligibility': {
    id: 'order-eligibility',
    category: HelpCategory.SUBMISSION,
    severity: HelpSeverity.INFO,
    title: 'Order Eligibility Criteria',
    description: 'Only positions meeting specific criteria can be submitted as orders.',
    detailedExplanation: `
      For a position to be eligible for order submission:
      • Transaction type must be "BUY" or "SELL" (not "HOLD")
      • Trade quantity must not equal zero
      • All required fields must be present and valid
    `,
    examples: [
      'BUY order with quantity 100 shares ✓',
      'SELL order with quantity 50 shares ✓',
      'HOLD position with any quantity ✗',
      'BUY order with zero quantity ✗'
    ],
    relatedTopics: ['submission-overview'],
    icon: Target
  },

  'batch-processing': {
    id: 'batch-processing',
    category: HelpCategory.SUBMISSION,
    severity: HelpSeverity.INFO,
    title: 'Batch Processing',
    description: 'Large submissions are processed in batches to ensure optimal performance.',
    detailedExplanation: `
      The system automatically splits large order submissions into batches of up to 1000 orders each. This ensures:
      • Optimal performance with large datasets
      • Better error isolation
      • Real-time progress tracking
      • Ability to continue processing if one batch fails
    `,
    examples: [
      '2500 orders → 3 batches (1000, 1000, 500)',
      'Each batch processed sequentially',
      'Progress updated after each batch',
      'Failed batches can be retried separately'
    ],
    relatedTopics: ['progress-tracking'],
    icon: BarChart3
  },

  'multi-select': {
    id: 'multi-select',
    category: HelpCategory.SUBMISSION,
    severity: HelpSeverity.INFO,
    title: 'Multi-Select Operations',
    description: 'Select multiple rebalances and portfolios for batch operations.',
    detailedExplanation: `
      Use checkboxes to select items for batch operations:
      • Individual rebalance/portfolio selection
      • "Select All" for bulk operations
      • Visual indicators show selection counts
      • Eligible order counts displayed
    `,
    examples: [
      'Select multiple rebalances for batch submission',
      'Use "Select All" to select everything',
      'Review selection summary before submitting',
      'Clear selections after successful operations'
    ],
    relatedTopics: ['submission-overview'],
    icon: CheckCircle2
  },

  // Status Help Content
  'status-not-submitted': {
    id: 'status-not-submitted',
    category: HelpCategory.STATUS,
    severity: HelpSeverity.INFO,
    title: 'Not Submitted Status',
    description: 'Position is ready for submission but has not been submitted yet.',
    detailedExplanation: `
      This status indicates that the position meets all eligibility criteria and is ready to be submitted as an order, but no submission attempt has been made yet.
    `,
    icon: Clock
  },

  'status-pending': {
    id: 'status-pending',
    category: HelpCategory.STATUS,
    severity: HelpSeverity.WARNING,
    title: 'Pending Status',
    description: 'Submission is in progress and waiting for Order Service response.',
    detailedExplanation: `
      The order has been sent to the Order Service and we are waiting for a response. This typically takes a few seconds but may take longer for large batches.
    `,
    icon: Clock
  },

  'status-submitted': {
    id: 'status-submitted',
    category: HelpCategory.STATUS,
    severity: HelpSeverity.SUCCESS,
    title: 'Submitted Status',
    description: 'Order has been successfully submitted to the Order Service.',
    detailedExplanation: `
      The order was successfully accepted by the Order Service and has been assigned an order ID. The position will be removed from the rebalance results.
    `,
    icon: CheckCircle2
  },

  'status-failed': {
    id: 'status-failed',
    category: HelpCategory.STATUS,
    severity: HelpSeverity.ERROR,
    title: 'Failed Status',
    description: 'Order submission failed and the position remains in the system.',
    detailedExplanation: `
      The Order Service rejected the order submission. Common causes include:
      • Invalid order data
      • Service temporarily unavailable
      • Network connectivity issues
      • Business rule violations
      
      The position is preserved and can be retried.
    `,
    examples: [
      'Check error message for specific details',
      'Verify order data is correct',
      'Try submitting again after fixing issues',
      'Contact support if problem persists'
    ],
    relatedTopics: ['error-recovery'],
    icon: XCircle
  },

  'status-partial': {
    id: 'status-partial',
    category: HelpCategory.STATUS,
    severity: HelpSeverity.WARNING,
    title: 'Partially Submitted',
    description: 'Some orders in the batch succeeded while others failed.',
    detailedExplanation: `
      In batch submissions, it's possible for some orders to succeed while others fail. Successfully submitted orders are processed normally, while failed orders are preserved for retry.
    `,
    examples: [
      'Batch of 100 orders: 85 succeeded, 15 failed',
      'Successful orders are removed from results',
      'Failed orders remain with error details',
      'Retry only the failed orders'
    ],
    relatedTopics: ['batch-processing', 'error-recovery'],
    icon: AlertTriangle
  },

  // Progress Help Content
  'progress-tracking': {
    id: 'progress-tracking',
    category: HelpCategory.PROGRESS,
    severity: HelpSeverity.INFO,
    title: 'Progress Tracking',
    description: 'Real-time feedback during order submission operations.',
    detailedExplanation: `
      The system provides detailed progress information during submissions:
      • Current batch and total batches
      • Items processed vs. total items
      • Estimated time remaining
      • Processing throughput
      • Current operation details
    `,
    examples: [
      'Batch 2 of 5 (40% complete)',
      'Processing 1,250 orders/second',
      'Estimated 3 minutes remaining',
      'Currently processing Portfolio ABC123'
    ],
    relatedTopics: ['batch-processing'],
    icon: BarChart3
  },

  'performance-metrics': {
    id: 'performance-metrics',
    category: HelpCategory.PERFORMANCE,
    severity: HelpSeverity.INFO,
    title: 'Performance Metrics',
    description: 'Understanding throughput and timing information.',
    detailedExplanation: `
      Performance metrics help you understand processing efficiency:
      • Throughput: Orders processed per second
      • Average time per order
      • Total elapsed time
      • Estimated completion time
      
      These metrics can help identify performance issues and optimize future submissions.
    `,
    icon: Zap
  },

  // Error Help Content
  'error-recovery': {
    id: 'error-recovery',
    category: HelpCategory.ERRORS,
    severity: HelpSeverity.WARNING,
    title: 'Error Recovery',
    description: 'Strategies for handling and recovering from submission errors.',
    detailedExplanation: `
      When submissions fail, several recovery options are available:
      • Retry individual failed orders
      • Retry entire failed batches
      • Review and fix data issues
      • Contact support for persistent problems
      
      The system preserves all failed orders for recovery attempts.
    `,
    examples: [
      'Review error message for specific cause',
      'Fix data issues before retrying',
      'Use selective retry for partial failures',
      'Monitor retry attempts for success'
    ],
    relatedTopics: ['status-failed', 'status-partial'],
    icon: AlertTriangle
  },

  'common-errors': {
    id: 'common-errors',
    category: HelpCategory.ERRORS,
    severity: HelpSeverity.ERROR,
    title: 'Common Error Scenarios',
    description: 'Typical errors and their solutions.',
    detailedExplanation: `
      Common submission errors and solutions:
      
      • HTTP 400 (Bad Request): Invalid order data
        → Review field mappings and data validation
      
      • HTTP 413 (Payload Too Large): Batch too large
        → Reduce batch size or split submission
      
      • HTTP 429 (Too Many Requests): Rate limit exceeded
        → Wait and retry with lower frequency
      
      • HTTP 500 (Server Error): Order Service issue
        → Retry after a delay or contact support
    `,
    relatedTopics: ['error-recovery'],
    icon: XCircle
  },

  // Workflow Help Content
  'workflow-overview': {
    id: 'workflow-overview',
    category: HelpCategory.WORKFLOW,
    severity: HelpSeverity.INFO,
    title: 'Submission Workflow',
    description: 'Step-by-step guide to the order submission process.',
    detailedExplanation: `
      Complete workflow for submitting orders:
      
      1. Review rebalance results and eligible positions
      2. Select rebalances/portfolios for submission
      3. Review submission preview and order counts
      4. Confirm submission to Order Service
      5. Monitor progress and status updates
      6. Handle any errors or retry failed orders
      7. Verify successful submissions and cleanup
    `,
    examples: [
      'Start with small test submissions',
      'Monitor progress during large batches',
      'Keep track of successful vs. failed orders',
      'Use retry functionality for failed submissions'
    ],
    relatedTopics: ['submission-overview', 'progress-tracking'],
    icon: HelpCircle
  }
}

/**
 * Get help content by ID
 */
export function getHelpContent(id: string): HelpContent | undefined {
  return helpContentRegistry[id]
}

/**
 * Get help content by category
 */
export function getHelpContentByCategory(category: HelpCategory): HelpContent[] {
  return Object.values(helpContentRegistry).filter(content => content.category === category)
}

/**
 * Get related help topics
 */
export function getRelatedHelpTopics(id: string): HelpContent[] {
  const content = getHelpContent(id)
  if (!content || !content.relatedTopics) return []
  
  return content.relatedTopics
    .map(topicId => getHelpContent(topicId))
    .filter((topic): topic is HelpContent => topic !== undefined)
}

/**
 * Search help content
 */
export function searchHelpContent(query: string): HelpContent[] {
  const searchTerms = query.toLowerCase().split(' ')
  
  return Object.values(helpContentRegistry).filter(content => {
    const searchableText = `
      ${content.title} 
      ${content.description} 
      ${content.detailedExplanation || ''} 
      ${content.examples?.join(' ') || ''}
    `.toLowerCase()
    
    return searchTerms.some(term => searchableText.includes(term))
  })
}

/**
 * Get contextual help for submission states
 */
export function getContextualHelp(context: {
  hasSelections?: boolean
  eligibleOrders?: number
  isSubmitting?: boolean
  hasErrors?: boolean
  progressStage?: string
}): HelpContent[] {
  const suggestions: HelpContent[] = []

  // No selections made
  if (!context.hasSelections) {
    const multiSelectHelp = getHelpContent('multi-select')
    if (multiSelectHelp) suggestions.push(multiSelectHelp)
  }

  // No eligible orders
  if (context.hasSelections && context.eligibleOrders === 0) {
    const eligibilityHelp = getHelpContent('order-eligibility')
    if (eligibilityHelp) suggestions.push(eligibilityHelp)
  }

  // Currently submitting
  if (context.isSubmitting) {
    const progressHelp = getHelpContent('progress-tracking')
    if (progressHelp) suggestions.push(progressHelp)
  }

  // Has errors
  if (context.hasErrors) {
    const errorHelp = getHelpContent('error-recovery')
    if (errorHelp) suggestions.push(errorHelp)
  }

  // Large batch processing
  if (context.eligibleOrders && context.eligibleOrders > 100) {
    const batchHelp = getHelpContent('batch-processing')
    if (batchHelp) suggestions.push(batchHelp)
  }

  return suggestions
}

/**
 * Format help content for tooltip display
 */
export function formatHelpTooltip(content: HelpContent): string {
  let result = `${content.title}\n\n${content.description}`
  
  if (content.examples && content.examples.length > 0) {
    result += '\n\nExamples:\n'
    result += content.examples.slice(0, 2).map(example => `• ${example}`).join('\n')
  }
  
  return result
}

/**
 * Get status-specific help content
 */
export function getStatusHelp(status: string): HelpContent | undefined {
  const statusHelpMap: Record<string, string> = {
    'not-submitted': 'status-not-submitted',
    'pending': 'status-pending',
    'submitting': 'status-pending',
    'submitted': 'status-submitted',
    'failed': 'status-failed',
    'partially-submitted': 'status-partial'
  }
  
  const helpId = statusHelpMap[status.toLowerCase()]
  return helpId ? getHelpContent(helpId) : undefined
}

/**
 * Get severity-based styling classes
 */
export function getSeverityClasses(severity: HelpSeverity): {
  icon: string
  text: string
  bg: string
  border: string
} {
  switch (severity) {
    case HelpSeverity.SUCCESS:
      return {
        icon: 'text-green-600',
        text: 'text-green-900',
        bg: 'bg-green-50',
        border: 'border-green-200'
      }
    case HelpSeverity.WARNING:
      return {
        icon: 'text-yellow-600',
        text: 'text-yellow-900',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200'
      }
    case HelpSeverity.ERROR:
      return {
        icon: 'text-red-600',
        text: 'text-red-900',
        bg: 'bg-red-50',
        border: 'border-red-200'
      }
    default:
      return {
        icon: 'text-blue-600',
        text: 'text-blue-900',
        bg: 'bg-blue-50',
        border: 'border-blue-200'
      }
  }
} 