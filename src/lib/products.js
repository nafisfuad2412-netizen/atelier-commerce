import "server-only";
import { z } from "zod";
import { createPublicSupabaseClient } from "./supabase/public-server.js";

const paginationSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
const columns = "id,title,description,price,image_url,stock_status,created_at";

export async function getProducts(options = {}) {
  const { page, pageSize } = paginationSchema.parse(options);
  const start = (page - 1) * pageSize;
  const { data, error, count } = await createPublicSupabaseClient()
    .from("products").select(columns, { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: true })
    .range(start, start + pageSize - 1);
  if (error) throw new Error("Product catalog is unavailable.");
  return { products: data, pagination: { page, pageSize, total: count, hasMore: start + data.length < count } };
}

export async function getProduct(id) {
  const productId = z.uuid().parse(id);
  const { data, error } = await createPublicSupabaseClient().from("products").select(columns).eq("id", productId).maybeSingle();
  if (error) throw new Error("Product is unavailable.");
  return data;
}
