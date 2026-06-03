'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuditLog, companiesApi, Company, CompanySetup, UpdateCompanyInput } from '@/lib/api'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonRow } from '@/components/Skeleton'
import { AlertTriangle, Building2, CheckCircle2, RefreshCw, UsersRound } from 'lucide-react'

const PLAN_COLOR: Record<string, string> = {
  free: 'text-[var(--text-3)] bg-[var(--muted)]',
  starter: 'text-[var(--blue)] bg-[#4f8ef718]',
  pro: 'text-[var(--green)] bg-[var(--green-glow)]',
  enterprise: 'text-[var(--amber)] bg-[#d98f2e18]',
}

const STATUS_DOT: Record<string, string> = {
  active: 'text-[var(--green)]',
  suspended: 'text-[var(--red)]',
  trial: 'text-[var(--amber)]',
  past_due: 'text-[var(--amber)]',
  restricted: 'text-[var(--red)]',
  cancelled: 'text-[var(--text-3)]',
}

const BLANK: UpdateCompanyInput = { name: '', industry: '', plan: 'free', status: 'trial' }
const PLAN_OPTIONS: NonNullable<Company['plan']>[] = ['free', 'starter', 'pro', 'enterprise']
const STATUS_OPTIONS: Company['status'][] = ['trial', 'active', 'past_due', 'restricted', 'cancelled']
const INDUSTRY_OPTIONS = [
  'Healthcare',
  'Retail',
  'Hospitality',
  'Logistics',
  'Cleaning Services',
  'Construction',
  'Security',
  'Education',
  'Manufacturing',
  'Office / Professional Services',
] as const

const MANAGER_BLANK = { email: '' }

type AttentionFilter = 'all' | 'needs_action' | 'incomplete_setup' | 'seat_risk'

function getSeatUsage(company: Company) {
  const used = company.seatCount ?? ((company.employeeCount ?? 0) + (company.managerCount ?? 0) + (company.pendingInviteCount ?? 0))
  const limit = company.seatLimit ?? 5
  const unlimited = company.seatLimit === null
  return {
    used,
    limit,
    unlimited,
    atLimit: !unlimited && used >= limit,
    nearLimit: !unlimited && used >= Math.max(limit - 3, Math.ceil(limit * 0.85)),
  }
}

function getSetupProgress(setup?: CompanySetup) {
  if (!setup) return { completed: 0, total: 6, percent: 0, complete: false }
  const total = setup.progress.total || 6
  const completed = setup.progress.completed || 0
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    complete: completed >= total,
  }
}

function getAttentionReason(company: Company, setup?: CompanySetup) {
  const seats = getSeatUsage(company)
  const setupProgress = getSetupProgress(setup)
  if (company.status === 'past_due') return 'Past due'
  if (company.status === 'restricted') return 'Restricted'
  if (company.status === 'cancelled') return 'Cancelled'
  if (seats.atLimit) return 'Seat limit reached'
  if (seats.nearLimit) return 'Near seat limit'
  if (!setupProgress.complete) return 'Setup incomplete'
  return ''
}

