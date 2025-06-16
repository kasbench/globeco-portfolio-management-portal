# Requirement 5

This enhancement adds the Trade Management page to the GlobeCo Portfolio Management Portal

- The Trading menu item in the menu bar has a submenu with two options:
    - Trade Managment (this page)
    - Execution Management (to be added in the next requirement)

- The Trade Management page depends on the Trade Service API.  The API is fully documented in [trade-service-claude-api-guide.md](trade-service-claude-api-guide.md).
- The look and feel of the Trade Management page should be similar to the Order Management page.  Filtering, sorting, and scrolling should work the same way.  See [requirement-4.md](requirement-4.md).
- The sorting and filterering fields should be those that are available in GET api/v2/tradeOrders
- The submit, modify, and delete actions should be available for each row.  Batch submit should also be available.
- It should also be possible to move trades to a new blotter in batch.  Selecting a blotter should be by blotter.abbreviation and not blotter.id.
- By default, the page should be filter for submitted=false
- Trade.order_id is not an editable field.





## Integrations

| Service | Host | Port | OpenAPI Spec |
| --- | --- | --- | --- |
| Trade Service | globeco-trade-service | 8082 | [globeco-trade-service-openapi.yaml](globeco-trade-service-openapi.yaml) and [trade-service-claude-api-guide.md](trade-service-claude-api-guide.md) |
