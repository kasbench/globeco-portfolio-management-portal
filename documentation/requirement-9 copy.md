# Requirement 9 - Add POST Transactions API

## Goal
Add a backend API to post transactions.  The front-end functionality will be built in a later enhancement.  This enhancement covers the backend API, which must run on the server.

## Requirements

POST /api/transactions

This is a pass through from this service to the GlobeCo Portfolio Accounting Service.  When this service receives a POST to /api/transactions, it POSTs to http://globeco-portfolio-accounting-service:8087/api/v1/transactions with the same payload it receives.  It then returns the same response object and status code received from the POST to the Portfolio Accounting Service.  This service is a simple proxy of the POST transactions API.

See the [GlobeCo Portfolio Accounting Service API Guide](globeco-portfolio-accounting-service-openapi.yaml)

Sample Request DTO:

```json
[
    {
        "portfolioId": "6875996f6ba8d303aac5f22b", "price": 1, 
        "quantity": 2949185, 
        "sourceId": "6f69880c-cb8a-42d9-9fca-6644865bb0ae", "transactionDate": "20250808", "transactionType": "DEP"
    }
]
```


Sample Response DTO:

```json
{
    "successful": [
        {
            "id": 16567,
            "portfolioId": "6875996f6ba8d303aac5f22b",
            "sourceId": "6f69880c-cb8a-42d9-9fca-6644865bb0ae",
            "status": "PROC",
            "transactionType": "DEP",
            "quantity": "2949185",
            "price": "1",
            "transactionDate": "20250808",
            "reprocessingAttempts": 0,
            "version": 2
        }
    ],
    "failed": null,
    "summary": {
        "totalRequested": 1,
        "successful": 1,
        "failed": 0,
        "successRate": 100
    }
}
```

Error handling should be consistent with the Portfolio Accounting Service API and the other APIs in this service

Resiliency, retries, and other failure scenarios should be consistent with other APIs in this service.
