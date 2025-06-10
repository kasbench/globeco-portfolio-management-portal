# Requirement 2

## Step 1 **Create a Model Management Submenu**
- [ ] Create a submenu under Model Management with two options:
  - Investment Model
  - Rebalance Results
- [ ] Selecting Investment Model should navigate to the existing Model Page. We will add the Rebalance Results Page in the next step.

**Additional Details:**
- [ ] Add the submenu to the main navigation (assume Model Management is already a top-level nav item)
- [ ] Use standard dropdown/submenu styling consistent with existing navigation
- [ ] All user roles (Admin, Internal, Partner, Customer) should have access to both options

## Step 2 **Build the Rebalance Results Page**
- [ ] This page is populated from the GET /api/v1/rebalances API of the Order Generation Service, as documented in [globeco-order-generation-service.yaml](globeco-order-generation-service.yaml)
- [ ] Each rebalance is a nested structure, as follows:
```
General Rebalance Data
    Portfolios
        Positions
```
- [ ] The list of rebalances should initially be collapsed. If a user expands a rebalance, they will see a list of portfolios that were included in the rebalance. If they expand a portfolio, they will see the list of positions in the portfolio. This is how the data is represented in MongoDB. See below for an abbreviated example.
- [ ] The column names should be based on the field name but appropriate for an end user. For example, rebalance_id should be Rebalance ID, and number_of_portfolios should be Number of Portfolios. I may adjust later.
- [ ] Round cash values, market values, price, and quantity to two decimal places. Round actual, target and all drift fields to three decimal places.
- [ ] Use infinite scrolling.

**Additional Implementation Requirements:**
- [ ] **Loading States**: Show loading spinners during initial load and when expanding nested items
- [ ] **Error Handling**: Display user-friendly error messages if API calls fail, with retry options
- [ ] **Empty States**: Show appropriate message when no rebalances are found
- [ ] **Infinite Scroll**: Load 20 rebalances initially, load 10 more on scroll
- [ ] **Data Loading**: Lazy-load portfolio and position data when expanded (not included in initial rebalance list)
- [ ] **Table Columns**:
  - **Rebalance Level**: Rebalance ID, Model Name, Rebalance Date, Number of Portfolios
  - **Portfolio Level**: Portfolio ID, Market Value, Cash Before Rebalance, Cash After Rebalance
  - **Position Level**: Security ID, Price, Original Quantity, Adjusted Quantity, Target, Actual, Actual Drift
- [ ] **Performance**: Virtualize large lists if needed (100+ portfolios per rebalance)

We will add filtering in a subsequent step.

**Technical Notes:**
- Use the service hostname `globeco-order-generation-service:8088` (not localhost)
- Handle timezone display for rebalance_date and created_at fields appropriately
- Consider using React Query for API state management and caching

---

```json
{
  "rebalance_id": "684703748cad343eddbfad30",
  "model_id": "68430cb85beff3974431846f",
  "rebalance_date": "2025-06-09T15:53:24.100000",
  "model_name": "Model 11",
  "number_of_portfolios": 100,
  "portfolios": [
    {
      "portfolio_id": "68430c0edbfc814369506be3",
      "market_value": 692761.0,
      "cash_before_rebalance": 692761.0,
      "cash_after_rebalance": 692761.0,
      "positions": [
        {
          "security_id": "68430bfd20f302c879a60286",
          "price": 62.85,
          "original_quantity": 0.0,
          "adjusted_quantity": 220.0,
          "original_position_market_value": 0.0,
          "adjusted_position_market_value": 13827.0,
          "target": 0.02,
          "high_drift": 0.005,
          "low_drift": 0.005,
          "actual": 0.01995926445051035,
          "actual_drift": 0.0020367774744825414,
...
  ],
  "version": 1,
  "created_at": "2025-06-09T15:53:24.100000"
}
```