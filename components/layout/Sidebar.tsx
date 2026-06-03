'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { authApi, companyChangeRequestsApi, leadsApi } from '@/lib/api'
import { useEffect, useState } from 'react'
import {
  Building2,
  CreditCard,
  Handshake,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/companies', icon: Building2, label: 'Companies' },
  { href: '/requests', icon: Handshake, label: 'Requests' },
  { href: '/leads', icon: Inbox, label: 'Leads' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function OwnerSidebar() {
  const path = usePathname()
  const router = useRouter()
  const [leadUnreadCount, setLeadUnreadCount] = useState(0)
  const [requestUnreadCount, setRequestUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [path])

  useEffect(() => {
    let active = true
    const loadUnread = async () => {
      try {
        const [leads, requests] = await Promise.all([
          leadsApi.list(),
          companyChangeRequestsApi.list(),
        ])
        if (!active) return
        setLeadUnreadCount(leads.filter((lead) => !lead.is_read_by_owner).length)
        setRequestUnreadCount(requests.filter((request) => !request.is_read_by_owner).length)
      } catch {
        if (!active) return
        setLeadUnreadCount(0)
        setRequestUnreadCount(0)
      }
    }
    loadUnread()
    const id = window.setInterval(loadUnread, 20000)
    window.addEventListener('shaqonet:owner-leads-read-updated', loadUnread)
    window.addEventListener('shaqonet:owner-requests-read-updated', loadUnread)
    return () => {
      active = false
      window.clearInterval(id)
      window.removeEventListener('shaqonet:owner-leads-read-updated', loadUnread)
      window.removeEventListener('shaqonet:owner-requests-read-updated', loadUnread)
    }
  }, [])

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('shaqonet_token')
    router.push('/login')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
        />
      ) : null}
      <aside
        aria-label="Owner navigation"
        className={`fixed left-0 top-0 z-50 flex h-screen w-[84vw] max-w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 lg:z-30 lg:w-56 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      <div className="border-b border-[var(--border)] px-4 py-5">
        <Link href="/dashboard" className="flex h-12 min-w-0 items-center overflow-hidden">
          <img src="/logos/shaqonet-logo-gold.svg" alt="ShaqoNet" className="h-9 max-w-full object-contain" />
        </Link>
      </div>

      <nav aria-label="Primary owner navigation" className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(n => {
          const active = path === n.href || path.startsWith(n.href + '/')
          const Icon = n.icon
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setIsOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'border border-[#1d9e7525] bg-[var(--green-glow)] text-[var(--green)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--card)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate">{n.label}</span>
              {(n.href === '/leads' && leadUnreadCount > 0) || (n.href === '/requests' && requestUnreadCount > 0) ? (
                <span className="rounded-full bg-[var(--red)] px-2 py-0.5 text-[10px] font-semibold text-white">
                  {n.href === '/leads' ? leadUnreadCount : requestUnreadCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d9e7540] bg-[var(--green-glow)] text-xs font-bold text-[var(--green)]">
            O
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text)]">Owner</p>
            <p className="truncate text-xs text-[var(--text-3)]">Full access</p>
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
    </>
  )
}
