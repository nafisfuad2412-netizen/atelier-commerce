import test from "node:test";
import assert from "node:assert/strict";
import { orderSchema } from "../src/lib/checkout/validation.js";
import { createOrderService } from "../src/lib/checkout/service.js";
import { readOrderJson, jsonResponse } from "../src/lib/http.js";

const requestId = "a6dfab81-b282-47dd-b12c-8c98110b5c86";
const productId = "b727513a-b9a7-492b-b780-f2b1c6c29701";
const input = () => ({ requestId, customerName: " Test Customer ", customerEmail: "TEST@example.com", shippingAddress: " Test address ", items: [{ productId, quantity: 2 }] });
const receipt = { id: requestId, total_amount: "39.98", status: "pending", created_at: "2026-10-30T00:00:00+00:00" };

test("normalizes customer fields and product UUIDs", () => {
  const value = input();
  value.items[0].productId = productId.toUpperCase();
  const result = orderSchema.parse(value);
  assert.equal(result.customerName, "Test Customer");
  assert.equal(result.customerEmail, "test@example.com");
  assert.equal(result.shippingAddress, "Test address");
  assert.equal(result.items[0].productId, productId);
});

test("rejects forged totals, prices, status, bad contact details, duplicates and invalid quantities", () => {
  const invalid = [
    { ...input(), totalAmount: 0.01 },
    { ...input(), status: "completed" },
    { ...input(), customerEmail: "invalid" },
    { ...input(), customerName: " " },
    { ...input(), shippingAddress: "tiny" },
    { ...input(), requestId: "not-a-uuid" },
    { ...input(), items: [] },
    { ...input(), items: [{ productId, quantity: 1, price: 0.01 }] },
    { ...input(), items: [{ productId, quantity: 1 }, { productId: productId.toUpperCase(), quantity: 2 }] },
    ...[0, -1, 1.5, 100, "2", null].map((quantity) => ({ ...input(), items: [{ productId, quantity }] })),
  ];
  invalid.forEach((value) => assert.equal(orderSchema.safeParse(value).success, false));
});

test("invalid input never reaches the privileged database client", async () => {
  const service = createOrderService(() => { throw new Error("must not run"); });
  const result = await service({ ...input(), totalAmount: 0 });
  assert.equal(result.status, 400);
});

test("sends only validated fields and returns only the receipt", async () => {
  const service = createOrderService(() => ({ rpc: async (name, params) => {
    assert.equal(name, "place_store_order");
    assert.equal(params.p_request_id, requestId);
    assert.deepEqual(params.p_payload, { customer_name: "Test Customer", customer_email: "test@example.com", shipping_address: "Test address", items: [{ product_id: productId, quantity: 2 }] });
    return { data: receipt, error: null };
  } }));
  assert.deepEqual(await service(input()), { ok: true, status: 200, order: receipt });
});

test("maps expected database failures and hides internal errors", async () => {
  for (const [message, status] of [["PRODUCT_UNAVAILABLE", 409], ["ORDER_RATE_LIMIT", 429], ["IDEMPOTENCY_CONFLICT", 409], ["secret database details", 503]]) {
    const service = createOrderService(() => ({ rpc: async () => ({ error: { message } }) }));
    const result = await service(input());
    assert.equal(result.status, status);
    assert.equal(JSON.stringify(result).includes("secret database details"), false);
  }
  const service = createOrderService(() => { throw new Error("secret key"); });
  assert.equal((await service(input())).status, 503);
});

test("rejects malformed receipt responses without exposing database fields", async () => {
  const service = createOrderService(() => ({ rpc: async () => ({ data: { ...receipt, customer_email: "private@example.com" } }) }));
  const result = await service(input());
  assert.equal(result.status, 503);
  assert.equal(JSON.stringify(result).includes("private@example.com"), false);
});

test("requires JSON, rejects cross-origin requests and malformed bodies", async () => {
  const request = (body, headers = {}) => new Request("https://store.example/api/orders", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  assert.deepEqual(await readOrderJson(request(JSON.stringify(input()))), input());
  await assert.rejects(readOrderJson(request("{}", { "content-type": "text/plain" })), { status: 415 });
  await assert.rejects(readOrderJson(request("{}", { origin: "https://other.example" })), { status: 403 });
  await assert.rejects(readOrderJson(request("{")), { status: 400 });
  await assert.rejects(readOrderJson(request("x".repeat(16385))), { status: 413 });
  const result = jsonResponse({ error: "limited" }, 429);
  assert.equal(result.headers.get("retry-after"), "3600");
  assert.equal(result.headers.get("cache-control"), "no-store");
});
