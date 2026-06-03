'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { leadsApi, LeadRequest } from '@/lib/api'

const STATUS_OPTIONS: LeadRequest['status'][] = ['new', 'contacted', 'closed']

function notifyLeadReadChange() {
  window.dispatchEvent(new CustomEvent('shaqonet:owner-leads-read-updated'))
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [markingLeadId, setMarkingLeadId] = useState<string | null>(null)
  const [inviteUrlByLead, setInviteUrlByLead] = useState<Record<string, string>>({})
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
      const items = await leadsApi.list()
      setLeads(items)
      setLastSync(new Date())
    } catch (err) {
      setLeads([])
      setError(err instanceof Error ? err.message : 'Failed to load lead requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(leadId: string, status: LeadRequest['status']) {
    setUpdatingId(leadId)
    setError('')
    try {
      const updated = await leadsApi.updateStatus(leadId, status)
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updated : lead)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead status')
    } finally {
      setUpdatingId(null)
    }
  }

  async function markLeadRead(leadId: string) {
    setMarkingLeadId(leadId)
    setError('')
    try {
      const updated = await leadsApi.markRead(leadId)
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updated : lead)))
      notifyLeadReadChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark lead as read')
    } finally {
      setMarkingLeadId(null)
    }
  }

  async function reviewLead(lead: LeadRequest, decision: 'approved' | 'denied') {
    setReviewingId(lead.id)
    setError('')
    try {
      const result = await leadsApi.review(lead.id, { decision })
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? result.lead : item)))
      notifyLeadReadChange()
      if (decision === 'approved' && result.inviteUrl) {
        setInviteUrlByLead((prev) => ({ ...prev, [lead.id]: result.inviteUrl! }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not review this lead right now.'
      setError(message)
    } finally {
      setReviewingId(null)
    }
  }

  async function markAllAsRead() {
    const unread = leads.filter((lead) => !lead.is_read_by_owner)
    if (unread.length === 0) return
    setMarkingAll(true)
    setError('')
    try {
      const results = await Promise.allSettled(unread.map((lead) => leadsApi.markRead(lead.id)))
      const failed = results.filter((result) => result.status === 'rejected').length
      setLeads((prev) =>
        prev.map((lead) => ({ ...lead, is_read_by_owner: true, read_by_owner_at: lead.read_by_owner_at ?? new Date().toISOString() })),
      )
      notifyLeadReadChange()
      if (failed > 0) {
        setError(`${failed} lead${failed === 1 ? '' : 's'} could not be marked read.`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark leads as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = leads.filter((lead) => !lead.is_read_by_owner).length
  const newCount = leads.filter((lead) => lead.status === 'new').length

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Lead Requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-2)]">
            New trial and contact requests from shaqonet.app.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
              {newCount} new
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
              {unreadCount} unread
            </span>
            <span>{lastSync ? `Last sync ${lastSync.toLocaleTimeString()}` : 'Not synced yet'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {markingAll ? 'Marking...' : `Mark all read${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#e05a5a25] bg-[#e05a5a12] px-4 py-3 text-sm text-[var(--red)]">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.9fr] border-b border-[var(--border)] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-3)] md:grid">
          <div>Contact</div>
          <div>Company</div>
          <div>Status</div>
          <div>Received</div>
          <div>Review</div>
        </div>

        {loading ? (
          <div className="space-y-3 px-5 py-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="h-4 w-44 animate-pulse rounded bg-[var(--muted)]" />
                <div className="mt-3 h-3 w-full max-w-md animate-pulse rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--text)]">No lead requests yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-3)]">
              New trial and contact requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {leads.map((lead) => (
              <div key={lead.id} className="px-5 py-4">
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.9fr] md:items-center md:gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text)]">{lead.work_email}</p>
                      {!lead.is_read_by_owner ? (
                        <span className="rounded-full bg-[var(--green-glow)] px-2 py-0.5 text-[10px] font-semibold text-[var(--green)]">NEW</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-3)]">{lead.source}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text)]">{lead.company_name}</p>
                    <p className="text-xs text-[var(--text-3)]">{lead.team_size}</p>
                  </div>
                  <div className="md:hidden">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--text-3)]">Status</p>
                  </div>
                  <div>
                    <select
                      value={lead.status}
                      disabled={updatingId === lead.id}
                      onChange={(event) =>
                        handleStatusChange(lead.id, event.target.value as LeadRequest['status'])
                      }
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)]"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-[var(--text-3)]">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-3)] md:hidden">Received</p>
                    {new Date(lead.created_at).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={reviewingId === lead.id || lead.status !== 'new'}
                      onClick={() => reviewLead(lead, 'approved')}
                      className="rounded-md bg-[var(--green)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={reviewingId === lead.id || lead.status !== 'new'}
                      onClick={() => reviewLead(lead, 'denied')}
                      className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
                    >
                      Deny
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-2)]">
                  {lead.message?.trim() ? lead.message : 'No message provided.'}
                </div>
                {inviteUrlByLead[lead.id] ? (
                  <div className="mt-2 rounded-lg border border-[var(--green)] border-opacity-30 bg-[var(--green-glow)] px-3 py-2 text-xs text-[var(--text)]">
                    Manager invite created:
                    <a
                      href={inviteUrlByLead[lead.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 break-all font-medium text-[var(--green)] hover:underline"
                    >
                      {inviteUrlByLead[lead.id]}
                    </a>
                  </div>
                ) : null}
                {!lead.is_read_by_owner ? (
                  <button
                    type="button"
                    onClick={() => markLeadRead(lead.id)}
                    disabled={markingLeadId === lead.id}
                    className="mt-2 text-xs font-medium text-[var(--green)] hover:underline disabled:opacity-50"
                  >
                    {markingLeadId === lead.id ? 'Marking...' : 'Mark as read'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
