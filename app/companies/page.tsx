'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { companiesApi, Company, CreateCompanyInput } from '@/lib/api'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonRow } from '@/components/Skeleton'

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
}

const BLANK: CreateCompanyInput = { name: '', industry: '' }

const MANAGER_BLANK = { email: '', name: '', password: '', confirmPassword: '' }

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showManagerForm, setShowManagerForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<CreateCompanyInput>(BLANK)
  const [managerForm, setManagerForm] = useState(MANAGER_BLANK)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [managerFormError, setManagerFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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
    try {
      const data = await companiesApi.list()
      console.log('Companies loaded:', data)
      setCompanies(data)
    } catch (err) {
      console.error('Error loading companies:', err)
      setCompanies([])
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
      const created = await companiesApi.create({ name: form.name, industry: form.industry })
      setCompanies(prev => [created, ...prev])
      setForm(BLANK)
      setShowForm(false)
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
    } catch {}
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
      const updated = await companiesApi.update(selectedCompany.id, { name: form.name, industry: form.industry })
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updated : c))
      setSelectedCompany(updated)
      setForm(BLANK)
      setShowEditForm(false)
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
    })
    setShowEditForm(true)
    setFormError('')
  }

  function openViewModal(company: Company) {
    setSelectedCompany(company)
    setShowViewModal(true)
  }

  async function handleCreateManager(e: React.FormEvent) {
    e.preventDefault()
    if (!managerForm.email.trim() || !managerForm.name.trim() || !managerForm.password.trim()) {
      setManagerFormError('All fields are required')
      return
    }
    if (managerForm.password !== managerForm.confirmPassword) {
      setManagerFormError('Passwords do not match')
      return
    }
    if (managerForm.password.length < 8) {
      setManagerFormError('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    setManagerFormError('')
    try {
      await companiesApi.createManager(selectedCompanyId!, {
        email: managerForm.email,
        name: managerForm.name,
        password: managerForm.password,
      })
      setManagerForm(MANAGER_BLANK)
      setShowManagerForm(false)
      alert('Manager account created successfully! The manager can now log in to the manager dashboard.')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manager'
      if (errorMessage.includes('already exists')) {
        setManagerFormError('A user with this email already exists. Please use a different email.')
      } else {
        setManagerFormError(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  function openManagerForm(companyId: string) {
    setSelectedCompanyId(companyId)
    setShowManagerForm(true)
    setManagerFormError('')
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Companies</h1>
          <p className="text-sm text-[var(--text-2)] mt-0.5">{companies.length} total</p>
        </div>
        <Button onClick={() => { setShowForm(true); setFormError('') }}>
          + Add company
        </Button>
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
                <input
                  value={form.industry}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  placeholder="Healthcare, Retail, etc."
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--green)]"
                />
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
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md slide-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">{selectedCompany.name}</h2>
              <button onClick={() => setShowViewModal(false)} className="text-[var(--text-3)] hover:text-[var(--text)] text-lg">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[var(--text-3)] mb-1">Company name</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] mb-1">Industry</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.industry || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] mb-1">Status</p>
                <div className={`text-xs font-medium capitalize ${STATUS_DOT[selectedCompany.status]}`}>● {selectedCompany.status}</div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] mb-1">Employees</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.employeeCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] mb-1">Managers</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.managerCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-3)] mb-1">Created</p>
                <p className="text-sm text-[var(--text)]">{selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
              <Button onClick={() => { setShowViewModal(false); openEditForm(selectedCompany); }}>
                Edit
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
                <input
                  value={form.industry}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  placeholder="Healthcare, Retail, etc."
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
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

      {/* Add manager form */}
      {showManagerForm && (
        <div className="bg-[var(--card)] border border-[var(--blue)] border-opacity-30 rounded-xl p-5 mb-6 slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Add Manager</h2>
            <button onClick={() => setShowManagerForm(false)} className="text-[var(--text-3)] hover:text-[var(--text)] text-lg">✕</button>
          </div>
          <form onSubmit={handleCreateManager}>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Manager name *</label>
                <input
                  value={managerForm.name}
                  onChange={e => setManagerForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={managerForm.email}
                  onChange={e => setManagerForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="manager@company.com"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Password *</label>
                <input
                  type="password"
                  value={managerForm.password}
                  onChange={e => setManagerForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="•••••••• (min 8 characters)"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1.5">Confirm password *</label>
                <input
                  type="password"
                  value={managerForm.confirmPassword}
                  onChange={e => setManagerForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>
            </div>
            {managerFormError && (
              <p className="text-xs text-[var(--red)] mb-3 bg-[#e05a5a12] px-3 py-2 rounded-lg border border-[#e05a5a25]">{managerFormError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowManagerForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {saving ? 'Creating...' : 'Create manager account'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-64 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--green)]"
        />
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="grid px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase tracking-wider"
             style={{ gridTemplateColumns: '1fr 120px 90px 80px 100px' }}>
          <div>Company</div><div>Industry</div><div>Status</div><div>Employees</div><div></div>
        </div>

        {loading ? (
          <>
            <div className="grid px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] text-xs font-medium text-[var(--text-3)] uppercase tracking-wider"
                 style={{ gridTemplateColumns: '1fr 120px 90px 80px 100px' }}>
              <div>Company</div><div>Industry</div><div>Status</div><div>Employees</div><div></div>
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🏢"
            title={search ? 'No companies match your search' : 'No companies yet'}
            description={search ? 'Try a different search term' : 'Add your first company to get started'}
            action={search ? undefined : { label: 'Add company', href: '/companies?new=1' }}
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map(c => (
              <div key={c.id} className="grid items-center px-5 py-3.5 hover:bg-[var(--surface)] transition-colors"
                   style={{ gridTemplateColumns: '1fr 120px 90px 80px 100px' }}>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{c.name}</p>
                </div>
                <div className="text-xs text-[var(--text-2)]">{c.industry || '—'}</div>
                <div className={`text-xs font-medium capitalize ${STATUS_DOT[c.status]}`}>● {c.status}</div>
                <div className="text-sm text-[var(--text-2)]">{c.employeeCount ?? 0}</div>
                <div className="flex items-center gap-3 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => openViewModal(c)}>
                    View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openManagerForm(c.id)}>
                    + Add Manager
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEditForm(c)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(c.id, c.name)}
                    loading={deletingId === c.id}
                  >
                    {deletingId === c.id ? '...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
