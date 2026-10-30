"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { signOut, saveProduct, deleteProduct, saveTheme, updateOrderStatus } from "@/app/admin/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { validateImageFile } from "@/lib/admin/images";

const fonts = { sans: "Arial, Helvetica, sans-serif", serif: "Georgia, serif", mono: "monospace" };
const amount = (value) => Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statuses = ["pending", "processing", "shipped", "completed", "cancelled"];

function Icon({ type, className = "size-5" }) {
  const paths = {
    products: "M4 6h16v15H4z M8 6V3h8v3 M9 11h6",
    orders: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",
    theme: "M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a1 1 0 0 1 0-2h2a6 6 0 0 0 0-12z M7 9h.1 M10 6h.1 M15 7h.1",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    plus: "M12 5v14 M5 12h14",
    store: "M3 10l2-7h14l2 7 M4 10v11h16V10 M8 21v-7h8v7 M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0",
    exit: "M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={paths[type] ?? paths.products} /></svg>;
}

function Notice({ value }) {
  if (!value) return null;
  return <p role={value.error ? "alert" : "status"} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${value.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-900"}`}>{value.text}</p>;
}

export default function Dashboard({ view, products, orders, theme, counts, pagination, userEmail }) {
  const router = useRouter();
  const [notice, setNotice] = useState(null);
  const [editor, setEditor] = useState(null);
  const editorRef = useRef(null);
  const notify = (text, error = false) => setNotice({ text, error });
  const openEditor = (product = {}) => {
    setEditor(product);
    setNotice(null);
    setTimeout(() => { editorRef.current?.scrollIntoView({ behavior: "auto", block: "start" }); editorRef.current?.querySelector("#product-title")?.focus(); }, 0);
  };
  const saved = (result, message) => {
    if (!result.ok) { notify(result.error, true); return false; }
    notify(result.warning ?? message, Boolean(result.warning));
    router.refresh();
    return true;
  };
  return <MotionConfig reducedMotion="user"><div className="admin-workspace lg:grid lg:grid-cols-[230px_1fr]">
    <aside className="flex flex-col border-b border-[#e4e8df] bg-[#fcfcf9] lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
      <Link href="/admin" className="flex items-center gap-3 px-6 py-7 text-xl font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-[#214b3b] font-serif text-2xl text-white">a.</span> atelier<span className="text-[#9aaa90]">✳</span></Link>
      <p className="hidden px-7 pt-8 pb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#9ca696] lg:block">Workspace</p>
      <nav aria-label="Admin navigation" className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col">
        {[["products", "Products"], ["orders", "Orders"], ["theme", "Appearance"]].map(([key, label]) => <Link key={key} href={`/admin?tab=${key}`} aria-current={view === key ? "page" : undefined} onClick={() => { setEditor(null); setNotice(null); }} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm whitespace-nowrap ${view === key ? "bg-[#eaf0e4] font-semibold text-[#214b3b]" : "text-[#7b887b] hover:bg-[#f0f3eb]"}`}><Icon type={key} />{label}{key === "orders" && counts.pending > 0 && <span className="ml-auto rounded-md bg-[#dbe5d0] px-2 py-0.5 text-[10px]">{counts.pending}</span>}</Link>)}
      </nav>
      <div className="mt-auto hidden p-5 lg:block"><div className="rounded-xl bg-[#f0f3e8] p-4"><span className="text-xl text-[#789369]">✳</span><p className="mt-2 text-xs font-semibold">Small details. Big difference.</p><p className="mt-2 text-[11px] leading-5 text-[#8a9681]">Your next great storefront starts with a little everyday care.</p></div></div>
      <div className="flex items-center justify-between gap-3 border-t border-[#e4e8df] px-6 py-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8ede2] text-xs font-bold">A</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Store owner</p><p className="truncate text-[10px] text-stone-400" title={userEmail}>{userEmail}</p></div><form action={signOut}><button aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><Icon type="exit" className="size-4" /></button></form></div>
    </aside>
    <main id="main-content" className="min-w-0">
      <header className="flex items-center justify-between gap-4 border-b border-[#e4e8df] bg-white/50 px-5 py-5 sm:px-9"><p className="text-xs text-stone-400">Workspace <span className="mx-3 text-stone-300">/</span> <span className="font-medium text-[#4c634d]">{view === "theme" ? "Appearance" : view === "orders" ? "Orders" : "Products"}</span></p><Link href="/" className="flex items-center gap-2 text-xs font-medium text-[#6f806a]"><Icon type="store" className="size-4" /><span className="hidden sm:inline">View storefront</span><span aria-hidden="true">↗</span></Link></header>
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-9 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8a9d80]">Made for the everyday</p><h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">A good day to grow.</h1><p className="mt-2 text-sm text-[#8a9587]">A little overview of what’s happening in your store.</p></div><span className="rounded-full border border-[#dfe7d8] bg-[#f0f5e9] px-3 py-1.5 text-[10px] font-medium text-[#718761]">● &nbsp; Your workspace</span></div>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">{[["products", "Total products", counts.products, "In your collection"], ["store", "Available products", counts.available, "Ready for your customers"], ["orders", "Pending orders", counts.pending, "Waiting for your attention"]].map(([icon, label, count, caption]) => <div key={label} className="admin-panel flex items-center gap-4 p-5"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${icon === "orders" ? "bg-[#fbf1dc] text-[#af8a47]" : "bg-[#eef2e7] text-[#8da178]"}`}><Icon type={icon} /></span><div><p className="text-[11px] text-[#8b9786]">{label}</p><p className="mt-1 text-3xl font-semibold tracking-tight">{count}</p><p className="mt-1 text-[10px] text-[#a4ad9d]">{caption}</p></div></div>)}</div>
        <Notice value={notice} />
        {view === "products" && <>
          {editor && <section ref={editorRef} className="mb-7 scroll-mt-6"><ProductEditor key={editor.id ?? "new"} product={editor} onCancel={() => setEditor(null)} onSaved={(result) => { if (saved(result, editor.id ? "Product updated." : "Product added to your collection.")) setEditor(null); }} onError={(message) => notify(message, true)} /></section>}
          <section className="admin-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef0e9] p-5 sm:p-6"><div><h2 className="text-base font-semibold">Your collection <span className="ml-2 rounded-md bg-[#f0f3eb] px-2 py-1 text-[10px] text-[#94a184]">{counts.products}</span></h2><p className="mt-1 text-xs text-[#9ba591]">Thoughtfully curated. Effortlessly managed.</p></div><button onClick={() => openEditor()} className="admin-button"><Icon type="plus" className="size-4" />Add product</button></div>
            <form className="flex items-center gap-2 border-b border-[#eef0e9] px-5 py-4" action="/admin"><input type="hidden" name="tab" value="products" /><Icon type="search" className="size-4 text-[#a3ad99]" /><label htmlFor="product-search" className="sr-only">Search products</label><input id="product-search" name="q" defaultValue={pagination.query} maxLength={100} placeholder="Find something in your collection…" className="min-w-0 flex-1 bg-transparent py-1 text-xs outline-none" /><button className="text-xs font-medium text-[#59764b]">Search</button></form>
            {products.length ? <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} onEdit={() => openEditor(product)} onResult={(result) => saved(result, "Product removed from your collection.")} />)}</div> : <div className="px-6 py-20 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f0f3e9] text-[#8b9e75]"><Icon type="products" className="size-7" /></span><h3 className="mt-5 text-lg font-semibold">{pagination.query ? "No matching products" : "Make room for something lovely."}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#98a18f]">{pagination.query ? "Try another search or clear the filter." : "Add your first product and start building a collection your customers will love."}</p>{pagination.query ? <Link href="/admin?tab=products" className="admin-button admin-secondary mt-6">Clear search</Link> : <button className="admin-button mt-6" onClick={() => openEditor()}>Add your first product <Icon type="arrow" className="size-4" /></button>}</div>}
            <Pagination view={view} data={pagination} />
          </section>
        </>}
        {view === "orders" && <section className="admin-panel overflow-hidden"><div className="border-b border-[#eef0e9] p-6"><h2 className="text-base font-semibold">Orders, with care.</h2><p className="mt-1 text-xs text-[#9ba591]">Review customer details and keep each delivery moving.</p></div><div className="divide-y divide-[#eef0e9]">{orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} onResult={(result) => saved(result, "Order status updated.")} />) : <p className="p-14 text-center text-sm text-[#8b9786]">Your first order will appear here.</p>}</div><Pagination view={view} data={pagination} /></section>}
        {view === "theme" && <ThemeEditor key={JSON.stringify(theme)} theme={theme} onResult={(result) => saved(result, "Store appearance saved.")} />}
        <footer className="mt-10 flex flex-wrap justify-between gap-3 text-[10px] text-[#a8b19f]"><p>Atelier Commerce · A considered way to sell.</p><p>Made for your next chapter <span className="ml-1 text-[#93a778]">✳</span></p></footer>
      </div>
    </main>
  </div></MotionConfig>;
}

