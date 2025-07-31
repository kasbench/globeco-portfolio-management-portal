# NGINX Metrics Setup Without Prometheus Operator

## Issue
The ServiceMonitor CRD is not available because Prometheus Operator is not installed in your cluster. This guide provides alternative approaches to collect NGINX metrics using standard Kubernetes resources and Prometheus annotations.

## Solution Options

### Option 1: Basic Prometheus Scraping (Recommended)

Use standard Kubernetes services with Prometheus annotations for automatic discovery.

#### Deploy Basic NGINX Metrics Collection
```bash
# Deploy NGINX exporter without ServiceMonitor
kubectl apply -f k8s/nginx-metrics-service-basic.yaml

# Deploy ingress controller metrics service
kubectl apply -f k8s/nginx-ingress-metrics-basic.yaml
```

#### Verify Deployment
```bash
# Check services are created
kubectl get services -n globeco | grep nginx

# Check NGINX exporter is running
kubectl get pods -n globeco | grep nginx-exporter

# Test metrics endpoints
kubectl port-forward -n globeco service/globeco-nginx-metrics 9113:9113
curl http://localhost:9113/metrics
```

### Option 2: Direct Ingress Controller Metrics

If you have access to the NGINX Ingress Controller configuration, you can scrape metrics directly from the controller.

#### Find Your Ingress Controller
```bash
# Find the ingress controller service
kubectl get services -n ingress-nginx

# Common service names:
# - ingress-nginx-controller
# - nginx-ingress-controller
# - ingress-nginx-controller-metrics
```

#### Test Controller Metrics
```bash
# Port forward to controller metrics (adjust service name as needed)
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 10254:10254

# Check metrics
curl http://localhost:10254/metrics | grep nginx_ingress
```

### Option 3: Install Prometheus Operator (If Possible)

If you can install Prometheus Operator, it provides the ServiceMonitor CRDs:

```bash
# Install Prometheus Operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Wait for CRDs to be ready
kubectl wait --for condition=established --timeout=60s crd/servicemonitors.monitoring.coreos.com

# Then apply the original ServiceMonitor configurations
kubectl apply -f k8s/nginx-metrics-service.yaml
```

## Prometheus Configuration

### For Standard Prometheus (prometheus.yml)

Add the configuration from `k8s/prometheus-config.yaml` to your Prometheus configuration:

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
      # ... (see full config in prometheus-config.yaml)
```

### For Prometheus in Kubernetes

If Prometheus is running in Kubernetes, update its ConfigMap:

```bash
# Edit Prometheus ConfigMap
kubectl edit configmap prometheus-config -n monitoring

# Add the scrape configs from k8s/prometheus-config.yaml
# Then restart Prometheus
kubectl rollout restart deployment/prometheus -n monitoring
```

## Available Metrics

### NGINX Ingress Controller Metrics
- `nginx_ingress_controller_requests_total`
- `nginx_ingress_controller_request_duration_seconds`
- `nginx_ingress_controller_response_size_bytes`
- `nginx_ingress_controller_upstream_response_time_seconds`

### NGINX Server Metrics (from exporter)
- `nginx_connections_active`
- `nginx_connections_reading`
- `nginx_connections_writing`
- `nginx_connections_waiting`
- `nginx_http_requests_total`

## Verification Steps

### 1. Check Services
```bash
kubectl get services -n globeco
# Should show:
# - globeco-nginx-metrics (port 9113)
# - nginx-ingress-controller-metrics (port 10254)
```

### 2. Test Metrics Endpoints
```bash
# Test NGINX exporter
kubectl port-forward -n globeco service/globeco-nginx-metrics 9113:9113
curl http://localhost:9113/metrics | head -20

# Test ingress controller (adjust namespace/service as needed)
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 10254:10254
curl http://localhost:10254/metrics | grep nginx_ingress | head -10
```

### 3. Check Prometheus Targets
If you have Prometheus UI access:
```bash
kubectl port-forward -n monitoring service/prometheus 9090:9090
# Visit http://localhost:9090/targets
# Look for nginx-related targets
```

## Troubleshooting

### NGINX Exporter Issues
```bash
# Check exporter logs
kubectl logs -n globeco deployment/globeco-nginx-exporter

# Common issues:
# 1. Cannot reach nginx_status endpoint
# 2. Wrong scrape URI configuration
```

### Ingress Controller Metrics Issues
```bash
# Check if controller has metrics enabled
kubectl describe ingress -n globeco globeco-portfolio-management-portal

# Check controller configuration
kubectl get configmap -n ingress-nginx ingress-nginx-controller -o yaml
```

### Prometheus Discovery Issues
```bash
# Check service annotations
kubectl get service -n globeco globeco-nginx-metrics -o yaml

# Verify annotations:
# prometheus.io/scrape: "true"
# prometheus.io/port: "9113"
# prometheus.io/path: "/metrics"
```

## Alternative: Manual Prometheus Configuration

If automatic discovery doesn't work, add static targets to Prometheus:

```yaml
scrape_configs:
  - job_name: 'nginx-metrics-static'
    static_configs:
      - targets: ['globeco-nginx-metrics.globeco.svc.cluster.local:9113']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'nginx-ingress-static'
    static_configs:
      - targets: ['ingress-nginx-controller.ingress-nginx.svc.cluster.local:10254']
    metrics_path: /metrics
    scrape_interval: 30s
```

## Integration with Existing Monitoring

This setup works alongside your existing:
- ✅ Structured JSON logging
- ✅ OpenTelemetry application metrics
- ✅ Standard Prometheus scraping

The NGINX metrics provide infrastructure-level HTTP observability to complement your application-level monitoring.