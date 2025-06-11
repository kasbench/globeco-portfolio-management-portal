import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      requestId: string
    }
  }
} 