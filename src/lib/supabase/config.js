export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith("sb_publishable_")) {
    throw new Error("Supabase public configuration is missing or invalid.");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("Supabase requires an HTTPS URL.");
  }
  return { url, key };
}
