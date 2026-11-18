import { useEffect, useRef, useState, type FormEvent } from 'react'
import { deposit, errorMessage, nameInquiry, TELCOS } from '../lib/api'
import { money } from '../lib/store'
import type { Collection, PaymentMethod, Session, TelcoId } from '../lib/types'
import TelcoLogo from './TelcoLogo'
import { Alert, Button, Field } from './ui'

const PHONE_RE = /^0\d{9}$/

interface Lookup {
  status: 'idle' | 'loading' | 'ok' | 'error'
  name: string
  error: string
}
const IDLE: Lookup = { status: 'idle', name: '', error: '' }
const METHODS: [PaymentMethod, string][] = [['MOMO', 'Mobile Money'], ['CASH', 'Cash']]

interface Props {
  session: Session
  onCollected: () => void
  onViewReceipt: (c: Collection) => void
}

export default function DepositForm({ session, onCollected, onViewReceipt }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('MOMO')
  const [telcoId, setTelcoId] = useState<TelcoId | ''>('')
  const [phone, setPhone] = useState('')
  const [lookup, setLookup] = useState<Lookup>(IDLE)
  const [cashName, setCashName] = useState('')
  const [cashPhone, setCashPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<Collection | null>(null)
  const [retry, setRetry] = useState(0)
  const lookupSeq = useRef(0)

  const telco = TELCOS.find((t) => t.id === telcoId)
  const isMomo = method === 'MOMO'
  const amountNum = Math.round(parseFloat(amount) * 100) / 100
  const amountOk = Number.isFinite(amountNum) && amountNum > 0
  const verified = lookup.status === 'ok'
  const canSubmit = amountOk && (isMomo ? verified : cashName.trim().length > 1)

  // Look the number up as soon as a telco and a full number are present.
  useEffect(() => {
    const seq = ++lookupSeq.current
    if (!isMomo || !telco || !PHONE_RE.test(phone)) {
      setLookup(IDLE)
      return
    }
    setLookup({ status: 'loading', name: '', error: '' })
    const timer = setTimeout(async () => {
      try {
        const name = await nameInquiry(phone, session)
        if (seq === lookupSeq.current) setLookup({ status: 'ok', name, error: '' })
      } catch (err) {
        if (seq === lookupSeq.current)
          setLookup({ status: 'error', name: '', error: errorMessage(err, 'Could not verify this number.') })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [isMomo, telco, phone, session, retry])

  const retryLookup = () => setRetry((n) => n + 1)

  function reset() {
    setPhone('')
    setCashName('')
    setCashPhone('')
    setAmount('')
    setError('')
    setDone(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError('')
    setSubmitting(true)
    try {
      const item = await deposit(
        {
          method,
          telco,
          customerName: isMomo ? lookup.name : cashName.trim(),
          customerNumber: isMomo ? phone : cashPhone,
          amount: amountNum,
        },
        session,
      )
      setDone(item)
      onCollected()
    } catch (err) {
      setError(errorMessage(err, 'The deposit could not be completed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done)
    return (
      <section className="card success-card" role="status">
        <div className="big-tick" aria-hidden="true">✓</div>
        <h2>Payment successful</h2>
        <p className="success-amount">{money(done.amount, done.currency)}</p>
        <p className="muted">
          {done.customerName ? `from ${done.customerName} ` : ''}to <b>{done.school}</b>
        </p>
        <p className="muted small">{done.statusText}</p>
        <p className="ref">Ref: {done.reference}</p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => onViewReceipt(done)} type="button">View receipt</button>
          <button className="btn btn-primary" onClick={reset} type="button" autoFocus>New payment</button>
        </div>
      </section>
    )

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>New payment</h2>
      <p className="muted">
        Into <b>{session.schoolName}</b>'s account
      </p>

      <div className="segmented" role="radiogroup" aria-label="Payment method">
        {METHODS.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={method === id} className={method === id ? 'active' : ''}
            onClick={() => { setMethod(id); setError('') }} disabled={submitting}>
            {label}
          </button>
        ))}
      </div>

      {isMomo ? (
        <>
          <div className="field">
            <span className="field-label">Network</span>
            <div className="telcos" role="radiogroup" aria-label="Network">
              {TELCOS.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={telcoId === t.id}
                  className={`telco ${telcoId === t.id ? 'active' : ''}`} onClick={() => setTelcoId(t.id)} disabled={submitting}>
                  <TelcoLogo id={t.id} />
                  <span>{t.label} <small>{t.sub}</small></span>
                </button>
              ))}
            </div>
          </div>

          <Field label="MoMo number">
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric" autoComplete="off" placeholder="0241234567" disabled={!telco || submitting} />
          </Field>
          {!telco && <p className="hint">Choose a network first.</p>}
          {telco && phone.length > 0 && !PHONE_RE.test(phone) && phone.length === 10 && (
            <p className="hint hint-error">Number must start with 0.</p>
          )}

          {lookup.status === 'loading' && (
            <div className="lookup"><span className="spinner dark" /> Checking number…</div>
          )}
          {verified && (
            <div className="lookup lookup-ok">
              <span className="avatar" aria-hidden="true">✓</span>
              <div><small>Account name</small><strong>{lookup.name}</strong></div>
            </div>
          )}
          {lookup.status === 'error' && (
            <Alert>
              {lookup.error}{' '}
              <button type="button" className="link" onClick={retryLookup}>Try again</button>
            </Alert>
          )}
        </>
      ) : (
        <>
          <Field label="Payer's name">
            <input value={cashName} onChange={(e) => setCashName(e.target.value)} placeholder="Parent or student name" disabled={submitting} />
          </Field>
          <Field label="Payer's phone" hint="optional">
            <input value={cashPhone} onChange={(e) => setCashPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric" placeholder="0241234567" disabled={submitting} />
          </Field>
        </>
      )}

      <Field label="Amount">
        <div className="amount">
          <span>GHS</span>
          <input value={amount} onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setAmount(e.target.value)}
            inputMode="decimal" placeholder="0.00" autoComplete="off" disabled={submitting} />
        </div>
      </Field>

      <Alert>{error}</Alert>

      <Button type="submit" className="btn-primary btn-block btn-lg" loading={submitting} disabled={!canSubmit}>
        {submitting ? 'Processing…' : amountOk ? `Deposit ${money(amountNum)}` : 'Deposit'}
      </Button>
    </form>
  )
}
