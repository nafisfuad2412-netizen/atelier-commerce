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

The catalog API and secure order API/server action are implemented. Configure environment variables as described in [API setup](docs/api.md). The storefront and admin routes remain placeholders; the admin route exposes no customer data or controls. Real credentials must never be committed.

Steps 2 and 3 are configured in the dedicated Supabase project. See [database setup](supabase/README.md) for the schema, access model, storage restrictions, and verified database tests. `theme_settings` is the canonical theme table. Order totals are calculated transactionally from database prices by the service-only checkout function.

Deployment to Sites is pending the later phases and verification of its Next.js-compatible server runtime. This setup has not been deployed.
