#!/bin/bash

echo "🔍 Finding OpenTelemetry Collector in the cluster..."
echo "=================================================="

echo ""
echo "🔍 Searching for collector pods in all namespaces..."
kubectl get pods --all-namespaces | grep -i collector

echo ""
echo "🔍 Searching for collector deployments in all namespaces..."
kubectl get deployments --all-namespaces | grep -i collector

echo ""
echo "🔍 Searching for collector services in all namespaces..."
kubectl get services --all-namespaces | grep -i collector

echo ""
echo "🔍 Searching for otel-related resources..."
kubectl get pods --all-namespaces | grep -i otel
kubectl get services --all-namespaces | grep -i otel

echo ""
echo "🔍 Checking monitoring namespace specifically..."
kubectl get all -n monitoring

echo ""
echo "🔍 Checking if there are any opentelemetry-related resources..."
kubectl get all --all-namespaces | grep -i opentelemetry

echo ""
echo "🔍 Looking for any telemetry or tracing related services..."
kubectl get services --all-namespaces | grep -E "(jaeger|prometheus|grafana|tempo|otel|collector|tracing)"