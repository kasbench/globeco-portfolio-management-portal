# GlobeCo Portfolio Management Portal - API Guide

## Overview

The GlobeCo Portfolio Management Portal exposes a comprehensive REST API for managing portfolios, investment models, orders, executions, and trades. All endpoints are accessible at the base URL: `http://globeco.local:31510/`

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "data": { ... },
  "status": "success"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "status": "error"
}
```

## Health Check

### GET /api/health

Health check endpoint that returns system status and telemetry information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T20:40:23.379Z",
  "service": "globeco-portfolio-management-portal",
  "version": "0.1.0",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "duration": 25.5
    },
    {
      "name": "external_api", 
      "status": "healthy",
      "duration": 45.2
    },
    {
      "name": "cache",
      "status": "healthy", 
      "duration": 12.1
    }
  ],
  "telemetry": {
    "service_name": "globeco-portfolio-management-portal",
    "collector_endpoint": "http://otel-collector-collector.monitoring.svc.cluster.local:4318",
    "debug_mode": false
  }
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/health"
```

---

## Portfolios

### GET /api/portfolios

List all portfolios.

**Response:**
```json
[
  {
    "portfolioId": "portfolio-123",
    "name": "Growth Portfolio",
    "dateCreated": "2024-01-15T10:30:00Z",
    "version": 1
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/portfolios"
```

### POST /api/portfolios

Create a new portfolio.

**Request Body:**
```json
{
  "name": "New Portfolio",
  "dateCreated": "2024-01-15T10:30:00Z"
}
```

**Response:** (201 Created)
```json
{
  "portfolioId": "portfolio-456",
  "name": "New Portfolio", 
  "dateCreated": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/portfolios" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Portfolio",
    "dateCreated": "2024-01-15T10:30:00Z"
  }'
```

### GET /api/portfolios/{id}

Get a specific portfolio by ID.

**Parameters:**
- `id` (path): Portfolio ID

**Response:**
```json
{
  "portfolioId": "portfolio-123",
  "name": "Growth Portfolio",
  "dateCreated": "2024-01-15T10:30:00Z", 
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/portfolios/portfolio-123"
```

### PUT /api/portfolios/{id}

Update a portfolio.

**Parameters:**
- `id` (path): Portfolio ID

**Request Body:**
```json
{
  "portfolioId": "portfolio-123",
  "name": "Updated Portfolio Name",
  "dateCreated": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Response:**
```json
{
  "portfolioId": "portfolio-123", 
  "name": "Updated Portfolio Name",
  "dateCreated": "2024-01-15T10:30:00Z",
  "version": 2
}
```

**Sample cURL:**
```bash
curl -X PUT "http://globeco.local:31510/api/portfolios/portfolio-123" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolioId": "portfolio-123",
    "name": "Updated Portfolio Name", 
    "dateCreated": "2024-01-15T10:30:00Z",
    "version": 1
  }'
