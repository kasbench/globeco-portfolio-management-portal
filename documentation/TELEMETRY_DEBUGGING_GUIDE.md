# OpenTelemetry Debugging Guide

## Current Status
✅ **One metric visible in Prometheus** - This confirms the basic telemetry pipeline is working!
❌ **No traces in Jaeger** - Need to investigate trace export
❌ **Limited metrics** - Need to generate more telemetry data

## Debugging Steps

### 1. Check Application Logs
After deploying with the updated environment variables, check the pod logs:

```bash
kubectl logs -f deployment/globeco-portfolio-management-portal -n globeco
```

Look for these log messages:
- `🚀 Starting OpenTelemetry initialization...`
- `✅ OpenTelemetry SDK started successfully!`
- `🧪 Test span created and ended`
- `🧪 Test metric recorded`

### 2. Test Telemetry Endpoints

#### Test the telemetry test endpoint:
```bash
# Port forward to access the application
kubectl port-forward deployment/globeco-portfolio-management-portal 3000:3000 -n globeco

# In another terminal, test the telemetry endpoint
curl http://localhost:3000/api/telemetry/test
```

This should generate:
- Custom spans
- Custom metrics
- API request metrics
- Page view metrics

#### Test instrumented API endpoints:
```bash
# Test portfolios endpoint (instrumented with withTelemetry)
curl http://localhost:3000/api/portfolios

# Test orders endpoint (instrumented with withTelemetry)
curl http://localhost:3000/api/orders
```

### 3. Generate More Telemetry Data

#### Visit pages to generate page view metrics:
```bash
# Visit different pages
curl http://localhost:3000/
curl http://localhost:3000/dashboard
curl http://localhost:3000/model-management
curl http://localhost:3000/order-management
```

#### Generate API traffic:
```bash
# Make multiple API calls
for i in {1..10}; do
  curl http://localhost:3000/api/telemetry/test
  curl http://localhost:3000/api/portfolios
  curl http://localhost:3000/api/orders
  sleep 1
done
```

### 4. Check OpenTelemetry Collector Logs

```bash
# Check collector logs for incoming data
kubectl logs -f deployment/otel-collector-collector -n monitoring

# Look for:
# - Incoming OTLP requests
# - Export attempts to Jaeger/Prometheus
# - Any error messages
```

### 5. Verify Collector Configuration

Check that the collector is properly configured to:
- Receive OTLP data on port 4318
- Export traces to Jaeger
- Export metrics to Prometheus

### 6. Check Prometheus Targets

In Prometheus UI, go to Status > Targets and verify:
- The collector is being scraped
- No errors in scraping

### 7. Check Jaeger Configuration

Verify Jaeger is:
- Receiving traces from the collector
- Properly configured to accept traces
- Not filtering out traces

## Expected Metrics in Prometheus

After generating telemetry data, you should see these metrics:

### Auto-instrumentation Metrics:
- `http_server_duration` - HTTP request durations
- `http_server_request_size` - HTTP request sizes
- `http_server_response_size` - HTTP response sizes
- `nodejs_*` - Node.js runtime metrics

### Custom Metrics:
- `api_requests_total` - API request counter
- `api_response_duration_ms` - API response time histogram
- `page_views_total` - Page view counter
- `errors_total` - Error counter
- `initialization_counter` - Test initialization counter
- `debug_test_counter` - Debug test counter
- `debug_test_histogram` - Debug test histogram

## Expected Traces in Jaeger

You should see traces for:
- HTTP requests to API endpoints
- Custom spans from `withTelemetry` wrapper
- Test spans from initialization
- Debug test spans

## Troubleshooting Common Issues

### Issue: No traces in Jaeger
**Possible causes:**
1. Trace exporter not configured correctly
2. Jaeger not receiving traces from collector
3. Traces being filtered out
4. Sampling rate too low

**Solutions:**
1. Check collector trace export configuration
2. Verify Jaeger endpoint in collector config
3. Check Jaeger logs for incoming traces
4. Ensure sampling rate allows traces through

### Issue: Limited metrics in Prometheus
**Possible causes:**
1. Not enough application activity
2. Metrics not being exported frequently enough
3. Prometheus not scraping collector

**Solutions:**
1. Generate more API traffic
2. Reduce metric export interval
3. Check Prometheus scrape configuration

### Issue: Application not generating telemetry
**Possible causes:**
1. OpenTelemetry not initializing
2. Environment variables not set correctly
3. Network connectivity issues to collector

**Solutions:**
1. Check application logs for initialization messages
2. Verify environment variables in pod
3. Test network connectivity to collector

## Manual Testing Commands

### Test Network Connectivity
```bash
# From inside the application pod
kubectl exec -it deployment/globeco-portfolio-management-portal -n globeco -- /bin/sh

# Test collector connectivity
wget -O- http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/traces
wget -O- http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/metrics
```

### Check Environment Variables
```bash
kubectl exec -it deployment/globeco-portfolio-management-portal -n globeco -- env | grep OTEL
```

### Force Metric Export
The application is configured to force metric exports every 3 seconds in debug mode, so you should see regular telemetry data.

## Next Steps

1. Deploy the updated deployment.yaml with environment variables
2. Check application logs for telemetry initialization
3. Test the `/api/telemetry/test` endpoint
4. Generate API traffic to instrumented endpoints
5. Check Prometheus for new metrics
6. Check Jaeger for traces
7. If issues persist, check collector and Jaeger logs