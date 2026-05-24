interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon?: string
  color?: string
  loading?: boolean
}

export function StatCard({ label, value, sub, icon, color = 'text-[var(--text)]', loading }: StatCardProps) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border)] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[var(--text-2)]">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {loading ? <span className="text-[var(--text-3)]">—</span> : value}
      </p>
      {sub && <p className="text-xs text-[var(--text-3)] mt-1">{sub}</p>}
    </div>
  )
}