function Pagination({ view, data }) {
  const { page, size, total, query } = data;
  if (!total && page === 1) return null;
  const url = (value) => `/admin?tab=${view}&page=${value}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  return <nav aria-label="Results pages" className="flex items-center justify-between gap-4 border-t border-[#eef0e9] px-6 py-4 text-xs text-[#849078]"><span>Page {page} · {total} {view === "orders" ? "orders" : "products"}</span><div className="flex gap-4">{page > 1 && <Link href={url(page - 1)}>← Previous</Link>}{page * size < total && <Link href={url(page + 1)}>Next →</Link>}</div></nav>;
}

function ProductCard({ product, onEdit, onResult }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try { onResult(await deleteProduct(product.id)); } catch { onResult({ ok: false, error: "The product could not be removed. Please try again." }); }
    setBusy(false); setConfirm(false);
  };
  return <motion.article whileHover={{ y: -3 }} className="overflow-hidden rounded-xl border border-[#edf0e7] bg-white">
    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-[#f3f4ee]">{product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy" className="h-full w-full object-cover" /> : <Icon type="products" className="size-12 text-[#c5ceba]" />}<span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[9px] font-semibold ${product.stock_status === "in_stock" ? "bg-white/95 text-[#6f8953]" : "bg-[#f6eddd] text-[#9e8257]"}`}>{product.stock_status === "in_stock" ? "In stock" : "Out of stock"}</span></div>
    <div className="p-4"><h3 className="truncate text-sm font-semibold" title={product.title}>{product.title}</h3><p className="mt-1 truncate text-[11px] text-[#a1aa96]">{product.description || "No description yet"}</p><div className="mt-4 flex items-center justify-between gap-2"><p className="text-sm font-semibold">{amount(product.price)}</p><div className="flex gap-3 text-[11px]"><button onClick={onEdit} className="text-[#64804f] underline-offset-4 hover:underline" aria-label={`Edit ${product.title}`}>Edit</button><button onClick={() => setConfirm(true)} className="text-stone-400 hover:text-red-700" aria-label={`Delete ${product.title}`}>Delete</button></div></div>{confirm && <div className="mt-4 rounded-lg bg-red-50 p-3"><p className="text-xs text-red-800">Remove this product? Existing orders will keep their item details.</p><div className="mt-3 flex gap-4 text-xs"><button disabled={busy} onClick={remove} className="font-semibold text-red-800">{busy ? "Removing…" : "Remove product"}</button><button disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></div></div>}</div>
  </motion.article>;
}

