# Requirement 4

- The purpose of this requirement is to add the Order Management Page
- The order management page is displayed from the Order Management menu item on the menu bar
- The data on this page comes from the Order Service=.  See ##Integrations for Host, Port, and Spec.
- The page comprises a list of orders with infinite scrolling.  The list can be filtered and sorted by id, security.ticker, portfolio.name, blotter.name, status.abbreviation, quantity, and orderTimestamp. The default filter will be for status.abbreviation == NEW.
- Each order in NEW status will have the following actions available:
    - Delete the order
    - View/Modify the order
    - Submit the order (using the Order Service POST api/v1/orders/{id}/submit endpoint)
- There will be checkboxes to the left of each order with a status of NEW.  If one or more are checked, then a Submit Selected button will be enabled to submit the selected orders in batch using the POST /api/v1/orders/batch/submit endpoint.
- Refresh after submit, since submitting will change the status and version number.
- Report any errors to the user.
- The page will have allow the user to input one or more filters (perhaps using filter pills like https://dribbble.com/shots/23673501-Filter-UI-UX-Revamp)
- The page will allow sorting on column headings if sorting on the column is supported by the API.












## Integrations

| Service | Host | Port | OpenAPI Spec |
| --- | --- | --- | --- |
| Order Service | globeco-order-service | 8081 | [globeco-order-service-openapi.yaml](globeco-order-service-openapi.yaml) and [API Usage Guide](API_USAGE_GUIDE-Order-Service.md)
---