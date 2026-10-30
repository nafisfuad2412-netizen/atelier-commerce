import "server-only";
import { z } from "zod";
import { createPublicSupabaseClient } from "./supabase/public-server.js";

const paginationSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  query: z.string().trim().max(100).default(""),
  stock: z.enum(["all", "in_stock"]).default("all"),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
});
const columns = "id,title,description,price,image_url,stock_status,created_at";

export async function getProducts(options = {}) {
  const { page, pageSize, query, stock, sort } = paginationSchema.parse(options);
  const start = (page - 1) * pageSize;
  let request = createPublicSupabaseClient().from("products").select(columns, { count: "exact" });
  if (query) request = request.ilike("title", `%${query}%`);
  if (stock === "in_stock") request = request.eq("stock_status", stock);
  request = sort === "newest" ? request.order("created_at", { ascending: false }) : request.order("price", { ascending: sort === "price_asc" });
  const { data, error, count } = await request.order("id", { ascending: true }).range(start, start + pageSize - 1);
  if (error) throw new Error("Product catalog is unavailable.");
  return { products: data, pagination: { page, pageSize, total: count, hasMore: start + data.length < count } };
}

export async function getCartProducts(ids) {
  const productIds = z.array(z.uuid()).min(1).max(100).parse(ids);
  const { data, error } = await createPublicSupabaseClient().from("products").select(columns).in("id", [...new Set(productIds)]);
  if (error) throw new Error("Bag products are unavailable.");
  return data;
}

export async function getProduct(id) {
  const productId = z.uuid().parse(id);
  const { data, error } = await createPublicSupabaseClient().from("products").select(columns).eq("id", productId).maybeSingle();
  if (error) throw new Error("Product is unavailable.");
  return data;
}
