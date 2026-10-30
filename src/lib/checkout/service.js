import "server-only";
import { createCheckoutSupabaseClient } from "../supabase/checkout-server.js";
import { orderSchema, receiptSchema, toDatabasePayload } from "./validation.js";

const databaseErrors = {
  INVALID_ORDER: [400, "INVALID_ORDER", "Please check your order details."],
  DUPLICATE_PRODUCT: [400, "INVALID_ORDER", "Each product must appear only once."],
  IDEMPOTENCY_CONFLICT: [409, "IDEMPOTENCY_CONFLICT", "This request ID was already used for a different order."],
  PRODUCT_UNAVAILABLE: [409, "PRODUCT_UNAVAILABLE", "A selected product is unavailable. Please refresh your cart."],
  ORDER_TOTAL_TOO_LARGE: [400, "INVALID_ORDER", "The order total exceeds the supported limit."],
  ORDER_RATE_LIMIT: [429, "RATE_LIMITED", "Too many orders for this email. Please try again later."],
};

export function createOrderService(clientFactory = createCheckoutSupabaseClient) {
  return async function submitOrder(input) {
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, status: 400, error: { code: "INVALID_ORDER", message: "Please check your order details.", fields: [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))] } };
    }
    try {
      const client = clientFactory();
      const { data, error } = await client.rpc("place_store_order", {
        p_request_id: parsed.data.requestId,
        p_payload: toDatabasePayload(parsed.data),
      });
      if (error) {
        const mapped = databaseErrors[error.message];
        if (mapped) return { ok: false, status: mapped[0], error: { code: mapped[1], message: mapped[2] } };
        return unavailable();
      }
      const receipt = receiptSchema.safeParse(data);
      if (!receipt.success) return unavailable();
      return { ok: true, status: 200, order: receipt.data };
    } catch {
      // Do not log customer fields, database errors or credentials.
      // The caller retains requestId so network failures can be retried safely.
      return unavailable();
    }
  };
}

function unavailable() {
  return { ok: false, status: 503, error: { code: "CHECKOUT_UNAVAILABLE", message: "Checkout is temporarily unavailable. Retry with the same request ID." } };
}

export const submitOrder = createOrderService();
