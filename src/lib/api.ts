// All backend calls live here. If an endpoint, field name or mapping differs
// from the backend, this is the only file to touch.
import { mockRequest } from './mock'
import type {
  AgentDepositRequest,
  AgentTransactionsResponse,
  Collection,
  DepositResponse,
  NameInquiryResponse,
  PaymentMethod,
  RegisterUserRequest,
  Session,
  Telco,
  TokenResponseDTO,
  Tokens,
  TxnResp,
  TxnStatus,
  UserGateway,
  UserGatewayResponseDTO,
  UserLoginResponse,
} from './types'

const env = import.meta.env
export const MOCK = env.VITE_MOCK_API === 'true'

// Dev uses the Vite proxy (same origin) unless a base URL is given explicitly.
const BASE: string = (env.VITE_API_BASE_URL || (env.DEV ? '' : 'https://app.msysconsultgh.com')).replace(/\/$/, '')

export const ENDPOINTS = {
  login: '/v1/auth/user/login',
  register: '/v1/auth/register-user',
  refresh: '/v1/auth/refresh-user-access-token',
  userDetails: '/v1/agent/api/get-user-details',
  nameInquiry: '/v1/api/name-inquiry',
  deposit: '/v1/agent/api/deposit',
  transactions: '/v1/agent/api/get-agent-transactions',
} as const

export const TELCOS: Telco[] = [
  { id: 'MTN', label: 'MTN', sub: 'MoMo', code: env.VITE_BILLER_MTN || 'MTN' },
  { id: 'TELECEL', label: 'Telecel', sub: 'Cash', code: env.VITE_BILLER_TELECEL || 'TELECEL' },
  { id: 'AT', label: 'AT', sub: 'Money', code: env.VITE_BILLER_AT || 'AT' },
]

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

/** Role sent when an agent registers. */
const REGISTER_ROLE = 'AGENT'

// The tokens of the signed-in session. Kept here (not only in React state) so a
// refreshed token is used immediately by every request, including in-flight retries.
let live: Tokens | null = null
export const setLiveTokens = (t: Tokens | null) => {
  live = t ? { token: t.token, tokenType: t.tokenType, refreshToken: t.refreshToken } : null
}

let onTokensRefreshed: (t: Tokens) => void = () => {}
export const setTokensRefreshedHandler = (fn: (t: Tokens) => void) => {
  onTokensRefreshed = fn
}

const toTokens = (t: TokenResponseDTO, previous?: Tokens): Tokens => ({
  token: t.AccessToken,
  tokenType: t.TokenType || previous?.tokenType || 'Bearer',
  refreshToken: t.RefreshToken || previous?.refreshToken || '',
})

