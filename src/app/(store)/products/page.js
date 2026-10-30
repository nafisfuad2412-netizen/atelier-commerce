import Link from "next/link";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/store/product-card";
import CatalogControls from "@/components/store/catalog-controls";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0,100) : "";
  const stock = params.stock === "in_stock" ? "in_stock" : "all";
  const sort = ["price_asc", "price_desc"].includes(params.sort) ? params.sort : "newest";
  const rawPage = Number(params.page ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
  const { products, pagination } = await getProducts({ page, pageSize: 12, query, stock, sort });
  const pageUrl = (value) => `/products?${new URLSearchParams({ q:query,stock,sort,page:String(value) })}`;
  return <div className="store-width store-catalog"><div className="store-breadcrumb"><Link href="/">Home</Link><span>/</span><span>The collection</span></div><div className="store-catalog-heading"><div><p className="store-eyebrow">OBJECTS & EVERYDAY LIVING</p><h1>A little less ordinary.</h1><p>Find a place for the things that feel like you.</p></div><span className="store-catalog-symbol" aria-hidden="true">✳</span></div><CatalogControls query={query} stock={stock} sort={sort}/><div className="store-results-label"><span>{pagination.total} {pagination.total === 1 ? "object" : "objects"}{query ? ` matching “${query}”` : " in the collection"}</span><span>All prices in BDT</span></div>{products.length ? <div className="store-product-grid">{products.map((product) => <ProductCard key={product.id} product={product}/>)}</div> : <div className="store-empty-state"><span aria-hidden="true">✳</span><h2>{query || stock !== "all" || page > 1 ? "Nothing here just yet." : "Good things are on their way."}</h2><p>{query || stock !== "all" || page > 1 ? "Try another search, or take a look at the whole collection." : "The collection is waiting for its first finds. Check back to discover what’s new."}</p>{(query || stock !== "all" || page > 1) && <Link href="/products" className="store-button">View all products ↗</Link>}</div>}{(pagination.total > 12 || page > 1) && <nav className="store-pagination" aria-label="Collection pages">{page > 1 ? <Link href={pageUrl(page - 1)}>← Previous</Link> : <span/>}<span>Page {page}</span>{pagination.hasMore ? <Link href={pageUrl(page + 1)}>Next →</Link> : <span/>}</nav>}</div>;
}
