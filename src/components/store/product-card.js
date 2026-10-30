"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCart } from "./cart-provider";
import { formatMoney } from "@/lib/store";

export default function ProductCard({ product }) {
  const cart = useCart();
  const router = useRouter();
  const available = product.stock_status === "in_stock";
  return <motion.article className="store-product-card" whileHover={{ y: -5 }} transition={{ duration: .2 }}>
    <div className="store-product-image">{product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy" width="600" height="650" /> : <div className="store-product-placeholder" aria-label="Product image unavailable"><span aria-hidden="true">✳</span><small>ATELIER COLLECTION</small></div>}<span className="store-product-tag">{available ? "In the collection" : "Out of stock"}</span><button className="store-add-button" disabled={!available || !cart.ready} onClick={() => cart.add(product)} aria-label={`Add ${product.title} to bag`}>+</button></div>
    <div className="store-product-info"><div><h3>{product.title}</h3><p>{formatMoney(product.price)}</p></div><p className="store-product-description">{product.description || "A little detail for the everyday."}</p><button className="store-buy-button" disabled={!available || !cart.ready} onClick={() => { if (cart.add(product)) router.push("/order"); }}>{available ? "Buy now" : "Currently unavailable"}<span aria-hidden="true">↗</span></button></div>
  </motion.article>;
}