// One refresh at a time: concurrent 401s all wait for the same call.
let refreshing: Promise<Tokens> | null = null
function refreshTokens(current: Tokens): Promise<Tokens> {
  refreshing ??= (async () => {
    try {
      const res = await request<UserLoginResponse>('POST', ENDPOINTS.refresh, { token: current.refreshToken })
      const dto = res.Result?.Token
      if (!dto?.AccessToken) throw new ApiError('Token refresh returned no access token.', 200)
      const next = toTokens(dto, current)
      live = next
      onTokensRefreshed(next)
      return next
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}
type Envelope = Record<string, unknown>

const messageOf = (data: unknown): string => {
  if (!data || typeof data !== 'object') return ''
  const d = data as Envelope
  for (const key of ['StatusMessage', 'StatusDesc', 'message', 'Message', 'error', 'Error']) {
    if (typeof d[key] === 'string' && d[key]) return d[key] as string
  }
  return ''
}

// The API reports failures inside the body (Success / StatusCode = false), often with HTTP 200.
const bodySaysFailed = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false
  const d = data as Envelope
  return d.Success === false || d.StatusCode === false
}

/**
 * `auth`: pass the session (or fresh login tokens) for authenticated calls.
 * The live tokens are preferred over the ones passed in, as those may be stale after a refresh.
 */
async function request<T>(method: 'GET' | 'POST', path: string, body?: object, auth?: Tokens, isRetry = false): Promise<T> {
  if (MOCK) return mockRequest(path, body) as Promise<T>
  const sent = auth ? (live ?? auth) : undefined

  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(sent ? { Authorization: `${sent.tokenType || 'Bearer'} ${sent.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', 0)
  }

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* not JSON */
  }

  if (res.status === 401 && sent) {
    // Access token expired: refresh once and replay the request.
    if (!isRetry && live?.refreshToken) {
      // Another request may already have refreshed while this one was in flight.
      const fresh =
        live.token !== sent.token
          ? live
          : await refreshTokens(live).catch((err: unknown) => {
              // Offline is not the same as an invalid session: keep the agent signed in.
              if (err instanceof ApiError && err.status === 0) throw err
              return null
            })
      if (fresh) return request<T>(method, path, body, fresh, true)
    }
    onUnauthorized()
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }
  if (!res.ok || bodySaysFailed(data)) {
    throw new ApiError(messageOf(data) || `Request failed (${res.status} ${res.statusText || 'error'}).`, res.status)
  }
  if (data === null) throw new ApiError('The server returned an unexpected response.', res.status)
  return data as T
}

// ------------------------------------------------------------------ auth

export async function login(username: string, password: string, clientId: string): Promise<Session> {
  const res = await request<UserLoginResponse>('POST', ENDPOINTS.login, {
    Username: username,
    Password: password,
    ClientId: clientId,
  })
  const token = res.Result?.Token
  if (!token?.AccessToken) throw new ApiError(res.StatusMessage || 'Login failed: no access token was returned.', 200)

  const auth = toTokens(token)
  const user = await getUserDetails(auth)

  return {
    ...auth,
    clientId,
    schoolName: schoolNameFor(user, clientId),
    username: user.Username || username,
    fullName: user.FullName || user.Username || username,
    agentCode: user.Username || username,
    phoneNumber: user.PhoneNumber || '',
  }
}

export async function getUserDetails(auth: Tokens): Promise<UserGateway> {
  const res = await request<UserGatewayResponseDTO>('POST', ENDPOINTS.userDetails, undefined, auth)
  if (!res.Result) throw new ApiError(res.StatusDesc || 'Could not load your user details.', 200)
  return res.Result
}

/** The school the agent signed in for: the corporative matching the client ID, else their default one. */
function schoolNameFor(user: UserGateway, clientId: string): string {
  const corps = (user.Corporatives ?? []).filter((c) => c.CorpId)
  const id = clientId.toLowerCase()
  const match =
    corps.find((c) =>
      [c.CorpId!.ClientCorpId, c.CorpId!.ClientCode, String(c.CorpId!.Id)].some((v) => v?.toLowerCase() === id),
    ) ??
    corps.find((c) => c.Default === 1) ??
    (corps.length === 1 ? corps[0] : undefined)
  return match?.CorpId?.ClientName || clientId
}

export interface RegisterInput {
  name: string
  username: string
  gender: string
  dob: string
  mobileNumber: string
  email: string
  password: string
  /** Numeric client ID of the school. */
  clientId: number
}

export async function registerUser(input: RegisterInput): Promise<UserGateway | null> {
  const body: RegisterUserRequest = {
    RequestId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ClientId: input.clientId,
    Name: input.name,
    Email: input.email,
    Gender: input.gender,
    MobileNumber: input.mobileNumber,
    Password: input.password,
    Dob: input.dob,
    Username: input.username,
    Role: REGISTER_ROLE,
  }
  const res = await request<UserGatewayResponseDTO>('POST', ENDPOINTS.register, body)
  return res.Result
}

// --------------------------------------------------------------- deposit

export async function nameInquiry(mobileNumber: string, session: Session): Promise<string> {
  const res = await request<NameInquiryResponse>(
    'POST',
    ENDPOINTS.nameInquiry,
    { MobileNumber: mobileNumber, ClientId: session.clientId },
    session,
  )
  const name = (res.Result ?? '').trim()
  if (!name) throw new ApiError(res.StatusMessage || 'No name was found for this number.', 200)
  return name
}

export interface DepositInput {
  method: PaymentMethod
  telco?: Telco
  customerName: string
  customerNumber: string
  amount: number
}

/**
 * Assumed mapping (adjust here if the backend expects otherwise):
 *   destination = the school's client ID
 *   source      = telco code for MoMo, 'CASH' for cash
 */
export async function deposit(input: DepositInput, session: Session): Promise<Collection> {
  const isMomo = input.method === 'MOMO'
  const body: AgentDepositRequest = {
    customerName: input.customerName,
    customerNumber: session.phoneNumber,
    amount: input.amount,
    destination: input.customerNumber,
    source: isMomo && input.telco ? input.telco.code : 'CASH',
    payment_method: input.method,
    client_id: session.clientId,
  }
  const res = await request<DepositResponse>('POST', ENDPOINTS.deposit, body, session)
  return {
    reference: res.Result?.TransactionReference || '—',
    date: new Date().toISOString(),
    customerName: input.customerName,
    customerNumber: session.phoneNumber,
    amount: res.Result?.Amount || input.amount,
    currency: res.Result?.Currency || 'GHS',
    channel: isMomo ? `Mobile Money · ${input.telco?.label ?? ''}` : 'Cash',
    badge: isMomo ? (input.telco?.label ?? 'MoMo') : 'Cash',
    status: 'success',
    statusText: res.StatusMessage || 'Successful',
    school: session.schoolName,
    agent: session.fullName,
  }
}

// ---------------------------------------------------------- transactions

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function classifyStatus(status: string): TxnStatus {
  if (/fail|declin|revers|reject|error|cancel/i.test(status)) return 'failed'
  if (/success|complet|approv|paid|done/i.test(status)) return 'success'
  return 'pending'
}

function toCollection(t: TxnResp, session: Session): Collection {
  const date = t.TransactionDate && !t.TransactionDate.startsWith('0001-') ? t.TransactionDate : null
  return {
    reference: t.TransactionRefNumber || t.ExternalReferenceNumber || '—',
    date,
    customerName: t.CustomerName,
    customerNumber: t.CustomerNumber,
    amount: t.Amount,
    currency: t.TransactingCurrency || 'GHS',
    channel: [t.Service, t.BillerCode].filter(Boolean).join(' · ') || t.SourceChannel || '—',
    badge: t.BillerCode || t.SourceChannel || t.Service || 'Txn',
    status: classifyStatus(t.Status),
    statusText: t.Status || 'Pending',
    school: session.schoolName,
    agent: t.OfficerName || session.fullName,
  }
}

/** Collections by this agent over the last `days` days (1 = today only), newest first. */
export async function getTransactions(session: Session, days: number): Promise<Collection[]> {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (days - 1))
  const res = await request<AgentTransactionsResponse>(
    'POST',
    ENDPOINTS.transactions,
    { AgentCode: session.agentCode, FromDate: ymd(from), ToDate: ymd(to) },
    session,
  )
  return (res.Result ?? [])
    .map((t) => toCollection(t, session))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}
