'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { companiesApi, Company } from '@/lib/api'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonCard, SkeletonRow } from '@/components/Skeleton'
import { Building2, CheckCircle2, Gem, UsersRound } from 'lucide-react'

const PLAN_COLOR: Record<string, string> = {
  free: 'text-[var(--text-3)] bg-[var(--muted)]',
  starter: 'text-[var(--blue)] bg-[#4f8ef718]',
  pro: 'text-[var(--green)] bg-[var(--green-glow)]',
  enterprise: 'text-[var(--amber)] bg-[#d98f2e18]',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'text-[var(--green)]',
  suspended: 'text-[var(--red)]',
  trial: 'text-[var(--amber)]',
  past_due: 'text-[var(--amber)]',
  restricted: 'text-[var(--red)]',
  cancelled: 'text-[var(--text-3)]',
}

export default function OwnerDashboard() {
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
      .catch((err) => {
        console.error('Error loading companies:', err)
        setCompanies([])
      })
      .finally(() => setLoading(false))
  }, [router])

  const active = companies.filter(c => c.status === 'active').length
  const trial = companies.filter(c => c.status === 'trial').length
  const proPlus = companies.filter(c => c.plan === 'pro' || c.plan === 'enterprise').length
  const totalEmp = companies.reduce((s, c) => s + (c.employeeCount ?? 0), 0)

  return (
    <div className="fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Overview</h1>
          <p className="mt-0.5 text-sm text-[var(--text-2)]">All companies on the platform</p>
        </div>
        <Link
          href="/companies?new=1"
          className="rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-dim)]"
        >
          + Add company
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard label="Total companies" value={companies.length} sub="on platform" icon={<Building2 className="h-4 w-4" />} />
            <StatCard label="Active" value={active} sub={`${trial} in trial`} icon={<CheckCircle2 className="h-4 w-4" />} color="text-[var(--green)]" />
            <StatCard label="Pro / Enterprise" value={proPlus} sub="paying customers" icon={<Gem className="h-4 w-4" />} color="text-[var(--amber)]" />
            <StatCard label="Total employees" value={totalEmp} sub="across all companies" icon={<UsersRound className="h-4 w-4" />} color="text-[var(--blue)]" />
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">All companies</h2>
          <Link href="/companies" className="text-xs text-[var(--green)] hover:underline">Manage all</Link>
        </div>

        {loading ? (
          <>
            <div
              className="grid px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-3)]"
              style={{ gridTemplateColumns: '1fr 100px 90px 80px 90px 60px' }}
            >
              <div>Company</div><div>Plan</div><div>Status</div><div>Employees</div><div>Created</div><div></div>
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : companies.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No companies yet"
            description="Get started by adding your first company to the platform"
            action={{ label: 'Add company', href: '/companies?new=1' }}
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            <div
              className="grid px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-3)]"
              style={{ gridTemplateColumns: '1fr 100px 90px 80px 90px 60px' }}
            >
              <div>Company</div><div>Plan</div><div>Status</div><div>Employees</div><div>Created</div><div></div>
            </div>

            {companies.map(c => (
              <div
                key={c.id}
                className="grid items-center px-5 py-3.5 transition-colors hover:bg-[var(--surface)]"
                style={{ gridTemplateColumns: '1fr 100px 90px 80px 90px 60px' }}
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{c.name}</p>
                  <p className="mono text-xs text-[var(--text-3)]">{c.slug || c.industry || c.id}</p>
                </div>
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLOR[c.plan || 'free']}`}>
                    {c.plan || 'free'}
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-medium capitalize ${STATUS_COLOR[c.status]}`}>
                    <span className="mr-1">●</span>{c.status}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-2)]">{c.employeeCount ?? 0}</div>
                <div className="text-xs text-[var(--text-3)]">
                  {new Date(c.createdAt).toLocaleDateString()}
                </div>
                <div className="flex justify-end">
                  <Link href={`/companies?open=${c.id}`} className="text-xs text-[var(--green)] hover:underline">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
