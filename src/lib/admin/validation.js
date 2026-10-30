import { z } from "zod";

export const productSchema = z.strictObject({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000),
  price: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Enter a price with at most two decimal places."),
  image_url: z.string().url().max(2048).nullable(),
  stock_status: z.enum(["in_stock", "out_of_stock"]),
});
export const themeSchema = z.strictObject({
  primary_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondary_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  font_family: z.enum(["sans", "serif", "mono"]),
});
export const orderStatusSchema = z.strictObject({
  id: z.uuid(),
  status: z.enum(["pending", "processing", "shipped", "completed", "cancelled"]),
});

export function getProductImagePath(imageUrl, supabaseUrl) {
  if (!imageUrl) return null;
  const url = new URL(imageUrl);
  const base = new URL(supabaseUrl);
  const prefix = "/storage/v1/object/public/product-images/";
  if (url.origin !== base.origin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(prefix)) {
    throw new Error("Choose an image uploaded to this store.");
  }
  const path = url.pathname.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|avif)$/.test(path) || !z.uuid().safeParse(path.split(".")[0]).success) {
    throw new Error("The image path is invalid.");
  }
  return path;
}
