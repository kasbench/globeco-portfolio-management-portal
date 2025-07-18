'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Something went wrong</p>
                  <p className="text-sm">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </p>
                  {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs">Error Details</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Export both named and default exports for compatibility
export { ErrorBoundary }
export default ErrorBoundary

// Also create an ErrorDisplay component for compatibility
export const ErrorDisplay: React.FC<{ error: Error | null; onRetry: () => void }> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm">
                {error?.message || 'An unexpected error occurred'}
              </p>
              {process.env.NODE_ENV === 'development' && error?.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">Error Details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button onClick={onRetry} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  )
}