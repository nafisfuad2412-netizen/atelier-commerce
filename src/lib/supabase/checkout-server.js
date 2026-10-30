import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config.js";

export function createCheckoutSupabaseClient() {
  const { url } = getSupabasePublicConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret?.startsWith("sb_secret_")) {
    throw new Error("Supabase server checkout configuration is missing.");
  }
  // This client never reads or writes an admin/customer session.
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
