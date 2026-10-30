import test from "node:test";
import assert from "node:assert/strict";
import { productSchema, themeSchema, orderStatusSchema, getProductImagePath } from "../src/lib/admin/validation.js";
import { detectImageType, validateImageFile } from "../src/lib/admin/images.js";

const id = "0e7c3175-f472-4e1c-99db-7443e3e902fc";
const base = "https://store.supabase.co";
const product = { title: "Desk lamp", description: "A considered detail.", price: "29.99", image_url: null, stock_status: "in_stock" };

test("product form preserves decimal prices and rejects invalid fields", () => {
  assert.equal(productSchema.parse(product).price, "29.99");
  for (const price of ["-1", "1.999", "1e3", "Infinity", "NaN", "10000000000", "", "01.00"]) {
    assert.equal(productSchema.safeParse({ ...product, price }).success, false);
  }
  assert.equal(productSchema.safeParse({ ...product, title: " " }).success, false);
  assert.equal(productSchema.safeParse({ ...product, stock_status: "anything" }).success, false);
  assert.equal(productSchema.safeParse({ ...product, created_at: "forged" }).success, false);
});

test("theme and order status changes allow only supported fields", () => {
  assert.equal(themeSchema.safeParse({ primary_color: "#214b3b", secondary_color: "#FAF8F4", font_family: "serif" }).success, true);
  assert.equal(themeSchema.safeParse({ primary_color: "red", secondary_color: "#FAF8F4", font_family: "url(external)" }).success, false);
  assert.equal(orderStatusSchema.safeParse({ id, status: "shipped" }).success, true);
  assert.equal(orderStatusSchema.safeParse({ id, status: "paid" }).success, false);
  assert.equal(orderStatusSchema.safeParse({ id, status: "pending", total_amount: 0 }).success, false);
});

test("product image URLs are confined to this store and generated image paths", () => {
  assert.equal(getProductImagePath(`${base}/storage/v1/object/public/product-images/${id}.png`, base), `${id}.png`);
  assert.equal(getProductImagePath(null, base), null);
  for (const url of [
    `https://elsewhere.example/storage/v1/object/public/product-images/${id}.png`,
    `${base}/storage/v1/object/public/another-bucket/${id}.png`,
    `${base}/storage/v1/object/public/product-images/${id}.svg`,
    `${base}/storage/v1/object/public/product-images/${id}.png?download=1`,
    `${base}/storage/v1/object/public/product-images/not-a-uuid.png`,
    `https://name:password@store.supabase.co/storage/v1/object/public/product-images/${id}.png`,
  ]) assert.throws(() => getProductImagePath(url, base));
});

test("image checks reject MIME spoofing, oversized files, SVG and corrupt headers", async () => {
  assert.equal(detectImageType(new Uint8Array([137,80,78,71,13,10,26,10])), "image/png");
  assert.equal(detectImageType(new Uint8Array([255,216,255,224])), "image/jpeg");
  assert.equal(detectImageType(new TextEncoder().encode("RIFF1234WEBP")), "image/webp");
  assert.equal(detectImageType(new TextEncoder().encode("0000ftypavif")), "image/avif");
  assert.equal(detectImageType(new TextEncoder().encode("<svg></svg>")), null);
  await assert.rejects(validateImageFile(new File(["<svg/>"], "image.svg", { type: "image/svg+xml" })));
  await assert.rejects(validateImageFile(new File(["plain text"], "image.png", { type: "image/png" })));
  await assert.rejects(validateImageFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 }));
});
