import { useState } from 'react'
import { MOCK } from '../lib/api.js'
import { addToHistory, dateTime, isToday, loadHistory, money } from '../lib/store.js'
import DepositForm from './DepositForm.jsx'
import Receipt from './Receipt.jsx'
import { Logo } from './ui.jsx'

export default function Dashboard({ session, onLogout }) {
  const [history, setHistory] = useState(() => loadHistory(session))
  const [receipt, setReceipt] = useState(null)

  const today = history.filter((h) => isToday(h.date))
  const todayTotal = today.reduce((sum, h) => sum + h.amount, 0)

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <Logo size={38} />
          <div>
            <strong>{session.clientId}</strong>
            <span>Agent · {session.username}</span>
          </div>
        </div>
        {MOCK && <span className="demo">DEMO</span>}
        <button className="btn btn-light" onClick={onLogout} type="button">Sign out</button>
      </header>

      <main className="grid no-print">
        <DepositForm session={session} onCollected={(item) => setHistory(addToHistory(session, item))} onViewReceipt={setReceipt} />

        <aside>
          <div className="stat">
            <span>Collected today</span>
            <b>{money(todayTotal)}</b>
            <small>{today.length} deposit{today.length === 1 ? '' : 's'}</small>
          </div>

          <section className="card">
            <h2>Recent collections</h2>
            {history.length === 0 ? (
              <p className="empty">No collections yet. Deposits you make on this device will appear here.</p>
            ) : (
              <ul className="history">
                {history.slice(0, 20).map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => setReceipt(h)} title="View receipt">
                      <span className={`badge ${h.method === 'MOMO' ? 'momo' : 'cash'}`}>{h.method === 'MOMO' ? h.telcoLabel : 'Cash'}</span>
                      <span className="who">
                        <strong>{h.customerName || h.customerNumber || 'Customer'}</strong>
                        <small>{dateTime(h.date)}</small>
                      </span>
                      <b>{money(h.amount)}</b>
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
