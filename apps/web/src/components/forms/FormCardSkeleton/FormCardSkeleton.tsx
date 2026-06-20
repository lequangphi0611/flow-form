import { Skeleton } from '@/components/ui/skeleton'

export function FormCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <div className="space-y-1 pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}
