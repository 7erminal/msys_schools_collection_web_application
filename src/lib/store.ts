import type { Session } from './types'

const SESSION_KEY = 'msys.session'

export function loadSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Session | null
  } catch {
    return null
  }
}

export function saveSession(s: Session | null): void {
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else sessionStorage.removeItem(SESSION_KEY)
}

export const money = (n: number, currency = 'GHS'): string =>
  `${currency} ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const dateTime = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

export const isToday = (iso: string | null): boolean => !!iso && new Date(iso).toDateString() === new Date().toDateString()
