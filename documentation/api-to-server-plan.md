# Plan: Migrate Client-Side API Calls to Server-Side Calls

## Overview
This plan outlines the steps required to move all API calls from the client (browser) to the server (Next.js server-side or API routes) for the GlobeCo Portfolio Management Portal. This will:
- Eliminate CORS/network issues
- Improve security and reliability
- Allow use of internal service DNS names

---

## 1. **Audit and Identify All Client-Side API Calls**
- [x] Review all React hooks (`use*`) that fetch or mutate data (e.g., `useOrders`, `useExecutions`, `useModels`, `useOrderSubmission`, etc.)
- [x] List all API utility modules in `src/lib/api/` (e.g., `orderService.ts`, `tradeService.ts`, `portfolioService.ts`, etc.)
- [x] Identify all React components/pages that directly use these hooks or API utilities
- [x] Update this plan based on the results of the prior three steps.

---

### Results of Phase 1 (Steps 1-4)

**API Utility Modules in `src/lib/api/`:**
- `orderService.ts`
- `tradeService.ts`
- `portfolioService.ts`
- `orderGenerationService.ts`
- `executionService.ts`
- `securityService.ts`

**Main Data-Fetching and Mutation Hooks:**
- `useOrders`
- `useExecutions`
- `useModels` / `useModel`
- `useOrderSubmission`
- `useTradeSubmission`
- `useTradeOrders`
- `useBatchOperations`
- `useBlotters`
- `useDestinations`
- `useRebalances`
- `usePortfolios`
- (plus utility hooks like `useKeyboardShortcuts`, etc.)

**Component/Page Usage Mapping (Excluding Test Files):**
- `useOrders`: `src/app/order-management/page.tsx`
- `useExecutions`: `src/app/trading/execution-management/page.tsx`, `src/app/trading/execution-management/ExecutionManagementPageContent.tsx`
- `useModels`: `src/app/model-management/page.tsx`
- `useTradeOrders`: `src/app/trading/trade-management/page.tsx`, `src/app/trading/trade-management/TradeManagementPageContent.tsx`
- `useTradeSubmission`: `src/components/features/trade-submission-modal.tsx`
- `useBatchOperations`: `src/components/features/BatchOperationsPanel.tsx`
- `useBlotters`: `src/components/features/trade-order-details-modal.tsx`
- `useDestinations`: `src/components/features/trade-submission-modal.tsx`
- `useRebalances`: `src/app/model-management/rebalance-results/page.tsx`, `src/components/tables/PortfolioTable.tsx`, `src/components/tables/RebalanceTable.tsx`
- `usePortfolios`: `src/components/forms/ModelForm.tsx`, `src/components/tables/ModelsTable.tsx`, `src/components/tables/RebalanceTable.tsx`

**Note:**
Test files and mocks are excluded from this migration plan. All relevant usages in production code have been mapped. If new hooks or usages are added in the future, this plan should be updated accordingly.

---

## 2. **Refactor API Utilities for Server-Side Use**
- [ ] Update API utility modules to support server-side execution (remove reliance on browser-only features, ensure they use internal service DNS names)
- [ ] Move all environment variable usage to server-side (e.g., use `process.env` in API routes, not in browser code)
- [ ] Ensure all axios/HTTP clients are only instantiated on the server

---

## 3. **Create Next.js API Routes or Server Functions**
- [ ] For each backend service, create a corresponding API route in `src/pages/api/` (e.g., `/api/orders`, `/api/models`, etc.)
- [ ] Move all business logic for data fetching/mutation into these API routes
- [ ] Update API routes to call internal services using service DNS names (e.g., `http://globeco-order-service.globeco:8081`)

---

## 4. **Refactor React Hooks and Components**
- [ ] Update all data-fetching hooks to call the new Next.js API routes instead of calling backend services directly
- [ ] Refactor mutation hooks (create, update, delete, submit, etc.) to use API routes
- [ ] Ensure all React components/pages use the updated hooks

---

## 5. **Update Environment Variables and Configuration**
- [ ] Remove all `NEXT_PUBLIC_*` variables for backend service addresses
- [ ] Set internal service addresses in server-side `.env` variables only
- [ ] Update documentation to reflect new configuration

---

## 6. **Testing and Validation**
- [ ] Test all major user flows (order management, trade management, model management, etc.)
- [ ] Validate that no API calls are made directly from the browser to internal services (use browser dev tools to confirm)
- [ ] Ensure all API calls go through the Next.js server/API routes
- [ ] Confirm that CORS/network issues are resolved
- [ ] Update or add automated tests as needed

---

## 7. **Cleanup and Documentation**
- [ ] Remove any unused client-side API code
- [ ] Update README and developer docs to describe the new architecture
- [ ] Document any breaking changes for future developers

---

## 8. **(Optional) Optimize for Performance**
- [ ] Consider caching strategies for server-side API calls
- [ ] Use React Query or SWR with server-side hydration for best UX

---

**Progress can be tracked by checking off each item above as it is completed.**
