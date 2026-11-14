import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import { setLiveTokens, setTokensRefreshedHandler, setUnauthorizedHandler } from './lib/api'
import { loadSession, saveSession } from './lib/store'
import type { Session } from './lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const s = loadSession()
    setLiveTokens(s)
    return s
  })
  const [notice, setNotice] = useState('')

  const update = (s: Session | null, msg = '') => {
    setLiveTokens(s)
    saveSession(s)
    setSession(s)
    setNotice(msg)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => update(null, 'Your session has expired. Please sign in again.'))
    // Persist refreshed tokens without disturbing the rest of the session.
    setTokensRefreshedHandler((tokens) =>
      setSession((s) => {
        if (!s) return s
        const next = { ...s, ...tokens }
        saveSession(next)
        return next
      }),
    )
  }, [])

  return session ? (
    <Dashboard key={session.clientId + session.username} session={session} onLogout={() => update(null)} />
  ) : (
    <Auth onLogin={update} notice={notice} />
  )
}
