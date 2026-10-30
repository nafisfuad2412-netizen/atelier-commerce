# Customer storefront (Step 5)

The completed three-page storefront is deployed at [Atelier Commerce](https://atelier-commerce-nafis.sacredbud.chatgpt.site). The Site currently has owner-only private access. GitHub repository visibility and Site audience are separate settings; public GitHub source does not open the storefront to customers.

## Experience

- **Home:** generated editorial hero image, featured carousel populated from the live catalog, store approach section, and collection links. Carousel controls, touch scrolling, focusable keyboard scrolling, hover effects and reduced-motion preferences are supported. An empty catalog produces an honest empty state rather than invented purchasable products.
- **Products:** responsive grid with real product images, descriptions, BDT prices, stock states, Buy now and add-to-bag controls. Search, availability filters, price sorting and pagination operate on the database.
- **Order:** persistent bag, quantity updates, product removal, current catalog/availability refresh, name/email/address form, server-calculated totals and a receipt-only confirmation. It records pending orders without collecting an online payment or sending email.

Primary/background colors and font family come from `theme_settings` on uncached server requests. System fonts avoid an external font dependency. The storefront displays Bangladeshi taka (BDT), as selected by the owner. Two-decimal currency amounts and integer minor units keep bag arithmetic consistent with checkout.

## Bag and retry privacy

Local storage keeps product UUIDs and quantities only. It never stores prices as authoritative values. Session storage retains a request UUID and a SHA-256 fingerprint of normalized checkout details for safe retries, and a minimal order receipt after success. Customer names, email addresses and shipping addresses are not persisted by the application in browser storage.

The request UUID is reused for identical normalized details and selected quantities, including after a reload and re-entry of the same details. Deliberately changing those details creates a new checkout request. The database transaction remains authoritative for prices, availability, status and snapshots. On transient errors, the customer is asked to retry with the same details. The bag clears only after a successful receipt. No online payment gateway or shipping fee calculation is included.

## Validation

- All 17 test groups passed, including bag parsing, quantity limits, BDT minor-unit arithmetic and stable checkout request IDs.
- The standard Next.js production build and the Sites/Vinext production build passed.
- Live API tests verified title search, price sorting, in-stock filters, selected-product reads and invalid ID rejection.
- Browser checks verified the real product grid and disabled unavailable products, Buy now navigation, quantity updates retained after reload, checkout validation, and a pending order for two units totaling BDT 2,500.00.
- The featured carousel moved through the real fixture catalog. Desktop and mobile checks showed no horizontal page overflow at the tested 1280- and 390-pixel viewports. Reduced-motion styling is included.
- Hosted checks verified Home and catalog HTTP 200, successful Supabase order insertion, duplicate request returning the same order ID, and HTTP 307 for unsigned `/admin` access.
- Temporary products, Storage image, orders and idempotency records were removed. The actual catalog remains empty until the owner adds products. No permanent admin Auth account was created during this phase.

## Before customer launch

Create the permanent verified owner account using [admin setup](admin.md), upload real products, and review the Supabase Auth password-protection setting documented there. The current deployment is private. Change the Sites audience explicitly when ready for customer access. The server has database-backed per-email order limits; public production exposure should also use edge-level abuse controls as described in [API setup](api.md).

See [deployment details](deployment.md) for the Next.js and Sites source relationship and [image provenance](assets.md) for the generated editorial asset.
