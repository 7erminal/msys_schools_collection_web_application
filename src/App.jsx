import { useEffect, useState } from 'react'
import Auth from './components/Auth.jsx'
import Dashboard from './components/Dashboard.jsx'
import { setUnauthorizedHandler } from './lib/api.js'
import { loadSession, saveSession } from './lib/store.js'

export default function App() {
  const [session, setSession] = useState(loadSession)
  const [notice, setNotice] = useState('')

  const update = (s, msg = '') => {
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
