# POST /api/rebalances/submit-positions API Specification

## Overview

The `POST /api/rebalances/submit-positions` endpoint is a Portal API that transforms rebalance positions into orders and submits them to the downstream Order Service. This endpoint handles the complete workflow from position validation to order submission with comprehensive error handling and retry logic.

## API Endpoint Details

**Endpoint**: `POST /api/rebalances/submit-positions`  
**File**: `src/app/api/rebalances/submit-positions/route.ts`  
**Purpose**: Submit rebalance positions as orders to the Order Service  
**Authentication**: Server-side only (not accessible from client-side code)

## Request Format

### Request Body
```json
{
  "positions": [
    {
      "security_id": "string",
      "price": 100.50,
      "original_quantity": 1000,
      "adjusted_quantity": 1200,
      "original_position_market_value": 100500.00,
      "adjusted_position_market_value": 120600.00,
      "target": 0.05,
      "high_drift": 0.02,
      "low_drift": 0.02,
      "actual": 0.048,
      "actual_drift": -0.002,
      "transaction_type": "BUY",
      "trade_quantity": 200,
      "isEligibleForSubmission": true
    }
  ],
  "portfolioId": "string (max 24 chars)"
}
```

### Request Validation
- `positions`: Required array of position objects
- `portfolioId`: Required string, maximum 24 characters
- Each position must have valid `transaction_type` ("BUY" or "SELL")
- `trade_quantity` must not be zero for eligible positions

## Processing Flow

### 1. Request Validation
```typescript
// Validate request body
if (!positions || !Array.isArray(positions) || !portfolioId) {
  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
}
```

### 2. Position Eligibility Filtering
The system filters positions based on eligibility criteria:

**Eligibility Rules**:
- `transaction_type` must be "BUY" or "SELL" (not "HOLD")
- `trade_quantity` must not equal zero
- `security_id` must be present

**Implementation**:
```typescript
// From orderMapping.ts
export function validateOrderEligibility(position: RebalancePositionWithSubmission): OrderEligibilityResult {
  const reasons: string[] = []
  
  if (position.transaction_type !== 'BUY' && position.transaction_type !== 'SELL') {
    reasons.push(`Transaction type '${position.transaction_type}' is not eligible`)
  }
  
  if (position.trade_quantity === 0) {
    reasons.push('Trade quantity is zero')
  }
  
  if (!position.security_id) {
    reasons.push('Security ID is missing')
  }
  
  return {
    isEligible: reasons.length === 0,
    reasons,
    warnings: []
  }
}
```

### 3. DTO Transformation: Position → Order

Each eligible position is transformed into an `OrderPostDTO`:

**Mapping Rules**:
```typescript
// From orderMapping.ts
export function mapPositionToOrder(
  position: RebalancePositionWithSubmission,
  portfolioId: string
): OrderPostDTO {
  return {
    blotterId: 1,                    // Default blotter ID
    statusId: 1,                     // Default status (New)
    portfolioId: portfolioId,        // From request parameter
    orderTypeId: position.transaction_type === 'BUY' ? 1 : 2, // 1=BUY, 2=SELL
    securityId: position.security_id,
    quantity: Math.abs(position.trade_quantity), // Always positive
    limitPrice: null,                // Market orders (no limit price)
    tradeOrderId: null,             // Not set initially
    orderTimestamp: new Date().toISOString(), // Current timestamp
    version: 1                       // Default version
  }
}
```

**Field Mapping Table**:

| RebalancePosition Field | OrderPostDTO Field | Transformation |
|------------------------|-------------------|----------------|
| `security_id` | `securityId` | Direct copy |
| `transaction_type` | `orderTypeId` | BUY → 1, SELL → 2 |
| `trade_quantity` | `quantity` | `Math.abs(trade_quantity)` |
| `portfolioId` (parameter) | `portfolioId` | Direct copy |
| N/A | `blotterId` | Default: 1 |
| N/A | `statusId` | Default: 1 |
| N/A | `limitPrice` | Default: null |
| N/A | `tradeOrderId` | Default: null |
| N/A | `orderTimestamp` | Current ISO timestamp |
| N/A | `version` | Default: 1 |

### 4. Batch Processing

Orders are submitted in batches to the Order Service:

**Batch Configuration**:
- **Default Batch Size**: 1,000 orders per batch
- **Environment Variable**: `ORDER_BATCH_SIZE`
- **Maximum Allowed**: 1,000 orders per API call

**Batching Logic**:
```typescript
// From orderService.ts
export const submitOrdersWithBatching = async (orders: OrderPostDTO[]) => {
  const config = getOrderServiceConfig()
  const batches: OrderPostDTO[][] = []
  
  // Split into batches of 1,000
  for (let i = 0; i < orders.length; i += config.batchSize) {
    batches.push(orders.slice(i, i + config.batchSize))
  }
  
  // Process batches sequentially
  for (let i = 0; i < batches.length; i++) {
    const result = await submitOrderBatch(batches[i])
    // Process result...
  }
}
```

### 5. Order Service API Call

**Downstream API Call**:
- **Method**: `POST`
- **URL**: `http://{ORDER_SERVICE_HOST}:{ORDER_SERVICE_PORT}/api/v1/orders`
- **Content-Type**: `application/json`
- **Timeout**: 30 seconds (configurable via `ORDER_SUBMISSION_TIMEOUT`)

