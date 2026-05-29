import OwnerSidebar from '@/components/layout/Sidebar'
import { ReactNode } from 'react'

export default function RequestsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <OwnerSidebar />
      <main className="min-h-screen lg:ml-56">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  )
}
