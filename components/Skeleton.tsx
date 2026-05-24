export function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse">
      <div className="h-3 bg-[var(--muted)] rounded w-20 mb-3" />
      <div className="h-8 bg-[var(--muted)] rounded w-16 mb-2" />
      <div className="h-3 bg-[var(--muted)] rounded w-24" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-[var(--muted)] rounded w-32 mb-2" />
        <div className="h-3 bg-[var(--muted)] rounded w-24" />
      </div>
      <div className="h-6 bg-[var(--muted)] rounded w-16" />
      <div className="h-4 bg-[var(--muted)] rounded w-12" />
      <div className="h-4 bg-[var(--muted)] rounded w-8" />
      <div className="h-3 bg-[var(--muted)] rounded w-16" />
      <div className="h-4 bg-[var(--muted)] rounded w-12" />
    </div>
  )
}
