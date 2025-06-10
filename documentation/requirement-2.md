# Requirement 2

## Step 1 **Create a Model Management Submenu**
- [x] Create a submenu under Model Management with two options:
  - Investment Model
  - Rebalance Results
- [x] Selecting Investment Model should navigate to the existing Model Page. We will add the Rebalance Results Page in the next step.

**Additional Details:**
- [x] Add the submenu to the main navigation (assume Model Management is already a top-level nav item)
- [x] Use standard dropdown/submenu styling consistent with existing navigation
- [x] Admin, Internal, and Partner should have access to both options (Customer access removed)

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

## Implementation Phases for Step 2

### **Phase 1: Foundation & API Integration**
**🎯 Goal:** Get basic data flowing and establish the foundation

#### 1. API Integration Setup (30-45 mins)
- [x] Create TypeScript types for rebalance data structure
- [x] Extend Order Generation Service API client with rebalance endpoints
- [x] Create React Query hooks for rebalance data fetching
- [x] Add mock data for development/testing

#### 2. Basic Page Structure (20-30 mins)
- [ ] Replace placeholder page with real implementation
- [ ] Add basic loading and error states
- [ ] Implement empty state handling
- [ ] Create page layout and header section

### **Phase 2: Core Table Implementation**
**🎯 Goal:** Display rebalance data in a basic table format

#### 3. Rebalance Level Table (45-60 mins)
- [ ] Create basic table showing rebalance-level data
- [ ] Implement proper column formatting (dates, numbers)
- [ ] Add infinite scrolling for rebalances
- [ ] Apply proper styling and responsive design

#### 4. Expandable Row Foundation (30-45 mins)
- [ ] Add expand/collapse functionality to rebalance rows
- [ ] Create nested table structure
- [ ] Implement smooth animations for expansion
- [ ] Add loading states for expanded content

### **Phase 3: Nested Data Implementation**
**🎯 Goal:** Add portfolio and position level data with lazy loading

#### 5. Portfolio Level Integration (45-60 mins)
- [ ] Implement lazy loading for portfolio data when rebalance is expanded
- [ ] Create portfolio-level table with proper columns
- [ ] Add expand/collapse for individual portfolios
- [ ] Implement portfolio data formatting and display

#### 6. Position Level Implementation (45-60 mins)
- [ ] Add position-level data loading and display
- [ ] Implement proper number formatting (2 decimal for currency, 3 for percentages)
- [ ] Create position table with all required columns
- [ ] Handle large position lists with virtual scrolling if needed

### **Phase 4: Polish & Performance**
**🎯 Goal:** Add professional touches and optimize performance

#### 7. Enhanced User Experience (30-45 mins)
- [ ] Add better loading skeletons
- [ ] Implement retry mechanisms for failed requests
- [ ] Add tooltips and help text where appropriate
- [ ] Improve mobile responsiveness

#### 8. Performance Optimization (30-45 mins)
- [ ] Implement virtual scrolling for large datasets
- [ ] Add data caching and background refresh
- [ ] Optimize re-renders and state management
- [ ] Add performance monitoring

## 🔄 **Implementation Order:**
```
1. API Integration Setup
   ↓
2. Basic Page Structure  
   ↓
3. Rebalance Level Table
   ↓
4. Expandable Row Foundation
   ↓
5. Portfolio Level Integration
   ↓
6. Position Level Implementation
   ↓
7. Enhanced UX
   ↓
8. Performance Optimization
```

## 🎯 **Key Decision Points:**
- **Data Strategy:** Should we fetch all nested data upfront or truly lazy-load?
- **Virtualization:** At what point do we implement virtual scrolling (100+ items)?
- **Caching:** How long should we cache rebalance data?
- **Real-time Updates:** Do we need periodic refresh of data?

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