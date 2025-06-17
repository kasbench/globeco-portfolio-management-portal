import { 
  TradeOrderEnhancedResponseDTO, 
  DestinationResponseDTO, 
  SubmissionValidationResult, 
  TradeOrderSubmissionData,
  SubmissionSummary,
  DestinationOption
} from '@/types/trade';

/**
 * Calculate remaining quantity for a trade order
 * 
 * Computes the amount of quantity that has not yet been submitted for execution.
 * This is used to determine the maximum quantity available for new submissions.
 * 
 * @param tradeOrder - The trade order to calculate remaining quantity for
 * @returns The remaining quantity (total - already sent)
 * 
 * @example
 * ```typescript
 * const order = { quantity: 1000, quantitySent: 300 };
 * const remaining = calculateRemainingQuantity(order); // Returns 700
 * ```
 */
export function calculateRemainingQuantity(tradeOrder: TradeOrderEnhancedResponseDTO): number {
  return tradeOrder.quantity - tradeOrder.quantitySent;
}

/**
 * Validate submission quantity against remaining quantity
 */
export function validateSubmissionQuantity(quantity: number, remaining: number): SubmissionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (quantity > remaining) {
    errors.push(`Quantity (${quantity}) cannot exceed remaining quantity (${remaining})`);
  }

  if (remaining === 0) {
    errors.push('No remaining quantity available for submission');
  }

  if (quantity === remaining && remaining > 0) {
    warnings.push('Submitting all remaining quantity');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format destination options for UI consumption
 */
export function formatDestinationOptions(destinations: DestinationResponseDTO[]): DestinationOption[] {
  return destinations.map(destination => ({
    value: destination.id,
    label: destination.abbreviation,
    description: destination.description,
    disabled: false
  }));
}

/**
 * Check if trade order is eligible for submission
 */
export function isTradeOrderSubmittable(tradeOrder: TradeOrderEnhancedResponseDTO): boolean {
  // Order must not be already submitted and must have remaining quantity
  return !tradeOrder.submitted && calculateRemainingQuantity(tradeOrder) > 0;
}

/**
 * Create submission data with validation
 */
export function createSubmissionData(
  tradeOrder: TradeOrderEnhancedResponseDTO,
  quantity: number,
  destinationId: number
): TradeOrderSubmissionData {
  const remainingQuantity = calculateRemainingQuantity(tradeOrder);
  const validationResult = validateSubmissionQuantity(quantity, remainingQuantity);

  return {
    tradeOrder,
    quantity,
    destinationId,
    remainingQuantity,
    validationResult
  };
}

/**
 * Get default submission quantity (all remaining)
 */
export function getDefaultSubmissionQuantity(tradeOrder: TradeOrderEnhancedResponseDTO): number {
  return calculateRemainingQuantity(tradeOrder);
}

/**
 * Validate all submission data in batch
 */
export function validateBatchSubmissionData(submissionData: TradeOrderSubmissionData[]): {
  isValid: boolean;
  errors: string[];
  validSubmissions: TradeOrderSubmissionData[];
  invalidSubmissions: TradeOrderSubmissionData[];
} {
  const errors: string[] = [];
  const validSubmissions: TradeOrderSubmissionData[] = [];
  const invalidSubmissions: TradeOrderSubmissionData[] = [];

  if (submissionData.length === 0) {
    errors.push('At least one submission is required');
  }

  if (submissionData.length > 100) {
    errors.push('Maximum 100 submissions allowed per batch');
  }

  submissionData.forEach((submission, index) => {
    if (submission.validationResult.isValid) {
      validSubmissions.push(submission);
    } else {
      invalidSubmissions.push(submission);
      errors.push(`Order ${submission.tradeOrder.id}: ${submission.validationResult.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0 && validSubmissions.length > 0,
    errors,
    validSubmissions,
    invalidSubmissions
  };
}

/**
 * Create submission summary for review step
 * 
 * Generates a comprehensive summary of all submissions grouped by destination
 * with validation status and statistics. Used in the review step to show
 * users exactly what will be submitted before final confirmation.
 * 
 * Features:
 * - Groups submissions by destination for clarity
 * - Includes validation summary with error/warning counts
 * - Provides total quantities and order counts
 * - Maps destination IDs to human-readable names
 * 
 * @param submissionData - Array of configured submissions to summarize
 * @param destinations - Available destinations for name mapping
 * @returns Comprehensive submission summary object
 * 
 * @example
 * ```typescript
 * const summary = createSubmissionSummary(submissions, destinations);
 * // Returns: {
 * //   totalOrders: 5,
 * //   totalQuantity: 2500,
 * //   destinations: [
 * //     { destinationId: 1, destinationName: 'NYSE', orderCount: 3, totalQuantity: 1500 }
 * //   ],
 * //   validationSummary: { validCount: 5, invalidCount: 0, warnings: [], errors: [] }
 * // }
 * ```
 */
export function createSubmissionSummary(
  submissionData: TradeOrderSubmissionData[],
  destinations: DestinationResponseDTO[]
): SubmissionSummary {
  const validation = validateBatchSubmissionData(submissionData);
  
  // Group by destination
  const destinationGroups = new Map<number, {
    destinationId: number;
    destinationName: string;
    orderCount: number;
    totalQuantity: number;
  }>();

  submissionData.forEach(submission => {
    const destination = destinations.find(d => d.id === submission.destinationId);
    const destinationName = destination?.abbreviation || `Destination ${submission.destinationId}`;
    
    if (!destinationGroups.has(submission.destinationId)) {
      destinationGroups.set(submission.destinationId, {
        destinationId: submission.destinationId,
        destinationName,
        orderCount: 0,
        totalQuantity: 0
      });
    }
    
    const group = destinationGroups.get(submission.destinationId)!;
    group.orderCount++;
    group.totalQuantity += submission.quantity;
  });

  const totalQuantity = submissionData.reduce((sum, submission) => sum + submission.quantity, 0);

  return {
    totalOrders: submissionData.length,
    totalQuantity,
    destinations: Array.from(destinationGroups.values()),
    validationSummary: {
      validCount: validation.validSubmissions.length,
      invalidCount: validation.invalidSubmissions.length,
      warnings: validation.validSubmissions.flatMap(s => s.validationResult.warnings),
      errors: validation.errors
    }
  };
}

/**
 * Get submission statistics for display
 */
export function getSubmissionStatistics(submissionData: TradeOrderSubmissionData[]): {
  totalOrders: number;
  totalQuantity: number;
  totalRemainingQuantity: number;
  averageQuantityPerOrder: number;
  uniqueDestinations: number;
} {
  const totalOrders = submissionData.length;
  const totalQuantity = submissionData.reduce((sum, s) => sum + s.quantity, 0);
  const totalRemainingQuantity = submissionData.reduce((sum, s) => sum + s.remainingQuantity, 0);
  const uniqueDestinations = new Set(submissionData.map(s => s.destinationId)).size;
  const averageQuantityPerOrder = totalOrders > 0 ? totalQuantity / totalOrders : 0;

  return {
    totalOrders,
    totalQuantity,
    totalRemainingQuantity,
    averageQuantityPerOrder,
    uniqueDestinations
  };
} 