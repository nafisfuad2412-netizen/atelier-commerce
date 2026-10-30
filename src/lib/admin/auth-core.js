import "server-only";

export class AdminAccessError extends Error {
  constructor(status) { super("Administrator access is required."); this.status = status; }
}

export async function authorizeAdminClient(client) {
  try {
    // getClaims verifies the JWT signature. Cookie/session contents alone are untrusted.
    const { data, error } = await client.auth.getClaims();
    if (error) {
      const transient = error.status >= 500 || error.name === "AuthRetryableFetchError" || error.name === "AbortError";
      throw new AdminAccessError(transient ? 503 : 401);
    }
    if (!data?.claims?.sub) throw new AdminAccessError(401);
    // The database reads the current Auth user and configured email; JWT email or
    // user_metadata is never used to decide who is an administrator.
    const result = await client.rpc("is_store_admin");
    if (result.error) throw new AdminAccessError(503);
    if (result.data !== true) throw new AdminAccessError(403);
    return { client, user: { id: data.claims.sub, email: data.claims.email ?? "Administrator" } };
  } catch (error) {
    if (error instanceof AdminAccessError) throw error;
    throw new AdminAccessError(503);
  }
}
