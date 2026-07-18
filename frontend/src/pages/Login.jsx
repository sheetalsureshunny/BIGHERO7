import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const inputClass =
  'w-full rounded-xl border border-sakura-300/20 bg-plum-950/60 p-3 text-sm text-sakura-50 placeholder:text-sakura-100/30 focus:border-sakura-400 focus:outline-none'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const from = location.state?.from ?? '/'

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login({ email, password })
      else await register({ name, email, password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-sakura-300/20 bg-plum-900/50 p-8 backdrop-blur-sm">
        <h1 className="text-center text-2xl font-bold text-white">
          {mode === 'login' ? 'Citizen Login' : 'Create Citizen Account'}
        </h1>
        <p className="mt-1 text-center text-sm text-sakura-100/60">
          {mode === 'login'
            ? 'Log in to report issues and earn metro rewards.'
            : 'Register to get your Citizen ID and Smart Civic Wallet.'}
        </p>

        <div className="mt-6 flex rounded-xl bg-plum-950/60 p-1 text-sm">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={`flex-1 rounded-lg py-1.5 font-medium capitalize transition-colors ${
                mode === m
                  ? 'bg-sakura-500 text-white'
                  : 'text-sakura-100/50 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm text-sakura-100/80">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Hiro Hamada"
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-sakura-100/80">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-sakura-100/80">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="min 6 characters"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-sakura-600/20 p-3 text-sm text-sakura-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-sakura-500 py-3 font-semibold text-white shadow-lg shadow-sakura-500/30 hover:bg-sakura-600 disabled:opacity-40"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-sakura-100/40">
          Demo account: demo@bh7.city / demo123
        </p>
      </div>
    </div>
  )
}
