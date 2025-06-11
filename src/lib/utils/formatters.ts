/**
 * Shared Formatting Utilities
 * 
 * Common formatting functions used across the application
 * for consistent display of numbers, dates, and currency values.
 */

import { format } from 'date-fns'

/**
 * Format currency values with proper localization
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format currency values with decimal precision
 */
export const formatCurrencyPrecise = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format numbers with commas and proper localization
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format percentage values
 */
export const formatPercentage = (value: number, precision: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value / 100)
}

/**
 * Format date values with consistent format
 */
export const formatDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return format(date, 'MMM dd, yyyy')
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Format date and time values
 */
export const formatDateTime = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return format(date, 'MMM dd, yyyy HH:mm')
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Format file sizes
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format phone numbers
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  
  return phoneNumber
}

/**
 * Format compact numbers (e.g., 1.2K, 1.5M)
 */
export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Format trading quantities
 */
export const formatQuantity = (quantity: number): string => {
  if (Math.abs(quantity) >= 1000000) {
    return `${(quantity / 1000000).toFixed(1)}M`
  } else if (Math.abs(quantity) >= 1000) {
    return `${(quantity / 1000).toFixed(1)}K`
  } else {
    return formatNumber(quantity)
  }
}

/**
 * Format basis points
 */
export const formatBasisPoints = (bps: number): string => {
  return `${formatNumber(bps)} bps`
}

/**
 * Format duration (e.g., "2 hours 30 minutes")
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts = []
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
  if (secs > 0 && hours === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`)
  
  return parts.join(' ') || '0 seconds'
}

export default {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatPhoneNumber,
  formatCompactNumber,
  formatQuantity,
  formatBasisPoints,
  formatDuration,
} 