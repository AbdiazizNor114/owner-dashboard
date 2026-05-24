'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

const NAV = [
  { href: '/dashboard',   icon: '▣', label: 'Overview'   },
  { href: '/companies',   icon: '🏢', label: 'Companies'  },
  { href: '/billing',     icon: '💳', label: 'Billing'    },
  { href: '/settings',    icon: '⚙', label: 'Settings'   },
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
    <aside className="fixed left-0 top-0 h-screen w-52 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <img src="/logos/shaqonet-logo-light.svg" alt="Shaqonet" className="h-12 w-auto" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(n => {
          const active = path === n.href || path.startsWith(n.href + '/')
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[var(--green-glow)] text-[var(--green)] border border-[#1d9e7525]'
                  : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--card)]'
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-[var(--green-glow)] border border-[#1d9e7540] flex items-center justify-center text-xs font-bold text-[var(--green)]">
            O
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text)]">Owner</p>
            <p className="text-xs text-[var(--text-3)]">Full access</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-[var(--text-3)] hover:text-[var(--red)] transition-colors px-1"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
