# Enhanced Trade Submission API Documentation

## Overview

This document provides technical details for the Enhanced Trade Submission API integration, including endpoints, data structures, error handling, and implementation patterns.

## API Endpoints

### Destinations API

#### Get All Destinations
```http
GET /api/v1/destinations
```

**Response:**
```typescript
interface DestinationResponseDTO {
  id: number;
  abbreviation: string;
  description: string;
  version: number;
}

type Response = DestinationResponseDTO[];
```

**Example Response:**
```json
[
  {
    "id": 1,
    "abbreviation": "NYSE",
    "description": "New York Stock Exchange",
    "version": 1
  },
  {
    "id": 2,
    "abbreviation": "NASDAQ",
    "description": "NASDAQ Stock Market",
    "version": 1
  }
]
```

**Error Handling:**
- `500`: Server error - destinations service unavailable
- `404`: Destinations not found
- Network errors handled with retry logic

### Batch Submit API

#### Submit Trade Orders Batch
```http
POST /api/v1/tradeOrders/batch/submit
```

**Request Body:**
```typescript
interface BatchSubmitRequestDTO {
  submissions: TradeOrderSubmission[];
}

interface TradeOrderSubmission {
  tradeOrderId: number;
  quantity: number;
  destinationId: number;
}
```

**Example Request:**
```json
{
  "submissions": [
    {
      "tradeOrderId": 151,
      "quantity": 100,
      "destinationId": 1
    },
    {
      "tradeOrderId": 152,
      "quantity": 50,
      "destinationId": 2
    }
  ]
}
```

**Response:**
```typescript
interface BatchSubmitResponseDTO {
  status: string;
  message: string;
  totalRequested: number;
  successful: number;
  failed: number;
  results?: BatchOperationResultDTO[];
}

interface BatchOperationResultDTO {
  orderId: number;
  success: boolean;
  id?: number;
  message: string;
  errorCode?: string;
}
```

**Example Response:**
```json
{
  "status": "SUCCESS",
  "message": "All 2 trade orders submitted successfully",
  "totalRequested": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "orderId": 151,
      "success": true,
      "id": 151,
      "message": "Trade order submitted successfully"
    },
    {
      "orderId": 152,
      "success": true,
      "id": 152,
      "message": "Trade order submitted successfully"
    }
  ]
}
```

**Error Handling:**
- `400`: Bad request - invalid submission data
- `404`: Trade order not found
- `409`: Conflict - trade order already submitted
- `422`: Validation error - quantity exceeds available amount
- `500`: Server error

## Client-Side Implementation

### Service Layer

#### TradeService Integration
```typescript
class TradeService {
  // Destinations
  async getDestinations(): Promise<DestinationResponseDTO[]> {
    const response = await this.api.get<DestinationResponseDTO[]>('/api/v1/destinations');
    return response.data;
  }

  // Batch Submit
  async submitTradeOrdersBatch(request: BatchSubmitRequestDTO): Promise<BatchSubmitResponseDTO> {
    this.validateBatchSubmission(request);
    const response = await this.api.post<BatchSubmitResponseDTO>(
      '/api/v1/tradeOrders/batch/submit', 
      request
    );
    return response.data;
  }

  // Validation
  private validateBatchSubmission(request: BatchSubmitRequestDTO): void {
    if (!request.submissions || !Array.isArray(request.submissions)) {
      throw new Error('Submissions array is required');
    }
    if (request.submissions.length === 0) {
      throw new Error('At least one submission is required');
    }
    if (request.submissions.length > 100) {
      throw new Error('Maximum 100 submissions allowed per batch');
    }
    for (const submission of request.submissions) {
      this.validateSubmission(submission);
    }
  }

  private validateSubmission(submission: TradeOrderSubmission): void {
    if (!submission.tradeOrderId || submission.tradeOrderId <= 0) {
      throw new Error('Valid trade order ID is required');
    }
    if (!submission.quantity || submission.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (!submission.destinationId || submission.destinationId <= 0) {
      throw new Error('Valid destination ID is required');
    }
  }
}
```

### React Hooks

#### useDestinations Hook
```typescript
interface UseDestinationsResult {
  destinations: DestinationResponseDTO[];
  destinationOptions: DestinationOption[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getCachedDestinations: () => DestinationResponseDTO[] | null;
  clearDestinationCache: () => void;
}

export function useDestinations(): UseDestinationsResult {
  // Implementation with 5-minute cache TTL
  // Error handling and retry logic
  // Formatted options for UI consumption
}
```

