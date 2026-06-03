// Shaqonet Owner Dashboard — API client
// Backend: Express + Supabase + Prisma, port 4000
// Auth: Supabase JWT passed as Bearer token

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'
const ROOT = BASE.endsWith('/api/v1') ? BASE.slice(0, -7) : BASE

function getToken() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('shaqonet_token')
  // Handle both old format (token) and new format (session.accessToken)
  try {
    const parsed = JSON.parse(token || '{}')
    return parsed.accessToken || token
  } catch {
    return token
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  // Backend wraps responses in { data } format
  return json.data || json
}

// ── Auth ──────────────────────────────────────────────────
// POST /auth/login  { email, password } → { token, user }
// POST /auth/logout
export const authApi = {
  login: (email: string, password: string) =>
    req<{ session: { accessToken: string }; user: OwnerUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me: () => req<{ profile: OwnerUser; memberships: any[] }>('/me'),
}

// ── Companies ─────────────────────────────────────────────
// GET    /companies              → Company[]
// POST   /companies              → Company
// PATCH  /companies/:id          → Company
// DELETE /companies/:id
export const companiesApi = {
  list: () => req<{ companies: Company[] }>('/companies').then(res => res.companies),
  get: (id: string) => req<{ company: Company }>(`/companies/${id}`).then(res => res.company),
  create: (data: CreateCompanyInput) =>
    req<{ company: Company }>('/companies', { method: 'POST', body: JSON.stringify(data) }).then(res => res.company),
  update: (id: string, data: UpdateCompanyInput) =>
    req<{ company: Company }>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(res => res.company),
  delete: (id: string) => req(`/companies/${id}`, { method: 'DELETE' }),
  auditLogs: (id: string) =>
    req<{ auditLogs: AuditLog[] }>(`/companies/${id}/audit-logs?limit=25`).then(res => res.auditLogs),
  inviteManager: (companyId: string, email: string) =>
    req<InviteResponse>(`/companies/${companyId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role: 'manager' }),
    }),
  resendInvitation: (companyId: string, invitationId: string) =>
    req<InviteResponse>(`/companies/${companyId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    }),
  getSetup: (companyId: string) =>
    req<{ setup: CompanySetup }>(`/companies/${companyId}/setup/owner`).then((res) => res.setup),
}

// ── Health ────────────────────────────────────────────────
// GET /health → { status, uptime, ... }
export const healthApi = {
  check: async () => {
    const res = await fetch(`${ROOT}/health`)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json() as Promise<{ status: string; uptime: number; version?: string }>
  },
}

export const leadsApi = {
  list: () => req<{ leads: LeadRequest[] }>('/leads').then((res) => res.leads),
  markRead: (leadId: string) =>
    req<{ lead: LeadRequest }>(`/leads/${leadId}/read`, { method: 'PATCH' }).then((res) => res.lead),
  updateStatus: (leadId: string, status: LeadRequest['status']) =>
    req<{ lead: LeadRequest }>(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then((res) => res.lead),
  review: (
    leadId: string,
    data: { decision: 'approved' | 'denied'; managerEmail?: string; ownerNote?: string },
  ) =>
    req<{
      lead: LeadRequest
      decision: 'approved' | 'denied'
      company?: Company
      invitation?: InviteResponse['invitation']
      inviteUrl?: string
      emailDelivery?: { sent?: boolean; skipped?: boolean; reason?: string; id?: string } | null
    }>(`/leads/${leadId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

export const companyChangeRequestsApi = {
  list: () =>
    req<{ requests: CompanyChangeRequest[] }>('/change-requests').then((res) => res.requests),
  markRead: (requestId: string) =>
    req<{ request: CompanyChangeRequest }>(`/change-requests/${requestId}/read`, { method: 'PATCH' }).then((res) => res.request),
  review: (
    requestId: string,
    data: { decision: 'approved' | 'denied'; ownerNote?: string },
  ) =>
    req<{ request: CompanyChangeRequest }>(`/change-requests/${requestId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((res) => res.request),
  timeline: (requestId: string) =>
    req<{ timeline: CompanyChangeRequestTimelineEvent[] }>(
      `/change-requests/${requestId}/timeline`,
    ).then((res) => res.timeline),
}

// ── Types ─────────────────────────────────────────────────
export interface OwnerUser {
  id: string
  email: string
  name: string
  role: 'owner'
}

export interface Company {
  id: string
  name: string
  slug?: string
  industry?: string
  plan?: 'free' | 'starter' | 'pro' | 'enterprise'
  status: 'trial' | 'active' | 'past_due' | 'restricted' | 'cancelled'
  subscriptionStatus?: string | null
  currentPeriodEnd?: string | null
  employeeCount?: number
  managerCount?: number
  pendingInviteCount?: number
  seatCount?: number
  seatLimit?: number | null
  createdAt: string
  updatedAt: string
}

export interface CompanySetup {
  locations: string[]
  departments: string[]
  staffRoles: string[]
  setupChecklist: {
    brandWorkspace: boolean
    addLocations: boolean
    addDepartments: boolean
    addStaffRoles: boolean
    inviteEmployees: boolean
    createFirstSchedule: boolean
  }
  progress: {
    completed: number
    total: number
  }
}

export interface CreateCompanyInput {
  name: string
  industry?: string
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  plan?: 'free' | 'starter' | 'pro' | 'enterprise'
  status?: 'trial' | 'active' | 'past_due' | 'restricted' | 'cancelled'
}

export interface InviteResponse {
  invitation: {
    id: string
    company_id: string
    email: string
    role: 'manager' | 'company_admin' | 'worker'
    expires_at: string
    accepted_at: string | null
    created_at: string
  }
  inviteUrl: string
  token: string
  emailDelivery?: { sent: boolean; skipped?: boolean; reason?: string; id?: string }
}

export interface LeadRequest {
  id: string
  work_email: string
  company_name: string
  team_size: string
  message: string | null
  status: 'new' | 'contacted' | 'closed'
  source: string
  is_read_by_owner: boolean
  read_by_owner_at: string | null
  created_at: string
  updated_at: string
}

export interface CompanyChangeRequest {
  id: string
  company_id: string
  requested_by_membership_id: string
  request_type: 'reactivate_company' | 'change_plan'
  requested_plan: 'free' | 'starter' | 'pro' | 'enterprise' | null
  manager_note: string | null
  status: 'pending' | 'approved' | 'denied'
  owner_note: string | null
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  is_read_by_owner: boolean
  owner_read_at: string | null
  is_read_by_manager: boolean
  manager_read_at: string | null
  created_at: string
  updated_at: string
  companies?: { id: string; name: string; status: string } | null
}

export interface CompanyChangeRequestTimelineEvent {
  id: string
  action: 'create' | 'update' | 'view' | 'delete' | 'login' | 'support_access' | 'ai_call'
  description?: string
  actorName?: string
  actorEmail?: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  actor_user_id: string | null
  actor_membership_id?: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  company_id: string
  actor_user_id: string | null
  actor_membership_id: string | null
  action: string
  entity_table: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
  description?: string
  actorName?: string
  actorEmail?: string | null
}
