import { useState, type ChangeEvent, type FormEvent } from 'react'
import { errorMessage, login, registerUser } from '../lib/api'
import type { Session } from '../lib/types'
import { Alert, Button, Field, Logo } from './ui'

const EMPTY = { name: '', username: '', gender: '', dob: '', phone: '', email: '', password: '', confirm: '', clientId: '' }
const today = new Date().toISOString().slice(0, 10)

type Mode = 'login' | 'register'
type Form = typeof EMPTY

export default function Auth({ onLogin, notice }: { onLogin: (s: Session) => void; notice: string }) {
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const isRegister = mode === 'register'

  const set = (key: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setSuccess('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    setSuccess('')
    const username = form.username.trim()
    const clientId = form.clientId.trim()

    if (!username || !form.password || !clientId) return setError('Username, password and school client ID are required.')
    if (isRegister) {
      if (!form.name.trim() || !form.gender || !form.dob || !form.phone)
        return setError('Full name, gender, date of birth and mobile number are required.')
      if (!/^0\d{9}$/.test(form.phone)) return setError('Enter a valid 10-digit mobile number starting with 0.')
      if (!/^\d+$/.test(clientId)) return setError('School client ID must be a number.')
      if (form.password !== form.confirm) return setError('The two passwords do not match.')
    }

    setLoading(true)
    try {
      if (isRegister) {
        await registerUser({
          name: form.name.trim(),
          username,
          gender: form.gender,
          dob: form.dob,
          mobileNumber: form.phone,
          email: form.email.trim(),
          password: form.password,
          clientId: Number(clientId),
        })
        setForm({ ...EMPTY, username, clientId })
        setMode('login')
        setSuccess('Account created. Sign in to start collecting.')
      } else {
        onLogin(await login(username, form.password, clientId))
      }
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'))
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
              <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="e.g. Ama Boateng" required />
            </Field>
          )}
          <Field label="Username">
            <input value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" required />
          </Field>
          {isRegister && (
            <>
              <div className="row">
                <Field label="Gender">
                  <select value={form.gender} onChange={set('gender')} required>
                    <option value="" disabled>Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input value={form.dob} onChange={set('dob')} type="date" max={today} autoComplete="bday" required />
                </Field>
              </div>
              <div className="row">
                <Field label="Mobile number">
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    inputMode="numeric" autoComplete="tel" placeholder="0241234567" required />
                </Field>
                <Field label="Email" hint="optional">
                  <input value={form.email} onChange={set('email')} type="email" autoComplete="email" />
                </Field>
              </div>
            </>
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
            <input value={form.clientId} onChange={set('clientId')} autoCapitalize="none" autoComplete="organization" inputMode={isRegister ? 'numeric' : 'text'} placeholder="Provided by your school" required />
          </Field>

          <Button type="submit" className="btn-primary btn-block" loading={loading}>
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  )
}