function CompaniesPageContent() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showManagerForm, setShowManagerForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<UpdateCompanyInput>(BLANK)
  const [managerForm, setManagerForm] = useState(MANAGER_BLANK)
  const [managerInviteUrl, setManagerInviteUrl] = useState('')
  const [managerInviteNotice, setManagerInviteNotice] = useState('')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [managerFormError, setManagerFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [setupByCompany, setSetupByCompany] = useState<Record<string, CompanySetup>>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Company['status']>('all')
  const [planFilter, setPlanFilter] = useState<'all' | NonNullable<Company['plan']>>('all')
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all')
  const [pageError, setPageError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('shaqonet_token')
    if (!token) {
      router.push('/login')
      return
    }

    load()
    if (searchParams.get('new') === '1') {
      setShowForm(true)
    }
  }, [router, searchParams])

  async function load() {
    setLoading(true)
    setPageError('')
    try {
      const data = await companiesApi.list()
      setCompanies(data)
      const setupEntries = await Promise.all(
        data.map(async (company) => {
          const setup = await companiesApi.getSetup(company.id).catch(() => null)
          if (!setup) return null
          return { companyId: company.id, setup }
        }),
      )
      const next: Record<string, CompanySetup> = {}
      setupEntries.forEach((entry) => {
        if (!entry) return
        next[entry.companyId] = entry.setup
      })
      setSetupByCompany(next)
      setLastSync(new Date())
      const openCompanyId = searchParams.get('open')
      if (openCompanyId) {
        const company = data.find((item) => item.id === openCompanyId)
        if (company) {
          setSelectedCompany(company)
          setShowViewModal(true)
        }
      }
    } catch (err) {
      setCompanies([])
      setSetupByCompany({})
      setPageError(err instanceof Error ? err.message : 'Failed to load companies')
    }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name?.trim()) {
      setFormError('Name is required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const created = await companiesApi.create({ name: form.name || '', industry: form.industry })
      const finalized = await companiesApi.update(created.id, {
        name: created.name,
        industry: created.industry,
        plan: form.plan || 'free',
        status: form.status || 'trial',
      })
      setCompanies(prev => [finalized, ...prev])
      setForm(BLANK)
      setShowForm(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await companiesApi.delete(id)
      setCompanies(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete company')
    }
    finally { setDeletingId(null) }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany) return
    if (!form.name?.trim()) {
      setFormError('Name is required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const updated = await companiesApi.update(selectedCompany.id, form as UpdateCompanyInput)
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updated : c))
      setSelectedCompany(updated)
      setForm(BLANK)
      setShowEditForm(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  function openEditForm(company: Company) {
    setSelectedCompany(company)
    setForm({
      name: company.name,
      industry: company.industry || '',
      plan: company.plan || 'free',
      status: company.status,
    })
    setShowEditForm(true)
    setFormError('')
  }

  function openViewModal(company: Company) {
    setSelectedCompany(company)
    setShowViewModal(true)
    setAuditLogs([])
    setAuditLoading(true)
    companiesApi.auditLogs(company.id)
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]))
      .finally(() => setAuditLoading(false))
  }

  async function handleInviteManager(e: React.FormEvent) {
    e.preventDefault()
    if (!managerForm.email.trim()) {
      setManagerFormError('Email is required')
      return
    }
    setSaving(true)
    setManagerFormError('')
    setManagerInviteUrl('')
    setManagerInviteNotice('')
    try {
      const result = await companiesApi.inviteManager(selectedCompanyId!, managerForm.email)
      setManagerForm(MANAGER_BLANK)
      setManagerInviteUrl(result.inviteUrl)
      setManagerInviteNotice(result.emailDelivery?.sent ? 'Invite email sent.' : 'Invite created. Email was not sent, use the link below.')
    } catch (err: unknown) {
      setManagerFormError(err instanceof Error ? err.message : 'Failed to invite manager')
    } finally {
      setSaving(false)
    }
  }

  function openManagerForm(companyId: string) {
    setSelectedCompanyId(companyId)
    setShowManagerForm(true)
    setManagerFormError('')
    setManagerInviteUrl('')
    setManagerInviteNotice('')
  }

  async function updateLifecycle(company: Company, updates: UpdateCompanyInput, label: string) {
    const actionCopy: Record<string, string> = {
      Restrict: `Restrict "${company.name}"? Managers keep history, but access should be limited until the issue is resolved.`,
      Cancel: `Cancel "${company.name}"? Company data and audit history will be preserved, but workspace access should stop.`,
      Reactivate: `Reactivate "${company.name}"? This restores the workspace to active access.`,
    }
    if (!confirm(actionCopy[label] ?? `${label} "${company.name}"? Company data and audit history will be preserved.`)) return
    setDeletingId(company.id)
    try {
      const updated = await companiesApi.update(company.id, updates)
      setCompanies(prev => prev.map(c => c.id === company.id ? updated : c))
      if (selectedCompany?.id === company.id) setSelectedCompany(updated)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : `Failed to ${label.toLowerCase()}`)
    } finally {
      setDeletingId(null)
    }
  }

  const stats = useMemo(() => {
    const active = companies.filter((company) => company.status === 'active').length
    const needsAction = companies.filter((company) => Boolean(getAttentionReason(company, setupByCompany[company.id]))).length
    const setupComplete = companies.filter((company) => getSetupProgress(setupByCompany[company.id]).complete).length
    const seatRisk = companies.filter((company) => {
      const seats = getSeatUsage(company)
      return seats.atLimit || seats.nearLimit
    }).length
    return { active, needsAction, setupComplete, seatRisk }
  }, [companies, setupByCompany])

  const filtered = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesPlan = planFilter === 'all' || (c.plan || 'free') === planFilter
    const setup = setupByCompany[c.id]
    const attentionReason = getAttentionReason(c, setup)
    const seats = getSeatUsage(c)
    const setupProgress = getSetupProgress(setup)
    const matchesAttention =
      attentionFilter === 'all' ||
      (attentionFilter === 'needs_action' && Boolean(attentionReason)) ||
      (attentionFilter === 'incomplete_setup' && !setupProgress.complete) ||
      (attentionFilter === 'seat_risk' && (seats.atLimit || seats.nearLimit))
    return matchesSearch && matchesStatus && matchesPlan && matchesAttention
  })

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Companies</h1>
          <p className="mt-0.5 text-sm text-[var(--text-2)]">{companies.length} total workspaces</p>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            {lastSync ? `Last sync ${lastSync.toLocaleTimeString()}` : 'Not synced yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={load} disabled={loading} aria-label="Refresh companies" title="Refresh companies">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => { setShowForm(true); setFormError('') }}>
            + Add company
          </Button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-xl border border-[#e05a5a25] bg-[#e05a5a12] px-4 py-3 text-sm text-[var(--red)]">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium text-[var(--text-2)]">Active companies</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--green)]">{loading ? '--' : stats.active}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium text-[var(--text-2)]">Need action</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--amber)]">{loading ? '--' : stats.needsAction}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium text-[var(--text-2)]">Setup complete</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--blue)]">{loading ? '--' : stats.setupComplete}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium text-[var(--text-2)]">Seat risk</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--red)]">{loading ? '--' : stats.seatRisk}</p>
        </div>
      </div>

      {/* Add company form */}
      {showForm && (
        <div className="bg-[var(--card)] border border-[var(--green)] border-opacity-30 rounded-xl p-5 mb-6 slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">New company</h2>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-3)] hover:text-[var(--text)] text-lg">✕</button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Company name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--green)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Industry</label>
                <select
                  value={form.industry || ''}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Plan</label>
                <select
                  value={form.plan || 'free'}
                  onChange={e => setForm(f => ({ ...f, plan: e.target.value as NonNullable<Company['plan']> }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--blue)]"
                >
                  {PLAN_OPTIONS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Status</label>
                <select
                  value={form.status || 'trial'}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Company['status'] }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--blue)]"
                >
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
            {formError && (
              <p className="text-xs text-[var(--red)] mb-3 bg-[#e05a5a12] px-3 py-2 rounded-lg border border-[#e05a5a25]">{formError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? 'Creating...' : 'Create company'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* View company modal */}
      {showViewModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 slide-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">{selectedCompany.name}</h2>
                <p className="text-xs text-[var(--text-3)]">{getAttentionReason(selectedCompany, setupByCompany[selectedCompany.id]) || 'No urgent owner action'}</p>
              </div>
              <button type="button" aria-label="Close company details" onClick={() => setShowViewModal(false)} className="text-[var(--text-3)] hover:text-[var(--text)] text-lg">✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Company name</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.name}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Industry</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.industry || '—'}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Status</p>
                <div className={`text-xs font-medium capitalize ${STATUS_DOT[selectedCompany.status]}`}>● {selectedCompany.status}</div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Plan</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[selectedCompany.plan || 'free']}`}>
                  {selectedCompany.plan || 'free'}
                </span>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Subscription</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.subscriptionStatus || 'No subscription'}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Seats</p>
                {(() => {
                  const seats = getSeatUsage(selectedCompany)
                  return (
                    <p className={`text-sm ${seats.atLimit ? 'font-semibold text-[var(--red)]' : seats.nearLimit ? 'font-semibold text-[var(--amber)]' : 'text-[var(--text)]'}`}>
                      {seats.unlimited ? `${seats.used} / unlimited` : `${seats.used} / ${seats.limit}`}
                    </p>
                  )
                })()}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">People</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.employeeCount ?? 0} employees · {selectedCompany.managerCount ?? 0} managers</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-xs text-[var(--text-3)] mb-1">Created</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString() : '—'}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:col-span-2">
                {(() => {
                  const setup = getSetupProgress(setupByCompany[selectedCompany.id])
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--text-2)]">Setup progress</p>
                        <p className="text-xs text-[var(--text-3)]">{setup.completed}/{setup.total}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                        <div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${setup.percent}%` }} />
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--text-2)]">Recent audit history</p>
                  {auditLoading ? <span className="text-xs text-[var(--text-3)]">Loading...</span> : null}
                </div>
                {!auditLoading && auditLogs.length === 0 ? (
                  <p className="text-xs text-[var(--text-3)]">No audit events yet.</p>
                ) : (
                  <div className="max-h-40 space-y-2 overflow-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="text-xs">
                        <p className="font-medium text-[var(--text)]">
                          {log.description || `${log.action} ${log.entity_table}`}
                        </p>
                        <p className="text-[var(--text-3)]">
                          {log.actorName || 'System'} · {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-end mt-6">
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
              <Button onClick={() => { setShowViewModal(false); openEditForm(selectedCompany); }}>
                Edit
              </Button>
              <Button variant="secondary" onClick={() => { setShowViewModal(false); openManagerForm(selectedCompany.id); }}>
                Invite manager
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit company form */}
      {showEditForm && selectedCompany && (
        <div className="bg-[var(--card)] border border-[var(--blue)] border-opacity-30 rounded-xl p-5 mb-6 slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Edit {selectedCompany.name}</h2>
            <button onClick={() => setShowEditForm(false)} className="text-[var(--text-3)] hover:text-[var(--text)] text-lg">✕</button>
          </div>
          <form onSubmit={handleUpdate}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Company name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Industry</label>
                <select
                  value={form.industry || ''}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--blue)]"
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Plan</label>
                <select
                  value={form.plan || 'free'}
                  onChange={e => setForm(f => ({ ...f, plan: e.target.value as NonNullable<Company['plan']> }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--blue)]"
                >
                  {PLAN_OPTIONS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Status</label>
                <select
                  value={form.status || 'trial'}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Company['status'] }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--blue)]"
                >
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
            {formError && (
              <p className="text-xs text-[var(--red)] mb-3 bg-[#e05a5a12] px-3 py-2 rounded-lg border border-[#e05a5a25]">{formError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Invite manager form */}
      {showManagerForm && (
        <div className="bg-[var(--card)] border border-[var(--blue)] border-opacity-30 rounded-xl p-5 mb-6 slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Invite manager</h2>
            <button onClick={() => setShowManagerForm(false)} className="text-[var(--text-3)] hover:text-[var(--text)] text-lg">✕</button>
          </div>
          <form onSubmit={handleInviteManager}>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={managerForm.email}
                  onChange={e => setManagerForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="manager@company.com"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
                <p className="mt-1 text-xs text-[var(--text-3)]">They will choose their password from the invite link. The manager can complete name and phone after sign-in.</p>
              </div>
            </div>
            {managerFormError && (
              <p className="text-xs text-[var(--red)] mb-3 bg-[#e05a5a12] px-3 py-2 rounded-lg border border-[#e05a5a25]">{managerFormError}</p>
            )}
            {managerInviteNotice && (
              <p className="mb-3 rounded-lg border border-[var(--green)] bg-[var(--green-glow)] px-3 py-2 text-xs text-[var(--green)]">{managerInviteNotice}</p>
            )}
            {managerInviteUrl && (
              <div className="mb-3 rounded-lg border border-[var(--green)] bg-[var(--green-glow)] p-3">
                <p className="mb-1 text-xs font-semibold text-[var(--green)]">Invite link</p>
                <input readOnly value={managerInviteUrl} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)]" />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowManagerForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? 'Sending...' : 'Create invite'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-64 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--green)]"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | Company['status'])}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value as 'all' | NonNullable<Company['plan']>)}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="all">All plans</option>
          {PLAN_OPTIONS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
        </select>
        <select
          value={attentionFilter}
          onChange={e => setAttentionFilter(e.target.value as AttentionFilter)}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="all">All attention</option>
          <option value="needs_action">Needs action</option>
          <option value="incomplete_setup">Incomplete setup</option>
          <option value="seat_risk">Seat risk</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="hidden px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase tracking-wider lg:grid"
             style={{ gridTemplateColumns: 'minmax(0,1fr) 110px 110px 110px 120px 120px 220px' }}>
          <div>Company</div><div>Industry</div><div>Plan</div><div>Status</div><div>Seats</div><div>Setup</div><div></div>
        </div>

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title={search ? 'No companies match your search' : 'No companies yet'}
            description={search ? 'Try a different search term' : 'Add your first company to get started'}
            action={search ? undefined : { label: 'Add company', href: '/companies?new=1' }}
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map(c => (
              <div key={c.id} className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--surface)] lg:grid lg:items-center"
                   style={{ gridTemplateColumns: 'minmax(0,1fr) 110px 110px 110px 120px 120px 220px' }}>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{c.name}</p>
                  {getAttentionReason(c, setupByCompany[c.id]) ? (
                    <p className="mt-1 text-xs text-[var(--amber)]">{getAttentionReason(c, setupByCompany[c.id])}</p>
                  ) : null}
                </div>
                <div className="text-xs text-[var(--text-2)]">{c.industry || '—'}</div>
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[c.plan || 'free']}`}>
                    {c.plan || 'free'}
                  </span>
                </div>
                <div className={`text-xs font-medium capitalize ${STATUS_DOT[c.status]}`}>● {c.status}</div>
                <div>
                  {(() => {
                    const seats = getSeatUsage(c)
                    return (
                      <p className={`text-sm ${seats.atLimit ? 'font-semibold text-[var(--red)]' : seats.nearLimit ? 'font-semibold text-[var(--amber)]' : 'text-[var(--text-2)]'}`}>
                        {seats.unlimited ? `${seats.used} / ∞` : `${seats.used} / ${seats.limit}`}
                      </p>
                    )
                  })()}
                </div>
                <div>
                  {setupByCompany[c.id] ? (
                    (() => {
                      const setup = getSetupProgress(setupByCompany[c.id])
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${setup.complete ? 'bg-[var(--green-glow)] text-[var(--green)]' : 'bg-[#d98f2e18] text-[var(--amber)]'}`}>
                          {setup.complete ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {setup.completed}/{setup.total}
                        </span>
                      )
                    })()
                  ) : (
                    <span className="text-xs text-[var(--text-3)]">—</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => openViewModal(c)}>
                    View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEditForm(c)}>
                    Edit
                  </Button>
                  {c.status !== 'restricted' && c.status !== 'cancelled' && (
                    <Button variant="secondary" size="sm" onClick={() => updateLifecycle(c, { status: 'restricted' }, 'Restrict')}>
                      Restrict
                    </Button>
                  )}
                  {c.status !== 'cancelled' ? (
                    <Button variant="danger" size="sm" onClick={() => updateLifecycle(c, { status: 'cancelled' }, 'Cancel')} loading={deletingId === c.id}>
                      Cancel
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => updateLifecycle(c, { status: 'active' }, 'Reactivate')} loading={deletingId === c.id}>
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-2)]">Loading companies...</div>}>
      <CompaniesPageContent />
    </Suspense>
  )
}
