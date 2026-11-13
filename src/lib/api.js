// All backend calls live here. If the backend's field names or response
// shapes differ from what is assumed below, this is the only file to touch.
import { mockRequest } from './mock.js'

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const MOCK = import.meta.env.VITE_MOCK_API === 'true'

export const TELCOS = [
  { id: 'MTN', label: 'MTN', sub: 'MoMo', billerCode: import.meta.env.VITE_BILLER_MTN || 'MTN' },
  { id: 'TELECEL', label: 'Telecel', sub: 'Cash', billerCode: import.meta.env.VITE_BILLER_TELECEL || 'TELECEL' },
  { id: 'AT', label: 'AT', sub: 'Money', billerCode: import.meta.env.VITE_BILLER_AT || 'AT' },
]

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn)

const norm = (k) => k.toLowerCase().replace(/[_\-\s]/g, '')

/** Breadth-first search of a response for the first non-empty value under any of `keys`. */
export function pick(obj, keys) {
  for (const key of keys) {
    const queue = [obj]
    while (queue.length) {
      const cur = queue.shift()
      if (!cur || typeof cur !== 'object') continue
      for (const [k, v] of Object.entries(cur)) {
        if (norm(k) === key && v !== null && v !== '' && typeof v !== 'object') return v
        if (v && typeof v === 'object') queue.push(v)
      }
    }
  }
  return undefined
}

const MESSAGE_KEYS = ['message', 'statusdesc', 'statusdescription', 'responsemessage', 'error', 'description', 'detail', 'msg']

export const messageOf = (data) => {
  if (typeof data === 'string') return data.trim().slice(0, 300)
  const m = pick(data, MESSAGE_KEYS)
  return m === undefined ? '' : String(m)
}

// Some APIs answer HTTP 200 with a failure code inside the body.
function bodySaysFailed(data) {
  if (!data || typeof data !== 'object') return false
  if (data.success === false || data.Success === false) return true
  const code = pick(data, ['statuscode', 'responsecode', 'code'])
  const n = Number(code)
  if (code !== undefined && Number.isFinite(n) && n >= 400) return true
  const status = data.status ?? data.Status
  return typeof status === 'string' && /^(error|fail(ed|ure)?)$/i.test(status)
}

async function request(path, body, token) {
  if (MOCK) return mockRequest(path, body)

  let res
  try {
    res = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', 0)
  }

  const text = await res.text()
  let data = text
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    /* not JSON - keep the raw text */
  }

  if (!res.ok || bodySaysFailed(data)) {
    if (res.status === 401 && token) onUnauthorized()
    const looksLikeHtml = typeof data === 'string' && data.trimStart().startsWith('<')
    const msg = (!looksLikeHtml && messageOf(data)) || `Request failed (${res.status} ${res.statusText || 'error'}).`
    throw new ApiError(msg, res.status)
  }
  return data
}

// ---------------------------------------------------------------- endpoints

export async function login({ username, password, clientId }) {
  const data = await request('/v1/auth/user/login', { username, password, clientId })
  return {
    token: pick(data, ['token', 'accesstoken', 'authtoken', 'jwt']) || '',
    username,
    clientId,
    displayName: pick(data, ['fullname', 'name']) || username,
  }
}

export function registerUser({ fullName, username, phone, email, password, clientId }) {
  return request('/v1/auth/register-user', {
    username,
    password,
    clientId,
    fullName,
    phoneNumber: phone,
    email,
  })
}

export async function accountQuery({ accountNumber, billerCode, clientId }, token) {
  const data = await request(
    '/v1/api/account-query',
    { account_number: accountNumber, biller_code: billerCode, client_id: clientId },
    token,
  )
  const name = pick(data, ['accountname', 'customername', 'accountholdername', 'fullname', 'name'])
  if (!name) throw new ApiError(messageOf(data) || 'No account name was returned for this number.', 200)
  return String(name)
}

/**
 * method: 'MOMO' | 'CASH'
 * Assumed mapping (adjust here if the backend expects otherwise):
 *   destination = the school's client ID
 *   source      = telco biller code for MoMo, 'CASH' for cash
 */
export async function deposit({ method, telco, customerName, customerNumber, amount, clientId }, token) {
  const data = await request(
    '/v1/agent/deposit',
    {
      customerName,
      customerNumber,
      amount,
      destination: clientId,
      source: method === 'MOMO' ? telco.billerCode : 'CASH',
      payment_method: method,
      client_id: clientId,
    },
    token,
  )
  return {
    reference: pick(data, ['reference', 'transactionid', 'transid', 'txnid', 'referenceid', 'referencenumber']),
    message: messageOf(data),
  }
}
