# Requirement 8: Enhance Rebalance DTO

The POST /api/models/{id}/rebalance API currently returns the following response:

**Response:**
```json
{
  "success": true,
  "message": "Rebalance triggered successfully"
}
```

We need to enhance the resonse to support stress testing the application.  The new Response should be:

**Response:**
```json
{
  "success": true,
  "message": "Rebalance triggered successfully",
  "rebalance_ids": ["string"]
}
```

The rebalance IDs come from the call this API makes to the Order Generation Service (POST /api/v1/model/{model_id}/rebalance), which returns: 

```
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
Extract the list of rebalance_ids from this reponse.

There should be no change to the Portal UI.  It should ignore this extra data.

Please modify any tests this will break.

Because of the dependencies, I will deploy to Kubernetes and perform integration testing manually.

