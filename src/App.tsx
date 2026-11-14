import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import { setUnauthorizedHandler } from './lib/api'
import { loadSession, saveSession } from './lib/store'
import type { Session } from './lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [notice, setNotice] = useState('')

  const update = (s: Session | null, msg = '') => {
    saveSession(s)
    setSession(s)
    setNotice(msg)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => update(null, 'Your session has expired. Please sign in again.'))
  }, [])

  return session ? (
    <Dashboard key={session.clientId + session.username} session={session} onLogout={() => update(null)} />
  ) : (
    <Auth onLogin={update} notice={notice} />
  )
}
