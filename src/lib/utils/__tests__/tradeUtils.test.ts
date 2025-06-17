import { describe, it, expect } from 'vitest';
import {
  calculateRemainingQuantity,
  validateSubmissionQuantity,
  formatDestinationOptions,
  isTradeOrderSubmittable,
  createSubmissionData,
  getDefaultSubmissionQuantity,
  validateBatchSubmissionData
} from '../tradeUtils';
import { TradeOrderEnhancedResponseDTO, DestinationResponseDTO, TradeOrderSubmissionData } from '@/types/trade';

describe('tradeUtils', () => {
  const mockTradeOrder: TradeOrderEnhancedResponseDTO = {
    id: 1,
    orderId: 100,
    orderType: 'BUY',
    quantity: 100,
    quantitySent: 30,
    portfolioId: 'portfolio-1',
    securityId: 'security-1',
    blotterId: 1,
    blotterAbbreviation: 'EQ',
    limitPrice: 50.00,
    tradeTimestamp: '2024-01-01T10:00:00Z',
    submitted: false,
    version: 1,
    portfolio: {
      name: 'Test Portfolio',
      portfolioId: 'portfolio-1'
    },
    security: {
      ticker: 'AAPL',
      securityId: 'security-1'
    }
  };

  const mockDestinations: DestinationResponseDTO[] = [
    {
      id: 1,
      abbreviation: 'NYSE',
      description: 'New York Stock Exchange',
      version: 1
    },
    {
      id: 2,
      abbreviation: 'NASDAQ',
      description: 'NASDAQ Stock Market',
      version: 1
    }
  ];

  describe('calculateRemainingQuantity', () => {
    it('should calculate remaining quantity correctly', () => {
      const result = calculateRemainingQuantity(mockTradeOrder);
      expect(result).toBe(70); // 100 - 30
    });

    it('should handle zero quantity sent', () => {
      const order = { ...mockTradeOrder, quantitySent: 0 };
      const result = calculateRemainingQuantity(order);
      expect(result).toBe(100);
    });

    it('should handle fully sent orders', () => {
      const order = { ...mockTradeOrder, quantitySent: 100 };
      const result = calculateRemainingQuantity(order);
      expect(result).toBe(0);
    });
  });

  describe('validateSubmissionQuantity', () => {
    it('should validate correct quantity', () => {
      const result = validateSubmissionQuantity(50, 70);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject zero quantity', () => {
      const result = validateSubmissionQuantity(0, 70);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be greater than 0');
    });

    it('should reject negative quantity', () => {
      const result = validateSubmissionQuantity(-10, 70);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be greater than 0');
    });

    it('should reject quantity exceeding remaining', () => {
      const result = validateSubmissionQuantity(80, 70);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity (80) cannot exceed remaining quantity (70)');
    });

    it('should handle zero remaining quantity', () => {
      const result = validateSubmissionQuantity(10, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No remaining quantity available for submission');
    });

    it('should warn when submitting all remaining', () => {
      const result = validateSubmissionQuantity(70, 70);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Submitting all remaining quantity');
    });
  });

  describe('formatDestinationOptions', () => {
    it('should format destinations for UI consumption', () => {
      const result = formatDestinationOptions(mockDestinations);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        value: 1,
        label: 'NYSE',
        description: 'New York Stock Exchange'
      });
      expect(result[1]).toEqual({
        value: 2,
        label: 'NASDAQ',
        description: 'NASDAQ Stock Market'
      });
    });

    it('should handle empty destinations array', () => {
      const result = formatDestinationOptions([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('isTradeOrderSubmittable', () => {
    it('should return true for unsubmitted order with remaining quantity', () => {
      const result = isTradeOrderSubmittable(mockTradeOrder);
      expect(result).toBe(true);
    });

    it('should return false for submitted order', () => {
      const order = { ...mockTradeOrder, submitted: true };
      const result = isTradeOrderSubmittable(order);
      expect(result).toBe(false);
    });

    it('should return false for order with no remaining quantity', () => {
      const order = { ...mockTradeOrder, quantitySent: 100 };
      const result = isTradeOrderSubmittable(order);
      expect(result).toBe(false);
    });

    it('should return false for submitted order with no remaining quantity', () => {
      const order = { ...mockTradeOrder, submitted: true, quantitySent: 100 };
      const result = isTradeOrderSubmittable(order);
      expect(result).toBe(false);
    });
  });

  describe('createSubmissionData', () => {
    it('should create valid submission data', () => {
      const result = createSubmissionData(mockTradeOrder, 50, 1);
      expect(result.tradeOrder).toBe(mockTradeOrder);
      expect(result.quantity).toBe(50);
      expect(result.destinationId).toBe(1);
      expect(result.remainingQuantity).toBe(70);
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should create invalid submission data for invalid quantity', () => {
      const result = createSubmissionData(mockTradeOrder, 100, 1);
      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors).toContain('Quantity (100) cannot exceed remaining quantity (70)');
    });
  });

  describe('getDefaultSubmissionQuantity', () => {
    it('should return remaining quantity as default', () => {
      const result = getDefaultSubmissionQuantity(mockTradeOrder);
      expect(result).toBe(70);
    });

    it('should return zero when no remaining quantity', () => {
      const order = { ...mockTradeOrder, quantitySent: 100 };
      const result = getDefaultSubmissionQuantity(order);
      expect(result).toBe(0);
    });
  });

  describe('validateBatchSubmissionData', () => {
    const validSubmission: TradeOrderSubmissionData = {
      tradeOrder: mockTradeOrder,
      quantity: 50,
      destinationId: 1,
      remainingQuantity: 70,
      validationResult: {
        isValid: true,
        errors: [],
        warnings: []
      }
    };

    const invalidSubmission: TradeOrderSubmissionData = {
      tradeOrder: { ...mockTradeOrder, id: 2 },
      quantity: 100,
      destinationId: 1,
      remainingQuantity: 70,
      validationResult: {
        isValid: false,
        errors: ['Quantity exceeds remaining'],
        warnings: []
      }
    };

    it('should validate all valid submissions', () => {
      const result = validateBatchSubmissionData([validSubmission]);
      expect(result.isValid).toBe(true);
      expect(result.validSubmissions).toHaveLength(1);
      expect(result.invalidSubmissions).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty submission array', () => {
      const result = validateBatchSubmissionData([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one submission is required');
    });

    it('should reject too many submissions', () => {
      const manySubmissions = Array(101).fill(validSubmission);
      const result = validateBatchSubmissionData(manySubmissions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 100 submissions allowed per batch');
    });

    it('should separate valid and invalid submissions', () => {
      const result = validateBatchSubmissionData([validSubmission, invalidSubmission]);
      expect(result.isValid).toBe(false);
      expect(result.validSubmissions).toHaveLength(1);
      expect(result.invalidSubmissions).toHaveLength(1);
      expect(result.errors).toContain('Order 2: Quantity exceeds remaining');
    });

    it('should handle mixed valid and invalid submissions', () => {
      const anotherValid = { ...validSubmission, tradeOrder: { ...mockTradeOrder, id: 3 } };
      const result = validateBatchSubmissionData([validSubmission, invalidSubmission, anotherValid]);
      expect(result.isValid).toBe(false); // Because there's one invalid
      expect(result.validSubmissions).toHaveLength(2);
      expect(result.invalidSubmissions).toHaveLength(1);
    });
  });
}); 