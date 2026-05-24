'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { session, user } = await authApi.login(email, password)
      localStorage.setItem('shaqonet_token', JSON.stringify({ accessToken: session.accessToken, user }))
      console.log('Login successful, token stored')
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src="/logos/shaqonet-logo-light.svg" alt="Shaqonet" className="h-12 w-auto" />
          </div>
          <p className="text-[var(--text-2)] text-sm">Owner portal — sign in to continue</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@shaqonet.com"
                required
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--green)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--green)] transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs text-[var(--red)] bg-[#e05a5a18] border border-[#e05a5a30] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--green)] hover:bg-[var(--green-dim)] disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-3)] mt-6">
          Shaqonet Owner Access · Restricted
        </p>
      </div>
    </div>
  )
}
