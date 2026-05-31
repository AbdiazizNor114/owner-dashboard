'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { authApi, OwnerUser } from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<OwnerUser | null>(null)

  useEffect(() => {
    authApi.me()
      .then((result) => setProfile(result.profile))
      .catch(() => setProfile(null))
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try { await authApi.logout() } catch {}
    localStorage.removeItem('shaqonet_token')
    router.push('/login')
  }

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-2)] mt-0.5">Platform account, access, and product controls</p>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Email</label>
              <input
                type="email"
                value={profile?.email || 'Signed-in owner'}
                disabled
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-2)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Role</label>
              <input
                type="text"
                value="Platform Owner"
                disabled
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-2)]"
              />
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Product Controls</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: 'Company lifecycle', value: 'Companies page' },
              { label: 'Plan and billing', value: 'Billing page' },
              { label: 'Lead approvals', value: 'Leads page' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                <p className="text-xs text-[var(--text-3)]">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[var(--card)] border border-[var(--red)] border-opacity-30 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[var(--red)] mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text)] mb-1">Sign out</p>
              <p className="text-xs text-[var(--text-3)]">You will need to sign in again to access your account</p>
            </div>
            <Button variant="danger" onClick={handleLogout} loading={loading}>
              {loading ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