function ProductEditor({ product, onCancel, onSaved, onError }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(product.image_url ?? null);
  const [preview, setPreview] = useState(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const fileRef = useRef(null);
  const chooseFile = (event) => {
    const next = event.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
    setFile(next);
  };
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      let imageUrl = uploadedUrl;
      if (file) {
        setStep("Checking image…");
        const extension = await validateImageFile(file);
        const client = getSupabaseBrowserClient();
        const access = await client.rpc("is_store_admin");
        if (access.error || access.data !== true) throw new Error("Your administrator session has ended. Sign in again.");
        const path = `${crypto.randomUUID()}.${extension}`;
        setStep("Uploading image…");
        const uploaded = await client.storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (uploaded.error) throw new Error("Image upload failed. Check your connection and try again.");
        imageUrl = client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        setUploadedUrl(imageUrl); setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
      setStep("Saving product…");
      const result = await saveProduct({ ...(product.id ? { id: product.id } : {}), title: String(form.get("title")), description: String(form.get("description")), price: String(form.get("price")), stock_status: String(form.get("stock_status")), image_url: imageUrl });
      onSaved(result);
    } catch (error) { onError(error.message || "The product could not be saved. Please try again."); }
    setBusy(false); setStep("");
  };
  return <div className="admin-panel p-5 sm:p-7"><div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">{product.id ? "Edit product" : "Something new for your collection."}</h2><button onClick={onCancel} disabled={busy} aria-label="Close product editor" className="px-2 text-xl text-stone-400">×</button></div>
    <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[240px_1fr]">
      <div><label className="admin-label" htmlFor="product-image">Product image</label><div className="mb-3 grid aspect-square place-items-center overflow-hidden rounded-xl border border-dashed border-[#cfd9c3] bg-[#f5f7f0]">{preview || uploadedUrl ? <img src={preview || uploadedUrl} alt="Product preview" className="h-full w-full object-cover" /> : <div className="p-5 text-center"><Icon type="products" className="mx-auto size-9 text-[#9bab88]" /><p className="mt-3 text-xs text-[#9aaa8d]">A good image tells the story.</p></div>}</div><input ref={fileRef} id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={chooseFile} disabled={busy} className="w-full text-[11px] text-[#78876b] file:mr-2 file:rounded-lg file:border-0 file:bg-[#eaf0e1] file:px-3 file:py-2 file:text-[#536e40]" /><p className="mt-2 text-[10px] leading-5 text-stone-400">JPEG, PNG, WebP or AVIF. Up to 5 MiB.</p>{(uploadedUrl || file) && <button type="button" disabled={busy} onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); setUploadedUrl(null); if (fileRef.current) fileRef.current.value = ""; }} className="mt-2 text-xs text-stone-400">Remove image</button>}</div>
      <div className="grid content-start gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label className="admin-label" htmlFor="product-title">Product name</label><input id="product-title" name="title" className="admin-input" defaultValue={product.title ?? ""} maxLength={200} required disabled={busy} placeholder="Something worth discovering" /></div><div className="sm:col-span-2"><label className="admin-label" htmlFor="product-description">Description</label><textarea id="product-description" name="description" className="admin-input min-h-28 resize-y" defaultValue={product.description ?? ""} maxLength={10000} disabled={busy} placeholder="Share the details that make it special." /></div><div><label className="admin-label" htmlFor="product-price">Unit price</label><input id="product-price" name="price" type="number" min="0" max="9999999999.99" step="0.01" className="admin-input" defaultValue={product.price ?? ""} required disabled={busy} placeholder="0.00" /></div><div><label className="admin-label" htmlFor="product-stock">Availability</label><select id="product-stock" name="stock_status" defaultValue={product.stock_status ?? "in_stock"} className="admin-input" disabled={busy}><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option></select></div><div className="flex flex-wrap justify-end gap-3 border-t border-[#eef0e9] pt-5 sm:col-span-2"><button type="button" className="admin-button admin-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className="admin-button" disabled={busy}>{busy ? step : "Save product"}</button></div></div>
    </form>
  </div>;
}

