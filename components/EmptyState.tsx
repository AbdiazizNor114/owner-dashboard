interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-sm font-medium text-[var(--text)] mb-2">{title}</h3>
      <p className="text-xs text-[var(--text-3)] mb-4 max-w-xs">{description}</p>
      {action && (
        <a
          href={action.href}
          className="text-sm text-[var(--green)] font-medium hover:underline"
        >
          {action.label} →
        </a>
      )}
    </div>
  )
}
