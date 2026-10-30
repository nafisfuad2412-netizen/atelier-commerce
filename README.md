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

The current scaffold does not perform authentication, accept orders, or expose admin data. No environment variables or credentials are required for this phase. Real credentials must never be committed.

Before the database phase, select a Supabase project and confirm the admin email. The brief uses both `theme` and `theme_settings`; use one canonical table consistently during that phase. Order totals must be computed from database prices on the server.

Deployment to Sites is pending the later phases and verification of its Next.js-compatible server runtime. This setup has not been deployed.
