'use client'

import { useState, useEffect } from 'react'
import { withFetchTelemetry } from '@/lib/telemetry-axios'
import { BlotterResponseDTO } from '@/types/trade'
import { tradeService } from '@/lib/api/tradeService'

interface UseBlottersResult {
  blotters: BlotterResponseDTO[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Cache for blotters with 5-minute TTL
interface BlotterCache {
  data: BlotterResponseDTO[]
  timestamp: number
  ttl: number
}

let blotterCache: BlotterCache | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Hook for fetching and caching blotters with 5-minute TTL
 * Uses the Trade Service API GET /api/v1/blotters endpoint
 */
export function useBlotters(): UseBlottersResult {
  const [blotters, setBlotters] = useState<BlotterResponseDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchBlotters = async (useCache: boolean = true) => {
    try {
      setIsLoading(true)
      setError(null)

      // Check cache first if useCache is true
      if (useCache && blotterCache) {
        const now = Date.now()
        const cacheAge = now - blotterCache.timestamp
        
        if (cacheAge < blotterCache.ttl) {
          console.log('Using cached blotters data')
          setBlotters(blotterCache.data)
          return
        } else {
          console.log('Blotter cache expired, fetching fresh data')
        }
      }

      console.log('Fetching blotters from /api/blotters API route')
      const res = await withFetchTelemetry(
        async () => fetch('/api/blotters'),
        'fetchBlotters',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to fetch blotters')
      const data = await res.json()
      
      // Update cache
      blotterCache = {
        data,
        timestamp: Date.now(),
        ttl: CACHE_TTL
      }
      
      setBlotters(data)
      console.log(`Loaded ${data.length} blotters with cache TTL of ${CACHE_TTL / 1000}s`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load blotters')
      console.error('Error fetching blotters:', error)
      setError(error)
      
      // If cache exists but is expired, use it as fallback
      if (blotterCache && blotterCache.data.length > 0) {
        console.log('Using expired cache as fallback for blotters')
        setBlotters(blotterCache.data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await fetchBlotters(false) // Force refresh, ignore cache
  }

  useEffect(() => {
    fetchBlotters()
  }, [])

  return {
    blotters,
    isLoading,
    error,
    refetch
  }
}

/**
 * Utility function to get cached blotters synchronously
 * Returns empty array if cache is empty or expired
 */
export function getCachedBlotters(): BlotterResponseDTO[] {
  if (!blotterCache) return []
  
  const now = Date.now()
  const cacheAge = now - blotterCache.timestamp
  
  if (cacheAge < blotterCache.ttl) {
    return blotterCache.data
  }
  
  return []
}

/**
 * Utility function to clear the blotter cache
 * Useful for testing or forcing a refresh
 */
export function clearBlotterCache(): void {
  blotterCache = null
  console.log('Blotter cache cleared')
} 