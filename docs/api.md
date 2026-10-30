# Catalog and checkout API (Step 3)

## Environment

Copy `.env.example` to `.env.local`, then configure the project's publishable key and server-only secret key. Local credentials have already been configured in this checkout. `.env.local` is ignored by Git. Set equivalent environment variables in the eventual host; the local file is never a deployment artifact.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may reach the browser. `SUPABASE_SECRET_KEY` must only be used by server modules. Its client has no persisted session and never handles admin login. `APP_ORIGIN` may specify the final site origin behind a reverse proxy.

## Utilities

- `src/lib/supabase.js`: lazy browser client with publishable credentials, ready for the admin Auth implementation.
- `src/lib/supabase/public-server.js`: stateless publishable client for public server reads, honoring RLS.
- `src/lib/supabase/checkout-server.js`: isolated server-only privileged client.
- `src/lib/products.js`: `getProducts({ page, pageSize })` and `getProduct(id)` for server components and handlers.
- `src/app/actions/orders.js`: `placeOrder(input)` server action sharing validation and checkout behavior with the HTTP endpoint.

Admin authentication, session refresh, route protection, and management controls are implemented in Step 4. See [admin setup](admin.md).

## GET /api/products

Optional query parameters: `page` (1–10000, default 1), `pageSize` (1–100, default 24). Returns `{ products, pagination: { page, pageSize, total, hasMore } }`. Sorting is newest first with a stable UUID tie-breaker. Invalid pagination returns 400; unavailable configuration/database returns 503. Responses use `Cache-Control: no-store` so stock and prices stay current.

## POST /api/orders

Send `Content-Type: application/json` with:

```json
{
  "requestId": "a6dfab81-b282-47dd-b12c-8c98110b5c86",
  "customerName": "Example Customer",
  "customerEmail": "customer@example.com",
  "shippingAddress": "Example delivery address",
  "items": [
    { "productId": "b727513a-b9a7-492b-b780-f2b1c6c29701", "quantity": 2 }
  ]
}
```

Use a real product UUID from the catalog and generate a fresh request ID with `crypto.randomUUID()` for each new checkout attempt. Retain that ID and identical order details for network retries. Reusing an ID with different order details returns 409. Retrying a successful order returns the existing receipt, including after prices or stock change. The storefront should reset the request ID only after success or a deliberate cart/customer-detail change.

Success returns HTTP 200 with `{ ok: true, order: { id, total_amount, status, created_at } }`. `total_amount` is an exact two-decimal string. No customer details or order history are returned. A successful new order starts as `pending`; this endpoint records an order and does not charge a payment method or send email.

Errors return `{ ok: false, error: { code, message, fields? } }`. The server action returns the same object with an additional numeric `status` property. Status codes are 400 for validation/JSON, 403 for a mismatched browser Origin, 409 for unavailable products or conflicting retries, 413 above 16 KiB, 415 for non-JSON, 429 for the email rate limit, and 503 for configuration/network/database errors. Preserve request IDs on 503 retries. Raw database messages and credentials are never returned or logged.

The payload accepts only the listed fields. Client-supplied prices, titles, totals, and statuses are rejected. Up to 100 distinct products and integer quantities of 1–99 are allowed. Input is normalized and validated again inside the database transaction.

## Database transaction

`supabase/checkout.sql` was applied as `atelier_service_checkout` after the initial schema. It creates a private idempotency ledger, an email/time index, and `public.place_store_order(uuid, jsonb)`. The function is `SECURITY INVOKER` and executable only by `service_role`. Visitors and authenticated browser users cannot call it or insert directly into `orders`.

The function serializes request-ID and email operations with transaction-scoped advisory locks. It locks product rows in deterministic order, reads current availability and decimal prices, calculates totals in integer minor units, saves authoritative item snapshots, and inserts the order and request ledger atomically. It allows at most five new orders per normalized email per rolling hour; retries do not consume quota. Stock is a status flag, not a numerical inventory count.

The email limit is basic abuse control, not identity verification: an attacker can rotate email addresses. Edge-level throttling or a challenge should be configured before public production checkout is exposed. Do not trust arbitrary forwarded-IP headers as a substitute.

## Validation completed

- `npm test`: seven groups covering input tampering, normalization, privileged-client isolation, receipts, error handling, and HTTP request boundaries.
- `npm run build`: production compilation passed for pages, route handlers, and the server action.
- `supabase/tests/checkout.sql`: passed against the hosted database, covering denied browser RPC access, authoritative totals, retries, mismatched payloads, malformed input, stock/missing products, and shared email limits. Fixtures roll back.
- `tests/api-smoke.mjs`: passed against the production Next.js server and hosted Supabase, including actual order insertion, receipt-only responses, concurrent retries, and HTTP errors. Temporary orders, request-ledger rows, and product were removed; the database returned to an empty catalog/order state.
- Supabase advisors: no security warnings or errors; the existing informational deny-all allowlist and unused catalog/order indexes remain documented in `supabase/README.md`.

To rerun HTTP integration checks, start the server, create a temporary in-stock product priced at 19.99 using operator access, then run `node tests/api-smoke.mjs <product-id> <unique-test-email>`. Remove the fixture orders (their ledger rows cascade) and product afterward. This test deliberately creates real database records; use a dedicated development project.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [Next.js server data security](https://nextjs.org/docs/app/guides/data-security).
