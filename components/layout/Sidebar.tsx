'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import {
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/companies', icon: Building2, label: 'Companies' },
  { href: '/leads', icon: Inbox, label: 'Leads' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function OwnerSidebar() {
  const path = usePathname()
  const router = useRouter()

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('shaqonet_token')
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-5">
        <Link href="/dashboard" className="flex h-12 items-center">
          <img src="/logos/shaqonet-logo-transparent-dark.svg" alt="ShaqoNet" className="h-9 w-auto max-w-[175px] object-contain" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(n => {
          const active = path === n.href || path.startsWith(n.href + '/')
          const Icon = n.icon
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'border border-[#1d9e7525] bg-[var(--green-glow)] text-[var(--green)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--card)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              {n.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d9e7540] bg-[var(--green-glow)] text-xs font-bold text-[var(--green)]">
            O
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text)]">Owner</p>
            <p className="text-xs text-[var(--text-3)]">Full access</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-1 text-xs text-[var(--text-3)] transition-colors hover:text-[var(--red)]"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
