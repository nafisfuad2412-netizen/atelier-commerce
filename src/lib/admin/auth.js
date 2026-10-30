import "server-only";
import { createSessionClient } from "../supabase/session-server.js";
import { authorizeAdminClient } from "./auth-core.js";
export { AdminAccessError } from "./auth-core.js";

export async function requireAdmin() {
  return authorizeAdminClient(await createSessionClient());
}
