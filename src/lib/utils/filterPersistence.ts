/**
 * Utility functions for persisting filters across page reloads
 */

export interface PersistedFilter {
  field: string
  values: string[]
  label: string
  timestamp: number
}

export interface PersistedFilterState {
  filters: PersistedFilter[]
  expiresAt: number
}

const FILTER_STORAGE_KEY_PREFIX = 'globeco_filters_'
const FILTER_EXPIRY_HOURS = 24 // Filters expire after 24 hours

/**
 * Save filters to localStorage with expiration
 */
export function saveFilters(pageKey: string, filters: any[]): void {
  try {
    const persistedFilters: PersistedFilter[] = filters.map(filter => ({
      field: filter.field,
      values: filter.values,
      label: filter.label,
      timestamp: Date.now()
    }))

    const filterState: PersistedFilterState = {
      filters: persistedFilters,
      expiresAt: Date.now() + (FILTER_EXPIRY_HOURS * 60 * 60 * 1000)
    }

    localStorage.setItem(
      `${FILTER_STORAGE_KEY_PREFIX}${pageKey}`,
      JSON.stringify(filterState)
    )
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error)
  }
}

/**
 * Load filters from localStorage, checking expiration
 */
export function loadFilters(pageKey: string): any[] {
  try {
    const stored = localStorage.getItem(`${FILTER_STORAGE_KEY_PREFIX}${pageKey}`)
    if (!stored) return []

    const filterState: PersistedFilterState = JSON.parse(stored)
    
    // Check if filters have expired
    if (Date.now() > filterState.expiresAt) {
      clearFilters(pageKey)
      return []
    }

    return filterState.filters.map(filter => ({
      field: filter.field,
      values: filter.values,
      label: filter.label
    }))
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error)
    return []
  }
}

/**
 * Clear filters from localStorage
 */
export function clearFilters(pageKey: string): void {
  try {
    localStorage.removeItem(`${FILTER_STORAGE_KEY_PREFIX}${pageKey}`)
  } catch (error) {
    console.warn('Failed to clear filters from localStorage:', error)
  }
}

/**
 * Get all stored filter keys (for cleanup/debugging)
 */
export function getAllFilterKeys(): string[] {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(FILTER_STORAGE_KEY_PREFIX)) {
        keys.push(key.replace(FILTER_STORAGE_KEY_PREFIX, ''))
      }
    }
    return keys
  } catch (error) {
    console.warn('Failed to get filter keys from localStorage:', error)
    return []
  }
}

/**
 * Clean up expired filters
 */
export function cleanupExpiredFilters(): void {
  try {
    const keys = getAllFilterKeys()
    keys.forEach(key => {
      const stored = localStorage.getItem(`${FILTER_STORAGE_KEY_PREFIX}${key}`)
      if (stored) {
        try {
          const filterState: PersistedFilterState = JSON.parse(stored)
          if (Date.now() > filterState.expiresAt) {
            clearFilters(key)
          }
        } catch {
          // If we can't parse it, remove it
          clearFilters(key)
        }
      }
    })
  } catch (error) {
    console.warn('Failed to cleanup expired filters:', error)
  }
} 