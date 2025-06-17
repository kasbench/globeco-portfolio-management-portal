import { useState, useCallback, useMemo } from 'react';
import { 
  TradeOrderEnhancedResponseDTO, 
  TradeOrderSubmissionData, 
  TradeOrderSubmission,
  BatchSubmitResponseDTO 
} from '@/types/trade';
import { tradeService } from '@/lib/api/tradeService';
import { 
  createSubmissionData, 
  validateBatchSubmissionData, 
  getDefaultSubmissionQuantity,
  isTradeOrderSubmittable 
} from '@/lib/utils/tradeUtils';

interface SubmissionState {
  [tradeOrderId: number]: {
    quantity: number;
    destinationId: number | null;
  };
}

interface UseTradeSubmissionReturn {
  // State
  submissions: SubmissionState;
  loading: boolean;
  error: string | null;
  
  // Actions
  setSubmissionQuantity: (tradeOrderId: number, quantity: number) => void;
  setSubmissionDestination: (tradeOrderId: number, destinationId: number) => void;
  setAllDestinations: (destinationId: number) => void;
  setAllRemainingQuantities: () => void;
  resetSubmissions: () => void;
  
  // Validation
  getSubmissionData: () => TradeOrderSubmissionData[];
  getValidationSummary: () => {
    isValid: boolean;
    errors: string[];
    validCount: number;
    invalidCount: number;
  };
  
  // Submission
  submitBatch: () => Promise<BatchSubmitResponseDTO>;
  
  // Utils
  getSubmissionForOrder: (tradeOrderId: number) => { quantity: number; destinationId: number | null } | null;
  isOrderConfigured: (tradeOrderId: number) => boolean;
}

/**
 * Custom hook for managing trade order submission state
 * Handles individual order configuration, validation, and batch submission
 */
export function useTradeSubmission(
  tradeOrders: TradeOrderEnhancedResponseDTO[],
  defaultDestinationId?: number
): UseTradeSubmissionReturn {
  const [submissions, setSubmissions] = useState<SubmissionState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter submittable orders
  const submittableOrders = useMemo(() => 
    tradeOrders.filter(isTradeOrderSubmittable), 
    [tradeOrders]
  );

  // Initialize submissions for new orders
  const initializeSubmissions = useCallback(() => {
    const newSubmissions: SubmissionState = {};
    submittableOrders.forEach(order => {
      if (!submissions[order.id]) {
        newSubmissions[order.id] = {
          quantity: getDefaultSubmissionQuantity(order),
          destinationId: defaultDestinationId || null
        };
      } else {
        newSubmissions[order.id] = submissions[order.id];
      }
    });
    setSubmissions(newSubmissions);
  }, [submittableOrders, defaultDestinationId, submissions]);

  // Initialize on mount or when orders change
  useMemo(() => {
    initializeSubmissions();
  }, [submittableOrders]);

  const setSubmissionQuantity = useCallback((tradeOrderId: number, quantity: number) => {
    setSubmissions(prev => ({
      ...prev,
      [tradeOrderId]: {
        ...prev[tradeOrderId],
        quantity
      }
    }));
  }, []);

  const setSubmissionDestination = useCallback((tradeOrderId: number, destinationId: number) => {
    setSubmissions(prev => ({
      ...prev,
      [tradeOrderId]: {
        ...prev[tradeOrderId],
        destinationId
      }
    }));
  }, []);

  const setAllDestinations = useCallback((destinationId: number) => {
    setSubmissions(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(orderId => {
        updated[Number(orderId)] = {
          ...updated[Number(orderId)],
          destinationId
        };
      });
      return updated;
    });
  }, []);

  const setAllRemainingQuantities = useCallback(() => {
    setSubmissions(prev => {
      const updated = { ...prev };
      submittableOrders.forEach(order => {
        if (updated[order.id]) {
          updated[order.id] = {
            ...updated[order.id],
            quantity: getDefaultSubmissionQuantity(order)
          };
        }
      });
      return updated;
    });
  }, [submittableOrders]);

  const resetSubmissions = useCallback(() => {
    setSubmissions({});
    setError(null);
    initializeSubmissions();
  }, [initializeSubmissions]);

  const getSubmissionData = useCallback((): TradeOrderSubmissionData[] => {
    const submissionData: TradeOrderSubmissionData[] = [];
    
    Object.entries(submissions).forEach(([orderIdStr, submission]) => {
      const orderId = Number(orderIdStr);
      const tradeOrder = submittableOrders.find(order => order.id === orderId);
      
      if (tradeOrder && submission.destinationId !== null) {
        const data = createSubmissionData(
          tradeOrder,
          submission.quantity,
          submission.destinationId
        );
        submissionData.push(data);
      }
    });
    
    return submissionData;
  }, [submissions, submittableOrders]);

  const getValidationSummary = useCallback(() => {
    const submissionData = getSubmissionData();
    const validation = validateBatchSubmissionData(submissionData);
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      validCount: validation.validSubmissions.length,
      invalidCount: validation.invalidSubmissions.length
    };
  }, [getSubmissionData]);

  const submitBatch = useCallback(async (): Promise<BatchSubmitResponseDTO> => {
    try {
      setLoading(true);
      setError(null);
      
      const submissionData = getSubmissionData();
      const validation = validateBatchSubmissionData(submissionData);
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const apiSubmissions: TradeOrderSubmission[] = validation.validSubmissions.map(data => ({
        tradeOrderId: data.tradeOrder.id,
        quantity: data.quantity,
        destinationId: data.destinationId
      }));
      
      const response = await tradeService.submitTradeOrdersBatch({
        submissions: apiSubmissions
      });
      
      // Reset submissions on success
      if (response.successCount > 0) {
        resetSubmissions();
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit trade orders';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getSubmissionData, resetSubmissions]);

  const getSubmissionForOrder = useCallback((tradeOrderId: number) => {
    return submissions[tradeOrderId] || null;
  }, [submissions]);

  const isOrderConfigured = useCallback((tradeOrderId: number) => {
    const submission = submissions[tradeOrderId];
    return submission && 
           submission.quantity > 0 && 
           submission.destinationId !== null;
  }, [submissions]);

  return {
    // State
    submissions,
    loading,
    error,
    
    // Actions
    setSubmissionQuantity,
    setSubmissionDestination,
    setAllDestinations,
    setAllRemainingQuantities,
    resetSubmissions,
    
    // Validation
    getSubmissionData,
    getValidationSummary,
    
    // Submission
    submitBatch,
    
    // Utils
    getSubmissionForOrder,
    isOrderConfigured
  };
} 