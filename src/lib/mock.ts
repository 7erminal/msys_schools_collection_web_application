// Fake backend used only when VITE_MOCK_API=true.
import { ApiError, ENDPOINTS } from './api'
import type { AgentDepositRequest, TxnResp } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const NAMES = ['Ama Serwaa Boateng', 'Kwame Mensah', 'Abena Owusu', 'Kofi Asante', 'Efua Darko', 'Yaw Adjei']

const txn = (over: Partial<TxnResp>): TxnResp => ({
  TransactionRefNumber: 'DEMO' + Math.random().toString().slice(2, 10),
  Service: 'DEPOSIT',
  BillerCode: 'MTN',
  CustomerName: NAMES[0],
  CustomerNumber: '0241234567',
  Amount: 100,
  TransactingCurrency: 'GHS',
  SourceChannel: 'MOMO',
  SourceAccount: '',
  DestinationAccount: '',
  Package: '',
  Charge: 0,
  ExternalReferenceNumber: '',
  Status: 'SUCCESS',
  CorpId: '',
  ExtraDetails1: '',
  ExtraDetails2: '',
  ExtraDetails3: '',
  TransactionDate: new Date().toISOString(),
  OfficerName: 'Demo Agent',
  OfficerNumber: '',
  Active: 1,
  ...over,
})

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const txns: TxnResp[] = [
  txn({ Amount: 450, CustomerName: NAMES[1], TransactionDate: hoursAgo(26) }),
  txn({ Amount: 1200, CustomerName: NAMES[2], BillerCode: '', SourceChannel: 'CASH', TransactionDate: hoursAgo(30) }),
  txn({ Amount: 300, CustomerName: NAMES[3], BillerCode: 'TELECEL', Status: 'FAILED', TransactionDate: hoursAgo(50) }),
]

export async function mockRequest(path: string, body?: object): Promise<unknown> {
  await wait(800)
  const b = (body ?? {}) as Record<string, unknown>
  switch (path) {
    case ENDPOINTS.login:
      if (b.Password === 'wrong') throw new ApiError('Invalid username or password', 401)
      return {
        StatusCode: true,
        StatusMessage: 'Login successful',
        Result: { UserType: 'AGENT', Token: { AccessToken: 'demo', RefreshToken: 'demo-refresh', TokenType: 'Bearer', ExpiresIn: 3600, PinSet: true } },
      }
    case ENDPOINTS.userDetails:
      return {
        Success: true,
        StatusDesc: 'OK',
        Result: {
          UserId: 1,
          FullName: 'Demo Agent',
          Username: 'demo',
          Corporatives: [{ Id: 1, Default: 1, Active: 1, CorpId: { Id: 1, ClientName: 'Demo International School', ClientCode: 'DEMO', ClientCorpId: 'DEMO' } }],
        },
      }
    case ENDPOINTS.register:
      if (b.Username === 'taken') throw new ApiError('Username already exists', 200)
      return { Success: true, StatusDesc: 'User registered', Result: { UserId: 2, FullName: b.Name, Username: b.Username } }
    case ENDPOINTS.nameInquiry: {
      const n = String(b.MobileNumber)
      if (n.endsWith('0000')) throw new ApiError('No account found for this number', 200)
      return { Success: true, StatusMessage: 'OK', Result: NAMES[Number(n.slice(-2)) % NAMES.length] }
    }
    case ENDPOINTS.deposit: {
      const d = b as unknown as AgentDepositRequest
      if (d.amount > 10000) throw new ApiError('Amount exceeds the transaction limit', 200)
      const t = txn({
        Amount: d.amount,
        CustomerName: d.customerName,
        CustomerNumber: d.customerNumber,
        SourceChannel: d.payment_method,
        BillerCode: d.payment_method === 'MOMO' ? d.source : '',
      })
      txns.unshift(t)
      return { Success: true, StatusMessage: 'Deposit successful', Result: { TransactionReference: t.TransactionRefNumber, Amount: d.amount, Currency: 'GHS' } }
    }
    case ENDPOINTS.transactions:
      return { Success: true, StatusDesc: 'OK', Result: txns }
    default:
      throw new ApiError('Not found', 404)
  }
}
