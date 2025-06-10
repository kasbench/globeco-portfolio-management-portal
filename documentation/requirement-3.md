# Requirement 3

This enhancement builds on [Requirement 2](requirement-2.md).

The goal of the Rebalance Results page is to be able to send orders to the Order Service.  The order service API is documented in [globeco-order-service-openapi.yaml](globeco-order-service-openapi.yaml).  The document [API_USAGE_GUIDE.md](API_USAGE_GUIDE.md) provides detailed instructions on the POST api/v1/orders endpoint of the Order Service.  If you need an API that does not exist, please provide a complete specification in the style of [api-portfolio-endpoint-spec.md](api-portfolio-endpoint-spec.md).

Here are the business requirements.

- The user should be able to control which results are submitted to the Order Service
    - At the top level, the user should be able to submit all rebalances, including all portfolios
    - The user should be able to select one or more rebalances to submit, including all of their portfolios 
    - The user should be able to select specific portfolios under a model to submit




```json
{
  "blotterId": 0,
  "statusId": 0,
  "portfolioId": "string",
  "orderTypeId": 0,
  "securityId": "string",
  "quantity": 0,
  "limitPrice": 0,
  "tradeOrderId": 0,
  "orderTimestamp": "2025-06-10T16:19:04.420Z",
  "version": 0
}

```

INSERT INTO order_type (abbreviation, description, version) VALUES
  ('BUY', 'Buy', 1),
  ('SELL', 'Sell', 1),
  ('SHORT', 'Sell to Open', 1),
  ('COVER', 'Buy to Close', 1),
  ('EXRC', 'Exercise', 1);