**Request Body to Order Service**:
```json
[
  {
    "blotterId": 1,
    "statusId": 1,
    "portfolioId": "PORTFOLIO123",
    "orderTypeId": 1,
    "securityId": "SEC001",
    "quantity": 200,
    "limitPrice": null,
    "tradeOrderId": null,
    "orderTimestamp": "2024-01-15T10:30:00.000Z",
    "version": 1
  }
]
```

## Error Handling

### 1. Client Errors (400-level)
- **400 Bad Request**: Invalid request body, missing required fields
- **413 Payload Too Large**: Batch size exceeds 1,000 orders

### 2. Server Errors (5xx-level)
- **500 Internal Server Error**: Order Service unavailable
- **503 Service Unavailable**: Order Service overloaded

### 3. Retry Logic

**Retryable Conditions**:
- HTTP status codes: 408, 429, 500, 502, 503, 504
- Network timeouts and connection errors

**Retry Configuration**:
```typescript
retryConfig: {
  maxRetries: 3,                    // Maximum retry attempts
  retryDelay: 1000,                // Initial delay (1 second)
  backoffMultiplier: 2,            // Exponential backoff
  retryableErrorCodes: [408, 429, 500, 502, 503, 504]
}
```

**Non-Retryable Conditions**:
- **400 Bad Request**: Treated as permanent client error
- **401 Unauthorized**: Authentication issues
- **403 Forbidden**: Authorization issues
- **404 Not Found**: Resource not found

### 4. Error Response Format

**Portal API Error Response**:
```json
{
  "error": "Failed to submit rebalance positions",
  "details": "Order Service Error: System temporarily overloaded - please retry in a few minutes"
}
```

## Response Format

### Success Response
```json
{
  "totalOrders": 150,
  "successfulOrders": 148,
  "failedOrders": 2,
  "errors": [
    "Position SEC123 in portfolio PORTFOLIO456: Trade quantity is zero"
  ],
  "submittedOrderIds": [1001, 1002, 1003, ...],
  "failedPositions": []
}
```

### Error Response
```json
{
  "error": "Failed to submit rebalance positions",
  "details": "Order Service Error: System temporarily overloaded - please retry in a few minutes"
}
```

## Performance Characteristics

### Batch Processing
- **Small Portfolio** (50 positions): 1 API call, ~500ms
- **Medium Portfolio** (500 positions): 1 API call, ~2-3 seconds
- **Large Portfolio** (1,500 positions): 2 API calls, ~5-8 seconds
- **Very Large Portfolio** (5,000 positions): 5 API calls, ~15-25 seconds

### Memory Usage
- Each order: ~200 bytes
- 1,000 order batch: ~200KB
- Peak memory during processing: ~500KB per batch

### Timeout Configuration
- **Request Timeout**: 30 seconds (configurable)
- **Retry Delays**: 1s, 2s, 4s (exponential backoff)
- **Total Max Time**: ~37 seconds with retries

## Configuration

### Environment Variables
```bash
# Order Service Connection
ORDER_SERVICE_HOST=globeco-order-service
ORDER_SERVICE_PORT=8081

# Batch Processing
ORDER_BATCH_SIZE=1000
ORDER_SUBMISSION_TIMEOUT=30000

# Retry Configuration
ORDER_RETRY_MAX_ATTEMPTS=3
ORDER_RETRY_DELAY=1000
ORDER_RETRY_BACKOFF_MULTIPLIER=2

# Order Defaults
ORDER_DEFAULT_BLOTTER_ID=1
ORDER_DEFAULT_STATUS_ID=1
ORDER_BUY_TYPE_ID=1
ORDER_SELL_TYPE_ID=2
```

## Logging and Monitoring

### Request Logging
```typescript
// Request ID generation for tracking
const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Logged information
{
  requestId: "req-1759092039300-hjw86j2w5",
  url: "/api/v1/orders",
  method: "POST",
  orderCount: 150,
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Error Logging
```typescript
// Error format
{
  requestId: "req-1759092039300-hjw86j2w5",
  error: "Invalid order data: System temporarily overloaded - please retry in a few minutes",
  status: 400,
  isRetryable: false,
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

## Dependencies

### Internal Dependencies
- `src/lib/api/orderService.ts` - Order Service client
- `src/lib/utils/orderMapping.ts` - DTO transformation
- `src/lib/utils/rebalanceTransform.ts` - Data transformation
- `src/lib/config/orderServiceConfig.ts` - Configuration

### External Dependencies
- **Order Service**: `http://globeco-order-service:8081/api/v1/orders`
- **Axios**: HTTP client with retry logic
- **Next.js**: API route framework

## Security Considerations

1. **Server-Side Only**: Endpoint not accessible from client-side code
2. **Input Validation**: All request parameters validated
3. **Error Sanitization**: Internal errors not exposed to clients
4. **Request Tracking**: All requests logged with unique IDs

## Known Issues

1. **Incorrect Error Codes**: Order Service returns 400 for overload conditions (should be 503)
2. **Large Batch Impact**: 1,000 order batches may overwhelm Order Service during peak load
3. **Sequential Processing**: Batches processed sequentially, not in parallel

## Recommendations

1. **Fix Order Service Error Codes**: Change overload errors from 400 to 503
2. **Implement Circuit Breaker**: Add circuit breaker pattern for Order Service calls
3. **Add Rate Limiting**: Implement client-side rate limiting for large submissions
4. **Parallel Processing**: Consider parallel batch processing for very large datasets