import { submitOrder } from "@/lib/checkout/service";
import { jsonResponse, readOrderJson, RequestError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const result = await submitOrder(await readOrderJson(request));
    const { status, ...body } = result;
    return jsonResponse(body, status);
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ ok: false, error: { code: error.code, message: error.message } }, error.status);
    return jsonResponse({ ok: false, error: { code: "CHECKOUT_UNAVAILABLE", message: "Checkout is temporarily unavailable." } }, 503);
  }
}
