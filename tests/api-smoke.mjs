// Start the production server first. Pass a temporary 19.99 in-stock product UUID
// and a unique test email. The operator must remove fixture orders/products after.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const [productId, testEmail] = process.argv.slice(2);
assert.ok(productId && testEmail, "Usage: node tests/api-smoke.mjs <fixture-product-id> <unique-test-email>");
const base = "http://127.0.0.1:3000";
const payload = { requestId: randomUUID(), customerName: "API test fixture", customerEmail: testEmail, shippingAddress: "Integration test address", items: [{ productId, quantity: 2 }] };
const post = async (body, headers = {}) => {
  const response = await fetch(`${base}/api/orders`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
};

const catalog = await fetch(`${base}/api/products`);
assert.equal(catalog.status, 200);
assert.equal(catalog.headers.get("cache-control"), "no-store");
assert.ok((await catalog.json()).products.some((product) => product.id === productId));
assert.equal((await fetch(`${base}/api/products?pageSize=101`)).status, 400);
assert.equal((await fetch(`${base}/api/orders`)).status, 405);
assert.equal((await post({ ...payload, totalAmount: 0.01 })).status, 400);
assert.equal((await post(payload, { origin: "https://untrusted.example" })).status, 403);
assert.equal((await post(payload, { "content-type": "text/plain" })).status, 415);
assert.equal((await post("{")).status, 400);
assert.equal((await post("x".repeat(16385))).status, 413);

const first = await post(payload);
assert.equal(first.status, 200, JSON.stringify(first.body));
assert.equal(first.body.order.total_amount, "39.98");
assert.equal(first.body.order.status, "pending");
assert.deepEqual(Object.keys(first.body.order).sort(), ["created_at", "id", "status", "total_amount"]);
assert.deepEqual((await post(payload)).body.order, first.body.order);
assert.equal((await post({ ...payload, customerName: "Changed" })).status, 409);
assert.equal((await post({ ...payload, requestId: randomUUID(), items: [{ productId: randomUUID(), quantity: 1 }] })).status, 409);

const concurrentPayload = { ...payload, requestId: randomUUID() };
const concurrent = await Promise.all([post(concurrentPayload), post(concurrentPayload)]);
concurrent.forEach((response) => assert.equal(response.status, 200, JSON.stringify(response.body)));
assert.equal(concurrent[0].body.order.id, concurrent[1].body.order.id);
console.log(JSON.stringify({ passed: true, testEmail, orders: [first.body.order.id, concurrent[0].body.order.id] }));
