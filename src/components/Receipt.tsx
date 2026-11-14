import { useEffect } from 'react'
import { dateTime, money } from '../lib/store'
import type { Collection } from '../lib/types'
import { Logo } from './ui'

const STATUS_LABEL = { success: 'Paid', failed: 'Failed', pending: 'Pending' } as const
const STATUS_ICON = { success: '✓', failed: '✕', pending: '…' } as const

export default function Receipt({ item, onClose }: { item: Collection; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows: [string, string][] = [
    ['Reference', item.reference],
    ['Date', dateTime(item.date)],
    ['School', item.school],
    ['Paid by', item.customerName || '—'],
    ['Phone', item.customerNumber || '—'],
    ['Channel', item.channel],
    ['Status', item.statusText],
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

        <div className={`receipt-amount is-${item.status}`}>
          <span className="tick" aria-hidden="true">{STATUS_ICON[item.status]}</span>
          <b>{money(item.amount, item.currency)}</b>
          <small>{STATUS_LABEL[item.status]}</small>
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
