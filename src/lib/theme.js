import "server-only";
import { createPublicSupabaseClient } from "./supabase/public-server.js";
import { themeSchema } from "./admin/validation.js";
import { DEFAULT_THEME } from "./store.js";

export async function getStoreTheme() {
  try {
    const { data, error } = await createPublicSupabaseClient().from("theme_settings").select("primary_color,secondary_color,font_family").eq("id", 1).single();
    if (error) return DEFAULT_THEME;
    const parsed = themeSchema.safeParse(data);
    return parsed.success ? parsed.data : DEFAULT_THEME;
  } catch { return DEFAULT_THEME; }
}
