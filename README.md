# msys_schools_collection_web_application

School fees collection for agents: sign in with a school's client ID, then deposit
into the school's account by Mobile Money (MTN, Telecel, AT) or cash.

React + TypeScript + Vite, no other runtime dependencies.

## Run

```bash
npm install
npm run dev
```

The API lives at `https://app.msysconsultgh.com`. In dev, `/v1/*` and `/agent/*` are proxied
there by Vite (no CORS needed); a production build calls it directly, so either host the app on
that origin or allow the app's origin in the API's CORS settings. Override with `.env`
(see `.env.example`).

- `npm run typecheck` - TypeScript check
- `npm run build` - typecheck + production build
- `VITE_MOCK_API=true npm run dev` - try the UI without a backend (a DEMO badge is shown)

## API mapping

Endpoints, request bodies and mappings are all in `src/lib/api.ts`; DTO types in `src/lib/types.ts`.

| Call | Method and endpoint | Body |
| --- | --- | --- |
| Login | `POST /v1/auth/user/login` | `Username`, `Password`, `ClientId` |
| User details | `GET /agent/api/get-user-details` | none (access token) |
| Register | `POST /v1/auth/register-user` | `Username`, `Password`, `ClientId`, `FullName`, `PhoneNumber`, `Email` |
| Name inquiry | `POST /v1/api/name-inquiry` | `MobileNumber`, `ClientId` |
| Deposit | `POST /v1/agent/api/deposit` | `customerName`, `customerNumber`, `amount`, `destination`, `source`, `payment_method`, `client_id` |
| Transactions | `POST /v1/agent/api/get-agent-transactions` | `AgentCode`, `FromDate`, `ToDate` |

Authenticated calls send `Authorization: <TokenType> <AccessToken>`. A body with
`Success: false` / `StatusCode: false` is treated as an error and its message shown.

Assumptions to confirm against the backend:

- User details is a `GET` at `/agent/api/...` (no `/v1` prefix), as specified.
- `AgentCode` = the user's `Username`; `FromDate` / `ToDate` are `YYYY-MM-DD`.
- `MobileNumber` is sent as typed (`0241234567`).
- Deposit `destination` = client ID; `source` = telco code (`MTN` / `TELECEL` / `AT`) for MoMo or `CASH`; `payment_method` = `MOMO` or `CASH`.
- Transaction `Status` text containing success/complete/approved/paid counts as successful, fail/declined/reversed/rejected as failed, anything else as pending. Only successful ones count towards "Collected today".
- Register request fields are unchanged guesses.
