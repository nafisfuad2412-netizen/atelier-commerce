"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { requireAdmin, AdminAccessError } from "@/lib/admin/auth";
import { productSchema, themeSchema, orderStatusSchema, getProductImagePath } from "@/lib/admin/validation";

export async function signIn(_previous, formData) {
  const parsed = z.object({ email: z.email().max(320), password: z.string().min(1).max(1024) }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(), password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };
  try {
    const client = await createSessionClient();
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error) return { error: "Unable to sign in. Check your credentials and verify your email." };
    const access = await client.rpc("is_store_admin");
    if (access.error || access.data !== true) {
      await client.auth.signOut({ scope: "local" });
      return { error: "This account does not have access to the store administration." };
    }
  } catch { return { error: "Sign-in is temporarily unavailable. Please try again." }; }
  redirect("/admin");
}

export async function signOut() {
  const client = await createSessionClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign-out failed. Please try again.");
  redirect("/admin/login");
}

async function mutation(task) {
  try {
    const context = await requireAdmin();
    const result = await task(context.client);
    revalidatePath("/admin");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof AdminAccessError) return { ok: false, error: error.status === 503 ? "Access verification is temporarily unavailable." : "Your admin session has ended or access was denied. Please sign in again." };
    if (error instanceof z.ZodError) return { ok: false, error: "Check the form fields and try again." };
    return { ok: false, error: "The change could not be saved. Please refresh and try again." };
  }
}

async function removeUnusedImage(client, imageUrl) {
  if (!imageUrl) return {};
  try {
    const path = getProductImagePath(imageUrl, getSupabasePublicConfig().url);
    const references = await client.from("products").select("id", { count: "exact", head: true }).eq("image_url", imageUrl);
    if (references.error) throw new Error("Image check unavailable.");
    if (references.count !== 0) return {};
    const removed = await client.storage.from("product-images").remove([path]);
    if (removed.error) throw new Error("Image removal failed.");
    return {};
  } catch {
    return { warning: "The product change was saved, but its unused image could not be removed." };
  }
}

export async function saveProduct(input) {
  return mutation(async (client) => {
    const { id, ...values } = productSchema.parse(input);
    getProductImagePath(values.image_url, getSupabasePublicConfig().url);
    let previousImage = null;
    if (id) {
      const previous = await client.from("products").select("image_url").eq("id", id).single();
      if (previous.error) throw new Error("Product no longer exists.");
      previousImage = previous.data.image_url;
    }
    const query = id ? client.from("products").update(values).eq("id", id) : client.from("products").insert(values);
    const saved = await query.select("id").single();
    if (saved.error) throw new Error("Save failed.");
    if (previousImage && previousImage !== values.image_url) return removeUnusedImage(client, previousImage);
    return {};
  });
}

export async function deleteProduct(input) {
  return mutation(async (client) => {
    const id = z.uuid().parse(input);
    const removed = await client.from("products").delete().eq("id", id).select("image_url").single();
    if (removed.error) throw new Error("Delete failed.");
    return removeUnusedImage(client, removed.data.image_url);
  });
}

export async function saveTheme(input) {
  return mutation(async (client) => {
    const values = themeSchema.parse(input);
    const saved = await client.from("theme_settings").update(values).eq("id", 1).select("id").single();
    if (saved.error) throw new Error("Theme update failed.");
    return {};
  });
}

export async function updateOrderStatus(input) {
  return mutation(async (client) => {
    const { id, status } = orderStatusSchema.parse(input);
    const saved = await client.from("orders").update({ status }).eq("id", id).select("id").single();
    if (saved.error) throw new Error("Order update failed.");
    return {};
  });
}
