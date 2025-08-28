# Requirement 11: New Passthrough APIs

This requirement is for two new passthrough APIs.  These APIs will not change the behavior of the portal client.  They will execute on the portal server.  They may be incorporated into the client at a later date.

Error handling is not required for these passthroughs, beyond passing through the response object received from the downstream service.  If the service call fails, the portal will return a 500-level error to the client.  The portal will not retry the call.

## GET /api/securities

This will be a passthrough to GET /api/v1/securities on the globeco-security-service on port 8080.  Extend the existing securityService.ts implementation.  Return the response from the call to the security service (same status code, response object, etc.)

### Sample JSON response

```json
[
  {
    "ticker": "A",
    "description": "AGILENT TECHNOLOGIES, INC.",
    "securityTypeId": "68759536672efc735e8b179c",
    "version": 1,
    "securityId": "68759537672efc735e8b179d",
    "securityType": {
      "securityTypeId": "68759536672efc735e8b179c",
      "abbreviation": "CS",
      "description": "Common Stock"
    }
  },
  {
    "ticker": "AAL",
    "description": "American Airlines Group Inc.",
    "securityTypeId": "68759536672efc735e8b179c",
    "version": 1,
    "securityId": "68759537672efc735e8b179e",
    "securityType": {
      "securityTypeId": "68759536672efc735e8b179c",
      "abbreviation": "CS",
      "description": "Common Stock"
    }
  }
]
```

## POST /api/allocations/executions/send

This will be a passthrough POST to /api/v1/executions/send on the globeco-allocation-service on port 8089.  The payload for the post will be empty (i.e., "{}").  Return the response object exactly as received from the service.



### Sample JSON response

```json
{
    "processedCount":387,
    "fileName":"transactions_20250828_145705.csv",
    "status":"success",
    "message":"Kubernetes batch job executed successfully",
    "jobName":"portfolio-cli-1756393025",
    "jobStatus":"succeeded",
    "executionMode":"kubernetes"
}
```

