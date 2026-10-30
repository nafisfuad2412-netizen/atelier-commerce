// Dedicated development project only. Creates a temporary owner-email fixture
// only if no account already exists. No email is sent. All fixtures are removed.
// node --env-file=.env.local tests/admin-live.mjs <owner-email> <random-qa-nonce>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const [email, nonce] = process.argv.slice(2);
assert.ok(email && nonce, "Owner email and a unique random test nonce are required.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const operator = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const password = `Atelier-QA-${nonce}`;
const users = [];
let productId, orderId, storagePath, originalTheme;
const cookies = [];
const admin = createServerClient(url, key, { cookies: { getAll: () => cookies, setAll(values) { for (const value of values) { const index = cookies.findIndex((item) => item.name === value.name); if (index >= 0) cookies.splice(index, 1); cookies.push(value); } } } });
const other = createClient(url, key, options);
const anonymous = createClient(url, key, options);

try {
  const existing = await operator.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) throw new Error("Cannot inspect fixture safety.");
  if (existing.data.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())) {
    throw new Error("Owner account already exists; fixtures must not replace it.");
  }
  const fixture = await operator.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { atelier_test_fixture: nonce } });
  if (fixture.error) throw new Error("Cannot create temporary admin fixture.");
  users.push(fixture.data.user.id);
  const nonAdmin = await operator.auth.admin.createUser({ email: `${nonce}@example.invalid`, password, email_confirm: true, user_metadata: { atelier_test_fixture: nonce, role: "admin" } });
  if (nonAdmin.error) throw new Error("Cannot create non-admin fixture.");
  users.push(nonAdmin.data.user.id);
  assert.equal((await admin.auth.signInWithPassword({ email, password })).error, null);
  assert.equal((await other.auth.signInWithPassword({ email: `${nonce}@example.invalid`, password })).error, null);
  assert.equal((await admin.rpc("is_store_admin")).data, true);
  assert.equal((await other.rpc("is_store_admin")).data, false);
  assert.ok((await anonymous.rpc("is_store_admin")).error);

  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDeYAAAAASUVORK5CYII=", "base64");
  storagePath = `${randomUUID()}.png`;
  assert.ok((await anonymous.storage.from("product-images").upload(`${randomUUID()}.png`, bytes, { contentType: "image/png" })).error);
  assert.ok((await other.storage.from("product-images").upload(`${randomUUID()}.png`, bytes, { contentType: "image/png" })).error);
  assert.equal((await admin.storage.from("product-images").upload(storagePath, bytes, { contentType: "image/png" })).error, null);
  const imageUrl = admin.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
  assert.equal((await fetch(imageUrl)).status, 200);
  assert.equal((await admin.storage.from("product-images").upload(storagePath, bytes, { contentType: "image/png", upsert: true })).error, null);

  const created = await admin.from("products").insert({ title: "Admin QA fixture", description: "Temporary test product", price: "12.34", image_url: imageUrl }).select("id").single();
  assert.equal(created.error, null); productId = created.data.id;
  assert.ok((await other.from("products").insert({ title: "Denied", price: 1 })).error);
  assert.equal((await other.from("products").update({ price: 0 }).eq("id", productId).select("id")).data.length, 0);
  assert.equal((await other.from("products").delete().eq("id", productId).select("id")).data.length, 0);
  assert.equal((await admin.from("products").update({ price: "15.00" }).eq("id", productId).select("price").single()).data.price, 15);

  originalTheme = (await admin.from("theme_settings").select("primary_color,secondary_color,font_family").eq("id", 1).single()).data;
  assert.equal((await admin.from("theme_settings").update({ primary_color: "#123456" }).eq("id", 1).select("id")).data.length, 1);
  assert.equal((await other.from("theme_settings").update({ primary_color: "#000000" }).eq("id", 1).select("id")).data.length, 0);
  assert.equal((await admin.from("theme_settings").update(originalTheme).eq("id", 1)).error, null);

  const placed = await operator.rpc("place_store_order", { p_request_id: randomUUID(), p_payload: { customer_name: "Admin order QA fixture", customer_email: `${nonce}@example.invalid`, shipping_address: "Temporary QA address", items: [{ product_id: productId, quantity: 1 }] } });
  assert.equal(placed.error, null); orderId = placed.data.id;
  assert.equal((await other.from("orders").select("id").eq("id", orderId)).data.length, 0);
  assert.equal((await admin.from("orders").update({ status: "processing" }).eq("id", orderId).select("status").single()).data.status, "processing");
  assert.ok((await admin.from("orders").update({ total_amount: 0 }).eq("id", orderId)).error);

  const cookieHeader = cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  const dashboard = await fetch("http://127.0.0.1:3000/admin", { headers: { cookie: cookieHeader } });
  const html = await dashboard.text();
  assert.ok(html.includes("Admin QA fixture"));
  assert.ok(!html.includes(process.env.SUPABASE_SECRET_KEY));
  console.log("ADMIN_LIVE_PASS: admin authorization, non-admin denial, real Storage upload/upsert/download, product CRUD, theme changes, order access/status and SSR cookies.");
  console.log("QA_READY: temporary owner fixture available for browser validation; send cleanup when finished.");
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 15 * 60 * 1000);
    process.stdin.once("data", () => { clearTimeout(timeout); resolve(); });
  });
} finally {
  if (originalTheme) await operator.from("theme_settings").update(originalTheme).eq("id", 1);
  if (orderId) await operator.from("orders").delete().eq("id", orderId);
  if (productId) await operator.from("products").delete().eq("id", productId);
  if (storagePath) await operator.storage.from("product-images").remove([storagePath]);
  for (const id of users.reverse()) {
    const removed = await operator.auth.admin.deleteUser(id);
    if (removed.error) console.error("Auth fixture cleanup failed; operator review required.");
  }
  await admin.auth.signOut({ scope: "local" });
  await other.auth.signOut({ scope: "local" });
  console.log("QA_CLEANUP_COMPLETE");
}

// Supabase's Auth/BroadcastChannel handles can otherwise keep this CLI alive.
process.exit(0);
