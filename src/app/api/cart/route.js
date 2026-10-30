import { ZodError } from "zod";
import { getCartProducts } from "@/lib/products";
import { jsonResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    const raw = new URL(request.url).searchParams.get("ids") ?? "";
    if (raw.length > 4000) return jsonResponse({ error: "Too many products." }, 400);
    return jsonResponse({ products: await getCartProducts(raw.split(",")) });
  } catch (error) {
    return jsonResponse({ error: error instanceof ZodError ? "Invalid product selection." : "Your bag could not be refreshed. Please try again." }, error instanceof ZodError ? 400 : 503);
  }
}