#### useTradeSubmission Hook
```typescript
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
  getValidationSummary: () => ValidationSummary;
  
  // Submission
  submitBatch: () => Promise<BatchSubmitResponseDTO>;
}

export function useTradeSubmission(
  tradeOrders: TradeOrderEnhancedResponseDTO[],
  defaultDestinationId?: number
): UseTradeSubmissionReturn {
  // Complex state management
  // Validation logic
  // API integration
}
```

### Data Transformation

#### Submission Data Creation
```typescript
function createSubmissionData(
  tradeOrder: TradeOrderEnhancedResponseDTO,
  quantity: number,
  destinationId: number
): TradeOrderSubmissionData {
  return {
    tradeOrder,
    quantity,
    destinationId,
    remainingQuantity: calculateRemainingQuantity(tradeOrder),
    validationResult: validateSubmissionQuantity(quantity, tradeOrder)
  };
}

function calculateRemainingQuantity(tradeOrder: TradeOrderEnhancedResponseDTO): number {
  return Math.max(0, tradeOrder.quantity - tradeOrder.quantitySent);
}

function validateSubmissionQuantity(
  quantity: number, 
  tradeOrder: TradeOrderEnhancedResponseDTO
): SubmissionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  const remaining = calculateRemainingQuantity(tradeOrder);
  if (quantity > remaining) {
    errors.push(`Quantity cannot exceed remaining amount (${remaining})`);
  }
  
  if (quantity > remaining * 0.9 && quantity < remaining) {
    warnings.push('Submitting less than 90% of remaining quantity');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Error Handling Patterns

#### API Error Handling
```typescript
// Service layer error handling
try {
  const response = await tradeService.submitTradeOrdersBatch(request);
  return response;
} catch (error) {
  if (error.response?.status === 422) {
    throw new Error('Validation failed: ' + error.response.data.message);
  } else if (error.response?.status === 409) {
    throw new Error('Some orders are already submitted');
  } else if (error.response?.status >= 500) {
    throw new Error('Server error. Please try again later.');
  } else {
    throw new Error('Failed to submit trade orders');
  }
}

// Component error handling
const handleSubmit = async () => {
  try {
    setLoading(true);
    const result = await submitBatch();
    // Handle success
  } catch (error) {
    setError(error.message);
    // Show error state
  } finally {
    setLoading(false);
  }
};
```

#### Validation Error Display
```typescript
// Real-time validation feedback
const getFieldValidation = (tradeOrderId: number) => {
  const submission = getSubmissionForOrder(tradeOrderId);
  if (!submission) return { isValid: true, errors: [] };
  
  const validation = validateSubmissionQuantity(submission.quantity, tradeOrder);
  return {
    isValid: validation.isValid,
    errors: validation.errors,
    className: validation.isValid ? 'border-green-300' : 'border-red-300'
  };
};
```

## Performance Optimizations

### Caching Strategy

#### Destinations Caching
```typescript
// 5-minute TTL cache implementation
const DESTINATIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DestinationsCache {
  private cache: CacheEntry<DestinationResponseDTO[]> | null = null;

  get(key: string): DestinationResponseDTO[] | null {
    if (!this.cache) return null;
    
    const age = Date.now() - this.cache.timestamp;
    if (age > DESTINATIONS_CACHE_TTL) {
      this.cache = null;
      return null;
    }
    
    return this.cache.data;
  }

  set(key: string, data: DestinationResponseDTO[]): void {
    this.cache = {
      data,
      timestamp: Date.now()
    };
  }

  clear(): void {
    this.cache = null;
  }
}
```

#### State Management Optimization
```typescript
// Optimized state updates for large datasets
const setSubmissionQuantity = useCallback((tradeOrderId: number, quantity: number) => {
  setSubmissions(prev => ({
    ...prev,
    [tradeOrderId]: {
      ...prev[tradeOrderId],
      quantity
    }
  }));
}, []);

