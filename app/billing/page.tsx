'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { companiesApi, Company } from '@/lib/api'
import { EmptyState } from '@/components/EmptyState'
import { StatCard } from '@/components/StatCard'
import { SkeletonCard, SkeletonRow } from '@/components/Skeleton'
import { BadgeDollarSign, Ban, CircleAlert, CircleDollarSign } from 'lucide-react'

const PAID_PLANS: Array<NonNullable<Company['plan']>> = ['starter', 'pro', 'enterprise']

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

export default function BillingPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('shaqonet_token')
    if (!token) {
      router.push('/login')
      return
    }

    companiesApi.list()
      .then(setCompanies)
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [router])

  const stats = useMemo(() => {
    const paying = companies.filter(company => company.status === 'active' && PAID_PLANS.includes(company.plan || 'free')).length
    const pastDue = companies.filter(company => company.status === 'past_due').length
    const cancelled = companies.filter(company => company.status === 'cancelled').length
    const freeOrTrial = companies.filter(company => company.status === 'trial' || (company.plan || 'free') === 'free').length
    return { paying, pastDue, cancelled, freeOrTrial }
  }, [companies])

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Billing</h1>
          <p className="text-sm text-[var(--text-2)] mt-0.5">Plan and payment status across companies</p>
        </div>
        <Link href="/companies" className="px-4 py-2 bg-[var(--green)] hover:bg-[var(--green-dim)] text-white text-sm font-semibold rounded-lg transition-colors">
          Manage companies
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
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
            <StatCard label="Cancelled" value={stats.cancelled} sub="preserved history" icon={<Ban className="h-4 w-4" />} color="text-[var(--red)]" />
          </>
        )}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Company billing states</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Update plans and lifecycle status from Companies.</p>
          </div>
          <Link href="/companies" className="text-xs text-[var(--green)] hover:underline">Edit plans</Link>
        </div>
        <div className="grid px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase tracking-wider"
             style={{ gridTemplateColumns: '1fr 120px 120px 140px 80px' }}>
          <div>Company</div><div>Plan</div><div>Status</div><div>Subscription</div><div></div>
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
            {companies.map(company => (
              <div key={company.id} className="grid items-center px-5 py-3.5 hover:bg-[var(--surface)] transition-colors"
                   style={{ gridTemplateColumns: '1fr 120px 120px 140px 80px' }}>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{company.name}</p>
                  <p className="text-xs text-[var(--text-3)]">{company.industry || 'No industry'}</p>
                </div>
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[company.plan || 'free']}`}>
                    {company.plan || 'free'}
                  </span>
                </div>
                <div className={`text-sm capitalize ${STATUS_COLOR[company.status] || 'text-[var(--text-2)]'}`}>{company.status}</div>
                <div className="text-sm text-[var(--text-2)]">{company.subscriptionStatus || 'none'}</div>
                <Link href={`/companies?open=${company.id}`} className="text-xs text-[var(--green)] hover:underline text-right">
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
