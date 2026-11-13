// Session (per tab) and the on-device list of recent collections.
const SESSION_KEY = 'msys.session'
const historyKey = (s) => `msys.collections.${s.clientId}.${s.username}`
const MAX = 100

const read = (storage, key, fallback) => {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export const loadSession = () => read(sessionStorage, SESSION_KEY, null)
export const saveSession = (s) =>
  s ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESSION_KEY)

export const loadHistory = (session) => read(localStorage, historyKey(session), [])
export function addToHistory(session, entry) {
  const list = [entry, ...loadHistory(session)].slice(0, MAX)
  try {
    localStorage.setItem(historyKey(session), JSON.stringify(list))
  } catch {
    /* storage full or blocked - the list just won't persist */
  }
  return list
}

export const money = (n) =>
  'GHS ' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString()
