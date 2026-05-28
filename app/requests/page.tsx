'use client'
import { useEffect, useState } from 'react'
import {
  companyChangeRequestsApi,
  CompanyChangeRequest,
  CompanyChangeRequestTimelineEvent,
} from '@/lib/api'

export default function OwnerRequestsPage() {
  const [requests, setRequests] = useState<CompanyChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [ownerNote, setOwnerNote] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [timelineByRequest, setTimelineByRequest] = useState<Record<string, CompanyChangeRequestTimelineEvent[]>>({})

  useEffect(() => {
    load()
    const id = window.setInterval(() => {
      load()
    }, 20000)
    return () => window.clearInterval(id)
  }, [])

  async function load() {
    companyChangeRequestsApi
      .list()
      .then((data) => {
        setRequests(data)
        setLastSync(new Date())
      })
      .finally(() => setLoading(false))
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setWorkingId(null)
    }
  }

  async function loadTimeline(requestId: string) {
    const timeline = await companyChangeRequestsApi.timeline(requestId)
    setTimelineByRequest((prev) => ({ ...prev, [requestId]: timeline }))
  }

  const pendingCount = requests.filter((request) => request.status === 'pending').length

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Company Change Requests</h1>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Review manager requests for reactivation and plan changes.
        </p>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          Pending {pendingCount} · Auto-sync every 20s
          {lastSync ? ` · Last sync ${lastSync.toLocaleTimeString()}` : ''}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {error && (
          <div className="border-b border-[var(--border)] bg-[#e05a5a12] px-4 py-3 text-sm text-[var(--red)]">
            {error}
          </div>
        )}
        {loading ? (
          <div className="px-4 py-6 text-sm text-[var(--text-3)]">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[var(--text-3)]">No requests.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {requests.map((request) => {
              const pending = request.status === 'pending'
              return (
                <div key={request.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {request.companies?.name || request.company_id}
                      </p>
                      <p className="text-xs text-[var(--text-3)]">
                        {request.request_type === 'reactivate_company'
                          ? 'Reactivate company'
                          : `Change plan to ${request.requested_plan}`}
                      </p>
                    </div>
                    <span className="text-xs capitalize text-[var(--text-2)]">{request.status}</span>
                  </div>
                  {request.manager_note && (
                    <p className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-2)]">
                      Manager note: {request.manager_note}
                    </p>
                  )}
                  {pending ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={ownerNote[request.id] || ''}
                        onChange={(e) =>
                          setOwnerNote((prev) => ({ ...prev, [request.id]: e.target.value }))
                        }
                        placeholder="Owner response note"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => review(request, 'approved')}
                        disabled={workingId === request.id}
                        className="rounded-lg bg-[var(--green)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => review(request, 'denied')}
                        disabled={workingId === request.id}
                        className="rounded-lg bg-[var(--red)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Deny
                      </button>
                    </div>
                  ) : (
                    request.owner_note && <p className="text-xs text-[var(--text-3)]">Owner note: {request.owner_note}</p>
                  )}
                  <button
                    onClick={() => loadTimeline(request.id)}
                    className="text-xs text-[var(--green)] hover:underline"
                  >
                    View timeline
                  </button>
                  {timelineByRequest[request.id]?.length ? (
                    <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
                      {timelineByRequest[request.id].map((event) => (
                        <p key={event.id} className="text-xs text-[var(--text-3)]">
                          {new Date(event.created_at).toLocaleString()} · {event.action}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
