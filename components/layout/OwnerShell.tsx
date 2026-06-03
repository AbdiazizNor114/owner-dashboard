import OwnerSidebar from '@/components/layout/Sidebar'
import { ReactNode } from 'react'

export default function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <OwnerSidebar />
      <main id="main-content" tabIndex={-1} className="min-h-screen lg:ml-56">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
