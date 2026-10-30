export const CART_KEY = "atelier.cart.v1";
export const RECEIPT_KEY = "atelier.receipt.v1";
export const REQUEST_KEY = "atelier.checkout-request.v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCart(raw) {
  try {
    if (!raw || raw.length > 20000) return [];
    const input = JSON.parse(raw);
    if (!Array.isArray(input) || input.length > 100) return [];
    const seen = new Set();
    return input.filter((item) => {
      if (!item || typeof item.productId !== "string" || !uuid.test(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return false;
      const id = item.productId.toLowerCase();
      if (seen.has(id)) return false;
      seen.add(id); return true;
    }).map(({ productId, quantity }) => ({ productId: productId.toLowerCase(), quantity }));
  } catch { return []; }
}

export function addCartItem(items, productId) {
  const id = productId.toLowerCase();
  if (!uuid.test(id)) return items;
  if (items.some((item) => item.productId === id)) return items.map((item) => item.productId === id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item);
  return items.length < 100 ? [...items, { productId: id, quantity: 1 }] : items;
}

export async function checkoutFingerprint(payload) {
  const canonical = JSON.stringify({
    customerName: payload.customerName.trim(), customerEmail: payload.customerEmail.trim().toLowerCase(),
    shippingAddress: payload.shippingAddress.trim(),
    items: [...payload.items].map(({ productId, quantity }) => ({ productId: productId.toLowerCase(), quantity })).sort((a, b) => a.productId.localeCompare(b.productId)),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function requestForFingerprint(signature, prior) {
  return prior?.signature === signature && uuid.test(prior.requestId) ? prior : { signature, requestId: crypto.randomUUID() };
}
