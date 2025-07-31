# Globeco Portfolio Management Portal - Kubernetes Deployment

This directory contains the essential Kubernetes manifests for deploying the Globeco Portfolio Management Portal with structured logging and NGINX metrics collection.

## Prerequisites

- Kubernetes cluster with NGINX Ingress Controller installed
- `globeco` namespace created
- Docker image `kasbench/globeco-portfolio-management-portal:latest` available

## Quick Deployment

```bash
# Create namespace
kubectl create namespace globeco

# Deploy the application
kubectl apply -f k8s/

# Enable NGINX Ingress Controller metrics (one-time setup)
kubectl apply -f k8s/nginx-ingress-controller-config.yaml
```

## Files Overview

### Core Application Manifests
- **`deployment.yaml`** - Main application deployment with structured logging configuration
- **`service.yaml`** - ClusterIP service exposing the application
- **`ingress.yaml`** - Ingress configuration with metrics enabled

### NGINX Metrics Configuration
- **`nginx-ingress-controller-config.yaml`** - ConfigMap and deployment patch for NGINX Ingress Controller metrics

## Features Enabled

### Structured Logging
- ✅ JSON-formatted logs with all required fields
- ✅ Request/response tracking with correlation IDs
- ✅ Clean startup logs (no verbose Next.js output)
- ✅ OpenTelemetry integration for metrics and tracing

### NGINX Metrics
- ✅ NGINX Ingress Controller Prometheus metrics
- ✅ Request rates, latencies, and status codes
- ✅ Upstream response times and backend metrics
- ✅ SSL certificate expiration monitoring

### Observability
- ✅ Health check endpoints
- ✅ Prometheus metrics scraping annotations
- ✅ Access logging for detailed request tracking
- ✅ Correlation ID propagation

## Deployment Steps

### 1. Deploy Application
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### 2. Enable NGINX Metrics (First Time Only)
```bash
# Apply ConfigMap
kubectl apply -f nginx-ingress-controller-config.yaml

# Patch the ingress controller to enable metrics
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/ports/-",
    "value": {
      "containerPort": 10254,
      "name": "prometheus",
      "protocol": "TCP"
    }
  }
]'

kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--enable-metrics=true"
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--metrics-per-host=false"
  }
]'
```

### 3. Verify Deployment
```bash
# Check application pods
kubectl get pods -n globeco

# Check ingress
kubectl get ingress -n globeco

# Test application
curl http://globeco.local/api/health
```

## Monitoring and Metrics

### Application Metrics
The application exposes OpenTelemetry metrics and structured logs:
- Health endpoint: `/api/health`
- Structured JSON logs with correlation IDs
- Request/response tracking

### NGINX Metrics
NGINX Ingress Controller exposes Prometheus metrics on port 10254:
```bash
# Port forward to metrics endpoint
kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller 10254:10254

# View metrics
curl http://localhost:10254/metrics | grep nginx_ingress
```

Available NGINX metrics include:
- `nginx_ingress_controller_requests_total` - Request counts by ingress/status/method
- `nginx_ingress_controller_request_duration_seconds` - Request latency histograms
- `nginx_ingress_controller_response_size_bytes` - Response size metrics
- `nginx_ingress_controller_upstream_response_time_seconds` - Backend response times

## Prometheus Configuration

Add this to your Prometheus configuration to scrape both application and NGINX metrics:

```yaml
scrape_configs:
  # Application metrics
  - job_name: 'globeco-portfolio-app'
    kubernetes_sd_configs:
      - role: service
        namespaces:
          names: [globeco]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: globeco-portfolio-management-portal

  # NGINX Ingress Controller metrics
  - job_name: 'nginx-ingress-controller'
    kubernetes_sd_configs:
      - role: service
        namespaces:
          names: [ingress-nginx]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

## Troubleshooting

### Check Application Logs
```bash
kubectl logs -n globeco deployment/globeco-portfolio-management-portal
```

### Check NGINX Controller Logs
```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Verify Metrics
```bash
# Test application health
kubectl port-forward -n globeco service/globeco-portfolio-management-portal 3000:3000
curl http://localhost:3000/api/health

# Test NGINX metrics
kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller 10254:10254
curl http://localhost:10254/metrics | grep nginx_ingress
```

## Environment Variables

The deployment includes comprehensive OpenTelemetry configuration:
- `OTEL_SERVICE_NAME`: Service identification
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Metrics/traces export endpoint
- `OTEL_DEBUG`: Set to "false" for clean production logs
- `NODE_ENV`: Set to "production"

## Clean Logs

The application uses:
- Custom quiet start script to suppress Next.js startup noise
- Structured JSON logging for all API operations
- Log filtering to remove verbose OpenTelemetry output
- Correlation ID tracking across requests

This results in clean, structured logs suitable for production log aggregation systems.