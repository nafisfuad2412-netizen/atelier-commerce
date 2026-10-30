# Store administration (Step 4)

## First sign-in

The admin panel is at `/admin`; unsigned visitors are redirected to `/admin/login`. In this checkout, run `npm run dev` and open http://localhost:3000/admin.

Create the permanent account for the configured owner email in [Supabase Authentication → Users](https://supabase.com/dashboard/project/flhzubsoajnjphkhalfg/auth/users). Choose your own strong password and ensure the email is confirmed. The configured email remains in the private database allowlist, not this public repository. No permanent account or password was generated. Development test accounts were removed after verification.

Use the email/password form to sign in. Other accounts receive an access-denied message and their local session is signed out. Sign out from the workspace sidebar. Account provisioning and password recovery are managed through Supabase rather than a public admin-signup form.

Supabase advisors currently report [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Review that Auth setting before production use. The intentional private allowlist [deny-all RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) remains informational.

## Workspace

- **Products:** paginated collection, title search, create/edit product details and stock status, direct Supabase Storage image uploads, and explicit product-delete confirmation. Removing a product preserves existing order item snapshots.
- **Orders:** paginated customer orders, customer contact and shipping details, item snapshots, totals, and status changes. The signed-in admin cannot rewrite order totals or customer details through the database API.
- **Appearance:** primary/background hex colors and three system font families, with an immediate local preview and saved database settings. Application to the customer storefront follows in Step 5.

Counts and empty states reflect the actual database; no demo products or orders remain. Admin amounts display two decimals; the store currency selected in Step 5 is BDT. Order dates use Dhaka time.

## Security and session flow

The admin proxy refreshes and verifies signed Supabase claims and redirects unsigned requests. Server-rendered admin pages and every management action independently verify signed claims and call `is_store_admin()`, an authenticated-only `SECURITY INVOKER` probe of the private database authorization helper. The helper checks the current Auth user and confirmed allowlisted email. JWT email and editable user metadata never authorize a user.

All dashboard reads and mutations use the publishable-key client with the administrator's cookie-backed session. The checkout service credential is not used by the admin dashboard. RLS applies to product, theme, order, and Storage operations even if someone bypasses the interface. Authenticated responses are private and uncached. Individual session-client network requests have a 12-second timeout; transient verification failures remain retryable and fail closed.

`supabase/admin.sql` was applied as `atelier_admin_authorization_probe` after the initial and checkout schemas. It introduces no new data access beyond a boolean authorization result. Runtime environment values remain in ignored local configuration.

## Images

Uploads go directly from the browser to the `product-images` Storage bucket under a random UUID path. The UI validates file size, MIME type, header signature, successful image decoding, and dimensions before upload. JPEG, PNG, WebP, and AVIF are accepted up to 5 MiB and 12,000 pixels per side. SVG and corrupt image files are rejected. The server accepts product image URLs only from this project's public product bucket and generated UUID paths.

The database save follows a successful upload. Existing image files are removed after product deletion or replacement only when no product still references them; a cleanup failure reports that the product change was saved. If an upload succeeds but a later save is interrupted, its URL is retained in the current editor for retry. Cancelled or interrupted edits can leave an unused file; they are not automatically deleted when the save outcome is uncertain. Storage RLS, not browser file checks, is the access-control boundary. Administrators remain trusted to upload appropriate content.

## Validation

- `npm test`: 13 passing groups covering authorization, expired/invalid sessions, retryable network failures, product/price/theme/status validation, image path confinement, MIME spoofing, and checkout behavior.
- `npm run build`: successful production build with admin routes, server actions, and session proxy.
- `tests/admin-live.mjs`: live Supabase checks passed for admin/non-admin authorization, real Storage upload/upsert/public download, denied visitor uploads, product management, theme changes, protected order access, status-only order updates, and SSR session cookies.
- Browser checks: password sign-in, image decoding rejection, valid direct upload/product creation, price and availability edits, product deletion, order status saves, appearance saves and preview, and responsive layout at a 390-pixel viewport. No horizontal page overflow was observed.
- Test accounts, products, orders, image objects, and request-ledger rows were removed; the original theme was restored. The browser preview was captured using test data before cleanup.

`tests/admin-live.mjs` is an operator-run development test, not an automatic production test. It refuses to overwrite an existing owner account, creates temporary Auth users without sending email, and cleans them up on normal completion. It holds fixtures for browser checks until stdin input or a 15-minute timeout. An abrupt process termination may require operator cleanup. Never use it on a populated production store.

The customer storefront is complete and [deployed privately](https://atelier-commerce-nafis.sacredbud.chatgpt.site). The saved appearance is applied to storefront requests. See [storefront behavior](storefront.md) and [deployment details](deployment.md).
