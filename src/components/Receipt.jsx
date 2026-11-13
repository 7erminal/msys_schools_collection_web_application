import { useEffect } from 'react'
import { dateTime, money } from '../lib/store.js'
import { Logo } from './ui.jsx'

export default function Receipt({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows = [
    ['Reference', item.reference],
    ['Date', dateTime(item.date)],
    ['School', item.clientId],
    ['Paid by', item.customerName || '—'],
    ['Phone', item.customerNumber || '—'],
    ['Method', item.method === 'MOMO' ? `Mobile Money · ${item.telcoLabel}` : 'Cash'],
    ['Collected by', item.agent],
  ]

  return (
    <div className="modal" onClick={onClose}>
      <div className="receipt" role="dialog" aria-modal="true" aria-label="Payment receipt" onClick={(e) => e.stopPropagation()}>
        <header>
          <Logo size={40} />
          <div>
            <strong>Payment receipt</strong>
            <span>School fees collection</span>
          </div>
        </header>

        <div className="receipt-amount">
          <span className="tick" aria-hidden="true">✓</span>
          <b>{money(item.amount)}</b>
          <small>Paid</small>
        </div>

        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <footer className="no-print">
          <button className="btn btn-ghost" onClick={onClose} type="button">Close</button>
          <button className="btn btn-primary" onClick={() => window.print()} type="button">Print / Save PDF</button>
        </footer>
      </div>
    </div>
  )
}
