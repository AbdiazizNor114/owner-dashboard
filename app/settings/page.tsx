'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { authApi, healthApi, OwnerUser } from '@/lib/api'
import {
  Activity,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Inbox,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

type HealthState = {
  status: 'idle' | 'checking' | 'healthy' | 'error'
  message: string
  checkedAt: Date | null
  uptime?: number
}

const controlCards = [
  {
    label: 'Company lifecycle',
    value: 'Create, review, restrict, and restore workspaces.',
    href: '/companies',
    icon: Building2,
  },
  {
    label: 'Billing operations',
    value: 'Review plans, seat risk, and subscription status.',
    href: '/billing',
    icon: CreditCard,
  },
  {
    label: 'Lead approvals',
    value: 'Approve new workspace requests and manager invites.',
    href: '/leads',
    icon: Inbox,
  },
]

const readinessItems = [
  { label: 'Owner authentication', value: 'Enabled' },
  { label: 'Manager invite flow', value: 'Backend-backed' },
  { label: 'Company audit trail', value: 'Available' },
  { label: 'Production CORS', value: 'Configured' },
]

function formatCheckedAt(date: Date | null) {
  if (!date) return 'Not checked yet'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatUptime(seconds?: number) {
  if (!seconds || seconds < 0) return 'Unknown'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profile, setProfile] = useState<OwnerUser | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthState>({
    status: 'idle',
    message: 'Run a check before release work.',
    checkedAt: null,
  })

  useEffect(() => {
    let active = true
    authApi.me()
      .then((result) => {
        if (!active) return
        setProfile(result.profile)
        setProfileError(null)
      })
      .catch((error) => {
        if (!active) return
        setProfile(null)
        setProfileError(error instanceof Error ? error.message : 'Could not load owner profile.')
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const checkHealth = async () => {
    setHealth((current) => ({ ...current, status: 'checking', message: 'Checking API health...' }))
    try {
      const result = await healthApi.check()
      setHealth({
        status: result.status === 'ok' || result.status === 'healthy' ? 'healthy' : 'error',
        message: result.status === 'ok' || result.status === 'healthy'
          ? 'API is responding normally.'
          : `API returned ${result.status}.`,
        checkedAt: new Date(),
        uptime: result.uptime,
      })
    } catch (error) {
      setHealth({
        status: 'error',
        message: error instanceof Error ? error.message : 'API health check failed.',
        checkedAt: new Date(),
      })
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try { await authApi.logout() } catch {}
    localStorage.removeItem('shaqonet_token')
    router.push('/login')
  }

  return (
    <div className="fade-in">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Settings</h1>
          <p className="mt-0.5 text-sm text-[var(--text-2)]">
            Platform account, release readiness, and owner controls.
          </p>
        </div>
        <Button variant="secondary" onClick={checkHealth} disabled={health.status === 'checking'}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${health.status === 'checking' ? 'animate-spin' : ''}`} />
            Check API
          </span>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Owner account</h2>
              <p className="mt-1 text-xs text-[var(--text-3)]">Current platform operator session.</p>
            </div>
            <div className="rounded-full border border-[#1d9e7540] bg-[var(--green-glow)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
              Full access
            </div>
          </div>
          {profileError ? (
            <div className="mb-4 rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">
              {profileError}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
              <p className="text-xs text-[var(--text-3)]">Email</p>
              <p className="mt-1 break-words text-sm font-medium text-[var(--text)]">
                {profileLoading ? 'Loading...' : profile?.email || 'Signed-in owner'}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
              <p className="text-xs text-[var(--text-3)]">Role</p>
              <p className="mt-1 text-sm font-medium text-[var(--text)]">Platform Owner</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-5 w-5 text-[var(--green)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Release health</h2>
              <p className="text-xs text-[var(--text-3)]">Live API connectivity for owner operations.</p>
            </div>
          </div>
          <div className={`rounded-lg border px-4 py-4 ${
            health.status === 'healthy'
              ? 'border-[#1d9e7540] bg-[var(--green-glow)]'
              : health.status === 'error'
                ? 'border-[var(--red)]/40 bg-[var(--red)]/10'
                : 'border-[var(--border)] bg-[var(--surface)]'
          }`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {health.status === 'healthy' ? 'Healthy' : health.status === 'error' ? 'Needs attention' : 'Checking'}
                </p>
                <p className="mt-1 text-sm text-[var(--text-2)]">{health.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-right text-xs sm:min-w-52">
                <div>
                  <p className="text-[var(--text-3)]">Checked</p>
                  <p className="font-medium text-[var(--text)]">{formatCheckedAt(health.checkedAt)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-3)]">Uptime</p>
                  <p className="font-medium text-[var(--text)]">{formatUptime(health.uptime)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--green)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Release readiness</h2>
              <p className="text-xs text-[var(--text-3)]">Core controls needed before wider rollout.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {readinessItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--green)]" />
                  <p className="truncate text-sm font-medium text-[var(--text)]">{item.label}</p>
                </div>
                <p className="shrink-0 text-xs text-[var(--text-3)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Product controls</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {controlCards.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 transition-colors hover:border-[#1d9e7540] hover:bg-[var(--green-glow)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Icon className="h-4 w-4 text-[var(--green)]" />
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--text-3)] transition-colors group-hover:text-[var(--green)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-3)]">{item.value}</p>
                </a>
              )
            })}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--red)] border-opacity-30 rounded-xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--red)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--red)]">Session security</h2>
              <p className="text-sm text-[var(--text)] mb-1">Sign out</p>
              <p className="text-xs text-[var(--text-3)]">You will need to sign in again to access your account</p>
              </div>
            </div>
            <Button variant="danger" onClick={handleLogout} loading={loading}>
              {loading ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