function OrderCard({ order, onResult }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(order.status);
  const update = async (event) => { event.preventDefault(); setBusy(true); try { onResult(await updateOrderStatus({ id: order.id, status })); } catch { onResult({ ok: false, error: "The order status could not be saved." }); } setBusy(false); };
  const items = Array.isArray(order.items_ordered) ? order.items_ordered : [];
  return <article className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] uppercase tracking-wider text-[#9aa68d]">Order {order.id.slice(0, 8)}</p><h3 className="mt-2 text-sm font-semibold">{order.customer_name}</h3><p className="mt-1 text-xs text-stone-500">{order.customer_email}</p><p className="mt-2 text-[10px] text-stone-400">{new Date(order.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })} · Dhaka time</p></div><div className="text-right"><span className="rounded-full bg-[#f4f2e5] px-3 py-1 text-[10px] capitalize text-[#928350]">{order.status}</span><p className="mt-3 text-lg font-semibold">{amount(order.total_amount)}</p></div></div><details className="mt-5"><summary className="cursor-pointer text-xs font-medium text-[#63804f]">View order details</summary><div className="mt-4 grid gap-5 rounded-xl bg-[#f7f8f4] p-4 text-xs sm:grid-cols-2"><div><h4 className="mb-2 font-semibold">Ship to</h4><p className="whitespace-pre-wrap leading-6 text-stone-500">{order.shipping_address}</p></div><div><h4 className="mb-2 font-semibold">Items</h4><ul className="space-y-2">{items.map((item, index) => <li key={index} className="flex justify-between gap-3 text-stone-500"><span>{String(item.title ?? "Product")} × {Number(item.quantity) || 0}</span><span>{amount(item.unit_price ?? 0)}</span></li>)}</ul><p className="mt-3 text-[10px] text-stone-400">Item prices are per unit.</p></div></div></details><form onSubmit={update} className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#eef0e9] pt-4"><label htmlFor={`status-${order.id}`} className="text-xs text-[#8a9681]">Order status</label><select id={`status-${order.id}`} value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy} className="admin-input max-w-44 capitalize">{statuses.map((value) => <option value={value} key={value}>{value}</option>)}</select><button className="admin-button admin-secondary" disabled={busy || status === order.status}>{busy ? "Saving…" : "Update status"}</button></form></article>;
}

