"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-provider";
import { formatMoney, toMinorUnits } from "@/lib/store";
import { REQUEST_KEY, RECEIPT_KEY, checkoutFingerprint, requestForFingerprint } from "@/lib/cart";
import { receiptSchema } from "@/lib/checkout/validation";
import { placeOrder } from "@/app/actions/orders";

export default function Checkout() {
  const cart = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [retry, setRetry] = useState(0);
  const requestRecord = useRef(null);
  const successRef = useRef(null);
  const ids = cart.items.map((item) => item.productId).sort().join(",");
  useEffect(() => {
    try { requestRecord.current = JSON.parse(sessionStorage.getItem(REQUEST_KEY)); } catch { /* Optional session storage. */ }
  }, []);
  useEffect(() => {
    if (!cart.ready || cart.items.length) return;
    try { const stored = receiptSchema.safeParse(JSON.parse(sessionStorage.getItem(RECEIPT_KEY))); if (stored.success) setReceipt(stored.data); } catch { /* No prior receipt. */ }
  }, [cart.ready, cart.items.length]);
  useEffect(() => {
    if (!cart.ready) return;
    if (!ids) { setLoading(false); setProducts([]); return; }
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    fetch(`/api/cart?ids=${encodeURIComponent(ids)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("load"); const data = await response.json(); setProducts(data.products); })
      .catch((error) => { if (error.name !== "AbortError") setLoadError("Your bag couldn’t be refreshed. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [cart.ready, ids, retry]);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const unavailable = cart.items.some((item) => productMap.get(item.productId)?.stock_status !== "in_stock");
  const totalMinor = cart.items.reduce((total, item) => Math.min(1000000000000, total + (productMap.has(item.productId) ? toMinorUnits(productMap.get(item.productId).price) * item.quantity : 0)), 0);
  const totalTooLarge = totalMinor > 999999999999;

  const submit = async (event) => {
    event.preventDefault();
    if (busy || loading || loadError || unavailable || totalTooLarge || !cart.items.length) return;
    const form = new FormData(event.currentTarget);
    const payload = { customerName: String(form.get("customerName")), customerEmail: String(form.get("customerEmail")), shippingAddress: String(form.get("shippingAddress")), items: cart.items.map(({ productId, quantity }) => ({ productId, quantity })) };
    setBusy(true); setSubmitError("");
    try {
      const signature = await checkoutFingerprint(payload);
      requestRecord.current = requestForFingerprint(signature, requestRecord.current);
      try { sessionStorage.setItem(REQUEST_KEY, JSON.stringify(requestRecord.current)); } catch { /* The ref retains retries in this tab. */ }
      const result = await placeOrder({ ...payload, requestId: requestRecord.current.requestId });
      if (!result.ok) {
        setSubmitError(result.error.message);
        if (result.error.code === "PRODUCT_UNAVAILABLE") setRetry((value) => value + 1);
        return;
      }
      setReceipt(result.order);
      try { sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(result.order)); sessionStorage.removeItem(REQUEST_KEY); } catch { /* Receipt remains visible in memory. */ }
      requestRecord.current = null;
      cart.clear();
      setTimeout(() => successRef.current?.focus(), 0);
    } catch { setSubmitError("The connection was interrupted. Retry with the same details so we can safely check your order."); }
    finally { setBusy(false); }
  };

  if (!cart.ready) return <div className="store-empty-state"><p role="status">Opening your bag…</p></div>;
  if (receipt && cart.items.length === 0) return <section ref={successRef} tabIndex={-1} className="store-order-success"><span className="store-success-mark" aria-hidden="true">✓</span><p className="store-eyebrow">A LITTLE SOMETHING TO LOOK FORWARD TO</p><h1>Your order is in.</h1><p>Thank you for making Atelier part of your everyday.</p><div className="store-receipt"><div><span>Order reference</span><strong>{receipt.id}</strong></div><div><span>Order total</span><strong>{formatMoney(receipt.total_amount)}</strong></div><div><span>Status</span><strong className="capitalize">{receipt.status}</strong></div></div><p className="store-order-note">No payment was collected online. Keep your order reference for any questions about this order.</p><Link href="/products" className="store-button">Continue exploring ↗</Link></section>;
  if (!cart.items.length) return <div className="store-empty-state"><span aria-hidden="true">✳</span><h1>A little room for good things.</h1><p>Your bag is empty. Find something that feels like you.</p><Link href="/products" className="store-button">Explore the collection ↗</Link></div>;
  return <><div className="store-checkout-heading"><p className="store-eyebrow">A FEW GOOD THINGS, JUST FOR YOU</p><h1>Make them yours.</h1><p>Your everyday favourites are one step closer.</p></div><div className="store-checkout-grid"><section className="store-checkout-form-panel"><div className="store-checkout-panel-heading"><span>01</span><div><h2>Your details</h2><p>Where should your good things find you?</p></div></div><form onSubmit={submit} className="store-checkout-form"><label htmlFor="customer-name">Full name<input id="customer-name" name="customerName" autoComplete="name" maxLength={200} required disabled={busy} placeholder="Your full name"/></label><label htmlFor="customer-email">Email address<input id="customer-email" name="customerEmail" type="email" autoComplete="email" maxLength={320} required disabled={busy} placeholder="you@example.com"/></label><label htmlFor="shipping-address">Shipping address<textarea id="shipping-address" name="shippingAddress" autoComplete="street-address" minLength={5} maxLength={2000} required disabled={busy} rows={4} placeholder="House, road, area, city and postal code"/></label><p className="store-checkout-disclosure">This places an order without collecting payment online. Product prices are checked again when you submit. Delivery and payment arrangements are separate.</p>{totalTooLarge && <p role="alert" className="store-form-error">This order exceeds the supported total. Reduce the quantities to continue.</p>}{submitError && <p role="alert" className="store-form-error">{submitError}</p>}<button className="store-button store-place-order" disabled={busy || loading || Boolean(loadError) || unavailable || totalTooLarge}>{busy ? "Placing your order…" : "Place order"}<span aria-hidden="true">↗</span></button><p className="store-checkout-security"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4"/></svg>Your details are used to process your order.</p></form></section><aside className="store-order-summary"><div className="store-checkout-panel-heading"><span>02</span><div><h2>A few good choices</h2><p>{cart.count} {cart.count === 1 ? "item" : "items"} in your bag</p></div></div>{loading ? <p role="status" className="store-summary-notice">Refreshing current prices…</p> : loadError ? <div className="store-summary-notice"><p role="alert">{loadError}</p><button type="button" className="store-text-link" onClick={() => setRetry((value) => value + 1)}>Try again ↗</button></div> : <><ul className="store-bag-items">{cart.items.map((item) => { const product = productMap.get(item.productId); return <li key={item.productId}><div className="store-bag-image">{product?.image_url ? <img src={product.image_url} alt={product.title} width="160" height="180"/> : <span aria-hidden="true">✳</span>}</div><div className="store-bag-item-content"><div><h3>{product?.title ?? "Product no longer available"}</h3>{product && <p>{formatMoney(product.price)} each</p>}</div>{product?.stock_status !== "in_stock" && <p className="store-unavailable">Unavailable · remove to continue</p>}<div className="store-bag-item-bottom"><div className="store-quantity"><button type="button" aria-label={`Decrease quantity of ${product?.title ?? "product"}`} disabled={busy || item.quantity <= 1} onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}>−</button><label className="sr-only" htmlFor={`quantity-${item.productId}`}>Quantity of {product?.title ?? "product"}</label><input id={`quantity-${item.productId}`} type="number" min="1" max="99" value={item.quantity} disabled={busy} onChange={(event) => cart.setQuantity(item.productId, Number(event.target.value))}/><button type="button" aria-label={`Increase quantity of ${product?.title ?? "product"}`} disabled={busy || item.quantity >= 99} onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}>+</button></div><button type="button" className="store-remove-item" disabled={busy} onClick={() => cart.remove(item.productId)} aria-label={`Remove ${product?.title ?? "product"} from bag`}>Remove</button></div></div></li>; })}</ul><div className="store-summary-totals"><div><span>Products subtotal</span><span>{formatMoney(totalMinor / 100)}</span></div><div><span>Currency</span><span>BDT · Bangladeshi taka</span></div><div className="store-summary-total"><strong>Estimated order total</strong><strong>{formatMoney(totalMinor / 100)}</strong></div><p>Final product total is calculated at submission. No delivery charge or online payment is included.</p></div></>}<Link href="/products" className="store-text-link store-keep-shopping">← A little more browsing</Link></aside></div></>;
}
