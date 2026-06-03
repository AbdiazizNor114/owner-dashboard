interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, ...props }: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-[var(--green)] hover:bg-[var(--green-dim)] text-white',
    secondary: 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--muted)]',
    danger: 'bg-[var(--red)] hover:bg-[var(--red-dim)] text-white',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
