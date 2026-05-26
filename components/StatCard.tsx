import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon?: ReactNode
  color?: string
  loading?: boolean
}

export function StatCard({ label, value, sub, icon, color = 'text-[var(--text)]', loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--border)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[var(--text-2)]">{label}</p>
        {icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]">
            {icon}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {loading ? <span className="text-[var(--text-3)]">--</span> : value}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--text-3)]">{sub}</p>}
    </div>
  )
}
