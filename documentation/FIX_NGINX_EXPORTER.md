# Fix NGINX Exporter Crash

## Issue
The NGINX Prometheus Exporter is crashing with:
```
Could not create Nginx Client: expected 200 response, got 404
```

## Root Cause
The exporter is trying to scrape `/nginx_status` from your Next.js application (`globeco-portfolio-management-portal:3000/nginx_status`), but:
1. Your Next.js app doesn't expose this endpoint
2. Your app is not an NGINX server - it's a Node.js/Next.js application

## Solutions

### Solution 1: Remove NGINX Exporter (Recommended)

Since you already have NGINX Ingress Controller metrics available, you don't need a separate NGINX exporter.

```bash
# Remove the crashing exporter
kubectl delete deployment globeco-nginx-exporter -n globeco
kubectl delete service globeco-nginx-metrics -n globeco

# Deploy ingress controller metrics only
kubectl apply -f k8s/nginx-ingress-only-metrics.yaml
```

**Benefits:**
- ✅ No crashes
- ✅ Still get comprehensive NGINX metrics from Ingress Controller
- ✅ Simpler setup
- ✅ Metrics include: request rates, latencies, status codes, upstream metrics

### Solution 2: Fix Exporter Configuration

If you specifically want the NGINX exporter, update it to scrape the correct endpoint:

```bash
# First, check your ingress controller setup
./check-nginx-controller.sh

# Then apply the fixed configuration
kubectl apply -f k8s/nginx-metrics-service-basic.yaml
```

The fixed exporter now tries to scrape:
`http://ingress-nginx-controller.ingress-nginx.svc.cluster.local:10254/nginx_status`

### Solution 3: Add nginx_status to Your App (Not Recommended)

You could add an nginx_status endpoint to your Next.js app, but this doesn't make sense since:
- Your app is Node.js, not NGINX
- The metrics wouldn't be real NGINX metrics
- The Ingress Controller already provides better metrics

## Recommended Approach

**Use Solution 1** - Remove the exporter and use Ingress Controller metrics:

```bash
# Clean up the failing exporter
kubectl delete -f k8s/nginx-metrics-service-basic.yaml

# Deploy ingress-only metrics
kubectl apply -f k8s/nginx-ingress-only-metrics.yaml

# Verify metrics are available
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 10254:10254
curl http://localhost:10254/metrics | grep nginx_ingress
```

## Available NGINX Metrics (from Ingress Controller)

With the Ingress Controller metrics, you get:

**Request Metrics:**
- `nginx_ingress_controller_requests_total{ingress="globeco-portfolio-management-portal"}`
- `nginx_ingress_controller_request_duration_seconds{ingress="globeco-portfolio-management-portal"}`
- `nginx_ingress_controller_bytes_sent_total{ingress="globeco-portfolio-management-portal"}`

**Backend Metrics:**
- `nginx_ingress_controller_upstream_last_activity_seconds_ago`
- `nginx_ingress_controller_upstream_response_length_bytes`
- `nginx_ingress_controller_upstream_response_time_seconds`

**SSL Metrics:**
- `nginx_ingress_controller_ssl_expire_time_seconds`
- `nginx_ingress_controller_ssl_certificate_info`

## Verification Steps

1. **Check ingress controller is running:**
   ```bash
   kubectl get pods -n ingress-nginx
   ```

2. **Test metrics endpoint:**
   ```bash
   kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 10254:10254
   curl http://localhost:10254/metrics | head -20
   ```

3. **Check your ingress has metrics enabled:**
   ```bash
   kubectl describe ingress -n globeco globeco-portfolio-management-portal
   # Should show: nginx.ingress.kubernetes.io/enable-metrics: "true"
   ```

4. **Generate some traffic and check metrics:**
   ```bash
   # Make some requests to your app
   curl http://globeco.local/

   # Check metrics show the requests
   curl http://localhost:10254/metrics | grep globeco
   ```

## Integration with Prometheus

Update your Prometheus configuration to scrape the ingress controller:

```yaml
scrape_configs:
  - job_name: 'nginx-ingress-controller'
    kubernetes_sd_configs:
      - role: service
        namespaces:
          names: [globeco, ingress-nginx]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

This approach gives you comprehensive NGINX metrics without the complexity and crashes of a separate exporter!