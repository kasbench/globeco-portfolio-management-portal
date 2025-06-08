# Requirement 1

- [x] The main functions of this application are Model Management, Order Generation, Order Management, Trading, and Administration.  Please add these functions to the menu bar.  Admin users should have access to all functions.  Internal users should have access to all functions except Administration. Partner users should just have access to Model Management and Order Generation.  Customers shouldn't have access to any of these functions (customer functions will be added later).  You can leave Home and Dashboard on the menu.  Home should be first and Dashboard should be between Trading and Administration.  For now, just add the menu items.  We will build out those pages in subsequent steps.
- [x] Clicking on Model Management renders the Model Management Page.  From the Model Management page, a user can view, add, modify, and delete models.  The model API is in the Order Generation Service.  See [general-context.mdc](../.cursor/rules/general-context.mdc) for information about the Order Generation Service, including host, port, and [OpenAPI spec](globeco-order-generation-service.yaml).  The GET model API supports pagination and sorting.  The page should start by displaying 10 rows and support infinite scrolling.  The page should enable sorting consistent with the API (any combination of model_id, name, and last_rebalance_date).  
- [ ] Portfolio IDs are meaningless to users.  Use the GET api/v1/portfolios API of the Portfolio Service to get and cache the mapping between portfolioId and name.  Where a portfolioId is displayed, replace it with its name.  If, for some reason, the portfolioId is not recognized, show the portfolioId as the name.  Anywhere a user inputs a portfolio, let them input a name instead of a portfolioDd. Update the tests as required.











