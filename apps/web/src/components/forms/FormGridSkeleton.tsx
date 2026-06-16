import { FormCardSkeleton } from './FormCardSkeleton'

export function FormGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <FormCardSkeleton key={i} />
      ))}
    </div>
  )
}
