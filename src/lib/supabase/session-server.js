import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config.js";

export async function createSessionClient() {
  const jar = await cookies();
  const { url, key } = getSupabasePublicConfig();
  return createServerClient(url, key, {
    global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store", signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. The admin proxy refreshes them.
        }
      },
    },
  });
}