```

### DELETE /api/portfolios/{id}

Delete a portfolio.

**Parameters:**
- `id` (path): Portfolio ID
- `version` (query): Portfolio version (required)

**Response:**
```json
{
  "success": true
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/portfolios/portfolio-123?version=1"
```

---

## Investment Models

### GET /api/models

List all investment models with optional pagination and sorting.

**Query Parameters:**
- `offset` (optional): Number of records to skip
- `limit` (optional): Maximum number of records to return
- `sort_by` (optional): Field to sort by

**Response:**
```json
[
  {
    "id": "model-123",
    "name": "Conservative Growth",
    "description": "Low-risk growth strategy",
    "created_date": "2024-01-15T10:30:00Z",
    "version": 1
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/models?limit=20&offset=0&sort_by=name"
```

### POST /api/models

Create a new investment model.

**Request Body:**
```json
{
  "name": "Aggressive Growth",
  "description": "High-risk growth strategy",
  "allocation": {
    "stocks": 80,
    "bonds": 20
  }
}
```

**Response:** (201 Created)
```json
{
  "id": "model-456",
  "name": "Aggressive Growth",
  "description": "High-risk growth strategy", 
  "created_date": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/models" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aggressive Growth",
    "description": "High-risk growth strategy",
    "allocation": {
      "stocks": 80,
      "bonds": 20
    }
  }'
```

### GET /api/models/{id}

Get a specific investment model by ID.

**Parameters:**
- `id` (path): Model ID

**Response:**
```json
{
  "id": "model-123",
  "name": "Conservative Growth",
  "description": "Low-risk growth strategy",
  "created_date": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/models/model-123"
```

### PUT /api/models/{id}

Update an investment model.

**Parameters:**
- `id` (path): Model ID

**Request Body:**
```json
{
  "name": "Updated Model Name",
  "description": "Updated description",
  "version": 1
}
```

**Response:**
```json
{
  "id": "model-123",
  "name": "Updated Model Name", 
  "description": "Updated description",
  "version": 2
}
```

**Sample cURL:**
```bash
curl -X PUT "http://globeco.local:31510/api/models/model-123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Model Name",
    "description": "Updated description",
    "version": 1
  }'
```

### DELETE /api/models/{id}

Delete an investment model.

**Parameters:**
- `id` (path): Model ID

**Response:** (501 Not Implemented)
```json
{
  "error": "Delete model not implemented"
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/models/model-123"
```

---

## Orders

### GET /api/orders

List orders with optional filtering and pagination.

**Query Parameters:**
- `offset` (optional): Number of records to skip
- `limit` (optional): Maximum number of records to return
- `status` (optional): Filter by order status
- `portfolio_id` (optional): Filter by portfolio ID

**Response:**
```json
[
  {
    "id": 123,
    "portfolio_id": "portfolio-123",
    "security_id": "AAPL",
    "quantity": 100,
    "order_type": "BUY",
    "status": "PENDING",
    "created_date": "2024-01-15T10:30:00Z",
    "version": 1
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/orders?limit=20&status=PENDING"
```

### POST /api/orders

Create a new order.

**Request Body:**
```json
{
  "blotterId": 1,
  "statusId": 1,
  "portfolioId": "portfolio-123",
  "orderTypeId": 1,
  "securityId": "AAPL",
  "quantity": 100,
  "limitPrice": 150.00,
  "tradeOrderId": null,
  "orderTimestamp": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Required Fields:**
- `blotterId` (number): Must exist in database, required
- `statusId` (number): Must exist in database, required  
- `portfolioId` (string): String, maximum 24 characters, required
- `orderTypeId` (number): Must exist in database (1=BUY, 2=SELL), required
- `securityId` (string): String identifier, required
- `quantity` (number): Positive decimal number, required
- `orderTimestamp` (string): ISO 8601 format (e.g., "2024-06-01T12:00:00Z"), required
- `version` (number): Integer version number, required

**Optional Fields:**
- `limitPrice` (number): Optional positive decimal number for limit orders
- `tradeOrderId` (number): Optional trade order ID

**Response:** (201 Created)
```json
{
  "status": "SUCCESS",
  "message": "Order processed successfully",
  "totalReceived": 1,
  "successful": 1,
  "failed": 0,
  "orders": [
    {
      "orderId": 456,
      "blotterId": 1,
      "statusId": 1,
      "portfolioId": "portfolio-123",
      "orderTypeId": 1,
      "securityId": "AAPL",
      "quantity": 100,
      "limitPrice": 150.00,
      "tradeOrderId": null,
      "orderTimestamp": "2024-01-15T10:30:00Z",
      "version": 1,
      "message": "Order created successfully"
    }
  ],
  "partial": false,
  "success": true,
  "failure": false,
  "successRate": 1.0
}
```

**Field Mappings and Common Values:**

- **orderTypeId Values:**
  - `1` = BUY
  - `2` = SELL

- **Common statusId Values:**
  - `1` = NEW (default for new orders)

- **Common blotterId Values:**
  - `1` = Default blotter (check with system admin for available blotters)

- **orderTimestamp Format:**
  - Must be ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
  - Example: `"2024-01-15T10:30:00Z"`

- **version:**
  - Always use `1` for new orders

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "blotterId": 1,
    "statusId": 1,
    "portfolioId": "portfolio-123",
    "orderTypeId": 1,
    "securityId": "AAPL",
    "quantity": 100,
    "limitPrice": 150.00,
    "tradeOrderId": null,
    "orderTimestamp": "2024-01-15T10:30:00Z",
    "version": 1
  }'
```

### GET /api/orders/{id}

Get a specific order by ID.

**Parameters:**
- `id` (path): Order ID

**Response:**
```json
{
  "id": 123,
  "portfolio_id": "portfolio-123",
  "security_id": "AAPL",
  "quantity": 100,
  "order_type": "BUY", 
  "status": "PENDING",
  "created_date": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/orders/123"
```

### PUT /api/orders/{id}

Update an order.

**Parameters:**
- `id` (path): Order ID

**Request Body:**
```json
{
  "id": 123,
  "blotterId": 1,
  "statusId": 2,
  "portfolioId": "portfolio-123",
  "orderTypeId": 1,
  "securityId": "AAPL",
  "quantity": 150,
  "limitPrice": 155.00,
  "tradeOrderId": null,
  "orderTimestamp": "2024-06-01T12:00:00Z",
  "version": 1
}
```

**Response:**
```json
{
  "id": 123,
  "blotter": {
    "id": 1,
    "name": "Main Blotter",
    "version": 1
  },
  "status": {
    "id": 2,
    "abbreviation": "PENDING",
    "description": "Pending",
    "version": 1
  },
  "security": {
    "securityId": "AAPL",
    "ticker": "AAPL"
  },
  "portfolio": {
    "portfolioId": "portfolio-123",
    "name": "Portfolio 123"
  },
  "orderType": {
    "id": 1,
    "abbreviation": "BUY",
    "description": "Buy Order",
    "version": 1
  },
  "quantity": 150,
  "limitPrice": 155.00,
  "tradeOrderId": null,
  "orderTimestamp": "2024-06-01T12:00:00Z",
  "version": 2
}
```

**Sample cURL:**
```bash
curl -X PUT "http://globeco.local:31510/api/orders/123" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "blotterId": 1,
    "statusId": 2,
    "portfolioId": "portfolio-123",
    "orderTypeId": 1,
    "securityId": "AAPL",
    "quantity": 150,
    "limitPrice": 155.00,
    "tradeOrderId": null,
    "orderTimestamp": "2024-06-01T12:00:00Z",
    "version": 1
  }'
```

### DELETE /api/orders/{id}

Delete an order.

**Parameters:**
- `id` (path): Order ID
- `version` (query): Order version (required)

**Response:**
```json
{
  "success": true
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/orders/123?version=1"
```

### POST /api/orders/batch/submit

Submit multiple orders in batch.

**Request Body:**
```json
{
  "orderIds": [123, 456, 789]
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "submitted": [123, 456, 789],
  "failed": [],
  "total": 3,
  "success_count": 3,
  "failure_count": 0
}
```

**Partial Success Response:** (207 Multi-Status)
```json
{
  "status": "PARTIAL",
  "submitted": [123, 456],
  "failed": [
    {
      "orderId": 789,
      "error": "Order not found"
    }
  ],
  "total": 3,
  "success_count": 2,
  "failure_count": 1
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/orders/batch/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": [123, 456, 789]
  }'
```

---

## Executions

### GET /api/executions

List executions with optional filtering and pagination.

**Query Parameters:**
- `offset` (optional): Number of records to skip
- `limit` (optional): Maximum number of records to return
- `status` (optional): Filter by execution status
- `portfolio_id` (optional): Filter by portfolio ID
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Response:**
```json
[
  {
    "id": 123,
    "order_id": 456,
    "portfolio_id": "portfolio-123",
    "security_id": "AAPL",
    "quantity": 100,
    "executed_price": 152.50,
    "status": "EXECUTED",
    "execution_date": "2024-01-15T10:30:00Z",
    "version": 1
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/executions?limit=20&status=EXECUTED"
```

### POST /api/executions

Create a new execution.

**Request Body:**
```json
{
  "order_id": 456,
  "quantity": 100,
  "executed_price": 152.50
}
```

**Response:** (201 Created)
```json
{
  "id": 789,
  "order_id": 456,
  "quantity": 100,
  "executed_price": 152.50,
  "status": "EXECUTED",
  "execution_date": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/executions" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 456,
    "quantity": 100,
    "executed_price": 152.50
  }'
```

### GET /api/executions/{id}

Get a specific execution by ID.

**Parameters:**
- `id` (path): Execution ID

**Response:**
```json
{
  "id": 123,
  "order_id": 456,
  "portfolio_id": "portfolio-123",
  "security_id": "AAPL",
  "quantity": 100,
  "executed_price": 152.50,
  "status": "EXECUTED",
  "execution_date": "2024-01-15T10:30:00Z",
  "version": 1
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/executions/123"
```

### PUT /api/executions/{id}

Update an execution.

**Parameters:**
- `id` (path): Execution ID

**Request Body:**
```json
{
  "executed_price": 153.00,
  "version": 1
}
```

**Response:**
```json
{
  "id": 123,
  "order_id": 456,
  "quantity": 100,
  "executed_price": 153.00,
  "status": "EXECUTED",
  "version": 2
}
```

**Sample cURL:**
```bash
curl -X PUT "http://globeco.local:31510/api/executions/123" \
  -H "Content-Type: application/json" \
  -d '{
    "executed_price": 153.00,
    "version": 1
  }'
```

### DELETE /api/executions/{id}

Cancel an execution.

**Parameters:**
- `id` (path): Execution ID
- `version` (query): Execution version (required)

**Response:**
```json
{
  "id": 123,
  "status": "CANCELLED",
  "version": 2
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/executions/123?version=1"
```

### POST /api/executions/batch

Create multiple executions in batch.

**Request Body:**
```json
[
  {
    "order_id": 456,
    "quantity": 100,
    "executed_price": 152.50
  },
  {
    "order_id": 789,
    "quantity": 50,
    "executed_price": 155.00
  }
]
```

**Response:** (201 Created)
```json
[
  {
    "id": 123,
    "order_id": 456,
    "quantity": 100,
    "executed_price": 152.50,
    "status": "EXECUTED"
  },
  {
    "id": 124,
    "order_id": 789,
    "quantity": 50,
    "executed_price": 155.00,
    "status": "EXECUTED"
  }
]
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/executions/batch" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "order_id": 456,
      "quantity": 100,
      "executed_price": 152.50
    },
    {
      "order_id": 789,
      "quantity": 50,
      "executed_price": 155.00
    }
  ]'
```

### DELETE /api/executions/batch

Cancel multiple executions in batch.

**Request Body:**
```json
[
  {
    "id": 123,
    "version": 1
  },
  {
    "id": 124,
    "version": 1
  }
]
```

**Response:**
```json
[
  {
    "id": 123,
    "status": "CANCELLED",
    "version": 2
  },
  {
    "id": 124,
    "status": "CANCELLED",
    "version": 2
  }
]
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/executions/batch" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": 123,
      "version": 1
    },
    {
      "id": 124,
      "version": 1
    }
  ]'
```

### GET /api/executions/summary

Get execution summary statistics.

**Query Parameters:**
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date
- `portfolio_id` (optional): Filter by portfolio ID

**Response:**
```json
{
  "total_executions": 150,
  "total_volume": 1500000.00,
  "average_price": 152.75,
  "status_breakdown": {
    "EXECUTED": 140,
    "CANCELLED": 10
  },
  "date_range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/executions/summary?start_date=2024-01-01&end_date=2024-01-31"
```

### GET /api/executions/filter-options

Get available filter options for executions.

**Response:**
```json
{
  "statuses": ["PENDING", "EXECUTED", "CANCELLED", "FAILED"],
  "portfolios": [
    {
      "id": "portfolio-123",
      "name": "Growth Portfolio"
    }
  ],
  "securities": ["AAPL", "GOOGL", "MSFT", "TSLA"]
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/executions/filter-options"
```

---

## Trades

### GET /api/trades

List trade orders with optional filtering and pagination.

**Query Parameters:**
- Any query parameters are accepted and passed to the trade service for filtering, sorting, and pagination

**Response:**
```json
[
  {
    "id": 123,
    "blotter_id": "blotter-456",
    "security_id": "AAPL",
    "quantity": 100,
    "side": "BUY",
    "status": "PENDING",
    "created_date": "2024-01-15T10:30:00Z"
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/trades?limit=20&status=PENDING"
```

### POST /api/trades

Create a new trade order.

**Request Body:**
```json
{
  "orderId": 12345,
  "orderType": "BUY",
  "quantity": 100,
  "portfolioId": "portfolio-123",
  "securityId": "AAPL",
  "blotterId": 456,
  "limitPrice": 150.00,
  "tradeTimestamp": "2024-01-15T10:30:00Z"
}
```

**Response:** (201 Created)
```json
{
  "id": 789,
  "orderId": 12345,
  "orderType": "BUY",
  "quantity": 100,
  "quantitySent": 0,
  "portfolioId": "portfolio-123",
  "securityId": "AAPL",
  "blotterId": 456,
  "blotterAbbreviation": "EQ",
  "limitPrice": 150.00,
  "tradeTimestamp": "2024-01-15T10:30:00Z",
  "submitted": false,
  "version": 1,
  "portfolioName": "Growth Portfolio",
  "securityTicker": "AAPL",
  "portfolio": {
    "name": "Growth Portfolio",
    "portfolioId": "portfolio-123"
  },
  "security": {
    "ticker": "AAPL",
    "securityId": "AAPL"
  },
  "blotter": {
    "id": 456,
    "abbreviation": "EQ",
    "name": "Equity Blotter",
    "version": 1
  }
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/trades" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 12345,
    "orderType": "BUY",
    "quantity": 100,
    "portfolioId": "portfolio-123",
    "securityId": "AAPL",
    "blotterId": 456,
    "limitPrice": 150.00,
    "tradeTimestamp": "2024-01-15T10:30:00Z"
  }'
```

### GET /api/trades/{id}

Get a specific trade order by ID.

**Parameters:**
- `id` (path): Trade ID

**Response:**
```json
{
  "id": 123,
  "blotter_id": "blotter-456",
  "security_id": "AAPL",
  "quantity": 100,
  "side": "BUY",
  "status": "PENDING",
  "created_date": "2024-01-15T10:30:00Z"
}
```

**Error Response:** (404 Not Found)
```json
{
  "error": "Trade order not found"
}
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/trades/123"
```

### PUT /api/trades/{id}

Update a trade order.

**Parameters:**
- `id` (path): Trade ID

**Request Body:**
```json
{
  "quantity": 150,
  "price": 155.00
}
```

**Response:**
```json
{
  "id": 123,
  "blotter_id": "blotter-456",
  "security_id": "AAPL",
  "quantity": 150,
  "side": "BUY",
  "status": "PENDING",
  "price": 155.00
}
```

**Sample cURL:**
```bash
curl -X PUT "http://globeco.local:31510/api/trades/123" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 150,
    "price": 155.00
  }'
```

### DELETE /api/trades/{id}

Delete a trade order.

**Parameters:**
- `id` (path): Trade ID

**Response:** (501 Not Implemented)
```json
{
  "error": "Delete trade order not implemented"
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/trades/123"
```

## Trade Orders (Additional Endpoints)

### PUT /api/trade-orders/{id}

Update a trade order (alternative endpoint).

**Parameters:**
- `id` (path): Trade order ID

**Request Body:**
```json
{
  "quantity": 150,
  "price": 155.00
}
```

**Response:**
```json
{
  "id": 123,
  "quantity": 150,
  "price": 155.00
}
```

### DELETE /api/trade-orders/{id}

Delete a trade order (alternative endpoint).

**Parameters:**
- `id` (path): Trade order ID
- `version` (query, required): Version number for optimistic locking

**Response:**
```json
{
  "success": true
}
```

**Error Response:** (400 Bad Request)
```json
{
  "error": "Missing version parameter"
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/trade-orders/123?version=1"
```

### POST /api/trade-orders/{id}/submit

Submit an individual trade order.

**Parameters:**
- `id` (path): Trade order ID

**Request Body:**
```json
{
  "destination": "NYSE",
  "urgency": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "submission_id": "sub-789"
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/trade-orders/123/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "NYSE",
    "urgency": "normal"
  }'
```

### POST /api/trade-orders/batch/submit

Submit multiple trade orders in a batch.

**Request Body:**
```json
{
  "trade_order_ids": [123, 124, 125],
  "destination": "NYSE",
  "urgency": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "batch_id": "batch-456",
  "submitted_orders": [123, 124, 125]
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/trade-orders/batch/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "trade_order_ids": [123, 124, 125],
    "destination": "NYSE",
    "urgency": "normal"
  }'
```

---

## Rebalances

### GET /api/rebalances

List rebalances with optional pagination and sorting.

**Query Parameters:**
- `offset` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum number of records to return (default: 20)
- `sort_by` (optional): Field to sort by (default: -rebalance_date)

**Response:**
```json
[
  {
    "id": "rebalance-123",
    "portfolio_id": "portfolio-456",
    "rebalance_date": "2024-01-15T10:30:00Z",
    "status": "COMPLETED",
    "total_positions": 25,
    "version": 1
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/rebalances?limit=10&sort_by=-rebalance_date"
```

### DELETE /api/rebalances/{rebalanceId}

Delete a rebalance.

**Parameters:**
- `rebalanceId` (path): Rebalance ID
- `version` (query): Rebalance version (required)

**Response:**
```json
{
  "success": true,
  "message": "Rebalance rebalance-123 deleted"
}
```

**Sample cURL:**
```bash
curl -X DELETE "http://globeco.local:31510/api/rebalances/rebalance-123?version=1"
```

### POST /api/rebalances/submit-positions

Submit rebalance positions for order creation.

**Request Body:**
```json
{
  "portfolioId": "portfolio-123",
  "positions": [
    {
      "security_id": "AAPL",
      "transaction_type": "BUY",
      "trade_quantity": 100,
      "target_weight": 0.15
    },
    {
      "security_id": "GOOGL",
      "transaction_type": "SELL",
      "trade_quantity": 50,
      "target_weight": 0.10
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "orders_created": 2,
  "failed_positions": [],
  "order_ids": [123, 124]
}
```

**Sample cURL:**
```bash
curl -X POST "http://globeco.local:31510/api/rebalances/submit-positions" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolioId": "portfolio-123",
    "positions": [
      {
        "security_id": "AAPL",
        "transaction_type": "BUY",
        "trade_quantity": 100,
        "target_weight": 0.15
      }
    ]
  }'
```

---

## Reference Data

### GET /api/blotters

List all available blotters.

**Response:**
```json
[
  {
    "id": "blotter-123",
    "name": "Equity Blotter",
    "description": "Main equity trading blotter",
    "status": "ACTIVE"
  },
  {
    "id": "blotter-456", 
    "name": "Fixed Income Blotter",
    "description": "Bond trading blotter",
    "status": "ACTIVE"
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/blotters"
```

### GET /api/destinations

List all available trade destinations.

**Response:**
```json
[
  {
    "id": "dest-123",
    "name": "NYSE",
    "description": "New York Stock Exchange",
    "status": "ACTIVE"
  },
  {
    "id": "dest-456",
    "name": "NASDAQ",
    "description": "NASDAQ Stock Market", 
    "status": "ACTIVE"
  }
]
```

**Sample cURL:**
```bash
curl -X GET "http://globeco.local:31510/api/destinations"
```

---

## Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 207 | Multi-Status (partial success in batch operations) |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Server Error |
| 501 | Not Implemented |

## Rate Limiting

Currently, there are no rate limits imposed on the API endpoints.

## Telemetry

All API endpoints are instrumented with OpenTelemetry for monitoring and observability. Metrics are automatically collected for:

- Request counts by endpoint and status code
- Response times
- Error rates
- Page views
- Custom business metrics

## Support

For API support and questions, please contact the development team.