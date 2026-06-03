'use client'
import { useEffect, useState } from 'react'
import {
  companyChangeRequestsApi,
  CompanyChangeRequest,
  CompanyChangeRequestTimelineEvent,
} from '@/lib/api'
import { Button } from '@/components/Button'

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-[#d98f2e30] bg-[#d98f2e12] text-[var(--amber)]',
  approved: 'border-[var(--green)] bg-[var(--green-glow)] text-[var(--green)]',
  denied: 'border-[#e05a5a25] bg-[#e05a5a12] text-[var(--red)]',
}

function formatPlan(plan?: string | null) {
  if (!plan) return 'Plan'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function requestTitle(request: CompanyChangeRequest) {
  if (request.request_type === 'change_plan') {
    return `Change plan to ${formatPlan(request.requested_plan)}`
  }
  return 'Reactivate company'
}

function requestSubtitle(request: CompanyChangeRequest) {
  if (request.request_type === 'change_plan') return 'Subscription approval'
  return 'Company access approval'
}

function statusClass(status: string) {
  return STATUS_STYLES[status] ?? 'border-[var(--border)] bg-[var(--muted)] text-[var(--text-2)]'
}

function notifyRequestReadChange() {
  window.dispatchEvent(new CustomEvent('shaqonet:owner-requests-read-updated'))
}

export default function OwnerRequestsPage() {
  const [requests, setRequests] = useState<CompanyChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [ownerNote, setOwnerNote] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [timelineByRequest, setTimelineByRequest] = useState<Record<string, CompanyChangeRequestTimelineEvent[]>>({})
  const [markingAll, setMarkingAll] = useState(false)
  const [markingRequestId, setMarkingRequestId] = useState<string | null>(null)

  useEffect(() => {
    load()
    const id = window.setInterval(() => {
      load()
    }, 20000)
    return () => window.clearInterval(id)
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await companyChangeRequestsApi.list()
      setRequests(data)
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load owner requests')
    } finally {
      setLoading(false)
    }
  }

  async function review(request: CompanyChangeRequest, decision: 'approved' | 'denied') {
    setWorkingId(request.id)
    setError('')
    try {
      const updated = await companyChangeRequestsApi.review(request.id, {
        decision,
        ownerNote: ownerNote[request.id]?.trim() || undefined,
      })
      setRequests((prev) => prev.map((item) => (item.id === request.id ? updated : item)))
      setOwnerNote((prev) => ({ ...prev, [request.id]: '' }))
      notifyRequestReadChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setWorkingId(null)
    }
  }

  async function toggleTimeline(requestId: string) {
    if (timelineByRequest[requestId]) {
      setTimelineByRequest((prev) => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })
      return
    }
    setError('')
    try {
      const timeline = await companyChangeRequestsApi.timeline(requestId)
      setTimelineByRequest((prev) => ({ ...prev, [requestId]: timeline }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request timeline')
    }
  }

  async function markRequestRead(requestId: string) {
    setMarkingRequestId(requestId)
    setError('')
    try {
      const updated = await companyChangeRequestsApi.markRead(requestId)
      setRequests((prev) => prev.map((item) => (item.id === requestId ? updated : item)))
      notifyRequestReadChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark request as read')
    } finally {
      setMarkingRequestId(null)
    }
  }

  async function markAllAsRead() {
    const unread = requests.filter((request) => !request.is_read_by_owner)
    if (unread.length === 0) return
    setMarkingAll(true)
    setError('')
    try {
      const results = await Promise.allSettled(unread.map((request) => companyChangeRequestsApi.markRead(request.id)))
      const failed = results.filter((result) => result.status === 'rejected').length
      setRequests((prev) =>
        prev.map((request) => ({
          ...request,
          is_read_by_owner: true,
          owner_read_at: request.owner_read_at ?? new Date().toISOString(),
        })),
      )
      notifyRequestReadChange()
      if (failed > 0) {
        setError(`${failed} request${failed === 1 ? '' : 's'} could not be marked read.`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark requests as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'pending').length
  const unreadCount = requests.filter((request) => !request.is_read_by_owner).length
  const reviewedCount = requests.length - pendingCount

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-2)]">
            Review manager requests for plan changes and company access.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
              {pendingCount} pending
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
              {unreadCount} unread
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
              {reviewedCount} reviewed
            </span>
            <span>Auto-sync every 20s{lastSync ? ` - Last sync ${lastSync.toLocaleTimeString()}` : ''}</span>
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
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Owner review queue</h2>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">Approve or deny manager requests with an owner note.</p>
        </div>
        {loading ? (
          <div className="space-y-3 px-4 py-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="h-4 w-44 animate-pulse rounded bg-[var(--muted)]" />
                <div className="mt-3 h-3 w-full max-w-md animate-pulse rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--text)]">No company requests</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-3)]">
              Manager plan and access requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {requests.map((request) => {
              const pending = request.status === 'pending'
              const timeline = timelineByRequest[request.id]
              const timelineOpen = Boolean(timeline)
              return (
                <article key={request.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--text)]">
                          {request.companies?.name || request.company_id}
                        </h3>
                        {!request.is_read_by_owner ? (
                          <span className="rounded-full bg-[var(--green-glow)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--green)]">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-3)]">
                        {requestTitle(request)} - {requestSubtitle(request)} - Created {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  {request.manager_note ? (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--text-3)]">Manager note</p>
                      <p className="mt-1 text-sm text-[var(--text-2)]">{request.manager_note}</p>
                    </div>
                  ) : null}

                  {pending ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                      <label className="mb-1 block text-xs font-medium text-[var(--text-3)]">Owner response note</label>
                      <div className="flex flex-col gap-2 lg:flex-row">
                        <input
                          value={ownerNote[request.id] || ''}
                          onChange={(e) =>
                            setOwnerNote((prev) => ({ ...prev, [request.id]: e.target.value }))
                          }
                          placeholder="Explain the decision..."
                          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:border-[var(--green)] focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => review(request, 'approved')}
                            loading={workingId === request.id}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => review(request, 'denied')}
                            loading={workingId === request.id}
                          >
                            Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : request.owner_note ? (
                    <div className="rounded-lg border border-[var(--green)] bg-[var(--green-glow)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--green)]">Owner note</p>
                      <p className="mt-1 text-sm text-[var(--green)]">{request.owner_note}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTimeline(request.id)}
                      className="text-xs font-medium text-[var(--green)] hover:underline"
                    >
                      {timelineOpen ? 'Hide timeline' : 'View timeline'}
                    </button>
                    {!request.is_read_by_owner ? (
                      <button
                        type="button"
                        onClick={() => markRequestRead(request.id)}
                        disabled={markingRequestId === request.id}
                        className="text-xs font-medium text-[var(--green)] hover:underline disabled:opacity-50"
                      >
                        {markingRequestId === request.id ? 'Marking...' : 'Mark as read'}
                      </button>
                    ) : null}
                  </div>

                  {timelineOpen ? (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                      {timeline.length > 0 ? (
                        <div className="space-y-3 border-l border-[var(--border)] pl-4">
                          {timeline.map((event) => (
                            <div key={event.id} className="relative text-xs text-[var(--text-3)]">
                              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-[var(--green)] bg-[var(--surface)]" />
                              <p className="font-medium text-[var(--text-2)]">
                                {event.description || event.action.replace(/_/g, ' ')}
                              </p>
                              <p>{event.actorName || 'System'} - {new Date(event.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-3)]">No timeline events yet.</p>
                      )}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
