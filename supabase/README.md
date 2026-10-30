# Database setup (Step 2)

Project: `atelier-commerce` (`flhzubsoajnjphkhalfg`), Personal Projects organization, Mumbai (`ap-south-1`).

The initial schema is applied to the hosted project as `atelier_commerce_initial_schema`. `schema.sql` is its source snapshot, not a script to rerun against the configured project. It deliberately fails if its objects already exist. No existing projects were modified.

## Tables and authorization

| Resource | Visitors | Verified configured admin | Server |
| --- | --- | --- | --- |
| `products` | Read | Create, read, edit, delete | CRUD |
| `theme_settings` | Read | Read and edit singleton row | CRUD |
| `orders` | No direct access | Read and update status only | CRUD |
| `product-images` | Download public URLs | List, upload, replace, delete | Storage API |
| `atelier_private.admin_access` | No access | No direct access | Operator SQL only |

`theme_settings` is the canonical theme table; the brief's alternate `theme` name is not used. Fonts are `sans`, `serif`, and `mono`; colors use six-digit hex values. Prices use fixed-point decimal values. Currency selection is deferred to storefront implementation.

The admin allowlist is a singleton stored outside the exposed schema. Its configured email was supplied by the owner and applied separately; it is not included in this public repository. A narrow private security-definer function checks the caller's Auth user ID against the authoritative user record, confirmed email, allowlist, anonymous flag, deletion status, and active ban. User-editable metadata and JWT email claims do not grant admin rights.

The admin workspace is implemented. Create the permanent account and verify the configured email through Supabase Auth as described in [admin setup](../docs/admin.md). No permanent password has been generated or stored. Temporary test accounts were removed after verification.

For a fresh clone of the database, run `schema.sql` as a database operator, then set the owner-supplied email separately:

```sql
insert into atelier_private.admin_access (id, email)
values (true, lower(btrim('<admin email supplied separately>')));
```

Do not expose `atelier_private` through the Data API. Do not commit the configured email, database credentials, or secret/service-role keys.

## Checkout boundary

Guest checkout now calls a Next.js server action or JSON API, using server-only credentials to invoke the transaction in `checkout.sql`. The function revalidates input, locks product rows, calculates totals using integer minor units, and inserts pending orders with authoritative snapshots. Rate limits and idempotency are shared across server instances in the database. No direct public order insert grant is present. See [API setup](../docs/api.md).

`items_ordered` holds item snapshots with product ID, title, quantity, and unit price. The table enforces a nonempty array of at most 100 lines; the checkout function validates each line and builds these snapshots from the catalog. Historical snapshots remain after a product is deleted.

## Images

The `product-images` bucket is public for storefront images. Accepted MIME types: JPEG, PNG, WebP, AVIF; maximum 5 MiB per file. Writes and object listing are restricted to the verified admin. Policies include select/insert/update to support replacement uploads. Validate actual image content during upload implementation; MIME restrictions alone do not inspect file contents. Private customer files must never be placed here.

## Verification

Run `tests/rls.sql` as an operator against this dedicated project. It creates temporary fixture Auth rows and test data inside a transaction, switches database roles and JWT claims, then rolls everything back. It sends no email and creates no lasting login account. The tests passed on the hosted database for public reads, denied visitor/non-admin writes and order access, spoofed claims, unverified admin denial, verified admin CRUD/status changes, immutable order totals for the admin browser role, server order insertion, and bucket-scoped storage predicates. Real file upload/download integration is deferred to Step 4.

Security advisors reported one intentional informational notice: the private allowlist has RLS enabled and no client policies (deny all). See [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Performance advisors reported the three new indexes as [unused](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), expected before application traffic. There were no security warnings or errors.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [bucket access model](https://supabase.com/docs/guides/storage/buckets/fundamentals), [upload restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets).
