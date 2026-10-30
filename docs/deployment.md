# Deployment

- Canonical Next.js repository: https://github.com/nafisfuad2412-netizen/atelier-commerce
- Site: https://atelier-commerce-nafis.sacredbud.chatgpt.site
- Sites project: `appgprj_6ae4e28c1c248191a8013209faf25293`
- Deployed Sites source commit: `71dbaad37d605ac3fb32962516bcb9ecdbb834d0`
- Saved version: `appgprj_6ae4e28c1c248191a8013209faf25293~appgver_9c098305a79481919df4def8ad43afdc`
- Deployment: `appgdep_6ae4e73abac4819194f9c7579bf8d253` (succeeded; environment revision 1).
- Audience: private to the owner. Supabase administrator authentication is a separate application-level check.

The canonical project retains `next dev`, `next build`, and `next start`. Sites hosts Cloudflare Workers, so the deployment checkout uses the supplied Sites Vinext starter, preserving its Worker entrypoint and `sites()` build integration. The same application `src/` and image assets were copied into that runtime. It uses pinned Supabase/SSR, Framer Motion and Zod versions matching this repository; its React/Next compatibility dependencies remain the starter's supported versions.

Local canonical checkout: `C:/Users/NAFIS/Downloads/New folder/atelier-commerce`.

Local Sites checkout: `C:/Users/NAFIS/Downloads/New folder/atelier-commerce-site`.

The Sites checkout's `.openai/hosting.json` owns the Site identity. Reuse it; do not create another Site when editing this storefront. Runtime scripts, generated client/SSR/Worker output and the private Sites Git repository are managed by the Sites workflow. The archive was built from the exact pushed Sites commit and deployed through the private publication operation.

Hosted values are configured through Sites environment tools: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN`, and secret `SUPABASE_SECRET_KEY`. No server secret, private access token, local environment file, test credential or user allowlist email is included in source or deployment archives. Only publishable configuration is included in browser bundles. The local `.env.local` remains ignored in the canonical checkout.

For later releases, copy reviewed application changes into the existing Sites source checkout, preserve its runtime files and identity, build with public environment values supplied in memory, synchronize/package with the Sites source helper, and deploy the saved exact source version. Update hosted runtime secrets through the native environment tool, never source files. Re-check the catalog, checkout and admin redirect after deployment.

The GitHub commit and Sites source commit differ because the Sites repository includes the hosting runtime. Both contain the completed application, and the standard Next.js build remains available from this repository.
