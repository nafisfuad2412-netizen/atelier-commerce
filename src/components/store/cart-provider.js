"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CART_KEY, RECEIPT_KEY, parseCart, addCartItem } from "@/lib/cart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try { setItems(parseCart(localStorage.getItem(CART_KEY))); } catch { /* Private browsing can disable storage. */ }
    setReady(true);
    const update = (event) => { if (event.key === CART_KEY) setItems(parseCart(event.newValue)); };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* The in-memory bag still works. */ } } }, [items, ready]);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(timeout); }, [message]);
  const add = (product) => {
    if (!ready || product.stock_status !== "in_stock") return false;
    if (items.length >= 100 && !items.some((item) => item.productId === product.id)) { setMessage("Your bag can hold up to 100 different products."); return false; }
    setItems((current) => addCartItem(current, product.id));
    try { sessionStorage.removeItem(RECEIPT_KEY); } catch { /* Optional storage. */ }
    setMessage(`${product.title} added to your bag.`);
    return true;
  };
  const setQuantity = (id, quantity) => { if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 99) setItems((current) => current.map((item) => item.productId === id ? { ...item, quantity } : item)); };
  const remove = (id) => setItems((current) => current.filter((item) => item.productId !== id));
  return <CartContext.Provider value={{ items, ready, add, setQuantity, remove, message, clear: () => setItems([]), count: items.reduce((sum, item) => sum + item.quantity, 0) }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("Cart provider is missing.");
  return value;
}
