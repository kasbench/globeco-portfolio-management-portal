'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  maxRetries?: number
  onRetry?: () => void
  showReload?: boolean
}

// Enhanced error display component
export const ErrorDisplay = ({
  title = "Something went wrong",
  message,
  error,
  onRetry,
  onGoHome,
  onGoBack,
  retryCount = 0,
  maxRetries = 3,
  showDetails = false
}: {
  title?: string
  message?: string
  error?: Error | null
  onRetry?: () => void
  onGoHome?: () => void
  onGoBack?: () => void
  retryCount?: number
  maxRetries?: number
  showDetails?: boolean
}) => {
  const canRetry = onRetry && retryCount < maxRetries

  return (
    <Card className="p-8 text-center border-red-200 bg-red-50">
      <div className="mx-auto mb-4">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
      </div>
      
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        {title}
      </h3>
      
      <p className="text-red-700 mb-4">
        {message || error?.message || "An unexpected error occurred while loading the data."}
      </p>

      {retryCount > 0 && (
        <p className="text-sm text-red-600 mb-4">
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {canRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {onGoBack && (
          <Button
            onClick={onGoBack}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
        
        {onGoHome && (
          <Button
            onClick={onGoHome}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>

      {showDetails && error && (
        <details className="mt-6 text-left">
          <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto max-h-32">
            <div className="font-bold">Error:</div>
            <div className="mb-2">{error.message}</div>
            {error.stack && (
              <>
                <div className="font-bold">Stack:</div>
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
              </>
            )}
          </div>
        </details>
      )}
    </Card>
  )
}

// Error boundary class component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // In production, you might want to log to an error reporting service
    // reportError(error, errorInfo)
  }

  handleRetry = () => {
    const { maxRetries = 3, onRetry } = this.props
    const { retryCount } = this.state

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))

      // Call optional retry callback
      if (onRetry) {
        onRetry()
      }

      // Auto-reset retry count after successful render
      this.resetTimeoutId = setTimeout(() => {
        this.setState({ retryCount: 0 })
      }, 10000) // Reset after 10 seconds
    }
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback, maxRetries = 3, showReload = true } = this.props

    if (hasError) {
      // If custom fallback is provided, use it
      if (fallback) {
        return fallback
      }

      // Default error display
      return (
        <ErrorDisplay
          title="Application Error"
          error={error}
          onRetry={this.handleRetry}
          onGoHome={showReload ? this.handleGoHome : undefined}
          onGoBack={this.handleGoBack}
          retryCount={retryCount}
          maxRetries={maxRetries}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      )
    }

    return children
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = (maxRetries: number = 3) => {
  const [error, setError] = React.useState<Error | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  const retry = React.useCallback(() => {
    if (retryCount < maxRetries) {
      setError(null)
      setRetryCount(prev => prev + 1)
    }
  }, [retryCount, maxRetries])

  const reset = React.useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  return {
    error,
    retryCount,
    maxRetries,
    handleError,
    retry,
    reset,
    canRetry: retryCount < maxRetries
  }
} 