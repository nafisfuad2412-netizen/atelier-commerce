import { z } from "zod";

const itemSchema = z.strictObject({
  productId: z.uuid().transform((value) => value.toLowerCase()),
  quantity: z.number().int().min(1).max(99),
});

export const orderSchema = z.strictObject({
  requestId: z.uuid(),
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().trim().toLowerCase().max(320).pipe(z.email()),
  shippingAddress: z.string().trim().min(5).max(2000),
  items: z.array(itemSchema).min(1).max(100),
}).superRefine((order, context) => {
  const ids = new Set();
  order.items.forEach((item, index) => {
    if (ids.has(item.productId)) {
      context.addIssue({ code: "custom", path: ["items", index, "productId"], message: "Each product must appear only once." });
    }
    ids.add(item.productId);
  });
});

export function toDatabasePayload(order) {
  return {
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    shipping_address: order.shippingAddress,
    items: order.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  };
}

export const receiptSchema = z.strictObject({
  id: z.uuid(),
  total_amount: z.string().regex(/^\d+\.\d{2}$/),
  status: z.enum(["pending", "processing", "shipped", "completed", "cancelled"]),
  created_at: z.string(),
});
