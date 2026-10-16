import { useState } from 'react'
import { adminLogin } from '../../api/client.js'
import { btn, messageOf } from './ui.js'

/** Admin parola ekranı. Parola doğrulaması API'de (mock'ta VITE_ADMIN_PASSWORD) yapılır. */
export default function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminLogin(password)
      onSuccess()
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-16 w-full max-w-sm p-6" aria-labelledby="admin-login-title">
      <div className="text-5xl" aria-hidden="true">
        🔐
      </div>
      <h1 id="admin-login-title" className="mt-2 text-2xl font-black">
        Admin girişi
      </h1>
      <label htmlFor="admin-password" className="mt-4 block text-sm font-extrabold">
        Parola
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 min-h-12 w-full rounded-2xl border-2 border-brand-100 bg-white/80 px-4 text-base font-bold outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/10"
      />
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-pop/15 px-4 py-2 text-sm font-extrabold text-pop">
          {error}
        </p>
      )}
      <button id="admin-login" type="submit" className={`${btn.primary} mt-4 w-full`} disabled={busy || !password}>
        {busy ? 'Kontrol ediliyor…' : 'Giriş yap'}
      </button>
    </form>
  )
}
