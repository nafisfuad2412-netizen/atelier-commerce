import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, AdminAccessError } from "@/lib/admin/auth";
import Dashboard from "@/components/admin/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }) {
  let context;
  try { context = await requireAdmin(); } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/admin/login");
    return <main id="main-content" className="admin-workspace grid place-items-center p-8"><div className="admin-panel max-w-lg p-8"><h1 className="mb-4 text-2xl font-semibold">Access unavailable</h1><p className="mb-6 text-sm text-stone-500">Your account may not have administrator access, or verification is temporarily unavailable.</p><Link href="/admin/login" className="admin-button">Return to sign in</Link></div></main>;
  }
  const params = await searchParams;
  const view = ["products", "orders", "theme"].includes(params.tab) ? params.tab : "products";
  const pageValue = Number(params.page ?? 1);
  const page = Number.isInteger(pageValue) && pageValue >= 1 && pageValue <= 10000 ? pageValue : 1;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const size = 12;
  const client = context.client;
  let productsQuery = client.from("products").select("id,title,description,price,image_url,stock_status,created_at", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((page - 1) * size, page * size - 1);
  if (query) productsQuery = productsQuery.ilike("title", `%${query}%`);
  const results = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }),
    client.from("products").select("id", { count: "exact", head: true }).eq("stock_status", "in_stock"),
    client.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    view === "products" ? productsQuery : Promise.resolve({ data: [], count: 0 }),
    view === "orders" ? client.from("orders").select("id,customer_name,customer_email,shipping_address,items_ordered,total_amount,status,created_at", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((page - 1) * size, page * size - 1) : Promise.resolve({ data: [], count: 0 }),
    client.from("theme_settings").select("primary_color,secondary_color,font_family").eq("id", 1).single(),
  ]);
  if (results.some((result) => result.error)) throw new Error("The admin dashboard could not be loaded. Please try again.");
  return <Dashboard view={view} products={results[3].data} orders={results[4].data} theme={results[5].data}
    counts={{ products: results[0].count, available: results[1].count, pending: results[2].count }}
    pagination={{ page, size, total: view === "orders" ? results[4].count : results[3].count, query }} userEmail={context.user.email} />;
}
