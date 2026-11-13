// Fake backend used only when VITE_MOCK_API=true.
import { ApiError } from './api.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const NAMES = ['Ama Serwaa Boateng', 'Kwame Mensah', 'Abena Owusu', 'Kofi Asante', 'Efua Darko', 'Yaw Adjei']

export async function mockRequest(path, body) {
  await wait(900)
  switch (path) {
    case '/v1/auth/user/login':
      if (body.password === 'wrong') throw new ApiError('Invalid username or password', 401)
      return { token: 'demo-token', message: 'Login successful' }
    case '/v1/auth/register-user':
      return { message: 'User registered' }
    case '/v1/api/account-query':
      if (body.account_number.endsWith('0000')) throw new ApiError('Account not found for this number', 404)
      return { account_name: NAMES[Number(body.account_number.slice(-2)) % NAMES.length] }
    case '/v1/agent/deposit':
      if (body.amount > 10000) throw new ApiError('Amount exceeds the transaction limit', 400)
      return { reference: 'DEMO' + Date.now().toString().slice(-8), message: 'Deposit successful' }
    default:
      throw new ApiError('Not found', 404)
  }
}
