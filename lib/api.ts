// Shaqonet Owner Dashboard — API client
// Backend: Express + Supabase + Prisma, port 4000
// Auth: Supabase JWT passed as Bearer token

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

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
    throw new Error(err.message ?? `HTTP ${res.status}`)
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
  update: (id: string, data: Partial<CreateCompanyInput>) =>
    req<{ company: Company }>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(res => res.company),
  delete: (id: string) => req(`/companies/${id}`, { method: 'DELETE' }),
  createManager: (companyId: string, data: { email: string; name: string; password: string }) =>
    req(`/companies/${companyId}/managers`, { method: 'POST', body: JSON.stringify(data) }),
}

// ── Health ────────────────────────────────────────────────
// GET /health → { status, uptime, ... }
export const healthApi = {
  check: () => req<{ status: string; uptime: number; version: string }>('/health'),
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
  industry?: string
  status: 'trial' | 'active' | 'past_due' | 'restricted' | 'cancelled'
  employeeCount?: number
  managerCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateCompanyInput {
  name: string
  industry?: string
}
