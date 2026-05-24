import OwnerSidebar from '@/components/layout/Sidebar'
import { ReactNode } from 'react'
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <OwnerSidebar />
      <main className="ml-52 min-h-screen"><div className="max-w-5xl mx-auto px-8 py-8">{children}</div></main>
    </div>
  )
}
