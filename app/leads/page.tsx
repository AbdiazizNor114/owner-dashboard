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

  useEffect(() => {
    const token = localStorage.getItem('shaqonet_token')
    if (!token) {
      router.push('/login')
      return
    }

    leadsApi
      .list()
      .then(setLeads)
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

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Lead Requests</h1>
        <p className="mt-0.5 text-sm text-[var(--text-2)]">
          New trial and contact requests from shaqonet.app
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr] border-b border-[var(--border)] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-3)]">
          <div>Contact</div>
          <div>Company</div>
          <div>Status</div>
          <div>Received</div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-[var(--text-3)]">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[var(--text-3)]">No lead requests yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {leads.map((lead) => (
              <div key={lead.id} className="px-5 py-4">
                <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr] items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{lead.work_email}</p>
                    <p className="text-xs text-[var(--text-3)]">{lead.source}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text)]">{lead.company_name}</p>
                    <p className="text-xs text-[var(--text-3)]">{lead.team_size}</p>
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
                    {new Date(lead.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-2)]">
                  {lead.message?.trim() ? lead.message : 'No message provided.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
