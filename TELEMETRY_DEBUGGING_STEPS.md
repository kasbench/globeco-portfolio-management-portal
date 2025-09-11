# OpenTelemetry Debugging Steps

## Current Status
- ✅ Build successful with enhanced debugging
- ✅ Test endpoints created for diagnostics
- ❌ Metrics still not appearing in Prometheus
- ❌ Missing telemetry initialization logs

## Debugging Sequence

### 1. Deploy and Check Basic Logs
```bash
# Deploy the updated image
kubectl apply -f k8s/deployment.yaml

# Check pod logs for telemetry initialization
kubectl logs -f deployment/globeco-portfolio-management-portal -n globeco | grep -E "(TELEMETRY|INSTRUMENTATION)"
```

**Expected logs:**
```
🔧 INSTRUMENTATION: Starting Next.js instrumentation...
🔧 INSTRUMENTATION: Loading telemetry for Node.js runtime...
🚀 TELEMETRY: Starting OpenTelemetry initialization...
🔧 TELEMETRY: Service Name: globeco-portfolio-management-portal
🔧 TELEMETRY: Collector URL: http://[NODE_IP]:4318
✅ TELEMETRY: OpenTelemetry SDK started successfully!
🧪 TELEMETRY: Test metric recorded
🔄 TELEMETRY: Forcing metric export...
✅ TELEMETRY: Forced metric export completed
```

### 2. Test Environment Variables
```bash
# Port forward to access debug endpoints
kubectl port-forward deployment/globeco-portfolio-management-portal 3000:3000 -n globeco

# Check environment variables
curl http://localhost:3000/api/debug/env | jq
```

**Look for:**
- `NODE_IP` should be set to the actual node IP
- `OTEL_EXPORTER_OTLP_ENDPOINT` should be `http://[NODE_IP]:4318`
- `OTEL_DEBUG` should be `"true"`

### 3. Test Collector Connectivity
```bash
# Test basic connectivity to collector
curl http://localhost:3000/api/debug/collector | jq
```

**Expected result:**
- `success: true` indicates collector is reachable
- `status: 200` or `status: 400` (both indicate connectivity)
- `success: false` with network error indicates connectivity issues

### 4. Test Direct Metrics Export
```bash
# Test direct metric export bypassing SDK
curl http://localhost:3000/api/debug/direct-metrics | jq
```

**Expected result:**
- `success: true` indicates metrics can be exported directly
- `exportResult.code: 0` indicates successful export
- `success: false` indicates export issues

### 5. Test Application Metrics
```bash
# Test the main telemetry endpoint
curl http://localhost:3000/api/telemetry/test | jq

# Generate multiple test metrics
for i in {1..5}; do
  curl http://localhost:3000/api/telemetry/test
  sleep 2
done
```

### 6. Check OpenTelemetry Debug Logs
```bash
# Check for OpenTelemetry debug output (should be verbose now)
kubectl logs deployment/globeco-portfolio-management-portal -n globeco | grep -E "(OTLP|export|metric)"
```

**Look for:**
- OTLP export attempts
- Metric collection messages
- Export success/failure messages
- Network connection attempts

## Troubleshooting Scenarios

### Scenario A: No Instrumentation Logs
**Symptoms:** No `🔧 INSTRUMENTATION` or `🚀 TELEMETRY` messages in logs

**Possible Causes:**
1. `instrumentation.ts` not being called by Next.js
2. Environment variable `NEXT_RUNTIME` not set to `nodejs`

**Solutions:**
1. Check if `instrumentation.ts` is in the root directory
2. Verify Next.js version supports instrumentation
3. Check environment variables with `/api/debug/env`

### Scenario B: Instrumentation Runs But No SDK Initialization
**Symptoms:** See `🔧 INSTRUMENTATION` but no `🚀 TELEMETRY` messages

**Possible Causes:**
1. Import error in telemetry module
2. Exception during SDK initialization

**Solutions:**
1. Check full error logs for import failures
2. Look for error messages in instrumentation logs

### Scenario C: SDK Initializes But No Metrics Export
**Symptoms:** See `✅ TELEMETRY: OpenTelemetry SDK started` but no export messages

**Possible Causes:**
1. Metric reader not properly configured
2. Export interval too long
3. No metrics being created

**Solutions:**
1. Look for `🔄 TELEMETRY: Forcing metric export...` messages
2. Test with `/api/telemetry/test` endpoint
3. Check if forced export succeeds

### Scenario D: Export Attempts But Network Failures
**Symptoms:** See export attempts but connection errors

**Possible Causes:**
1. Incorrect collector URL
2. Network connectivity issues
3. Collector not running or misconfigured

**Solutions:**
1. Test with `/api/debug/collector` endpoint
2. Verify `NODE_IP` environment variable
3. Check collector pod status and logs

### Scenario E: Network OK But Metrics Not in Prometheus
**Symptoms:** Successful exports but no metrics in Prometheus

**Possible Causes:**
1. Collector not forwarding to Prometheus
2. Prometheus not scraping collector
3. Metric names/labels being filtered

**Solutions:**
1. Check collector configuration and logs
2. Verify Prometheus scrape targets
3. Check Prometheus logs for scrape errors

## Manual Network Test

If all else fails, test network connectivity manually:

```bash
# Get into the application pod
kubectl exec -it deployment/globeco-portfolio-management-portal -n globeco -- /bin/sh

# Check environment variables
env | grep OTEL
env | grep NODE_IP

# Test collector connectivity
wget -O- --timeout=5 "http://$NODE_IP:4318/v1/metrics" || echo "Connection failed"

# Test with curl if available
curl -v -X POST "http://$NODE_IP:4318/v1/metrics" \
  -H "Content-Type: application/x-protobuf" \
  --data-binary @/dev/null \
  --max-time 5
```

## Expected Metrics in Prometheus

After successful debugging, you should see these metrics:

1. **From initialization:**
   - `initialization_counter{component="telemetry-init"}`

2. **From test endpoint:**
   - `test_endpoint_calls{endpoint="/api/telemetry/test"}`
   - `test_endpoint_duration{endpoint="/api/telemetry/test"}`

3. **From simple telemetry:**
   - `simple_telemetry_test{test="initialization"}`

## Next Steps

1. Deploy the updated image with debugging enabled
2. Follow the debugging sequence above
3. Identify which scenario matches your situation
4. Apply the appropriate solutions
5. Once metrics appear, disable debug logging for production

The enhanced logging and test endpoints should help identify exactly where the telemetry pipeline is failing.