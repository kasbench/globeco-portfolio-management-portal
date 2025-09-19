# Infrastructure Delay Investigation

## Current Status
- API completes in 9ms (confirmed by performance headers)
- End-to-end request takes 5.03s
- Telemetry has been disabled/optimized
- Issue persists despite code-level fixes

## Hypothesis
The delay is occurring in the **infrastructure layer** between the Next.js application and the client, most likely:

1. **NGINX Ingress Controller** - Buffering or processing delays
2. **Kubernetes Service Mesh** - Network routing issues  
3. **Load Balancer** - Health check or routing delays
4. **DNS Resolution** - Service discovery issues
5. **Container Resource Limits** - CPU/Memory throttling

## Investigation Steps

### 1. Test Direct Pod Access (Bypass Ingress)
```bash
# Get pod name
kubectl get pods -n globeco -l app=globeco-portfolio-management-portal

# Port forward directly to pod
kubectl port-forward -n globeco <pod-name> 8080:3000

# Test direct pod access
curl -X POST http://localhost:8080/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Direct Pod Test","version":1}]' \
  -w "Time: %{time_total}s\n"
```

### 2. Test Service Access (Bypass Ingress)
```bash
# Port forward to service
kubectl port-forward -n globeco service/globeco-portfolio-management-portal 8081:3000

# Test service access
curl -X POST http://localhost:8081/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Service Test","version":1}]' \
  -w "Time: %{time_total}s\n"
```

### 3. Check NGINX Ingress Logs
```bash
# Get ingress controller pod
kubectl get pods -n ingress-nginx

# Check logs for delays or errors
kubectl logs -n ingress-nginx <ingress-controller-pod> | grep -i "globeco\|timeout\|delay\|slow"
```

### 4. Check Application Logs
```bash
# Check application logs for timing
kubectl logs -n globeco -l app=globeco-portfolio-management-portal | grep "BULK_PORTFOLIO_PERF"
```

### 5. Monitor Resource Usage
```bash
# Check if pod is being throttled
kubectl top pods -n globeco
kubectl describe pod -n globeco <pod-name> | grep -A 10 "Limits\|Requests"
```

## Expected Results

### If Direct Pod Access is Fast (~20ms)
- **Root Cause**: NGINX Ingress Controller or Service routing
- **Fix**: Adjust ingress configuration or service settings

### If Direct Pod Access is Still Slow (~5s)
- **Root Cause**: Application-level issue we haven't identified
- **Fix**: Further application debugging needed

### If Service Access is Fast but Ingress is Slow
- **Root Cause**: NGINX Ingress Controller configuration
- **Fix**: Adjust ingress timeouts, buffering, or routing rules

## Potential Fixes

### NGINX Ingress Configuration
```yaml
# Add to ingress annotations
nginx.ingress.kubernetes.io/proxy-buffering: "off"
nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
```

### Resource Limits
```yaml
# Increase resource limits if throttling
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

### Service Configuration
```yaml
# Add session affinity if needed
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

## Next Steps
1. Run the direct pod access test first
2. Based on results, focus on either infrastructure or application fixes
3. Monitor logs during testing to identify specific bottlenecks
4. Apply targeted fixes based on findings