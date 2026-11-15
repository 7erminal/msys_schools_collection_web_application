// ---- Backend DTOs (Go structs without json tags serialise with these exact names) ----

export interface TokenResponseDTO {
  AccessToken: string
  RefreshToken: string
  TokenType: string
  ExpiresIn: number
  PinSet: boolean
}

export interface UserLoginResponse {
  StatusCode: boolean
  StatusMessage: string
  Result: { UserType: string; Token: TokenResponseDTO | null } | null
}

export interface Client {
  Id: number
  ClientCorpId: string
  ClientName: string
  ClientCode: string
  ClientUrl: string
  Active: number
}

export interface UserCorporative {
  Id: number
  UserId: string
  CorpId: Client | null
  Default: number
  Active: number
}

export interface BranchesResponse {
  BranchName: string
  Country: string
  Location: string
  PhoneNumber: string
  Active: number
}

export interface UserGateway {
  UserId: number
  FullName: string
  Username: string
  Email: string
  PhoneNumber: string
  ImagePath: string
  Status: string
  IsVerified: boolean
  DateRegistered: string
  Branch: BranchesResponse | null
  Corporatives: UserCorporative[] | null
}

export interface UserGatewayResponseDTO {
  Success: boolean
  Result: UserGateway | null
  StatusDesc: string
}

export interface RegisterUserRequest {
  RequestId: string
  ClientId: number
  Name: string
  Email: string
  Gender: string
  MobileNumber: string
  Password: string
  Dob: string
  Username: string
  Role: string
}

export interface NameInquiryResponse {
  Success: boolean
  StatusMessage: string
  Result: string
}

export interface AgentDepositRequest {
  customerName: string
  customerNumber: string
  amount: number
  destination: string
  source: string
  payment_method: string
  client_id: string
}

export interface DepositResponse {
  Success: boolean
  StatusMessage: string
  Result: { TransactionReference: string; Amount: number; Currency: string } | null
}

export interface TxnResp {
  TransactionRefNumber: string
  Service: string
  BillerCode: string
  CustomerName: string
  CustomerNumber: string
  Amount: number
  TransactingCurrency: string
  SourceChannel: string
  SourceAccount: string
  DestinationAccount: string
  Package: string
  Charge: number
  ExternalReferenceNumber: string
  Status: string
  CorpId: string
  ExtraDetails1: string
  ExtraDetails2: string
  ExtraDetails3: string
  TransactionDate: string
  OfficerName: string
  OfficerNumber: string
  Active: number
}

export interface AgentTransactionsResponse {
  Success: boolean
  Result: TxnResp[] | null
  StatusDesc: string
}

// ---- App models ----

export type PaymentMethod = 'MOMO' | 'CASH'
export type TelcoId = 'MTN' | 'TELECEL' | 'AT'

export interface Telco {
  id: TelcoId
  label: string
  sub: string
  code: string
}

export interface Tokens {
  token: string
  tokenType: string
  refreshToken: string
}

export interface Session extends Tokens {
  /** Client ID typed at login - identifies the school in every request. */
  clientId: string
  schoolName: string
  username: string
  fullName: string
  /** Sent as AgentCode when fetching transactions. */
  agentCode: string
  phoneNumber: string
}

export type TxnStatus = 'success' | 'failed' | 'pending'

/** One collection, as shown in the list and on a receipt. */
export interface Collection {
  reference: string
  date: string | null
  customerName: string
  customerNumber: string
  amount: number
  currency: string
  /** Human readable channel, e.g. "Mobile Money · MTN" or "Cash". */
  channel: string
  /** Short label for the list badge. */
  badge: string
  status: TxnStatus
  statusText: string
  school: string
  agent: string
}
