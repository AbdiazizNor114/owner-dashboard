'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('shaqonet_token')
    router.push('/login')
  }

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-2)] mt-0.5">Manage your account settings</p>
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
                defaultValue="owner@shaqonet.com"
                disabled
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-2)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Role</label>
              <input
                type="text"
                defaultValue="Platform Owner"
                disabled
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-2)]"
              />
            </div>
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
            <Button variant="danger" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
