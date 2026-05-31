'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { leadsApi, LeadRequest } from '@/lib/api'

const STATUS_OPTIONS: LeadRequest['status'][] = ['new', 'contacted', 'closed']

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [inviteUrlByLead, setInviteUrlByLead] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('shaqonet_token')
    if (!token) {
      router.push('/login')
      return
    }

    leadsApi
      .list()
      .then((items) => setLeads(items))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [router])

  async function handleStatusChange(leadId: string, status: LeadRequest['status']) {
    setUpdatingId(leadId)
    try {
      const updated = await leadsApi.updateStatus(leadId, status)
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updated : lead)))
    } finally {
      setUpdatingId(null)
    }
  }

  async function markLeadRead(leadId: string) {
    const updated = await leadsApi.markRead(leadId)
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updated : lead)))
  }

  async function reviewLead(lead: LeadRequest, decision: 'approved' | 'denied') {
    setReviewingId(lead.id)
    setError('')
    try {
      const result = await leadsApi.review(lead.id, { decision })
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? result.lead : item)))
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
    try {
      await Promise.all(unread.map((lead) => leadsApi.markRead(lead.id).catch(() => null)))
      setLeads((prev) =>
        prev.map((lead) => ({ ...lead, is_read_by_owner: true, read_by_owner_at: lead.read_by_owner_at ?? new Date().toISOString() })),
      )
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = leads.filter((lead) => !lead.is_read_by_owner).length

  return (
    <div className="fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[var(--text)]">Lead Requests</h1>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : `Mark all as read${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        </div>
        <p className="mt-0.5 text-sm text-[var(--text-2)]">
          New trial and contact requests from shaqonet.app
        </p>
        {error ? (
          <p className="mt-2 rounded-lg border border-[#e05a5a25] bg-[#e05a5a12] px-3 py-2 text-sm text-[var(--red)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.9fr] border-b border-[var(--border)] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-3)] md:grid">
          <div>Contact</div>
          <div>Company</div>
          <div>Status</div>
          <div>Received</div>
          <div>Review</div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-[var(--text-3)]">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[var(--text-3)]">No lead requests yet.</div>
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
                    className="mt-2 text-xs font-medium text-[var(--green)] hover:underline"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
