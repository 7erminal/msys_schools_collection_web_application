import { useEffect, useRef, useState } from 'react'
import { accountQuery, deposit, TELCOS } from '../lib/api.js'
import { money } from '../lib/store.js'
import TelcoLogo from './TelcoLogo.jsx'
import { Alert, Button, Field } from './ui.jsx'

const PHONE_RE = /^0\d{9}$/
const IDLE = { status: 'idle', name: '', error: '' }

export default function DepositForm({ session, onCollected, onViewReceipt }) {
  const [method, setMethod] = useState('MOMO')
  const [telcoId, setTelcoId] = useState('')
  const [phone, setPhone] = useState('')
  const [lookup, setLookup] = useState(IDLE)
  const [cashName, setCashName] = useState('')
  const [cashPhone, setCashPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
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
        const name = await accountQuery(
          { accountNumber: phone, billerCode: telco.billerCode, clientId: session.clientId },
          session.token,
        )
        if (seq === lookupSeq.current) setLookup({ status: 'ok', name, error: '' })
      } catch (err) {
        if (seq === lookupSeq.current)
          setLookup({ status: 'error', name: '', error: err.message || 'Could not verify this number.' })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [isMomo, telco, phone, session.clientId, session.token, retry])

  const retryLookup = () => setRetry((n) => n + 1)

  function reset() {
    setPhone('')
    setCashName('')
    setCashPhone('')
    setAmount('')
    setError('')
    setDone(null)
  }

  async function submit(e) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError('')
    setSubmitting(true)
    const details = {
      method,
      telco,
      customerName: isMomo ? lookup.name : cashName.trim(),
      customerNumber: isMomo ? phone : cashPhone,
      amount: amountNum,
      clientId: session.clientId,
    }
    try {
      const res = await deposit(details, session.token)
      const item = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        reference: String(res.reference ?? 'RCPT-' + Date.now().toString(36).toUpperCase()),
        message: res.message,
        date: new Date().toISOString(),
        method,
        telcoLabel: isMomo ? telco.label : '',
        customerName: details.customerName,
        customerNumber: details.customerNumber,
        amount: amountNum,
        clientId: session.clientId,
        agent: session.username,
      }
      onCollected(item)
      setDone(item)
    } catch (err) {
      setError(err.message || 'The deposit could not be completed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done)
    return (
      <section className="card success-card" role="status">
        <div className="big-tick" aria-hidden="true">✓</div>
        <h2>Deposit successful</h2>
        <p className="success-amount">{money(done.amount)}</p>
        <p className="muted">
          {done.customerName ? `from ${done.customerName} ` : ''}to <b>{done.clientId}</b>
        </p>
        {done.message && <p className="muted small">{done.message}</p>}
        <p className="ref">Ref: {done.reference}</p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => onViewReceipt(done)} type="button">View receipt</button>
          <button className="btn btn-primary" onClick={reset} type="button" autoFocus>New deposit</button>
        </div>
      </section>
    )

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>New deposit</h2>
      <p className="muted">
        Into <b>{session.clientId}</b>'s account
      </p>

      <div className="segmented" role="radiogroup" aria-label="Payment method">
        {[['MOMO', '📱 Mobile Money'], ['CASH', '💵 Cash']].map(([id, label]) => (
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
