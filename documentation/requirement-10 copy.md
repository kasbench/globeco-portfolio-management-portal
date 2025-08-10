# Requirement 10 - Add GET Rebalances API

## Goal
Add a backend API to get a single rebalance.  The front-end functionality will be built in a later enhancement.  This enhancement covers the backend API, which must run on the server.

## Requirements

GET /api/rebalances/{id}

This is a pass through from this service to the GlobeCo Order Generation Service.  When this service receives a GET to /api/rebalances/{id}, it GETS  http://globeco-order-generation-service:8088/api/v1/rebalance/{id}.  It then returns the same response object and status code received from the GET to the Order Generation Service.  This service is a simple proxy.

See the [GlobeCo Order Genration Service API Guide](globeco-order-generation-service.yaml)

Sample request

```
http://globeco-order-generation-service:8088/api/v1/rebalance/68989d590736e528af66d6a3
```

Sample Response DTO (edited for brevity):

```json
{
  "rebalance_id": "68989d590736e528af66d6a3",
  "model_id": "68989d480c54ce6407ea514b",
  "rebalance_date": "2025-08-10T13:23:37.879000",
  "model_name": "Model 290ac416-0f19-4ea1-885e-a4229759a61b",
  "number_of_portfolios": 10,
  "portfolios": [
    {
      "portfolio_id": "68989d07a711681c7aed8cb7",
      "market_value": 3852996,
      "cash_before_rebalance": 3852996,
      "cash_after_rebalance": 3852996,
      "positions": [
        {
          "security_id": "68759586672efc735e8b181d",
          "price": 106.7,
          "original_quantity": 0,
          "adjusted_quantity": 2347,
          "original_position_market_value": 0,
          "adjusted_position_market_value": 250424.9,
          "target": 0.065,
          "high_drift": 0.005,
          "low_drift": 0.005,
          "actual": 0.06499485076029148,
          "actual_drift": -0.0000792190724388941,
          "transaction_type": "BUY",
          "trade_quantity": 2347,
          "trade_date": "2025-08-10T13:23:37.877000"
        },
        {
          "security_id": "687598a3672efc735e8b199c",
          "price": 65.79,
          "original_quantity": 0,
          "adjusted_quantity": 1757,
          "original_position_market_value": 0,
          "adjusted_position_market_value": 115593.03,
          "target": 0.03,
          "high_drift": 0.005,
          "low_drift": 0.005,
          "actual": 0.030000817545619046,
          "actual_drift": 0.000027251520634851424,
          "transaction_type": "BUY",
          "trade_quantity": 1757,
          "trade_date": "2025-08-10T13:23:37.877000"
        },
  
        {
          "security_id": "68759578672efc735e8b1811",
          "price": 157.68,
          "original_quantity": 0,
          "adjusted_quantity": 71,
          "original_position_market_value": 0,
          "adjusted_position_market_value": 11195.28,
          "target": 0.03,
          "high_drift": 0.005,
          "low_drift": 0.005,
          "actual": 0.03018751112285565,
          "actual_drift": 0.006250370761854942,
          "transaction_type": "BUY",
          "trade_quantity": 71,
          "trade_date": "2025-08-10T13:23:37.878000"
        }
      ]
  
    }
  ],
  "version": 1,
  "created_at": "2025-08-10T13:23:37.879000"
}
```

Error handling should be consistent with the Portfolio Accounting Service API and the other APIs in this service

Resiliency, retries, and other failure scenarios should be consistent with other APIs in this service.
