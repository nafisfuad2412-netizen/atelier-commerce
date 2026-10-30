import { ZodError } from "zod";
import { getProducts } from "@/lib/products";
import { jsonResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  try {
    return jsonResponse(await getProducts({
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
      query: params.get("q") ?? undefined,
      stock: params.get("stock") ?? undefined,
      sort: params.get("sort") ?? undefined,
    }));
  } catch (error) {
    if (error instanceof ZodError) return jsonResponse({ error: { code: "INVALID_PAGINATION", message: "Use a valid page and pageSize (1–100)." } }, 400);
    return jsonResponse({ error: { code: "CATALOG_UNAVAILABLE", message: "The product catalog is temporarily unavailable." } }, 503);
  }
}
