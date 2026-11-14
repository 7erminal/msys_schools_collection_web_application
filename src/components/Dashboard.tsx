import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, getTransactions, MOCK } from '../lib/api'
import { dateTime, isToday, money } from '../lib/store'
import type { Collection, Session } from '../lib/types'
import DepositForm from './DepositForm'
import Receipt from './Receipt'
import { Alert, Logo } from './ui'

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
]

export default function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [days, setDays] = useState(7)
  const [items, setItems] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<Collection | null>(null)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const mine = ++seq.current
    setLoading(true)
    setError('')
    try {
      const list = await getTransactions(session, days)
      if (mine === seq.current) setItems(list)
    } catch (err) {
      if (mine === seq.current) setError(errorMessage(err, 'Could not load collections.'))
    } finally {
      if (mine === seq.current) setLoading(false)
    }
  }, [session, days])

  useEffect(() => {
    load()
  }, [load])

  const today = items.filter((c) => isToday(c.date) && c.status === 'success')
  const todayTotal = today.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <Logo size={38} />
          <div>
            <strong>{session.schoolName}</strong>
            <span>Agent · {session.fullName}</span>
          </div>
        </div>
        {MOCK && <span className="demo">DEMO</span>}
        <button className="btn btn-light" onClick={onLogout} type="button">Sign out</button>
      </header>

      <main className="grid no-print">
        <DepositForm session={session} onCollected={load} onViewReceipt={setReceipt} />

        <aside>
          <div className="stat">
            <span>Collected today</span>
            <b>{loading && items.length === 0 ? '…' : money(todayTotal)}</b>
            <small>{today.length} successful deposit{today.length === 1 ? '' : 's'}</small>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Recent collections</h2>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">
                {RANGES.map((r) => (
                  <option key={r.days} value={r.days}>{r.label}</option>
                ))}
              </select>
              <button className="icon-btn" onClick={load} disabled={loading} type="button" title="Refresh" aria-label="Refresh">
                <span className={loading ? 'spin' : ''} aria-hidden="true">↻</span>
              </button>
            </div>

            {error && (
              <Alert>
                {error}{' '}
                <button type="button" className="link" onClick={load}>Try again</button>
              </Alert>
            )}

            {!error && items.length === 0 && (
              <p className="empty">{loading ? 'Loading collections…' : 'No collections in this period.'}</p>
            )}

            {items.length > 0 && (
              <ul className={`history ${loading ? 'is-loading' : ''}`}>
                {items.map((c, i) => (
                  <li key={c.reference + i}>
                    <button type="button" onClick={() => setReceipt(c)} title="View receipt">
                      <span className="badge">{c.badge}</span>
                      <span className="who">
                        <strong>{c.customerName || c.customerNumber || 'Customer'}</strong>
                        <small>{dateTime(c.date)}</small>
                      </span>
                      <span className="amt">
                        <b>{money(c.amount, c.currency)}</b>
                        <small className={`status is-${c.status}`}>{c.statusText}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>

      {receipt && <Receipt item={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}