// Memoized calculations
const submissionData = useMemo(() => 
  createSubmissionSummary(submissions, destinations),
  [submissions, destinations]
);
```

### Batch Processing

#### Efficient API Calls
```typescript
// Batch submissions with proper error handling
async function submitBatch(submissions: TradeOrderSubmission[]): Promise<BatchSubmitResponseDTO> {
  // Validate before sending
  const validation = validateBatchSubmissionData(submissions);
  if (!validation.isValid) {
    throw new Error('Validation failed: ' + validation.errors.join(', '));
  }
  
  // Submit in batches of max 100
  const batchSize = 100;
  const batches = chunk(submissions, batchSize);
  
  const results = await Promise.allSettled(
    batches.map(batch => tradeService.submitTradeOrdersBatch({ submissions: batch }))
  );
  
  // Aggregate results
  return aggregateBatchResults(results);
}
```

## Testing Strategies

### Unit Testing

#### Service Layer Tests
```typescript
describe('TradeService', () => {
  describe('getDestinations', () => {
    it('should fetch destinations successfully', async () => {
      const mockDestinations = [
        { id: 1, abbreviation: 'NYSE', description: 'New York Stock Exchange', version: 1 }
      ];
      
      mockApi.get.mockResolvedValue({ data: mockDestinations });
      
      const result = await tradeService.getDestinations();
      
      expect(result).toEqual(mockDestinations);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/destinations');
    });
  });
  
  describe('submitTradeOrdersBatch', () => {
    it('should validate and submit batch successfully', async () => {
      const request = {
        submissions: [
          { tradeOrderId: 1, quantity: 100, destinationId: 1 }
        ]
      };
      
      const expectedResponse = {
        status: 'SUCCESS',
        message: 'All 1 trade orders submitted successfully',
        totalRequested: 1,
        successful: 1,
        failed: 0
      };
      
      mockApi.post.mockResolvedValue({ data: expectedResponse });
      
      const result = await tradeService.submitTradeOrdersBatch(request);
      
      expect(result).toEqual(expectedResponse);
    });
  });
});
```

#### Hook Testing
```typescript
describe('useTradeSubmission', () => {
  it('should manage submission state correctly', () => {
    const tradeOrders = [
      { id: 1, quantity: 1000, quantitySent: 500 } as TradeOrderEnhancedResponseDTO
    ];
    
    const { result } = renderHook(() => useTradeSubmission(tradeOrders));
    
    act(() => {
      result.current.setSubmissionQuantity(1, 100);
      result.current.setSubmissionDestination(1, 1);
    });
    
    const submissionData = result.current.getSubmissionData();
    expect(submissionData).toHaveLength(1);
    expect(submissionData[0].quantity).toBe(100);
    expect(submissionData[0].destinationId).toBe(1);
  });
});
```

### Integration Testing

#### Component Integration
```typescript
describe('TradeSubmissionModal Integration', () => {
  it('should complete full submission workflow', async () => {
    const mockTradeOrders = [
      { id: 1, quantity: 1000, quantitySent: 0 }
    ];
    
    const mockDestinations = [
      { id: 1, abbreviation: 'NYSE', description: 'New York Stock Exchange', version: 1 }
    ];
    
    // Mock API calls
    mockTradeService.getDestinations.mockResolvedValue(mockDestinations);
    mockTradeService.submitTradeOrdersBatch.mockResolvedValue({
      status: 'SUCCESS',
      successful: 1,
      failed: 0
    });
    
    render(
      <TradeSubmissionModal
        open={true}
        onOpenChange={jest.fn()}
        tradeOrders={mockTradeOrders}
        onSubmissionComplete={jest.fn()}
      />
    );
    
    // Configure submission
    await userEvent.type(screen.getByTestId('quantity-input-1'), '500');
    await userEvent.selectOptions(screen.getByTestId('destination-select-1'), '1');
    
    // Proceed to review
    await userEvent.click(screen.getByText('Next'));
    
    // Submit
    await userEvent.click(screen.getByText('Submit'));
    
    // Verify API call
    expect(mockTradeService.submitTradeOrdersBatch).toHaveBeenCalledWith({
      submissions: [{ tradeOrderId: 1, quantity: 500, destinationId: 1 }]
    });
  });
});
```

## Security Considerations

### Input Validation
- **Client-side**: Immediate feedback and UX improvement
- **Server-side**: Authoritative validation and security
- **Sanitization**: Prevent injection attacks
- **Type checking**: TypeScript compile-time safety

### Authentication & Authorization
- **Session management**: Handle expired sessions gracefully
- **Permission checks**: Verify user can submit specific orders
- **Role-based access**: Restrict features based on user roles
- **Audit logging**: Track submission attempts and results

### Data Protection
- **Sensitive data**: Avoid logging sensitive information
- **Network security**: HTTPS for all API communications
- **CORS policies**: Proper cross-origin resource sharing
- **Rate limiting**: Prevent abuse of batch submission endpoints

## Monitoring & Observability

### Metrics to Track
- **Submission success rates**: Overall and per-destination
- **API response times**: Performance monitoring
- **User adoption**: Feature usage analytics
- **Error rates**: Track and alert on failures

### Logging Strategy
- **Structured logging**: JSON format for easy parsing
- **Correlation IDs**: Track requests across services
- **Performance logs**: Timing for optimization
- **Error context**: Sufficient detail for debugging

### Health Checks
- **API endpoints**: Monitor service availability
- **Cache performance**: Track hit/miss ratios
- **User experience**: Real user monitoring
- **Error boundaries**: Graceful degradation tracking 