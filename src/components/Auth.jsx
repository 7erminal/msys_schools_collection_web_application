import { useState } from 'react'
import { login, registerUser } from '../lib/api.js'
import { Alert, Button, Field, Logo } from './ui.jsx'

const EMPTY = { fullName: '', username: '', phone: '', email: '', password: '', confirm: '', clientId: '' }

export default function Auth({ onLogin, notice }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const isRegister = mode === 'register'

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const switchMode = (m) => {
    setMode(m)
    setError('')
    setSuccess('')
  }

  async function submit(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setSuccess('')
    const username = form.username.trim()
    const clientId = form.clientId.trim()

    if (!username || !form.password || !clientId) return setError('Username, password and school client ID are required.')
    if (isRegister && form.password !== form.confirm) return setError('The two passwords do not match.')

    setLoading(true)
    try {
      if (isRegister) {
        await registerUser({
          fullName: form.fullName.trim(),
          username,
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          clientId,
        })
        setForm({ ...EMPTY, username, clientId })
        setMode('login')
        setSuccess('Account created. Sign in to start collecting.')
      } else {
        onLogin(await login({ username, password: form.password, clientId }))
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth">
      <section className="auth-hero">
        <Logo size={56} />
        <h1>School fees,<br />collected in seconds.</h1>
        <p>Accept Mobile Money or cash and pay straight into the school's account.</p>
      </section>

      <section className="card auth-card">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''} onClick={() => switchMode('login')} type="button">
            Sign in
          </button>
          <button role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''} onClick={() => switchMode('register')} type="button">
            Register
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <Alert>{error}</Alert>
          <Alert kind="success">{success}</Alert>
          {!error && !success && notice && <Alert>{notice}</Alert>}

          {isRegister && (
            <Field label="Full name">
              <input value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="e.g. Ama Boateng" />
            </Field>
          )}
          <Field label="Username">
            <input value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" required />
          </Field>
          {isRegister && (
            <div className="row">
              <Field label="Phone" hint="optional">
                <input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="024 000 0000" />
              </Field>
              <Field label="Email" hint="optional">
                <input value={form.email} onChange={set('email')} type="email" autoComplete="email" />
              </Field>
            </div>
          )}
          <Field label="Password">
            <input value={form.password} onChange={set('password')} type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required />
          </Field>
          {isRegister && (
            <Field label="Confirm password">
              <input value={form.confirm} onChange={set('confirm')} type="password" autoComplete="new-password" required />
            </Field>
          )}
          <Field label="School client ID">
            <input value={form.clientId} onChange={set('clientId')} autoCapitalize="none" autoComplete="organization" placeholder="Provided by your school" required />
          </Field>

          <Button type="submit" className="btn-primary btn-block" loading={loading}>
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  )
}
