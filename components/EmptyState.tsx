import { Building2 } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text-2)]">
        {icon ?? <Building2 className="h-6 w-6" />}
      </span>
      <h3 className="mb-2 text-sm font-medium text-[var(--text)]">{title}</h3>
      <p className="mb-4 max-w-xs text-xs text-[var(--text-3)]">{description}</p>
      {action && (
        <a
          href={action.href}
          className="text-sm font-medium text-[var(--green)] hover:underline"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
