'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { companiesApi, Company } from '@/lib/api'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { StatCard } from '@/components/StatCard'
import { SkeletonCard, SkeletonRow } from '@/components/Skeleton'
import { ArrowUpRight, BadgeDollarSign, Ban, CircleAlert, CircleDollarSign, RefreshCw } from 'lucide-react'

const PAID_PLANS: Array<NonNullable<Company['plan']>> = ['starter', 'pro', 'enterprise']
const PLAN_OPTIONS: NonNullable<Company['plan']>[] = ['free', 'starter', 'pro', 'enterprise']
const STATUS_OPTIONS: Company['status'][] = ['trial', 'active', 'past_due', 'restricted', 'cancelled']

const PLAN_COLOR: Record<string, string> = {
  free: 'text-[var(--text-3)] bg-[var(--muted)]',
  starter: 'text-[var(--blue)] bg-[#4f8ef718]',
  pro: 'text-[var(--green)] bg-[var(--green-glow)]',
  enterprise: 'text-[var(--amber)] bg-[#d98f2e18]',
}

const STATUS_COLOR: Record<string, string> = {
  trial: 'text-[var(--amber)]',
  active: 'text-[var(--green)]',
  past_due: 'text-[var(--amber)]',
  restricted: 'text-[var(--red)]',
  cancelled: 'text-[var(--text-3)]',
}

function formatSeatUsage(company: Company) {
  const used = company.seatCount ?? ((company.employeeCount ?? 0) + (company.managerCount ?? 0) + (company.pendingInviteCount ?? 0))
  if (company.seatLimit === null) return `${used} / unlimited`
  return `${used} / ${company.seatLimit ?? 5}`
}

function getSeatUsage(company: Company) {
  const used = company.seatCount ?? ((company.employeeCount ?? 0) + (company.managerCount ?? 0) + (company.pendingInviteCount ?? 0))
  const limit = company.seatLimit ?? 5
  const isUnlimited = company.seatLimit === null
  return {
    used,
    limit,
    isUnlimited,
    atLimit: !isUnlimited && used >= limit,
    nearLimit: !isUnlimited && used >= Math.max(limit - 3, Math.ceil(limit * 0.85)),
  }
}

function getAttentionReason(company: Company) {
  const seats = getSeatUsage(company)
  if (company.status === 'past_due') return 'Payment is past due'
  if (company.status === 'restricted') return 'Workspace is restricted'
  if (company.status === 'cancelled') return 'Workspace is cancelled'
  if (seats.atLimit) return 'Seat limit reached'
  if (seats.nearLimit) return 'Near seat limit'
  return ''
}

