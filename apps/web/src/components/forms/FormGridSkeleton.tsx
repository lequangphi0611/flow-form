import { FormCardSkeleton } from './FormCardSkeleton'

const SKELETON_CARD_COUNT = 6

export function FormGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
        <FormCardSkeleton key={i} />
      ))}
    </div>
  )
}
