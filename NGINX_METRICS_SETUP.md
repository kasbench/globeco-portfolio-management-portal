# NGINX Metrics Collection Setup

## Overview

This setup provides comprehensive NGINX metrics collection for the Globeco Portfolio Management Portal, including both NGINX Ingress Controller metrics and application-level NGINX metrics.

## Components

### 1. NGINX Ingress Controller Metrics

**File: `k8s/ingress.yaml`**
- Enables controller-level metrics via `nginx.ingress.kubernetes.io/enable-metrics: "true"`
- Configures Prometheus scraping on port 10254
- Enables access logging for detailed request tracking

**Available Metrics:**
- `nginx_ingress_controller_requests_total` - Total requests by ingress, status, method
- `nginx_ingress_controller_request_duration_seconds` - Request latency histograms
- `nginx_ingress_controller_response_size_bytes` - Response size histograms
- `nginx_ingress_controller_request_size_bytes` - Request size histograms
- `nginx_ingress_controller_ssl_expire_time_seconds` - SSL certificate expiration
- `nginx_ingress_controller_config_last_reload_successful` - Configuration reload status

### 2. NGINX Ingress Controller ServiceMonitor

**File: `k8s/nginx-ingress-metrics.yaml`**
- ServiceMonitor for Prometheus to scrape ingress controller metrics
- Service to expose controller metrics endpoint
- ConfigMap for enhanced metrics configuration

### 3. NGINX Prometheus Exporter (Optional)

**File: `k8s/nginx-metrics-service.yaml`**
- Dedicated NGINX Prometheus exporter deployment
- Scrapes NGINX stub_status endpoint
- Provides detailed NGINX server metrics

## Deployment Instructions

### Step 1: Apply Ingress Configuration
```bash
kubectl apply -f k8s/ingress.yaml
```

### Step 2: Deploy NGINX Metrics Collection
```bash
kubectl apply -f k8s/nginx-ingress-metrics.yaml
```

### Step 3: (Optional) Deploy NGINX Exporter
```bash
kubectl apply -f k8s/nginx-metrics-service.yaml
```

### Step 4: Verify Metrics Collection
```bash
# Check if metrics are being exposed
kubectl get servicemonitor -n globeco

# Test metrics endpoint
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller-metrics 10254:10254
curl http://localhost:10254/metrics | grep nginx_ingress
```

## Available NGINX Metrics

### Ingress Controller Metrics (Port 10254)

**Request Metrics:**
- `nginx_ingress_controller_requests_total{ingress="globeco-portfolio-management-portal"}`
- `nginx_ingress_controller_request_duration_seconds{ingress="globeco-portfolio-management-portal"}`
- `nginx_ingress_controller_bytes_sent_total{ingress="globeco-portfolio-management-portal"}`

**Backend Metrics:**
- `nginx_ingress_controller_upstream_last_activity_seconds_ago`
- `nginx_ingress_controller_upstream_response_length_bytes`
- `nginx_ingress_controller_upstream_response_time_seconds`

**Configuration Metrics:**
- `nginx_ingress_controller_config_last_reload_successful`
- `nginx_ingress_controller_config_last_reload_successful_timestamp_seconds`

**SSL Metrics:**
- `nginx_ingress_controller_ssl_expire_time_seconds`
- `nginx_ingress_controller_ssl_certificate_info`

### NGINX Server Metrics (Port 9113 - if using exporter)

**Connection Metrics:**
- `nginx_connections_active` - Active client connections
- `nginx_connections_reading` - Connections reading request headers
- `nginx_connections_writing` - Connections writing responses
- `nginx_connections_waiting` - Idle connections waiting for requests

**Request Metrics:**
- `nginx_http_requests_total` - Total HTTP requests
- `nginx_connections_accepted_total` - Total accepted connections
- `nginx_connections_handled_total` - Total handled connections

## Prometheus Configuration

Add the following to your Prometheus configuration:

```yaml
scrape_configs:
- job_name: 'nginx-ingress-controller'
  kubernetes_sd_configs:
  - role: service
    namespaces:
      names:
      - globeco
      - ingress-nginx
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
  - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
    target_label: __address__
```

## Grafana Dashboard

Import the official NGINX Ingress Controller dashboard:
- Dashboard ID: 9614 (NGINX Ingress Controller)
- Dashboard ID: 11199 (NGINX Ingress Controller Request Handling Performance)

Or create custom dashboards using these key metrics:
- Request rate: `rate(nginx_ingress_controller_requests_total[5m])`
- Error rate: `rate(nginx_ingress_controller_requests_total{status=~"5.."}[5m])`
- Response time: `histogram_quantile(0.95, rate(nginx_ingress_controller_request_duration_seconds_bucket[5m]))`

## Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
- name: nginx-ingress
  rules:
  - alert: NginxIngressHighErrorRate
    expr: rate(nginx_ingress_controller_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate on NGINX Ingress"
      description: "Error rate is {{ $value }} errors per second"

  - alert: NginxIngressHighLatency
    expr: histogram_quantile(0.95, rate(nginx_ingress_controller_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency on NGINX Ingress"
      description: "95th percentile latency is {{ $value }} seconds"
```

## Troubleshooting

### Check Ingress Controller Metrics
```bash
# Port forward to ingress controller metrics
kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller 10254:10254

# Check metrics
curl http://localhost:10254/metrics | grep globeco
```

### Verify ServiceMonitor
```bash
# Check if ServiceMonitor is created
kubectl get servicemonitor -n globeco nginx-ingress-controller-metrics

# Check Prometheus targets
kubectl port-forward -n monitoring service/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

### Check Ingress Annotations
```bash
kubectl describe ingress -n globeco globeco-portfolio-management-portal
```

## Integration with Existing Monitoring

This NGINX metrics setup complements your existing structured logging and OpenTelemetry metrics:

1. **Application Metrics**: Your OpenTelemetry metrics (business logic, API performance)
2. **NGINX Metrics**: Infrastructure-level HTTP metrics (request rates, response times)
3. **Structured Logs**: Detailed request/response logging in JSON format

Together, these provide comprehensive observability for your application stack.