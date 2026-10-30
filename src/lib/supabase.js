"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./supabase/config.js";

let browserClient;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, key } = getSupabasePublicConfig();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