export default function BillingPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('shaqonet_token')
    if (!token) {
      router.push('/login')
      return
    }

    load()
  }, [router])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await companiesApi.list()
      setCompanies(data)
      setLastSync(new Date())
    } catch (err) {
      setCompanies([])
      setError(err instanceof Error ? err.message : 'Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  async function updateBillingCompany(company: Company, updates: Partial<Pick<Company, 'plan' | 'status'>>) {
    setUpdatingId(company.id)
    setError('')
    try {
      const updated = await companiesApi.update(company.id, updates)
      setCompanies((current) => current.map((item) => (item.id === company.id ? updated : item)))
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company billing')
    } finally {
      setUpdatingId(null)
    }
  }

  const stats = useMemo(() => {
    const paying = companies.filter(company => company.status === 'active' && PAID_PLANS.includes(company.plan || 'free')).length
    const pastDue = companies.filter(company => company.status === 'past_due').length
    const cancelled = companies.filter(company => company.status === 'cancelled').length
    const freeOrTrial = companies.filter(company => company.status === 'trial' || (company.plan || 'free') === 'free').length
    const atLimit = companies.filter(company => company.seatLimit !== null && (company.seatCount ?? 0) >= (company.seatLimit ?? 5)).length
    return { paying, pastDue, cancelled, freeOrTrial, atLimit }
  }, [companies])

  const attentionCompanies = useMemo(
    () => companies
      .map((company) => ({ company, reason: getAttentionReason(company) }))
      .filter((item) => item.reason)
      .slice(0, 5),
    [companies],
  )

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Billing</h1>
          <p className="mt-0.5 text-sm text-[var(--text-2)]">Plan, payment, and seat capacity across companies.</p>
          <p className="mt-2 text-xs text-[var(--text-3)]">
            {lastSync ? `Last sync ${lastSync.toLocaleTimeString()}` : 'Not synced yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={load} disabled={loading} aria-label="Refresh billing" title="Refresh billing">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/companies" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-dim)]">
            Manage companies
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#e05a5a25] bg-[#e05a5a12] px-4 py-3 text-sm text-[var(--red)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard label="Paying companies" value={stats.paying} sub="active paid plans" icon={<BadgeDollarSign className="h-4 w-4" />} color="text-[var(--green)]" />
            <StatCard label="Past due" value={stats.pastDue} sub="needs payment action" icon={<CircleAlert className="h-4 w-4" />} color="text-[var(--amber)]" />
            <StatCard label="Free / trial" value={stats.freeOrTrial} sub="not paying yet" icon={<CircleDollarSign className="h-4 w-4" />} />
            <StatCard label="At seat limit" value={stats.atLimit} sub="upgrade candidates" icon={<Ban className="h-4 w-4" />} color="text-[var(--red)]" />
          </>
        )}
      </div>

      {!loading && attentionCompanies.length > 0 ? (
        <section className="rounded-xl border border-[#d98f2e40] bg-[var(--card)] p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Needs attention</h2>
              <p className="text-xs text-[var(--text-3)]">Payment, lifecycle, and seat-limit risks.</p>
            </div>
            <Link href="/companies" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--green)] hover:underline">
              Open companies <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {attentionCompanies.map(({ company, reason }) => (
              <Link
                key={company.id}
                href={`/companies?open=${company.id}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition-colors hover:border-[var(--amber)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{company.name}</p>
                    <p className="text-xs text-[var(--text-3)]">{reason}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PLAN_COLOR[company.plan || 'free']}`}>
                    {company.plan || 'free'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Company billing states</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Change plans and lifecycle status with owner-level controls.</p>
          </div>
          <Link href="/companies" className="text-xs text-[var(--green)] hover:underline">Edit plans</Link>
        </div>
        <div className="hidden px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase tracking-wider md:grid"
             style={{ gridTemplateColumns: '1fr 120px 120px 140px 130px 80px' }}>
          <div>Company</div><div>Plan</div><div>Status</div><div>Subscription</div><div>Seats</div><div></div>
        </div>
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : companies.length === 0 ? (
          <EmptyState
            icon={<BadgeDollarSign className="h-6 w-6" />}
            title="No billing data yet"
            description="Add companies and assign plans to start tracking billing status"
            action={{ label: 'Add company', href: '/companies?new=1' }}
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {companies.map(company => {
              const seats = getSeatUsage(company)
              const attentionReason = getAttentionReason(company)
              return (
              <div key={company.id} className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--surface)] md:grid md:items-center"
                   style={{ gridTemplateColumns: 'minmax(0,1fr) 120px 120px 140px 130px 80px' }}>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{company.name}</p>
                  <p className="text-xs text-[var(--text-3)]">{company.industry || 'No industry'}</p>
                  {attentionReason ? (
                    <p className="mt-1 text-xs text-[var(--amber)]">{attentionReason}</p>
                  ) : null}
                </div>
                <div>
                  <select
                    value={company.plan || 'free'}
                    disabled={updatingId === company.id}
                    onChange={(event) => updateBillingCompany(company, { plan: event.target.value as NonNullable<Company['plan']> })}
                    className={`rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold capitalize ${PLAN_COLOR[company.plan || 'free']}`}
                  >
                    {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                  </select>
                </div>
                <div>
                  <select
                    value={company.status}
                    disabled={updatingId === company.id}
                    onChange={(event) => updateBillingCompany(company, { status: event.target.value as Company['status'] })}
                    className={`rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs capitalize ${STATUS_COLOR[company.status] || 'text-[var(--text-2)]'}`}
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="text-sm text-[var(--text-2)]">{company.subscriptionStatus || 'none'}</div>
                <div>
                  <p className={`text-sm ${seats.atLimit ? 'font-semibold text-[var(--red)]' : seats.nearLimit ? 'font-semibold text-[var(--amber)]' : 'text-[var(--text-2)]'}`}>
                    {formatSeatUsage(company)}
                  </p>
                  {(company.pendingInviteCount ?? 0) > 0 ? (
                    <p className="text-xs text-[var(--text-3)]">{company.pendingInviteCount} pending</p>
                  ) : null}
                </div>
                <Link href={`/companies?open=${company.id}`} className="text-xs text-[var(--green)] hover:underline text-right">
                  Open
                </Link>
              </div>
            )})}
          </div>
        )}
      </section>
    </div>
  )
}
