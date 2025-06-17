import { TradeOrderEnhancedResponseDTO, DestinationResponseDTO, SubmissionValidationResult, TradeOrderSubmissionData } from '@/types/trade';

/**
 * Calculate remaining quantity for a trade order
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
export function formatDestinationOptions(destinations: DestinationResponseDTO[]): Array<{ value: number; label: string; description: string }> {
  return destinations.map(destination => ({
    value: destination.id,
    label: destination.abbreviation,
    description: destination.description
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