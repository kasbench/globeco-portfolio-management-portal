#!/usr/bin/env python3

import time
import socket
import requests
from contextlib import contextmanager

def test_tcp_connection_timing():
    """Test raw TCP connection establishment timing"""
    print("🔍 Testing TCP Connection Establishment...")
    print("=" * 50)
    
    host = "globeco.local"
    port = 32080
    
    for i in range(3):
        print(f"\n🧪 TCP Connection Test {i+1}:")
        
        start_time = time.perf_counter()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(30)
            sock.connect((host, port))
            connect_time = time.perf_counter() - start_time
            print(f"   TCP connect time: {connect_time:.4f} seconds")
            sock.close()
        except Exception as e:
            connect_time = time.perf_counter() - start_time
            print(f"   TCP connect failed after {connect_time:.4f} seconds: {e}")

def test_http_connection_reuse():
    """Test HTTP connection reuse vs new connections"""
    print("\n🔍 Testing HTTP Connection Reuse...")
    print("=" * 50)
    
    base_url = "http://globeco.local:32080"
    endpoint = "/api/test-minimal"
    
    # Test 1: Session with connection reuse
    print("\n🚀 Test 1: Session with connection reuse")
    with requests.Session() as session:
        for i in range(3):
            start_time = time.perf_counter()
            response = session.get(f"{base_url}{endpoint}")
            elapsed = time.perf_counter() - start_time
            print(f"   Request {i+1}: {elapsed:.4f} seconds (status: {response.status_code})")
    
    # Test 2: New connection each time
    print("\n🐌 Test 2: New connection each time")
    for i in range(3):
        start_time = time.perf_counter()
        response = requests.get(f"{base_url}{endpoint}")
        elapsed = time.perf_counter() - start_time
        print(f"   Request {i+1}: {elapsed:.4f} seconds (status: {response.status_code})")

def test_different_endpoints():
    """Test if the delay affects all endpoints equally"""
    print("\n🔍 Testing Different Endpoints (New Connections)...")
    print("=" * 50)
    
    base_url = "http://globeco.local:32080"
    endpoints = [
        "/api/test-minimal",
        "/api/portfolios/bulk",
        "/api/health"
    ]
    
    for endpoint in endpoints:
        print(f"\n🧪 Testing {endpoint}:")
        start_time = time.perf_counter()
        try:
            if endpoint == "/api/portfolios/bulk":
                response = requests.post(f"{base_url}{endpoint}", 
                                       json=[{"name": "Connection Test", "version": 1}],
                                       headers={"Content-Type": "application/json"})
            else:
                response = requests.get(f"{base_url}{endpoint}")
            elapsed = time.perf_counter() - start_time
            print(f"   Time: {elapsed:.4f} seconds (status: {response.status_code})")
        except Exception as e:
            elapsed = time.perf_counter() - start_time
            print(f"   Failed after {elapsed:.4f} seconds: {e}")

def test_keep_alive_headers():
    """Test with explicit keep-alive headers"""
    print("\n🔍 Testing Keep-Alive Headers...")
    print("=" * 50)
    
    base_url = "http://globeco.local:32080"
    endpoint = "/api/test-minimal"
    
    headers = {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
    }
    
    with requests.Session() as session:
        session.headers.update(headers)
        
        print("🚀 Session with explicit keep-alive:")
        for i in range(3):
            start_time = time.perf_counter()
            response = session.get(f"{base_url}{endpoint}")
            elapsed = time.perf_counter() - start_time
            print(f"   Request {i+1}: {elapsed:.4f} seconds")

if __name__ == "__main__":
    print("🚀 Connection Establishment Debugging")
    print("=" * 60)
    
    test_tcp_connection_timing()
    test_http_connection_reuse()
    test_different_endpoints()
    test_keep_alive_headers()
    
    print("\n📊 Analysis:")
    print("- If TCP connect is slow: Network/infrastructure issue")
    print("- If first HTTP request is slow: HTTP-level connection issue")
    print("- If all endpoints affected equally: General connection issue")
    print("- If keep-alive helps: Connection reuse is the solution")