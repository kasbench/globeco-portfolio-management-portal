import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  )
}

// Enhanced skeleton components for different data types
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={`skeleton-row-${index}`} className="border-b border-slate-200">
          <td className="p-4">
            <Skeleton className="h-4 w-8" />
          </td>
          <td className="p-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </td>
          <td className="p-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </td>
          <td className="p-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
          </td>
          <td className="p-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-6 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function ExpandedContentSkeleton() {
  return (
    <div className="p-6 bg-slate-25 border-t border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton key={`card-skeleton-${index}`} />
        ))}
      </div>
      
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`nested-skeleton-${index}`} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, ExpandedContentSkeleton } 