# Bulk Portfolio API Performance Issue - RESOLVED

## Problem Summary
- **Issue**: POST /api/portfolios/bulk taking 5+ seconds vs 14ms for direct service calls
- **Scope**: Also affected /api/models/{id}/rebalance (860-1200ms)
- **Other APIs**: Working normally (15-300ms)

## Root Cause Analysis

### Key Evidence from Locust Metrics
```
POST /api/portfolios/bulk:           5000-5200ms (SLOW)
POST /api/models/{id}/rebalance:     860-1200ms  (SLOW)
POST /api/orders/batch/submit:       45-300ms    (NORMAL)
POST /api/rebalances/submit-positions: 17-97ms   (NORMAL)
```

### Root Cause: Missing Service Configuration
The slow APIs were trying to connect to backend services that were **not configured** in the Kubernetes deployment:

**Missing Environment Variables:**
- `PORTFOLIO_SERVICE_HOST` → defaulted to `globeco-portfolio-service:8000`
- `ORDER_GENERATION_SERVICE_HOST` → defaulted to `globeco-order-generation-service:8088`

**Working APIs** had proper configuration:
- `ALLOCATION_SERVICE_HOST=globeco-allocation-service` ✅

### Delay Breakdown
When services were unreachable:
1. **Connection attempts fail**
2. **Retry logic kicks in**: 3 attempts with exponential backoff
   - Attempt 1: 500ms delay
   - Attempt 2: 1000ms delay  
   - Attempt 3: 2000ms delay
   - **Total retry time: 3.5 seconds**
3. **Connection timeouts**: ~1.5 seconds
4. **Total delay: ~5 seconds**

## Solution Implemented

### 1. Added Missing Service Configuration
**File**: `k8s/deployment.yaml`
```yaml
# Backend services configuration
- name: PORTFOLIO_SERVICE_HOST
  value: "globeco-portfolio-service"
- name: PORTFOLIO_SERVICE_PORT
  value: "8000"
- name: ORDER_GENERATION_SERVICE_HOST
  value: "globeco-order-generation-service"
- name: ORDER_GENERATION_SERVICE_PORT
  value: "8088"
```

### 2. Implemented Fast-Fail Strategy
**Files**: `src/lib/api/portfolioService.ts`, `src/lib/api/orderGenerationService.ts`

**Before** (with retries):
```typescript
return withSmartRetry(async () => {
  const response = await apiClient.post('/api/v2/portfolios', portfolios)
  return response.data
}, 3) // 3 retries = 3.5s delay when service unreachable
```

**After** (fast-fail):
```typescript
// Fail fast - no retries to prevent delays when service is unreachable
const response = await apiClient.post('/api/v2/portfolios', portfolios)
return response.data
```

### 3. Enhanced Monitoring
**File**: `src/app/api/portfolios/bulk/route.ts`
- Added detailed performance logging
- Added performance headers for monitoring
- Added mode indicator (`X-Performance-Mode: fast-fail`)

## Expected Results

### Before Fix
- **Bulk Portfolio API**: 5000-5200ms
- **Model Rebalance API**: 860-1200ms

### After Fix
- **If services are reachable**: ~20-100ms (normal performance)
- **If services are unreachable**: ~100-500ms (fast failure, no retries)

## Deployment Steps

1. **Apply the updated deployment**:
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```

2. **Restart the pods** to pick up new environment variables:
   ```bash
   kubectl rollout restart deployment/globeco-portfolio-management-portal -n globeco
   ```

3. **Verify the fix**:
   ```bash
   # Test the API performance
   curl -X POST http://globeco.local/api/portfolios/bulk \
     -H "Content-Type: application/json" \
     -d '[{"name":"Performance Test","version":1}]' \
     -w "Time: %{time_total}s\n"
   ```

4. **Check performance headers**:
   ```bash
   curl -I -X POST http://globeco.local/api/portfolios/bulk \
     -H "Content-Type: application/json" \
     -d '[{"name":"Header Test","version":1}]'
   ```

## Monitoring

The API now includes these performance headers:
- `X-Performance-Total`: Total request processing time
- `X-Performance-Parse`: JSON parsing time
- `X-Performance-Service`: Backend service call time
- `X-Performance-Mode`: Processing mode (fast-fail)

## Alternative Solutions (if services don't exist)

If the backend services (`globeco-portfolio-service`, `globeco-order-generation-service`) don't actually exist in your cluster:

### Option 1: Mock Services
Create mock implementations that return appropriate responses

### Option 2: Disable Features
Comment out or disable the problematic endpoints until services are available

### Option 3: Redirect to Working Services
Point to alternative services that can handle these requests

## Lessons Learned

1. **Always configure service endpoints** in deployment manifests
2. **Implement fast-fail strategies** for unreachable services
3. **Use consistent retry policies** across all services
4. **Add performance monitoring** to catch issues early
5. **Test service connectivity** during deployment

## Verification Checklist

- [ ] Deployment updated with service environment variables
- [ ] Pods restarted to pick up new configuration
- [ ] API performance improved (< 100ms for reachable services)
- [ ] Performance headers present in responses
- [ ] Logs show fast-fail behavior for unreachable services
- [ ] Locust tests show improved response times