function ThemeEditor({ theme, onResult }) {
  const [values, setValues] = useState(theme);
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { onResult(await saveTheme(values)); } catch { onResult({ ok: false, error: "The appearance could not be saved." }); } setBusy(false); };
  return <div className="grid items-start gap-6 xl:grid-cols-2"><section className="admin-panel p-6 sm:p-8"><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#99aa85]">Make it yours</p><h2 className="text-xl font-semibold">A storefront with your signature.</h2><p className="mt-2 mb-7 text-xs leading-6 text-[#98a18d]">Choose the colors and type that feel like your brand.</p><form onSubmit={submit} className="space-y-6">{[["primary_color", "Primary color"], ["secondary_color", "Background color"]].map(([key, label]) => <div key={key}><label htmlFor={key} className="admin-label">{label}</label><div className="flex gap-3"><input type="color" value={/^#[0-9a-f]{6}$/i.test(values[key]) ? values[key] : "#000000"} onChange={(event) => update(key, event.target.value)} disabled={busy} aria-label={`${label} picker`} className="h-11 w-14 rounded-lg border border-[#dce1d9] bg-white p-1" /><input id={key} className="admin-input" value={values[key]} onChange={(event) => update(key, event.target.value)} required pattern="#[0-9A-Fa-f]{6}" maxLength={7} disabled={busy} /></div></div>)}<div><label htmlFor="font-family" className="admin-label">Font family</label><select id="font-family" className="admin-input" value={values.font_family} onChange={(event) => update("font_family", event.target.value)} disabled={busy}><option value="sans">Sans serif · clean & contemporary</option><option value="serif">Serif · classic & considered</option><option value="mono">Monospace · distinctive & precise</option></select></div><button className="admin-button" disabled={busy}>{busy ? "Saving…" : "Save appearance"}</button></form></section><section aria-label="Appearance preview" className="admin-panel overflow-hidden"><div className="border-b border-[#edf0e7] px-6 py-4 text-[10px] uppercase tracking-wider text-stone-400">A little preview</div><div className="min-h-96 p-8 sm:p-12" style={{ backgroundColor: values.secondary_color, fontFamily: fonts[values.font_family] }}><p className="mb-12 text-sm font-bold" style={{ color: values.primary_color }}>atelier <span aria-hidden="true">✳</span></p><p className="text-[10px] uppercase tracking-[.2em] text-stone-500">Everyday, elevated</p><h3 className="mt-4 text-4xl leading-tight tracking-tight" style={{ color: values.primary_color }}>Good things.<br />Thoughtfully chosen.</h3><p className="mt-5 max-w-xs text-xs leading-6 text-stone-500">A collection of things you’ll love coming home to.</p><span className="mt-8 inline-flex rounded-lg px-5 py-3 text-xs font-semibold" style={{ backgroundColor: values.primary_color, color: values.secondary_color }}>Explore the collection →</span></div></section></div>;
}
