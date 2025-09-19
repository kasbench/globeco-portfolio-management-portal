#!/usr/bin/env python3

import requests
import time
from concurrent.futures import ThreadPoolExecutor

class ConnectionPool:
    def __init__(self, base_url, pool_size=5):
        self.base_url = base_url
        self.sessions = []
        self.pool_size = pool_size
        self._warm_up_connections()
    
    def _warm_up_connections(self):
        """Pre-warm connections to avoid first-request delays"""
        print(f"🔥 Warming up {self.pool_size} connections...")
        
        def create_warmed_session():
            session = requests.Session()
            # Make a lightweight request to establish connection
            try:
                session.get(f"{self.base_url}/api/health", timeout=10)
                print("   ✅ Connection warmed up")
                return session
            except Exception as e:
                print(f"   ❌ Failed to warm up connection: {e}")
                return session
        
        with ThreadPoolExecutor(max_workers=self.pool_size) as executor:
            futures = [executor.submit(create_warmed_session) for _ in range(self.pool_size)]
            self.sessions = [future.result() for future in futures]
        
        print(f"🚀 {len(self.sessions)} connections ready!")
    
    def get_session(self):
        """Get a pre-warmed session"""
        if self.sessions:
            return self.sessions.pop()
        else:
            # Fallback: create new session
            return requests.Session()
    
    def return_session(self, session):
        """Return session to pool for reuse"""
        if len(self.sessions) < self.pool_size:
            self.sessions.append(session)

# Example usage
if __name__ == "__main__":
    base_url = "http://globeco.local:32080"
    
    # Create connection pool
    pool = ConnectionPool(base_url, pool_size=3)
    
    # Use pre-warmed connections
    for i in range(5):
        session = pool.get_session()
        
        start_time = time.perf_counter()
        response = session.post(f"{base_url}/api/portfolios/bulk",
                              json=[{"name": f"Warmed Test {i}", "version": 1}])
        elapsed = time.perf_counter() - start_time
        
        print(f"Request {i+1}: {elapsed:.4f} seconds (status: {response.status_code})")
        
        pool.return_session(session)