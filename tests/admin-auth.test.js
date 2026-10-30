import test from "node:test";
import assert from "node:assert/strict";
import { authorizeAdminClient } from "../src/lib/admin/auth-core.js";

const claims = { sub: "verified-user-id", email: "display-only@example.invalid", user_metadata: { role: "admin" } };
const client = (authResult, rpcResult) => ({ auth: { getClaims: async () => authResult }, rpc: async (name) => { assert.equal(name, "is_store_admin"); return rpcResult; } });

test("verified identity still requires database admin authorization", async () => {
  await assert.rejects(authorizeAdminClient(client({ data: { claims } }, { data: false })), { status: 403 });
  await assert.rejects(authorizeAdminClient(client({ data: {} }, { data: true })), { status: 401 });
  const source = client({ data: { claims } }, { data: true });
  assert.deepEqual((await authorizeAdminClient(source)).user, { id: claims.sub, email: claims.email });
});

test("invalid and expired sessions fail closed, network failures remain retryable", async () => {
  await assert.rejects(authorizeAdminClient(client({ error: { status: 401 } }, { data: true })), { status: 401 });
  await assert.rejects(authorizeAdminClient(client({ error: { name: "AuthRetryableFetchError" } }, { data: true })), { status: 503 });
  await assert.rejects(authorizeAdminClient(client({ data: { claims } }, { error: { message: "database unavailable" } })), { status: 503 });
  await assert.rejects(authorizeAdminClient({ auth: { getClaims: async () => { throw new Error("network"); } } }), { status: 503 });
});
