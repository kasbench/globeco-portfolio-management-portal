# Requirement 8: Enhance Rebalance DTO

## Current State
The POST /api/models/{id}/rebalance API currently returns the following response:

**Current Response:**
```json
{
  "success": true,
  "message": "Rebalance triggered successfully"
}
```

## Required Enhancement
We need to enhance the response to support stress testing the application by including rebalance IDs. The new response should be:

**Enhanced Response:**
```json
{
  "success": true,
  "message": "Rebalance triggered successfully",
  "rebalance_ids": ["string"]
}
```

## Implementation Details

### Data Source
The rebalance IDs come from the call this API makes to the Order Generation Service (POST /api/v1/model/{model_id}/rebalance), which returns:

```json
[
  {
    "portfolio_id": "stringstringstringstring",
    "rebalance_id": "string",
    "transactions": [
      {
        "transaction_type": "BUY",
        "security_id": "stringstringstringstring",
        "quantity": 1,
        "trade_date": "2025-08-06"
      }
    ],
    "drifts": [
      {
        "security_id": "stringstringstringstring",
        "original_quantity": "string",
        "adjusted_quantity": "string",
        "target": "string",
        "high_drift": "string",
        "low_drift": "string",
        "actual": "string"
      }
    ]
  }
]
```

### Implementation Steps
1. **Extract rebalance_ids**: Parse the Order Generation Service response and extract the `rebalance_id` field from each portfolio object
2. **Transform response**: Modify the API route to return the enhanced response format with the extracted rebalance IDs
3. **Error handling**: If the Order Generation Service call fails, return the original response format to maintain backward compatibility
4. **UI compatibility**: The Portal UI should continue to work with the existing response format - the additional `rebalance_ids` field should be ignored by the frontend

### Files to Modify
- `src/app/api/models/[id]/rebalance/route.ts` - Update the response format
- Any tests that verify the current response format

### Testing Requirements
- Update any existing tests that verify the current response format
- Add tests to verify the new response format includes rebalance_ids
- Ensure backward compatibility is maintained for error cases

## Notes
- The Portal UI should ignore the additional `rebalance_ids` field and continue to function normally
- This enhancement is primarily for stress testing and monitoring purposes
- Because of the dependencies, integration testing will be performed manually in Kubernetes

