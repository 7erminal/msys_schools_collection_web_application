# msys_schools_collection_web_application

School fees collection for agents: sign in with a school's client ID, then deposit
into the school's account by Mobile Money (MTN, Telecel, AT) or cash.

React + Vite, no other runtime dependencies.

## Run

```bash
npm install
cp .env.example .env   # point VITE_API_PROXY_TARGET at the backend
npm run dev
```

In dev, `/v1/*` is proxied to `VITE_API_PROXY_TARGET`, so no CORS setup is needed.
For a production build set `VITE_API_BASE_URL` (or serve the app from the API's origin).

To try the UI without a backend: `VITE_MOCK_API=true npm run dev` (a DEMO badge is shown).

## API mapping

Everything the app sends is defined in `src/lib/api.js`.

| Call | Endpoint | Body |
| --- | --- | --- |
| Login | `/v1/auth/user/login` | `username`, `password`, `clientId` |
| Register | `/v1/auth/register-user` | `username`, `password`, `clientId`, `fullName`, `phoneNumber`, `email` |
| Validate number | `/v1/api/account-query` | `account_number` (phone), `biller_code` (telco), `client_id` |
| Deposit | `/v1/agent/deposit` | `customerName`, `customerNumber`, `amount`, `destination`, `source`, `payment_method`, `client_id` |

Assumptions to confirm against the backend:

- Deposit `destination` = client ID; `source` = telco biller code (MoMo) or `CASH`; `payment_method` = `MOMO` or `CASH`.
- Biller codes default to `MTN`, `TELECEL`, `AT` (override with `VITE_BILLER_*`).
- A token found in the login response is sent as `Authorization: Bearer <token>` afterwards.
- Recent collections and receipts are stored in the browser (localStorage), since no history endpoint exists.
