# Test: Bypass Ingress to Confirm Root Cause

## Current Status
- **All endpoints show 5-second delay** (bulk portfolio, minimal POST, minimal GET)
- **Handlers complete in 1-11ms** but clients see 5+ seconds
- **Root Cause**: Infrastructure layer (most likely NGINX ingress buffering)

## Test 1: Direct Pod Access (Bypass Ingress)

### Step 1: Get Pod Information
```bash
kubectl get pods -n globeco -l app=globeco-portfolio-management-portal
```

### Step 2: Port Forward to Pod
```bash
# Replace <pod-name> with actual pod name from step 1
kubectl port-forward -n globeco <pod-name> 8080:3000
```

### Step 3: Test Direct Pod Access
```bash
# Test minimal endpoint directly
curl -X GET http://localhost:8080/api/test-minimal \
  -w "Time: %{time_total}s\n"

# Test bulk portfolio directly  
curl -X POST http://localhost:8080/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Direct Pod Test","version":1}]' \
  -w "Time: %{time_total}s\n"
```

**Expected Result**: If direct pod access is fast (~10-50ms), then ingress is the problem.

## Test 2: Service Access (Bypass Ingress, Use Service)

### Step 1: Port Forward to Service
```bash
kubectl port-forward -n globeco service/globeco-portfolio-management-portal 8081:3000
```

### Step 2: Test Service Access
```bash
# Test minimal endpoint via service
curl -X GET http://localhost:8081/api/test-minimal \
  -w "Time: %{time_total}s\n"

# Test bulk portfolio via service
curl -X POST http://localhost:8081/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Service Test","version":1}]' \
  -w "Time: %{time_total}s\n"
```

**Expected Result**: If service access is fast, confirms ingress is the bottleneck.

## Fix Applied: Ingress Configuration Update

I've updated `k8s/ingress.yaml` with these critical annotations:

```yaml
# CRITICAL: Disable response buffering to prevent 5-second delays
nginx.ingress.kubernetes.io/proxy-buffering: "off"
nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
nginx.ingress.kubernetes.io/proxy-max-temp-file-size: "0"
# Reduced timeouts
nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
```

## Apply the Fix

### Step 1: Apply Updated Ingress
```bash
kubectl apply -f k8s/ingress.yaml
```

### Step 2: Wait for Ingress Controller to Reload
```bash
# Check ingress status
kubectl get ingress -n globeco globeco-portfolio-management-portal

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### Step 3: Test the Fix
```bash
# Test after ingress update
curl -X GET http://globeco.local:32080/api/test-minimal \
  -w "Time: %{time_total}s\n"

curl -X POST http://globeco.local:32080/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Fixed Test","version":1}]' \
  -w "Time: %{time_total}s\n"
```

**Expected Result After Fix**: Response times should drop to ~10-100ms.

## Why This Fixes the Issue

### NGINX Response Buffering Problem
By default, NGINX ingress controller buffers responses, which can cause delays when:
1. **Small responses** get buffered unnecessarily
2. **Buffer timeouts** cause artificial delays
3. **Proxy buffering** waits for complete response before forwarding

### The Fix Explained
- `proxy-buffering: "off"` - Disables response buffering
- `proxy-request-buffering: "off"` - Disables request buffering  
- `proxy-max-temp-file-size: "0"` - Prevents temporary file creation
- Reduced timeouts prevent long waits

## Verification Steps

1. **Run bypass tests first** to confirm ingress is the issue
2. **Apply the ingress fix**
3. **Test performance improvement**
4. **Monitor logs** to ensure no new errors

If the bypass tests show fast responses (~10-50ms) but ingress shows 5s, this confirms the root cause and the fix should resolve it.