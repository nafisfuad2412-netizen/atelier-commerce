# Atelier Commerce

An e-commerce project built iteratively with Next.js App Router, React, Tailwind CSS, and Framer Motion. Supabase integration follows in later phases.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To check a production build, run `npm run build`; serve it with `npm start`.

## Project structure

- `src/app/`: root layout and placeholder routes at `/`, `/products`, `/order`, and `/admin`.
- `src/components/`: shared UI components.
- `src/lib/`: reserved for integration utilities.
- `public/`: static assets.

## Implementation phases

1. Project scaffold and initial GitHub commit.
2. Supabase schema, product image storage, and row-level security.
3. Supabase clients and server-side catalog/order operations.
4. Authenticated admin dashboard and product/theme/order management.
5. Customer storefront and final deployment preparation.

All five implementation phases are complete. The Home, Products and Order storefront, catalog API, secure checkout, and authenticated admin workspace are implemented. [Open the deployed private Site](https://atelier-commerce-nafis.sacredbud.chatgpt.site). Configure local environment variables as described in [API setup](docs/api.md), then follow [admin setup](docs/admin.md) to create the permanent owner account and add real products. Real credentials must never be committed.

The dedicated Supabase project supplies the catalog, orders, theme, Auth and Storage. See [database setup](supabase/README.md), [storefront behavior](docs/storefront.md), and [deployment details](docs/deployment.md). `theme_settings` is the canonical theme table. Order totals are calculated transactionally from database prices by the service-only checkout function. The store currency is BDT.

The standard Next.js production build and the Sites/Vinext hosting build were verified. The Site is deployed privately; customer-facing public access has not been enabled. Checkout records orders without online payment collection. Temporary test accounts and catalog/order fixtures have been removed.
