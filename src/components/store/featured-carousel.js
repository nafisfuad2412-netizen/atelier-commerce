"use client";

import { useRef } from "react";
import ProductCard from "./product-card";

export default function FeaturedCarousel({ products }) {
  const track = useRef(null);
  const move = (direction) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollBy({ left: direction * track.current.clientWidth * .8, behavior: reduced ? "auto" : "smooth" });
  };
  return <section className="store-section store-width" aria-labelledby="featured-heading"><div className="store-section-heading"><div><p className="store-eyebrow">THE LATEST FINDS</p><h2 id="featured-heading">Meet your everyday favourites.</h2></div><div className="store-carousel-controls"><button aria-label="Previous featured products" onClick={() => move(-1)}>←</button><button aria-label="Next featured products" onClick={() => move(1)}>→</button></div></div><div ref={track} className="store-carousel" role="region" aria-label="Featured products" tabIndex={0}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
